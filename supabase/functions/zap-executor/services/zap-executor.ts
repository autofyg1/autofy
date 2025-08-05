import { GmailService, EmailMessage } from './gmail.ts';
import { NotionService, NotionPageConfig } from './notion.ts';
import { EmailParser } from './email-parser.ts';
import { Logger } from '../utils/logger.ts';
import { Zap, ZapStep } from '../lib/supabase.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ZapExecutionResult {
  zapId: string
  success: boolean
  error?: string
  emailsProcessed?: number
  notionPagesCreated?: number
  executionTime?: number
}

export class ZapExecutor {
  constructor(
    private supabase: SupabaseClient,
    private gmailService: GmailService,
    private notionService: NotionService,
    private emailParser: EmailParser,
    private logger: Logger
  ) {}

  async executeActiveZaps(userId?: string): Promise<ZapExecutionResult[]> {
    this.logger.info('Fetching active zaps', { userId });
    
    let query = this.supabase
      .from('zaps')
      .select('id, user_id, name')
      .eq('is_active', true);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: zaps, error } = await query;

    if (error) {
      this.logger.error('Error fetching zaps:', error);
      return [];
    }

    if (!zaps || zaps.length === 0) {
      this.logger.info('No active zaps found');
      return [];
    }

    this.logger.info(`Found ${zaps.length} active zaps to execute`);
    
    const results = await Promise.allSettled(
      zaps.map((zap: any) => this.executeSingleZap(zap.id))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          zapId: zaps[index].id,
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  async executeSingleZap(zapId: string): Promise<ZapExecutionResult> {
    const startTime = Date.now();
    this.logger.info(`Executing zap: ${zapId}`);

    try {
      // Fetch zap with steps, ordered by step_order
      const { data: zap, error } = await this.supabase
        .from('zaps')
        .select(`
          *,
          steps:zap_steps(
            *
          )
        `)
        .eq('id', zapId)
        .single();

      if (error || !zap) {
        this.logger.error('Error retrieving zap details:', error);
        return { 
          zapId, 
          success: false, 
          error: error?.message || 'Zap not found'
        };
      }

      // Sort steps by order
      const sortedSteps = (zap.steps || []).sort((a: ZapStep, b: ZapStep) => a.step_order - b.step_order);
      
      if (sortedSteps.length === 0) {
        return {
          zapId,
          success: false,
          error: 'No steps configured for this zap'
        };
      }

      this.logger.info(`Processing ${sortedSteps.length} steps for zap ${zapId}`);

      // Find trigger step (should be first)
      const triggerStep = sortedSteps.find((step: ZapStep) => step.step_type === 'trigger');
      if (!triggerStep) {
        return {
          zapId,
          success: false,
          error: 'No trigger step found in zap'
        };
      }

      // Execute trigger to get emails
      const emails = await this.executeTriggerStep(triggerStep, zap.user_id);
      
      if (emails.length === 0) {
        this.logger.info(`No new emails found for zap ${zapId}`);
        await this.updateZapStats(zapId, 0);
        return {
          zapId,
          success: true,
          emailsProcessed: 0,
          notionPagesCreated: 0,
          executionTime: Date.now() - startTime
        };
      }

      this.logger.info(`Found ${emails.length} emails to process`);

      // Execute action steps for each email
      const actionSteps = sortedSteps.filter((step: ZapStep) => step.step_type === 'action');
      let notionPagesCreated = 0;

      for (const email of emails) {
        for (const actionStep of actionSteps) {
          try {
            await this.executeActionStep(actionStep, zap.user_id, email);
            if (actionStep.service_name === 'notion') {
              notionPagesCreated++;
            }
          } catch (error) {
            this.logger.error(`Error executing action step for email ${email.id}:`, error);
            // Continue processing other emails even if one fails
          }
        }
      }

      // Update zap statistics
      await this.updateZapStats(zapId, emails.length);

      const executionTime = Date.now() - startTime;
      this.logger.info(`Zap execution complete. Processed ${emails.length} emails, created ${notionPagesCreated} pages in ${executionTime}ms`);

      return {
        zapId,
        success: true,
        emailsProcessed: emails.length,
        notionPagesCreated,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Critical error executing zap ${zapId}:`, error);
      return {
        zapId,
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  private async executeTriggerStep(step: ZapStep, userId: string): Promise<EmailMessage[]> {
    const { service_name, event_type, configuration } = step;
    
    if (service_name === 'gmail' && event_type === 'new_email') {
      const filters = {
        keywords: configuration.keywords?.split(',').map((k: string) => k.trim()).filter(Boolean),
        fromEmail: configuration.from_email,
        maxResults: 50 // Reasonable limit for cron jobs
      };
      
      return await this.gmailService.fetchEmailsWithFilters(userId, filters);
    }
    
    throw new Error(`Unsupported trigger: ${service_name}.${event_type}`);
  }

  private async executeActionStep(step: ZapStep, userId: string, email: EmailMessage): Promise<void> {
    const { service_name, event_type, configuration } = step;
    
    this.logger.info(`Executing action step:`, {
      service_name,
      event_type,
      configuration,
      configType: typeof configuration
    });
    
    if (service_name === 'notion' && event_type === 'create_page') {
      const config: NotionPageConfig = {
        databaseId: configuration.database_id,
        pageId: configuration.page_id,
        titleTemplate: configuration.title_template || 'Email from {{sender}}: {{subject}}',
        contentTemplate: configuration.content_template || '{{body}}'
      };
      
      this.logger.info(`Notion config:`, config);
      
      if (!config.databaseId && !config.pageId) {
        throw new Error(`Either database_id or page_id is required in configuration: ${JSON.stringify(configuration)}`);
      }
      
      await this.notionService.createPageFromEmail(userId, email, config);
      return;
    }
    
    throw new Error(`Unsupported action: ${service_name}.${event_type}`);
  }

  private async updateZapStats(zapId: string, emailsProcessed: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_zap_run_stats', {
          zap_id_param: zapId,
          emails_processed: emailsProcessed
        });

      if (error) {
        this.logger.error('Error updating zap stats:', error);
      }
    } catch (error) {
      this.logger.error('Error updating zap stats:', error);
    }
  }
}

