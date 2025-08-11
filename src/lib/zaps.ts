import { supabase } from './supabase';

export interface Zap {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  total_runs: number;
  steps?: ZapStep[];
}

export interface ZapStep {
  id: string;
  zap_id: string;
  step_order: number;
  step_type: 'trigger' | 'action';
  service_name: string;
  event_type: string;
  configuration: Record<string, any>;
  created_at: string;
}

export interface ZapConfiguration {
  name: string;
  description?: string;
  steps: {
    step_type: 'trigger' | 'action';
    service_name: string;
    event_type: string;
    configuration: Record<string, any>;
  }[];
}

// Create a new zap
export const createZap = async (config: ZapConfiguration): Promise<{ data: Zap | null; error: string | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First create the zap
    const { data: zapData, error: zapError } = await supabase
      .from('zaps')
      .insert({
        user_id: user.id,
        name: config.name,
        description: config.description || '',
        is_active: false
      })
      .select()
      .single();

    if (zapError) throw zapError;

    // Then create the steps
    const stepsToInsert = config.steps.map((step, index) => ({
      zap_id: zapData.id,
      step_order: index,
      step_type: step.step_type,
      service_name: step.service_name,
      event_type: step.event_type,
      configuration: step.configuration
    }));

    const { data: stepsData, error: stepsError } = await supabase
      .from('zap_steps')
      .insert(stepsToInsert)
      .select();

    if (stepsError) throw stepsError;

    return {
      data: { ...zapData, steps: stepsData },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create zap'
    };
  }
};

// Get all zaps for a user
export const getUserZaps = async (): Promise<{ data: Zap[] | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('zaps')
      .select(`
        *,
        steps:zap_steps(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch zaps'
    };
  }
};

// Get a specific zap with its steps
export const getZap = async (zapId: string): Promise<{ data: Zap | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('zaps')
      .select(`
        *,
        steps:zap_steps(*)
      `)
      .eq('id', zapId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch zap'
    };
  }
};

// Update zap status (activate/deactivate)
export const updateZapStatus = async (zapId: string, isActive: boolean): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('zaps')
      .update({ is_active: isActive })
      .eq('id', zapId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update zap status'
    };
  }
};

// Delete a zap
export const deleteZap = async (zapId: string): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('zaps')
      .delete()
      .eq('id', zapId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete zap'
    };
  }
};

// Service configurations for different integrations
export const serviceConfigs = {
  gmail: {
    name: 'Gmail',
    triggers: [
      {
        id: 'new_email',
        name: 'New Email',
        description: 'Triggers when a new email is received',
        fields: [
          {
            key: 'keywords',
            label: 'Keywords/Phrases',
            type: 'text',
            placeholder: 'Enter keywords separated by commas',
            required: true,
            description: 'Email must contain at least one of these keywords'
          },
          {
            key: 'from_email',
            label: 'From Email (optional)',
            type: 'email',
            placeholder: 'specific@email.com',
            required: false,
            description: 'Only trigger for emails from this sender'
          }
        ]
      }
    ],
    actions: []
  },
  openrouter: {
    name: 'AI Processing',
    triggers: [],
    actions: [
      {
        id: 'process_with_ai',
        name: 'Process with AI',
        description: 'Process email content using AI models',
        fields: [
          {
            key: 'model',
            label: 'AI Model',
            type: 'select',
            placeholder: 'Select AI model',
            required: true,
            description: 'Choose the AI model to process your email',
            options: [
              { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (Recommended)' },
              { value: 'meta-llama/llama-3.2-1b-instruct:free', label: 'Llama 3.2 1B (Fast)' },
              { value: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi 3 Mini' },
              { value: 'microsoft/phi-3-medium-128k-instruct:free', label: 'Phi 3 Medium' },
              { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B' },
              { value: 'huggingface/zephyr-7b-beta:free', label: 'Zephyr 7B' },
              { value: 'openchat/openchat-7b:free', label: 'OpenChat 7B' },
              { value: 'google/gemma-7b-it:free', label: 'Gemma 7B' },
              { value: 'qwen/qwen-2-7b-instruct:free', label: 'Qwen 2 7B' },
              { value: 'gryphe/mythomist-7b:free', label: 'Mythomist 7B' }
            ]
          },
          {
            key: 'prompt',
            label: 'AI Prompt',
            type: 'textarea',
            placeholder: 'Summarize this email in bullet points:\n\n{{body}}',
            required: true,
            description: 'Instructions for the AI. Use {{subject}}, {{sender}}, {{body}}, {{date}} for dynamic values'
          },
          {
            key: 'max_tokens',
            label: 'Max Tokens (optional)',
            type: 'number',
            placeholder: '1000',
            required: false,
            description: 'Maximum number of tokens in the AI response (default: 1000)'
          },
          {
            key: 'temperature',
            label: 'Temperature (optional)',
            type: 'number',
            placeholder: '0.7',
            required: false,
            description: 'Controls randomness: 0.0 = focused, 1.0 = creative (default: 0.7)'
          }
        ]
      }
    ]
  },
  notion: {
    name: 'Notion',
    triggers: [],
    actions: [
      {
        id: 'create_page',
        name: 'Create Page',
        description: 'Creates a new page in Notion',
        fields: [
          {
            key: 'database_id',
            label: 'Database ID',
            type: 'text',
            placeholder: 'Enter Notion database ID',
            required: true,
            description: 'The ID of the Notion database where the page will be created'
          },
          {
            key: 'title_template',
            label: 'Page Title Template',
            type: 'text',
            placeholder: 'Email from {{sender}}: {{subject}}',
            required: true,
            description: 'Template for the page title. Use {{field}} for dynamic values'
          },
          {
            key: 'content_template',
            label: 'Page Content Template',
            type: 'textarea',
            placeholder: 'Original: {{body}}\n\nAI Summary: {{ai_content}}',
            required: false,
            description: 'Template for the page content. Use {{field}} for dynamic values. Available: {{ai_content}} if AI processed'
          }
        ]
      }
    ]
  },
  telegram: {
    name: 'Telegram',
    triggers: [],
    actions: [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to your connected Telegram chat',
        fields: [
          {
            key: 'message_template',
            label: 'Message Template',
            type: 'textarea',
            placeholder: '📧 New Email Alert\n\n📤 From: {{sender}}\n📝 Subject: {{subject}}\n🕒 Time: {{timestamp}}\n\n{{ai_content}}',
            required: true,
            description: 'Message template with dynamic variables. Use HTML formatting: <b>bold</b>, <i>italic</i>, <code>code</code>. Available: {{sender}}, {{subject}}, {{timestamp}}, {{body}}, {{ai_content}}'
          },
          {
            key: 'parse_mode',
            label: 'Message Format',
            type: 'select',
            placeholder: 'Select message format',
            required: false,
            description: 'How to format the message text',
            options: [
              { value: 'HTML', label: 'HTML (Recommended)' },
              { value: 'Markdown', label: 'Markdown' },
              { value: 'MarkdownV2', label: 'Markdown V2' }
            ]
          },
          {
            key: 'disable_web_page_preview',
            label: 'Disable Link Previews',
            type: 'select',
            placeholder: 'Disable web page previews',
            required: false,
            description: 'Whether to show previews for links in the message',
            options: [
              { value: 'true', label: 'Yes (Recommended)' },
              { value: 'false', label: 'No' }
            ]
          },
          {
            key: 'disable_notification',
            label: 'Silent Notification',
            type: 'select',
            placeholder: 'Send silently',
            required: false,
            description: 'Send the message silently without notification sound',
            options: [
              { value: 'false', label: 'Normal notification' },
              { value: 'true', label: 'Silent (no sound)' }
            ]
          },
          {
            key: 'chat_id',
            label: 'Specific Chat ID (Optional)',
            type: 'text',
            placeholder: 'Leave empty to send to all connected chats',
            required: false,
            description: 'Send to a specific chat ID. Leave empty to send to all your connected Telegram chats'
          }
        ]
      }
    ]
  }
};

// Get available triggers/actions for a service
export const getServiceConfig = (serviceName: string) => {
  return serviceConfigs[serviceName as keyof typeof serviceConfigs] || null;
};