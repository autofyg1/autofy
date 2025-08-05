import { Integration, supabase } from "../lib/supabase.ts";
import { EmailMessage } from "./gmail.ts";

export interface NotionPageConfig {
  databaseId?: string
  pageId?: string // For creating child pages under a parent page
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
    const accessToken = await this.getNotionToken(userId);
    
    if (!accessToken) {
      throw new Error('Notion integration not found for user. Please connect your Notion account or configure internal integration token.');
    }

    // Determine if we're working with a database or page
    const parentId = config.databaseId || config.pageId;
    if (!parentId) {
      throw new Error('Either databaseId or pageId must be provided in configuration');
    }

    // Validate access and determine type
    const parentType = await this.validateAndDetectParentType(accessToken, parentId);
    
    return this.createPageFromEmailWithToken(accessToken, emailData, config, parentType);
  }

  // Legacy method for backward compatibility
  async createPage(userId: string, emailData: { subject: string, sender: string, body: string }) {
    const integration = await this.retrieveIntegration(userId, 'notion');
    
    if (!integration) {
      throw new Error('Notion integration not found for user');
    }
    
    // Get database_id from integration or use a default from config
    const databaseId = integration.credentials.database_id || '';
    
    if (!databaseId) {
      throw new Error('Notion database ID not configured. Please add database_id to your Notion integration.');
    }
    
    const config: NotionPageConfig = {
      databaseId,
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

  // Fallback method to use internal integration token
  private async getNotionToken(userId: string): Promise<string | null> {
    // First try to get OAuth integration
    const integration = await this.retrieveIntegration(userId, 'notion');
    
    if (integration?.credentials?.access_token) {
      return integration.credentials.access_token;
    }

    // Fallback to internal integration token from environment
    const internalToken = Deno.env.get('NOTION_INTERNAL_TOKEN');
    if (internalToken) {
      console.log('Using internal integration token as fallback');
      return internalToken;
    }

    return null;
  }

  // Public method for testing database access
  async testDatabaseAccess(userId: string, databaseId: string): Promise<{ success: boolean; databaseName?: string; error?: string }> {
    try {
      const accessToken = await this.getNotionToken(userId);
      
      if (!accessToken) {
        return { 
          success: false, 
          error: 'Notion integration not found. Please connect your Notion account first.' 
        };
      }

      await this.validateDatabaseAccess(accessToken, databaseId);
      
      // Get database info for the response
      const formattedDatabaseId = this.formatDatabaseId(databaseId);
      const response = await fetch(`https://api.notion.com/v1/databases/${formattedDatabaseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (response.ok) {
        const database = await response.json();
        return { 
          success: true, 
          databaseName: database.title?.[0]?.plain_text || 'Untitled'
        };
      }

      return { 
        success: false, 
        error: 'Failed to retrieve database information' 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  private async createPageFromEmailWithToken(
    accessToken: string,
    emailData: EmailMessage, 
    config: NotionPageConfig,
    parentType: 'database' | 'page'
  ): Promise<any> {
    const { databaseId, pageId, titleTemplate, contentTemplate, properties } = config;
    const title = this.applyTemplate(titleTemplate, emailData);
    const content = contentTemplate ? this.applyTemplate(contentTemplate, emailData) : '';
    
    const parentId = databaseId || pageId;
    const formattedParentId = this.formatDatabaseId(parentId!);
    
    // Add debugging logs
    console.log('=== NOTION DEBUG ===');
    console.log('Parent type:', parentType);
    console.log('Original parent ID:', parentId);
    console.log('Formatted parent ID:', formattedParentId);
    console.log('Access token present:', !!accessToken);
    console.log('Title:', title);
    console.log('Content length:', content.length);

    return this.retryApiCall(async () => {
      let requestBody: any;
      
      if (parentType === 'database') {
        // Creating a page in a database
        requestBody = {
          parent: { database_id: formattedParentId },
          properties: {
            Name: {
              title: [
                {
                  type: 'text',
                  text: {
                    content: title
                  }
                }
              ]
            },
            ...properties
          },
          children: content ? [{
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content
                  }
                }
              ]
            }
          }] : []
        };
      } else {
        // Creating a child page under a parent page
        requestBody = {
          parent: { page_id: formattedParentId },
          properties: {
            title: {
              title: [
                {
                  type: 'text',
                  text: {
                    content: title
                  }
                }
              ]
            }
          },
          children: content ? [{
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content
                  }
                }
              ]
            }
          }] : []
        };
      }
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`https://api.notion.com/v1/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('=== NOTION API ERROR ===');
        console.error('Status:', response.status);
        console.error('Response:', error);
        throw new Error(`Error creating Notion page: ${error}`);
      }

      const result = await response.json();
      console.log('=== NOTION SUCCESS ===');
      console.log('Page created:', result.id);
      return result;
    });
  }

  private async validateAndDetectParentType(accessToken: string, parentId: string): Promise<'database' | 'page'> {
    const formattedId = this.formatDatabaseId(parentId);
    
    console.log('=== VALIDATING PARENT ACCESS ===');
    console.log('Parent ID:', formattedId);
    
    // First try as database
    try {
      const dbResponse = await fetch(`https://api.notion.com/v1/databases/${formattedId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (dbResponse.ok) {
        const database = await dbResponse.json();
        console.log('✅ Parent is a database:', database.title?.[0]?.plain_text || 'Untitled');
        return 'database';
      }
    } catch (error) {
      console.log('Not a database, trying as page...');
    }

    // Try as page
    try {
      const pageResponse = await fetch(`https://api.notion.com/v1/pages/${formattedId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (pageResponse.ok) {
        const page = await pageResponse.json();
        console.log('✅ Parent is a page:', page.properties?.title?.title?.[0]?.plain_text || 'Untitled');
        return 'page';
      } else {
        const error = await pageResponse.text();
        throw new Error(`Page validation failed: ${error}`);
      }
    } catch (error) {
      console.error('Parent validation failed:', error);
      throw new Error(`Could not access parent with ID: ${formattedId}. Please ensure:
1. The ID is correct: ${formattedId}
2. The page/database is shared with your Notion integration
3. Your integration has permission to access this resource`);
    }
  }

  private async validateDatabaseAccess(accessToken: string, databaseId: string): Promise<void> {
    const formattedDatabaseId = this.formatDatabaseId(databaseId);
    
    console.log('=== VALIDATING DATABASE ACCESS ===');
    console.log('Database ID:', formattedDatabaseId);
    
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${formattedDatabaseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Database validation failed:', error);
        
        if (response.status === 404) {
          throw new Error(`Database not found or not accessible. Please ensure:
1. The database ID is correct: ${formattedDatabaseId}
2. The database is shared with your Notion integration
3. Your integration has permission to access this database`);
        }
        
        throw new Error(`Database validation failed: ${error}`);
      }

      const database = await response.json();
      console.log('Database validation successful:', database.title?.[0]?.plain_text || 'Untitled');
      
    } catch (error) {
      console.error('Database validation error:', error);
      throw error;
    }
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

  private formatDatabaseId(databaseId: string): string {
    // Remove any existing dashes
    const cleanId = databaseId.replace(/-/g, '');
    
    // If already 32 characters, format with dashes
    if (cleanId.length === 32) {
      return `${cleanId.substring(0, 8)}-${cleanId.substring(8, 12)}-${cleanId.substring(12, 16)}-${cleanId.substring(16, 20)}-${cleanId.substring(20, 32)}`;
    }
    
    // Return as-is if not 32 characters (might already be formatted)
    return databaseId;
  }
}
