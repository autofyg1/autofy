import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CreateZapRequest {
  zap_data: any;
  session_id?: string;
}

interface ZapValidationResult {
  isValid: boolean;
  errors: string[];
  zapData?: any;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helper function to check if a field is a valid integration reference
function isIntegrationReference(value: any): boolean {
  return typeof value === 'string' && value.startsWith('{{integration.') && value.endsWith('}}');
}

function validateZapConfiguration(step: any, stepIndex: number): string[] {
  const errors: string[] = [];
  const { service_name, event_type, configuration } = step;

  switch (service_name) {
    case 'gmail':
      if (event_type === 'new_email') {
        // Gmail triggers are flexible - can work without specific filters
        // No validation needed - user can filter all emails if they want
      } else if (event_type === 'send_email') {
        if (!configuration.to_email) {
          errors.push(`Step ${stepIndex + 1}: Gmail send_email requires to_email`);
        }
        if (!configuration.subject_template) {
          errors.push(`Step ${stepIndex + 1}: Gmail send_email requires subject_template`);
        }
        if (!configuration.body_template) {
          errors.push(`Step ${stepIndex + 1}: Gmail send_email requires body_template`);
        }
      } else if (event_type === 'send_reply') {
        if (!configuration.body_template) {
          errors.push(`Step ${stepIndex + 1}: Gmail send_reply requires body_template`);
        }
      }
      break;

    case 'notion':
      if (event_type === 'create_page') {
        if (!configuration.database_id && !configuration.page_id) {
          errors.push(`Step ${stepIndex + 1}: Notion create_page requires either database_id or page_id`);
        }
        
        // Accept either title_template OR properties.title format
        const hasTitle = configuration.title_template || 
                        (configuration.properties && configuration.properties.title);
        if (!hasTitle) {
          errors.push(`Step ${stepIndex + 1}: Notion create_page requires either title_template or properties.title`);
        }
      }
      break;

    case 'openrouter':
      if (event_type === 'process_with_ai') {
        if (!configuration.model) {
          errors.push(`Step ${stepIndex + 1}: OpenRouter process_with_ai requires model`);
        }
        if (!configuration.prompt) {
          errors.push(`Step ${stepIndex + 1}: OpenRouter process_with_ai requires prompt`);
        }
      }
      break;

    case 'telegram':
      if (event_type === 'send_message') {
        // Telegram is flexible - can work without explicit chat_id (will use all user chats)
        if (!configuration.message_title && !configuration.message_template) {
          errors.push(`Step ${stepIndex + 1}: Telegram send_message requires either message_title or message_template`);
        }
      }
      break;

    default:
      errors.push(`Step ${stepIndex + 1}: Unsupported service '${service_name}'`);
  }

  return errors;
}

function validateZapJson(zapData: any): ZapValidationResult {
  const errors: string[] = [];
  
  // Check required fields
  if (!zapData.name || typeof zapData.name !== 'string') {
    errors.push('Name is required and must be a string');
  } else if (zapData.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }
  
  if (zapData.description && zapData.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }
  
  if (!zapData.steps || !Array.isArray(zapData.steps) || zapData.steps.length === 0) {
    errors.push('Steps array is required and must contain at least one step');
  }
  
  if (zapData.steps && zapData.steps.length > 10) {
    errors.push('Maximum 10 steps allowed');
  }
  
  // Check for exactly one trigger
  const triggerSteps = zapData.steps?.filter((step: any) => step.step_type === 'trigger') || [];
  if (triggerSteps.length !== 1) {
    errors.push('Exactly one trigger step is required');
  }
  
  // Validate each step structure and configuration
  zapData.steps?.forEach((step: any, index: number) => {
    if (!step.step_type || !['trigger', 'action'].includes(step.step_type)) {
      errors.push(`Step ${index + 1}: step_type must be 'trigger' or 'action'`);
    }
    
    if (!step.service_name || typeof step.service_name !== 'string') {
      errors.push(`Step ${index + 1}: service_name is required`);
    }
    
    if (!step.event_type || typeof step.event_type !== 'string') {
      errors.push(`Step ${index + 1}: event_type is required`);
    }
    
    if (!step.configuration || typeof step.configuration !== 'object') {
      errors.push(`Step ${index + 1}: configuration object is required`);
    } else {
      // Validate service-specific configuration
      const configErrors = validateZapConfiguration(step, index);
      errors.push(...configErrors);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    zapData: errors.length === 0 ? zapData : undefined
  };
}

async function enrichZapWithUserData(zapData: any, userId: string): Promise<any> {
  try {
    const processed = JSON.parse(JSON.stringify(zapData)); // Deep clone

    if (!processed.steps || !Array.isArray(processed.steps)) {
      return processed;
    }

    // Get user's telegram chats for auto-population
    const { data: telegramChats } = await supabase
      .from('telegram_chats')
      .select('chat_id, chat_type, username, first_name, title')
      .eq('user_id', userId)
      .eq('is_active', true);

    processed.steps.forEach((step: any) => {
      if (!step.configuration || typeof step.configuration !== 'object') {
        return;
      }

      // Convert legacy Notion properties format to current format
      if (step.service_name === 'notion' && step.event_type === 'create_page') {
        if (step.configuration.properties && !step.configuration.title_template) {
          // Convert properties.title to title_template
          if (step.configuration.properties.title) {
            step.configuration.title_template = step.configuration.properties.title;
          }
          if (step.configuration.properties.content) {
            step.configuration.content_template = step.configuration.properties.content;
          }
          // Remove the properties object
          delete step.configuration.properties;
        }
      }

      // Fix Gmail search field to keywords
      if (step.service_name === 'gmail' && step.event_type === 'new_email') {
        if (step.configuration.search && !step.configuration.keywords) {
          step.configuration.keywords = step.configuration.search;
          delete step.configuration.search;
        }
      }

      // Add integration references for known credential fields if missing
      const credentialFields = {
        gmail: ['client_id', 'client_secret', 'refresh_token', 'access_token'],
        notion: ['api_key', 'integration_token'],
        telegram: ['bot_token'],
        openrouter: ['api_key']
      };

      const serviceCredFields = credentialFields[step.service_name as keyof typeof credentialFields];
      if (serviceCredFields) {
        serviceCredFields.forEach(credField => {
          if (!step.configuration[credField]) {
            step.configuration[credField] = `{{integration.${step.service_name}}}`;
          }
        });
      }
    });

    return processed;
  } catch (error) {
    console.error('Error enriching zap with user data:', error);
    return zapData; // Return original if enrichment fails
  }
}

function applyDefaultValues(zapData: any): any {
  const processed = { ...zapData };
  
  // Apply default name if missing
  if (!processed.name) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    processed.name = `Zap-${timestamp}`;
  }
  
  // Apply default description if missing
  if (!processed.description && processed.steps) {
    const triggerStep = processed.steps.find((step: any) => step.step_type === 'trigger');
    const actionSteps = processed.steps.filter((step: any) => step.step_type === 'action');
    
    if (triggerStep && actionSteps.length > 0) {
      const triggerService = triggerStep.service_name;
      const actionServices = actionSteps.map((step: any) => step.service_name);
      
      if (actionServices.length === 1) {
        processed.description = `Auto-generated Zap from ${triggerService} to ${actionServices[0]}`;
      } else {
        processed.description = `Auto-generated Zap from ${triggerService} to ${actionServices.join(', ')}`;
      }
    }
  }
  
  // Apply default values to step configurations
  processed.steps?.forEach((step: any) => {
    if (step.service_name === 'openrouter' && step.event_type === 'process_with_ai') {
      if (!step.configuration.max_tokens) {
        step.configuration.max_tokens = 1000;
      }
      if (step.configuration.temperature === undefined) {
        step.configuration.temperature = 0.7;
      }
    }
    
    if (step.service_name === 'gmail' && ['send_email', 'send_reply'].includes(step.event_type)) {
      if (step.configuration.is_html === undefined) {
        step.configuration.is_html = "false";
      }
    }
    
    if (step.service_name === 'telegram' && step.event_type === 'send_message') {
      if (!step.configuration.parse_mode) {
        step.configuration.parse_mode = "HTML";
      }
      if (step.configuration.disable_web_page_preview === undefined) {
        step.configuration.disable_web_page_preview = "true";
      }
      if (step.configuration.disable_notification === undefined) {
        step.configuration.disable_notification = "false";
      }
    }
  });
  
  return processed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Create zap function called');
    
    const { zap_data, session_id }: CreateZapRequest = await req.json();
    console.log('Request data:', { 
      hasZapData: !!zap_data, 
      sessionId: session_id,
      zapName: zap_data?.name 
    });
    
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Enrich zap with user's available data
    console.log('Enriching zap with user data...');
    let processedZapData = await enrichZapWithUserData(zap_data, user.id);
    console.log('Zap enriched');
    
    // Apply default values
    console.log('Applying default values...');
    processedZapData = applyDefaultValues(processedZapData);
    console.log('Defaults applied');
    
    // Validate the zap JSON
    console.log('Validating zap JSON...');
    const validation = validateZapJson(processedZapData);
    console.log('Validation result:', { isValid: validation.isValid, errorCount: validation.errors.length });
    
    if (!validation.isValid) {
      console.log('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create the zap in the database
    console.log('Creating zap in database...');
    const { data: createdZap, error: zapError } = await supabase
      .from('workflows')
      .insert({
        user_id: user.id,
        name: processedZapData.name,
        description: processedZapData.description,
        steps: processedZapData.steps,
        is_active: false, // Created as inactive for safety
        created_from_chat: true,
        chat_session_id: session_id || null
      })
      .select('id, name, description, is_active, created_at')
      .single();

    if (zapError) {
      console.error('Error creating zap in database:', zapError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create zap',
          details: zapError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Zap created successfully:', createdZap?.id);
    return new Response(
      JSON.stringify({
        success: true,
        zap: createdZap,
        message: 'Zap created successfully! It has been created as inactive for safety. You can activate it from your dashboard.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Create zap error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
