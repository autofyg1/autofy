import { supabase } from "../lib/supabase.ts";
export class NotionService {
  maxRetries = 3;
  retryDelay = 1000;
  maxParagraphLength = 2000;
  async createPageFromEmail(userId, emailData, config) {
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
  async createPage(userId, emailData) {
    const integration = await this.retrieveIntegration(userId, 'notion');
    if (!integration) {
      throw new Error('Notion integration not found for user');
    }
    // Get database_id from integration or use a default from config
    const databaseId = integration.credentials.database_id || '';
    if (!databaseId) {
      throw new Error('Notion database ID not configured. Please add database_id to your Notion integration.');
    }
    const config = {
      databaseId,
      titleTemplate: 'Email from {{sender}}: {{subject}}',
      contentTemplate: '{{body}}'
    };
    const emailMessage = {
      id: '',
      subject: emailData.subject,
      sender: emailData.sender,
      body: emailData.body,
      timestamp: new Date(),
      threadId: ''
    };
    return this.createPageFromEmail(userId, emailMessage, config);
  }
  async retrieveIntegration(userId, serviceName) {
    const { data, error } = await supabase.from('integrations').select('*').eq('user_id', userId).eq('service_name', serviceName).single();
    if (error) {
      console.error('Error retrieving integration:', error);
      return null;
    }
    return data;
  }
  // Fallback method to use internal integration token
  async getNotionToken(userId) {
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
  async testDatabaseAccess(userId, databaseId) {
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
  // New method to chunk content into multiple paragraph blocks
  createContentBlocks(content) {
    if (!content || content.length === 0) {
      return [];
    }
    // If content is within limit, create single block
    if (content.length <= this.maxParagraphLength) {
      return [
        {
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
        }
      ];
    }
    // Split content into chunks
    const chunks = this.chunkContent(content, this.maxParagraphLength);
    console.log(`Content split into ${chunks.length} chunks due to length (${content.length} chars)`);
    // Create paragraph blocks for each chunk
    return chunks.map((chunk, index)=>({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: chunk
              }
            }
          ]
        }
      }));
  }
  // Smart content chunking that tries to preserve readability
  chunkContent(content, maxLength) {
    const chunks = [];
    let remaining = content;
    while(remaining.length > 0){
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      // Find the best place to split within the maxLength
      let splitIndex = maxLength;
      const substring = remaining.substring(0, maxLength);
      // Try to split at paragraph breaks first
      const paragraphBreak = substring.lastIndexOf('\n\n');
      if (paragraphBreak > maxLength * 0.5) {
        splitIndex = paragraphBreak + 2; // Include the line breaks
      } else {
        // Try to split at sentence endings
        const sentenceEnd = Math.max(substring.lastIndexOf('. '), substring.lastIndexOf('! '), substring.lastIndexOf('? '));
        if (sentenceEnd > maxLength * 0.7) {
          splitIndex = sentenceEnd + 2; // Include the punctuation and space
        } else {
          // Try to split at word boundaries
          const lastSpace = substring.lastIndexOf(' ');
          if (lastSpace > maxLength * 0.8) {
            splitIndex = lastSpace + 1; // Include the space
          }
        // Otherwise, use the maxLength (hard split)
        }
      }
      chunks.push(remaining.substring(0, splitIndex).trim());
      remaining = remaining.substring(splitIndex).trim();
    }
    return chunks.filter((chunk)=>chunk.length > 0);
  }
  async createPageFromEmailWithToken(accessToken, emailData, config, parentType) {
    const { databaseId, pageId, titleTemplate, contentTemplate, properties } = config;
    const title = this.applyTemplate(titleTemplate, emailData);
    const content = contentTemplate ? this.applyTemplate(contentTemplate, emailData) : '';
    const parentId = databaseId || pageId;
    const formattedParentId = this.formatDatabaseId(parentId);
    // Add debugging logs
    console.log('=== NOTION DEBUG ===');
    console.log('Parent type:', parentType);
    console.log('Original parent ID:', parentId);
    console.log('Formatted parent ID:', formattedParentId);
    console.log('Access token present:', !!accessToken);
    console.log('Title:', title);
    console.log('Content length:', content.length);
    // Create content blocks (handles chunking automatically)
    const contentBlocks = this.createContentBlocks(content);
    console.log(`Created ${contentBlocks.length} content blocks`);
    return this.retryApiCall(async ()=>{
      let requestBody;
      if (parentType === 'database') {
        // Creating a page in a database
        requestBody = {
          parent: {
            database_id: formattedParentId
          },
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
          children: contentBlocks
        };
      } else {
        // Creating a child page under a parent page
        requestBody = {
          parent: {
            page_id: formattedParentId
          },
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
          children: contentBlocks
        };
      }
      console.log('Request body children count:', requestBody.children.length);
      console.log('First block content length:', requestBody.children[0]?.paragraph?.rich_text[0]?.text?.content?.length || 0);
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
  async validateAndDetectParentType(accessToken, parentId) {
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
  async validateDatabaseAccess(accessToken, databaseId) {
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
  applyTemplate(template, data) {
    console.log('=== TEMPLATE DEBUG ===');
    console.log('Original template:', template);
    console.log('Data object keys:', Object.keys(data));
    console.log('Data has aiProcessedContent:', 'aiProcessedContent' in data);
    console.log('Data.aiProcessedContent value:', data.aiProcessedContent);
    
    // Check if this is an AI-processed email and if template should use AI content
    const hasAIContent = 'aiProcessedContent' in data && data.aiProcessedContent;
    const templateUsesAIContent = template.includes('{{ai_content}}');
    
    // If we have AI content and template uses {{body}}, but not {{ai_content}},
    // we should prioritize AI content over original body
    let bodyContent = data.body || 'No Content';
    if (hasAIContent && !templateUsesAIContent && template.includes('{{body}}')) {
      console.log('Template uses {{body}} but AI content available - using AI content instead');
      bodyContent = String(data.aiProcessedContent).trim();
    }
    
    let result = template.replace(/\{\{subject\}\}/g, data.subject || 'No Subject')
                       .replace(/\{\{sender\}\}/g, data.sender || 'Unknown Sender')
                       .replace(/\{\{body\}\}/g, bodyContent)
                       .replace(/\{\{timestamp\}\}/g, data.timestamp ? data.timestamp.toISOString() : new Date().toISOString());
    
    // Handle AI processed email additional placeholders
    if (hasAIContent) {
      console.log('Replacing AI placeholders with:', {
        ai_content: data.aiProcessedContent,
        ai_model: data.aiModel,
        ai_processed_at: data.aiProcessedAt
      });
      
      // Use a more robust replacement that handles multiline content
      result = result.replace(/\{\{ai_content\}\}/g, String(data.aiProcessedContent).trim())
                   .replace(/\{\{ai_model\}\}/g, data.aiModel || 'Unknown Model')
                   .replace(/\{\{ai_processed_at\}\}/g, data.aiProcessedAt || new Date().toISOString());
    } else {
      console.log('No AI content found, replacing AI placeholders with defaults');
      // Replace AI placeholders with default text if no AI processing occurred
      result = result.replace(/\{\{ai_content\}\}/g, '[No AI processing performed]')
                   .replace(/\{\{ai_model\}\}/g, '[No AI model used]')
                   .replace(/\{\{ai_processed_at\}\}/g, '[Not processed]');
    }
    
    console.log('Final template result length:', result.length);
    console.log('Final template result preview:', result.substring(0, 200));
    console.log('=== END TEMPLATE DEBUG ===');
    
    return result;
  }
  async retryApiCall(apiCall) {
    let lastError;
    for(let attempt = 1; attempt <= this.maxRetries; attempt++){
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        const isRetryable = error.message.includes('429') || error.message.includes('5') || error.message.includes('timeout');
        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }
        console.warn(`API call failed (attempt ${attempt}/${this.maxRetries}), retrying in ${this.retryDelay}ms`, error.message);
        await this.delay(this.retryDelay * attempt);
      }
    }
    throw lastError;
  }
  delay(ms) {
    return new Promise((resolve)=>setTimeout(resolve, ms));
  }
  formatDatabaseId(databaseId) {
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
