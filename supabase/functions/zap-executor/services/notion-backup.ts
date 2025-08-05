import { Integration, supabase } from "../lib/supabase.ts";
import { EmailMessage } from "./gmail.ts";

export interface NotionPageConfig {
  databaseId: string
  titleTemplate: string
  contentTemplate?: string
  properties?: Record<string, any>
}

export class NotionService {
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // 1 second

  async createPageFromEmail(
    userId: string, 
    emailData: EmailMessage, 
    config: NotionPageConfig
  ): Promise<any> {
    const integration = await this.retrieveIntegration(userId, 'notion');

    if (!integration) {
      throw new Error('Notion integration not found for user');
    }

    const accessToken = integration.credentials.access_token;

    try {
      return await this.createNotionPage(accessToken, config, emailData);
    } catch (error) {
      console.error('Failed to create Notion page:', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async createPage(userId: string, emailData: { subject: string, sender: string, body: string }) {
    const config: NotionPageConfig = {
      databaseId: '', // Will be retrieved from integration
      titleTemplate: 'Email from {{sender}}: {{subject}}',
      contentTemplate: '{{body}}'
    };
    
    const emailMessage: EmailMessage = {
      id: '',
      subject: emailData.subject,
      sender: emailData.sender,
      body: emailData.body,
      timestamp: new Date(),
      threadId: ''
    };

    return this.createPageFromEmail(userId, emailMessage, config);
  }

  private async retrieveIntegration(userId: string, serviceName: string): Promise<Integration | null> {
    const { data, error } = await supabase
      .from<Integration>('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('service_name', serviceName)
      .single();

    if (error) {
      console.error('Error retrieving integration:', error);
      return null;
    }

    return data;
  }

  private async createNotionPage(
    accessToken: string, 
    config: NotionPageConfig, 
    emailData: EmailMessage
  ): Promise<any> {
    const { databaseId, titleTemplate, contentTemplate, properties } = config;
    const title = this.applyTemplate(titleTemplate, emailData);
    const content = contentTemplate ? this.applyTemplate(contentTemplate, emailData) : '';

    return this.retryApiCall(async () => {
      const response = await fetch(`https://api.notion.com/v1/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            title: [{ text: { content: title } }],
            ...properties
          },
          children: [{
            object: 'block',
            type: 'paragraph',
            paragraph: {
              text: [{ type: 'text', text: { content } }]
            }
          }]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error creating Notion page: ${error}`);
      }

      return await response.json();
    });
  }

  private applyTemplate(template: string, data: EmailMessage): string {
    return template
      .replace('{{subject}}', data.subject)
      .replace('{{sender}}', data.sender)
      .replace('{{body}}', data.body)
      .replace('{{timestamp}}', data.timestamp.toISOString());
  }

  private async retryApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;

        const isRetryable = error.message.includes('429') ||
                           error.message.includes('5') ||
                           error.message.includes('timeout');

        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }

        console.warn(`API call failed (attempt ${attempt}/${this.maxRetries}), retrying in ${this.retryDelay}ms`, error.message);
        await this.delay(this.retryDelay * attempt);
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

