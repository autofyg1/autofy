import { EmailMessage } from './gmail.ts';
import { Logger } from '../utils/logger.ts';

export interface OpenRouterConfig {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProcessedEmail extends EmailMessage {
  aiProcessedContent?: string;
  aiModel?: string;
  aiPrompt?: string;
  aiProcessedAt?: string;
}

export class OpenRouterService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(private logger: Logger) {
    this.apiKey = Deno.env.get('OPENROUTER_API_KEY') || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  async processEmailWithAI(email: EmailMessage, config: OpenRouterConfig): Promise<AIProcessedEmail> {
    try {
      this.logger.info(`=== AI PROCESSING START ===`);
      this.logger.info(`Processing email with AI model: ${config.model}`);
      this.logger.info(`Email ID: ${email.id}`);
      this.logger.info(`Email subject: ${email.subject}`);
      this.logger.info(`Prompt: ${config.prompt}`);

      // Prepare the email content for AI processing
      const emailContent = this.prepareEmailContent(email);
      this.logger.info(`Prepared email content:`, emailContent);
      
      // Create the full prompt
      const fullPrompt = this.createPrompt(config.prompt, emailContent);
      this.logger.info(`Full prompt length: ${fullPrompt.length} characters`);

      // Make request to OpenRouter
      const response = await this.makeOpenRouterRequest(config.model, fullPrompt, config);
      this.logger.info(`OpenRouter response:`, response);

      const aiProcessedContent = response.choices[0]?.message?.content || '';
      this.logger.info(`AI processed content length: ${aiProcessedContent.length} characters`);
      this.logger.info(`AI processed content preview: ${aiProcessedContent.substring(0, 200)}...`);

      // Validate that we actually got content from the AI
      if (!aiProcessedContent || aiProcessedContent.trim().length === 0) {
        this.logger.error('AI processing returned empty or null content');
        throw new Error('AI processing failed: No content returned from the AI model');
      }
      
      const processedEmail = {
        ...email,
        aiProcessedContent: aiProcessedContent.trim(),
        aiModel: config.model,
        aiPrompt: config.prompt,
        aiProcessedAt: new Date().toISOString()
      };
      
      this.logger.info(`=== AI PROCESSING COMPLETE ===`);
      this.logger.info(`Processed email object keys:`, Object.keys(processedEmail));
      this.logger.info(`aiProcessedContent exists:`, !!processedEmail.aiProcessedContent);
      
      return processedEmail;

    } catch (error) {
      this.logger.error(`=== AI PROCESSING ERROR ===`);
      this.logger.error(`Error processing email with AI:`, error);
      throw error;
    }
  }

  private prepareEmailContent(email: EmailMessage): any {
    return {
      subject: email.subject || 'No Subject',
      sender: email.sender || 'Unknown Sender',
      body: email.body || 'No Content',
      date: email.timestamp ? email.timestamp.toISOString() : new Date().toISOString()
    };
  }

  private createPrompt(userPrompt: string, emailData: any): string {
    // Replace placeholders in the user prompt with actual email data
    let processedPrompt = userPrompt
      .replace(/\{\{subject\}\}/g, emailData.subject)
      .replace(/\{\{sender\}\}/g, emailData.sender)
      .replace(/\{\{body\}\}/g, emailData.body)
      .replace(/\{\{date\}\}/g, emailData.date);

    // Create a clear, structured prompt for the AI
    return `You are an AI assistant helping to process emails. Please follow these instructions carefully:

${processedPrompt}

=== EMAIL TO PROCESS ===
Subject: ${emailData.subject}
From: ${emailData.sender}
Date: ${emailData.date}
Content: ${emailData.body}
=== END EMAIL ===

Please provide a clear, complete response based on the instructions above.`;
  }

  private async makeOpenRouterRequest(model: string, prompt: string, config: OpenRouterConfig): Promise<any> {
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.7
    };

    this.logger.info(`Making OpenRouter request with model: ${model}`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://zappy.app', // Optional: for analytics
        'X-Title': 'Zappy Email Automation' // Optional: for analytics
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`OpenRouter API error:`, { status: response.status, error });
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    this.logger.info(`OpenRouter response received successfully`);
    
    return result;
  }

  // Get available free models from OpenRouter (corrected list)
  async getAvailableModels(): Promise<string[]> {
    try {
      // Corrected list of available free models on OpenRouter
      return [
        'meta-llama/llama-3.2-3b-instruct:free',
        'meta-llama/llama-3.2-1b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free',
        'microsoft/phi-3-medium-128k-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'huggingface/zephyr-7b-beta:free',
        'openchat/openchat-7b:free'
      ];
    } catch (error) {
      this.logger.error('Error fetching available models:', error);
      // Return a default list of known free models
      return [
        'meta-llama/llama-3.2-3b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free',
        'mistralai/mistral-7b-instruct:free'
      ];
    }
  }

  // Get model display names (removing the :free suffix and organization prefixes)
  static getModelDisplayName(modelId: string): string {
    return modelId
      .replace(':free', '')
      .split('/')
      .pop()
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()) || modelId;
  }
}
