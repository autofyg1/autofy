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

    // Check if there's AI processing in the workflow
    const hasAiProcessing = config.steps.some(step => 
      step.service_name === 'openrouter' && step.event_type === 'process_with_ai'
    );

    // Process steps to ensure Telegram message templates are generated
    const processedSteps = config.steps.map(step => {
      if (step.service_name === 'telegram' && step.event_type === 'send_message' && step.configuration.message_title) {
        // Generate the message template if not already present
        if (!step.configuration.message_template) {
          step.configuration.message_template = generateTelegramMessageTemplate(
            step.configuration.message_title,
            hasAiProcessing
          );
        }
      }
      return step;
    });

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
    const stepsToInsert = processedSteps.map((step, index) => ({
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

// Update an existing zap
export const updateZap = async (zapId: string, config: ZapConfiguration): Promise<{ data: Zap | null; error: string | null }> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if there's AI processing in the workflow
    const hasAiProcessing = config.steps.some(step => 
      step.service_name === 'openrouter' && step.event_type === 'process_with_ai'
    );

    // Process steps to ensure Telegram message templates are generated
    const processedSteps = config.steps.map(step => {
      if (step.service_name === 'telegram' && step.event_type === 'send_message' && step.configuration.message_title) {
        // Generate the message template if not already present
        if (!step.configuration.message_template) {
          step.configuration.message_template = generateTelegramMessageTemplate(
            step.configuration.message_title,
            hasAiProcessing
          );
        }
      }
      return step;
    });

    // Update the zap details
    const { data: zapData, error: zapError } = await supabase
      .from('zaps')
      .update({
        name: config.name,
        description: config.description || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', zapId)
      .eq('user_id', user.id)  // Ensure user can only update their own zaps
      .select()
      .single();

    if (zapError) throw zapError;

    // Delete existing steps
    const { error: deleteError } = await supabase
      .from('zap_steps')
      .delete()
      .eq('zap_id', zapId);

    if (deleteError) throw deleteError;

    // Insert new steps
    const stepsToInsert = processedSteps.map((step, index) => ({
      zap_id: zapId,
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
      error: error instanceof Error ? error.message : 'Failed to update zap'
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
    actions: [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send a new email to any recipient',
        fields: [
          {
            key: 'to_email',
            label: 'To Email',
            type: 'email',
            placeholder: 'recipient@example.com',
            required: true,
            description: 'Email address of the recipient'
          },
          {
            key: 'subject_template',
            label: 'Subject Template',
            type: 'text',
            placeholder: 'Re: {{subject}} - AI Response',
            required: true,
            description: 'Email subject. Use {{field}} for dynamic values like {{subject}}, {{sender}}'
          },
          {
            key: 'body_template',
            label: 'Email Body Template',
            type: 'textarea',
            placeholder: 'Hi there,\n\n{{ai_content}}\n\nBest regards,\nYour Assistant',
            required: true,
            description: 'Email body content. Use {{field}} for dynamic values. Available: {{ai_content}} if AI processed, {{body}}, {{sender}}, {{subject}}'
          },
          {
            key: 'is_html',
            label: 'HTML Format',
            type: 'select',
            placeholder: 'Send as HTML',
            required: false,
            description: 'Whether to send the email as HTML formatted text',
            options: [
              { value: 'false', label: 'Plain Text (Recommended)' },
              { value: 'true', label: 'HTML Format' }
            ]
          }
        ]
      },
      {
        id: 'send_reply',
        name: 'Send Reply',
        description: 'Reply to the original email sender',
        fields: [
          {
            key: 'body_template',
            label: 'Reply Body Template',
            type: 'textarea',
            placeholder: 'Thank you for your email.\n\n{{ai_content}}\n\nBest regards',
            required: true,
            description: 'Reply content. Use {{field}} for dynamic values. Available: {{ai_content}} if AI processed, {{body}}, {{sender}}, {{subject}}'
          },
          {
            key: 'custom_to_email',
            label: 'Custom Reply Email (Optional)',
            type: 'email',
            placeholder: 'Leave empty to reply to original sender',
            required: false,
            description: 'Override the reply recipient. Leave empty to reply to the original sender'
          },
          {
            key: 'is_html',
            label: 'HTML Format',
            type: 'select',
            placeholder: 'Send as HTML',
            required: false,
            description: 'Whether to send the reply as HTML formatted text',
            options: [
              { value: 'false', label: 'Plain Text (Recommended)' },
              { value: 'true', label: 'HTML Format' }
            ]
          }
        ]
      }
    ]
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
            key: 'message_title',
            label: 'Message Title',
            type: 'text',
            placeholder: 'New Email Alert',
            required: true,
            description: 'Title for your Telegram notification. A default template with sender, subject, and content will be automatically added.'
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

// Generate default Telegram message template based on configuration
export const generateTelegramMessageTemplate = (title: string, hasAiProcessing: boolean = false): string => {
  const contentVariable = hasAiProcessing ? '{{ai_content}}' : '{{body}}';
  
  return `📧 <b>${title}</b>\n\n` +
    `<b>From:</b> {{sender}}\n` +
    `<b>Subject:</b> {{subject}}\n` +
    `<b>Time:</b> {{timestamp}}\n\n` +
    `${contentVariable}\n\n` +
    `<i>⚡ Automated by Autofy</i>`;
};

// Import a zap from JSON file
export const importZapFromJson = async (file: File): Promise<{ data: Zap | null; error: string | null }> => {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Call the import edge function
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/zap-import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to import zap');
    }

    return {
      data: result.zap,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to import zap from JSON'
    };
  }
};

// Import a zap from JSON object (for direct JSON payload)
export const importZapFromJsonData = async (zapData: ZapConfiguration): Promise<{ data: Zap | null; error: string | null }> => {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Call the import edge function with JSON payload
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/zap-import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zapData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to import zap');
    }

    return {
      data: result.zap,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to import zap from JSON data'
    };
  }
};

// Validate JSON file before upload
export const validateJsonFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    return { valid: false, error: 'File must be a JSON file (.json)' };
  }

  // Check file size (max 1MB)
  if (file.size > 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 1MB' };
  }

  return { valid: true };
};

// Parse and validate JSON content (client-side validation)
export const parseJsonFile = async (file: File): Promise<{ data: any; error?: string }> => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Basic validation
    if (!data.name || typeof data.name !== 'string') {
      return { data: null, error: 'JSON must contain a "name" field with a string value' };
    }
    
    if (!Array.isArray(data.steps) || data.steps.length === 0) {
      return { data: null, error: 'JSON must contain a "steps" array with at least one step' };
    }
    
    return { data };
  } catch (error) {
    return { data: null, error: 'Invalid JSON format' };
  }
};

// Export a zap to JSON format
export const exportZapToJson = (zap: Zap): string => {
  const zapConfig: ZapConfiguration = {
    name: zap.name,
    description: zap.description,
    steps: (zap.steps || []).map(step => ({
      step_type: step.step_type,
      service_name: step.service_name,
      event_type: step.event_type,
      configuration: step.configuration
    }))
  };
  
  return JSON.stringify(zapConfig, null, 2);
};

// Download a zap as JSON file
export const downloadZapAsJson = (zap: Zap): void => {
  const jsonString = exportZapToJson(zap);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${zap.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_zap.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
};
