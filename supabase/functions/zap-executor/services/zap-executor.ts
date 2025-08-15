import { GmailService, EmailMessage } from './gmail.ts';
import { NotionService, NotionPageConfig } from './notion.ts';
import { OpenRouterService, AIProcessedEmail, OpenRouterConfig } from './openrouter.ts';
import { TelegramService, TelegramConfig } from './telegram.ts';
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
  telegramMessagesSent?: number
  executionTime?: number
}

export class ZapExecutor {
  private openRouterService: OpenRouterService;
  private telegramService: TelegramService;

  constructor(
    private supabase: SupabaseClient,
    private gmailService: GmailService,
    private notionService: NotionService,
    private emailParser: EmailParser,
    private logger: Logger
  ) {
    this.openRouterService = new OpenRouterService(logger);
    this.telegramService = new TelegramService(logger);
  }

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
    
    // Check if this zap is already running to prevent concurrent executions
    const lockId = `zap_execution_${zapId}`;
    const executionLock = await this.acquireExecutionLock(lockId);
    if (!executionLock) {
      this.logger.info(`Zap ${zapId} is already executing, skipping`);
      return {
        zapId,
        success: true,
        error: 'Zap is already executing - skipped to prevent duplicate processing',
        emailsProcessed: 0,
        notionPagesCreated: 0,
        executionTime: Date.now() - startTime
      };
    }

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
      let processedEmails = 0;

      for (const email of emails) {
        try {
          // Check if this email has already been processed by this zap
          const alreadyProcessed = await this.isEmailAlreadyProcessed(email.id, zapId);
          if (alreadyProcessed) {
            this.logger.info(`Email ${email.id} already processed by zap ${zapId}, skipping`);
            continue;
          }

          // Process email through the action pipeline
          let currentEmail: EmailMessage | AIProcessedEmail = email;
          
          this.logger.info(`=== EMAIL PIPELINE START ===`);
          this.logger.info(`Initial email object keys:`, Object.keys(currentEmail));
          
          for (const actionStep of actionSteps) {
            this.logger.info(`Processing step: ${actionStep.service_name}.${actionStep.event_type}`);
            this.logger.info(`Input email has aiProcessedContent:`, 'aiProcessedContent' in currentEmail);
            
            currentEmail = await this.executeActionStep(actionStep, zap.user_id, currentEmail);
            
            this.logger.info(`After step ${actionStep.service_name}: email has aiProcessedContent:`, 'aiProcessedContent' in currentEmail);
            this.logger.info(`Current email object keys:`, Object.keys(currentEmail));
            
            if (actionStep.service_name === 'notion') {
              notionPagesCreated++;
            }
          }
          
          this.logger.info(`=== EMAIL PIPELINE END ===`);

          // Mark email as processed
          await this.markEmailAsProcessed(email.id, zapId, zap.user_id, email.subject, email.sender);
          processedEmails++;
          
        } catch (error) {
          this.logger.error(`Error executing action steps for email ${email.id}:`, error);
          // Continue processing other emails even if one fails
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
    } finally {
      // Always release the execution lock
      await this.releaseExecutionLock(lockId);
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

  private async executeActionStep(step: ZapStep, userId: string, email: EmailMessage | AIProcessedEmail): Promise<EmailMessage | AIProcessedEmail> {
    const { service_name, event_type, configuration } = step;
    
    this.logger.info(`Executing action step:`, {
      service_name,
      event_type,
      configuration,
      configType: typeof configuration
    });
    
    // Handle AI processing step
    if (service_name === 'openrouter' && event_type === 'process_with_ai') {
      const config: OpenRouterConfig = {
        model: configuration.model,
        prompt: configuration.prompt,
        maxTokens: configuration.max_tokens,
        temperature: configuration.temperature
      };
      
      this.logger.info(`OpenRouter config:`, config);
      
      if (!config.model || !config.prompt) {
        throw new Error(`Model and prompt are required for AI processing: ${JSON.stringify(configuration)}`);
      }
      
      const processedEmail = await this.openRouterService.processEmailWithAI(email as EmailMessage, config);
      return processedEmail;
    }
    
    // Handle Notion page creation
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
      return email; // Return the email unchanged for potential next steps
    }
    
    // Handle Gmail send actions
    if (service_name === 'gmail' && (event_type === 'send_email' || event_type === 'send_reply')) {
      this.logger.info(`Executing Gmail ${event_type} action`);
      
      const gmailResult = await this.gmailService.handleSendAction(userId, email, event_type, configuration);
      
      if (!gmailResult.success) {
        throw new Error(`Gmail ${event_type} failed: ${gmailResult.error}`);
      }
      
      this.logger.info(`Gmail ${event_type} successful:`, {
        messageId: gmailResult.messageId,
        threadId: gmailResult.threadId
      });
      
      return email; // Return the email unchanged for potential next steps
    }
    
    // Handle Telegram message sending
    if (service_name === 'telegram' && event_type === 'send_message') {
      const config: TelegramConfig = {
        messageTemplate: configuration.message_template,
        parseMode: configuration.parse_mode,
        disableWebPagePreview: configuration.disable_web_page_preview,
        disableNotification: configuration.disable_notification,
        chatId: configuration.chat_id
      };
      
      this.logger.info('Telegram config:', config);
      
      // Validate Telegram configuration
      const validation = this.telegramService.validateConfig(configuration);
      if (!validation.valid) {
        throw new Error(`Invalid Telegram configuration: ${validation.errors.join(', ')}`);
      }
      
      // Send Telegram message
      const telegramResult = await this.telegramService.sendMessageFromZap(userId, email, config);
      
      this.logger.info('Telegram message result:', {
        success: telegramResult.success,
        messagesSent: telegramResult.messagesSent,
        errorCount: telegramResult.errors.length
      });
      
      // Log errors if any
      if (telegramResult.errors.length > 0) {
        this.logger.error('Telegram errors:', telegramResult.errors);
      }
      
      // Don't throw error for Telegram failures to allow other steps to continue
      // The result is already logged for debugging
      
      return email; // Return the email unchanged for potential next steps
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

  private async isEmailAlreadyProcessed(emailId: string, zapId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('processed_emails')
        .select('id, processed_at')
        .eq('email_id', emailId)
        .eq('zap_id', zapId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        this.logger.error('Error checking if email is processed:', error);
        return false; // On error, process the email to be safe
      }

      if (data) {
        this.logger.info(`Email ${emailId} already processed on ${data.processed_at}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error checking if email is processed:', error);
      return false; // On error, process the email to be safe
    }
  }

  private async markEmailAsProcessed(
    emailId: string, 
    zapId: string, 
    userId: string, 
    emailSubject: string, 
    emailSender: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('processed_emails')
        .insert({
          email_id: emailId,
          zap_id: zapId,
          user_id: userId,
          email_subject: emailSubject,
          email_sender: emailSender
        });

      if (error) {
        this.logger.error('Error marking email as processed:', error);
        // Don't throw error here, as we still want the zap to succeed
      } else {
        this.logger.info(`Marked email ${emailId} as processed for zap ${zapId}`);
      }
    } catch (error) {
      this.logger.error('Error marking email as processed:', error);
      // Don't throw error here, as we still want the zap to succeed
    }
  }

  // Simple in-memory execution lock using a Set to track running zaps
  private static runningZaps: Set<string> = new Set();

  private async acquireExecutionLock(lockId: string): Promise<boolean> {
    if (ZapExecutor.runningZaps.has(lockId)) {
      return false; // Lock already acquired
    }
    
    ZapExecutor.runningZaps.add(lockId);
    this.logger.info(`Acquired execution lock: ${lockId}`);
    return true;
  }

  private async releaseExecutionLock(lockId: string): Promise<void> {
    ZapExecutor.runningZaps.delete(lockId);
    this.logger.info(`Released execution lock: ${lockId}`);
  }
}

