import { Logger } from '../utils/logger.ts';
import { EmailMessage, AIProcessedEmail } from './openrouter.ts';

export interface TelegramConfig {
  messageTemplate: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  chatId?: string; // Optional specific chat ID
}

export interface TelegramMessageResult {
  success: boolean;
  messagesSent: number;
  errors: string[];
  chatIds: string[];
}

export class TelegramService {
  private readonly botToken: string;
  private readonly supabaseUrl: string;

  constructor(private logger: Logger) {
    this.botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
    this.supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    
    if (!this.botToken) {
      this.logger.error('TELEGRAM_BOT_TOKEN environment variable is not set');
    }
    
    if (!this.supabaseUrl) {
      this.logger.error('SUPABASE_URL environment variable is not set');
    }
  }

  /**
   * Send Telegram message as part of Zap execution
   */
  async sendMessageFromZap(
    userId: string,
    email: EmailMessage | AIProcessedEmail, 
    config: TelegramConfig
  ): Promise<TelegramMessageResult> {
    this.logger.info('=== TELEGRAM SERVICE START ===');
    this.logger.info('Telegram service configuration:', {
      hasMessageTemplate: !!config.messageTemplate,
      parseMode: config.parseMode,
      disableWebPagePreview: config.disableWebPagePreview,
      disableNotification: config.disableNotification,
      hasSpecificChatId: !!config.chatId,
      userId: userId
    });

    const result: TelegramMessageResult = {
      success: false,
      messagesSent: 0,
      errors: [],
      chatIds: []
    };

    try {
      // Validate required configuration
      if (!config.messageTemplate) {
        const error = 'Message template is required for Telegram action';
        this.logger.error(error);
        result.errors.push(error);
        return result;
      }

      if (!this.botToken) {
        const error = 'Telegram bot token is not configured';
        this.logger.error(error);
        result.errors.push(error);
        return result;
      }

      // Generate message content by replacing template variables
      const messageContent = this.generateMessageContent(email, config.messageTemplate);
      this.logger.info('Generated message content:', {
        contentLength: messageContent.length,
        hasAiContent: messageContent.includes('ai_content'),
        preview: messageContent.substring(0, 200) + (messageContent.length > 200 ? '...' : '')
      });

      // Check if AI content should be skipped
      if (messageContent.includes('SKIP:')) {
        this.logger.info('Skipping Telegram notification due to AI filter');
        result.success = true;
        result.messagesSent = 0;
        return result;
      }

      // Prepare message sending request
      const sendRequest = {
        user_id: userId,
        chat_id: config.chatId,
        message: messageContent,
        parse_mode: config.parseMode || 'HTML',
        disable_web_page_preview: config.disableWebPagePreview !== false,
        disable_notification: config.disableNotification || false
      };

      this.logger.info('Sending message request:', {
        requestStructure: Object.keys(sendRequest),
        hasUserId: !!sendRequest.user_id,
        hasChatId: !!sendRequest.chat_id,
        messageLength: sendRequest.message.length
      });

      // Get chat IDs for this user from database
      const chatIds = await this.getChatIdsForUser(userId, config.chatId);
      
      if (chatIds.length === 0) {
        const error = 'No active Telegram chats found for user';
        this.logger.error(error, { userId, specificChatId: config.chatId });
        result.errors.push(error);
        return result;
      }
      
      this.logger.info(`Sending message to ${chatIds.length} chat(s)`, {
        userId,
        chatIds
      });
      
      // Send messages to all specified chats directly via Telegram API
      const telegramResults = await Promise.all(
        chatIds.map(async (chatId) => {
          const telegramResult = await this.sendTelegramMessage(chatId, messageContent, {
            parse_mode: sendRequest.parse_mode,
            disable_web_page_preview: sendRequest.disable_web_page_preview,
            disable_notification: sendRequest.disable_notification
          });
          
          return {
            chat_id: chatId,
            ...telegramResult
          };
        })
      );
      
      // Count successful and failed sends
      const successful = telegramResults.filter(r => r.success);
      const failed = telegramResults.filter(r => !r.success);
      
      this.logger.info(`Message sending completed`, {
        userId,
        successful_count: successful.length,
        failed_count: failed.length
      });
      
      // Update result
      result.success = failed.length === 0;
      result.messagesSent = successful.length;
      result.chatIds = successful.map(r => r.chat_id);
      
      // Log any failures
      failed.forEach((failedResult) => {
        this.logger.error('Failed to send to chat:', {
          chatId: failedResult.chat_id,
          error: failedResult.error
        });
        result.errors.push(`Chat ${failedResult.chat_id}: ${failedResult.error}`);
      });
      
      if (successful.length > 0) {
        this.logger.info('Telegram messages sent successfully:', {
          messagesSent: result.messagesSent,
          chatIds: result.chatIds
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Exception in Telegram service:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      result.errors.push(errorMessage);
    }

    this.logger.info('=== TELEGRAM SERVICE END ===', {
      success: result.success,
      messagesSent: result.messagesSent,
      errorCount: result.errors.length
    });

    return result;
  }

  /**
   * Generate message content by replacing template variables
   */
  private generateMessageContent(email: EmailMessage | AIProcessedEmail, template: string): string {
    this.logger.info('Template processing started:', {
      template,
      emailKeys: Object.keys(email),
      hasAiProcessedContent: 'aiProcessedContent' in email
    });
    
    let content = template;
    
    // Basic email variables
    const variables: Record<string, string> = {
      'sender': email.sender || 'Unknown',
      'subject': email.subject || 'No Subject', 
      'timestamp': email.timestamp || new Date().toISOString(),
      'body': email.body || '',
      'body_preview': (email.body || '').substring(0, 200) + (email.body && email.body.length > 200 ? '...' : ''),
      'id': email.id || ''
    };

    // AI processed variables if available
    if ('aiProcessedContent' in email && email.aiProcessedContent) {
      variables['ai_content'] = email.aiProcessedContent;
      variables['ai_model'] = email.aiModel || 'AI';
      variables['ai_processed_at'] = email.aiProcessedAt || new Date().toISOString();
    } else {
      variables['ai_content'] = 'No AI processing available';
      variables['ai_model'] = 'None';
      variables['ai_processed_at'] = '';
    }

    this.logger.info('Variables to replace:', variables);

    // Replace all variables in template using simple string replacement
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const beforeReplace = content;
      content = content.split(placeholder).join(value || '');
      
      if (beforeReplace !== content) {
        this.logger.info(`Replaced ${placeholder} with value (length: ${(value || '').length})`);
      }
    });

    // Clean up any remaining unreplaced variables
    const beforeCleanup = content;
    content = content.replace(/\{\{[^}]+\}\}/g, '[Not Available]');
    
    if (beforeCleanup !== content) {
      this.logger.info('Cleaned up unreplaced variables');
    }

    this.logger.info('Template processing complete:', {
      originalLength: template.length,
      finalLength: content.length,
      variablesAvailable: Object.keys(variables).length,
      hasAiContent: 'aiProcessedContent' in email,
      finalContent: content.substring(0, 500) + (content.length > 500 ? '...' : '')
    });

    return content;
  }

  /**
   * Validate Telegram configuration
   */
  validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.message_template) {
      errors.push('message_template is required for Telegram action');
    }

    if (config.parse_mode && !['HTML', 'Markdown', 'MarkdownV2'].includes(config.parse_mode)) {
      errors.push('parse_mode must be HTML, Markdown, or MarkdownV2');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get chat IDs for a user from the database
   */
  private async getChatIdsForUser(userId: string, specificChatId?: string): Promise<string[]> {
    try {
      // Create Supabase client with service role key
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration');
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      if (specificChatId) {
        // Verify user owns this specific chat
        const { data: chat, error: chatError } = await supabase
          .from('telegram_chats')
          .select('chat_id')
          .eq('user_id', userId)
          .eq('chat_id', specificChatId)
          .eq('is_active', true)
          .single();

        if (chatError || !chat) {
          this.logger.error('Specific chat not found or unauthorized', chatError, { 
            userId, 
            chatId: specificChatId 
          });
          return [];
        }
        
        return [specificChatId];
      } else {
        // Get all active chats for this user
        const { data: chats, error: chatsError } = await supabase
          .from('telegram_chats')
          .select('chat_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (chatsError || !chats || chats.length === 0) {
          this.logger.error('No active chats found', chatsError, { userId });
          return [];
        }

        return chats.map(c => c.chat_id);
      }
    } catch (error) {
      this.logger.error('Error fetching chat IDs from database:', {
        error: error.message,
        userId,
        specificChatId
      });
      return [];
    }
  }

  /**
   * Send message directly to Telegram API
   */
  private async sendTelegramMessage(
    chatId: string, 
    text: string, 
    options: {
      parse_mode?: string
      disable_web_page_preview?: boolean
      disable_notification?: boolean
    } = {}
  ): Promise<{ success: boolean; error?: string; message_id?: number }> {
    try {
      this.logger.info('Sending message to Telegram API', { chat_id: chatId });

      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...options
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error('Telegram API error', result, { chat_id: chatId });
        return { 
          success: false, 
          error: result.description || 'Unknown Telegram API error' 
        };
      }

      this.logger.info('Message sent successfully to Telegram', { 
        chat_id: chatId, 
        message_id: result.result?.message_id 
      });

      return { 
        success: true, 
        message_id: result.result?.message_id 
      };
    } catch (error) {
      this.logger.error('Error sending message to Telegram API', error, { chat_id: chatId });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
