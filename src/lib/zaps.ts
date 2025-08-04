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
    // First create the zap
    const { data: zapData, error: zapError } = await supabase
      .from('zaps')
      .insert({
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
            placeholder: 'Email content: {{body}}',
            required: false,
            description: 'Template for the page content. Use {{field}} for dynamic values'
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