/**
 * Smart Zap Templates Generator
 * Provides intelligent zap templates based on user's connected integrations
 */

export interface UserIntegration {
  service_name: string;
  credentials: any;
}

export interface TelegramChat {
  chat_id: string;
  chat_type: string;
  username?: string;
  first_name?: string;
  title?: string;
}

export interface SmartZapTemplate {
  name: string;
  description: string;
  category: string;
  requiredServices: string[];
  steps: any[];
}

export class SmartZapTemplateGenerator {
  
  static generateTemplatesForUser(
    integrations: UserIntegration[], 
    telegramChats: TelegramChat[] = []
  ): SmartZapTemplate[] {
    const templates: SmartZapTemplate[] = [];
    const connectedServices = integrations.map(i => i.service_name);
    
    // Gmail + Telegram Templates
    if (connectedServices.includes('gmail') && connectedServices.includes('telegram')) {
      templates.push({
        name: "Important Email Alerts",
        description: "Get Telegram notifications for urgent emails",
        category: "notifications",
        requiredServices: ['gmail', 'telegram'],
        steps: [
          {
            step_type: "trigger",
            service_name: "gmail",
            event_type: "new_email",
            configuration: {
              keywords: "urgent, important, deadline, critical",
              client_id: "{{integration.gmail}}",
              client_secret: "{{integration.gmail}}",
              refresh_token: "{{integration.gmail}}"
            }
          },
          {
            step_type: "action",
            service_name: "telegram",
            event_type: "send_message",
            configuration: {
              message_template: "🚨 Important Email Alert\\n\\n📧 From: {{sender}}\\n📌 Subject: {{subject}}\\n⏰ Received: {{timestamp}}",
              bot_token: "{{integration.telegram}}",
              parse_mode: "HTML",
              disable_web_page_preview: "true"
            }
          }
        ]
      });
    }

    // Gmail + Notion Templates
    if (connectedServices.includes('gmail') && connectedServices.includes('notion')) {
      templates.push({
        name: "Email Backup to Notion",
        description: "Save important emails to Notion database",
        category: "backup",
        requiredServices: ['gmail', 'notion'],
        steps: [
          {
            step_type: "trigger",
            service_name: "gmail",
            event_type: "new_email",
            configuration: {
              keywords: "contract, invoice, receipt, agreement",
              client_id: "{{integration.gmail}}",
              client_secret: "{{integration.gmail}}",
              refresh_token: "{{integration.gmail}}"
            }
          },
          {
            step_type: "action",
            service_name: "notion",
            event_type: "create_page",
            configuration: {
              database_id: "YOUR_DATABASE_ID",
              title_template: "📧 {{subject}} - {{sender}}",
              content_template: "**From:** {{sender}}\\n**Subject:** {{subject}}\\n**Date:** {{timestamp}}\\n\\n**Content:**\\n{{body}}",
              api_key: "{{integration.notion}}"
            }
          }
        ]
      });
    }

    // Gmail + OpenRouter + Telegram (AI Processing)
    if (connectedServices.includes('gmail') && 
        connectedServices.includes('openrouter') && 
        connectedServices.includes('telegram')) {
      templates.push({
        name: "AI Email Summarizer",
        description: "Process emails with AI and send summaries to Telegram",
        category: "ai_processing",
        requiredServices: ['gmail', 'openrouter', 'telegram'],
        steps: [
          {
            step_type: "trigger",
            service_name: "gmail",
            event_type: "new_email",
            configuration: {
              keywords: "meeting, report, update, summary",
              client_id: "{{integration.gmail}}",
              client_secret: "{{integration.gmail}}",
              refresh_token: "{{integration.gmail}}"
            }
          },
          {
            step_type: "action",
            service_name: "openrouter",
            event_type: "process_with_ai",
            configuration: {
              model: "meta-llama/llama-3.2-3b-instruct:free",
              prompt: "Summarize this email in 2-3 bullet points focusing on key information and action items:\\n\\nFrom: {{sender}}\\nSubject: {{subject}}\\nContent: {{body}}",
              max_tokens: 300,
              temperature: 0.3,
              api_key: "{{integration.openrouter}}"
            }
          },
          {
            step_type: "action",
            service_name: "telegram",
            event_type: "send_message",
            configuration: {
              message_template: "🤖 AI Email Summary\\n\\n📧 From: {{sender}}\\n📌 Subject: {{subject}}\\n\\n📝 Summary:\\n{{ai_content}}",
              bot_token: "{{integration.telegram}}",
              parse_mode: "HTML",
              disable_web_page_preview: "true"
            }
          }
        ]
      });
    }

    // Gmail Auto-Reply
    if (connectedServices.includes('gmail') && connectedServices.includes('openrouter')) {
      templates.push({
        name: "AI Auto-Reply Assistant",
        description: "Generate and send AI-powered email replies",
        category: "automation",
        requiredServices: ['gmail', 'openrouter'],
        steps: [
          {
            step_type: "trigger",
            service_name: "gmail",
            event_type: "new_email",
            configuration: {
              keywords: "support, help, question, inquiry",
              client_id: "{{integration.gmail}}",
              client_secret: "{{integration.gmail}}",
              refresh_token: "{{integration.gmail}}"
            }
          },
          {
            step_type: "action",
            service_name: "openrouter",
            event_type: "process_with_ai",
            configuration: {
              model: "meta-llama/llama-3.2-3b-instruct:free",
              prompt: "Generate a professional and helpful email reply to this inquiry. Be polite, acknowledge their request, and provide useful information or next steps:\\n\\nOriginal Email:\\nFrom: {{sender}}\\nSubject: {{subject}}\\nContent: {{body}}",
              max_tokens: 500,
              temperature: 0.7,
              api_key: "{{integration.openrouter}}"
            }
          },
          {
            step_type: "action",
            service_name: "gmail",
            event_type: "send_reply",
            configuration: {
              body_template: "{{ai_content}}\\n\\nBest regards,\\nAI Assistant",
              is_html: "false",
              client_id: "{{integration.gmail}}",
              client_secret: "{{integration.gmail}}",
              refresh_token: "{{integration.gmail}}"
            }
          }
        ]
      });
    }

    return templates;
  }

  static getTemplatesByCategory(templates: SmartZapTemplate[]): Record<string, SmartZapTemplate[]> {
    return templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, SmartZapTemplate[]>);
  }

  static findRelevantTemplates(
    userQuery: string, 
    templates: SmartZapTemplate[]
  ): SmartZapTemplate[] {
    const queryLower = userQuery.toLowerCase();
    
    return templates.filter(template => {
      // Check if query mentions the services required by this template
      const servicesMatched = template.requiredServices.every(service => 
        queryLower.includes(service)
      );
      
      // Check if query contains keywords related to the template
      const keywordMatches = [
        template.name.toLowerCase(),
        template.description.toLowerCase(),
        template.category
      ].some(text => {
        const keywords = text.split(/\s+/);
        return keywords.some(keyword => queryLower.includes(keyword));
      });
      
      return servicesMatched || keywordMatches;
    }).slice(0, 3); // Return top 3 matches
  }

  static customizeTemplateForUser(
    template: SmartZapTemplate,
    userPreferences: {
      telegramChatId?: string;
      notionDatabaseId?: string;
      emailKeywords?: string;
      aiModel?: string;
    } = {}
  ): SmartZapTemplate {
    const customized = JSON.parse(JSON.stringify(template)); // Deep clone
    
    customized.steps.forEach(step => {
      if (step.service_name === 'telegram' && userPreferences.telegramChatId) {
        step.configuration.chat_id = userPreferences.telegramChatId;
      }
      
      if (step.service_name === 'notion' && userPreferences.notionDatabaseId) {
        step.configuration.database_id = userPreferences.notionDatabaseId;
      }
      
      if (step.service_name === 'gmail' && step.event_type === 'new_email' && userPreferences.emailKeywords) {
        step.configuration.keywords = userPreferences.emailKeywords;
      }
      
      if (step.service_name === 'openrouter' && userPreferences.aiModel) {
        step.configuration.model = userPreferences.aiModel;
      }
    });
    
    return customized;
  }
}

export default SmartZapTemplateGenerator;
