import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ZapImportStep {
  step_type: 'trigger' | 'action'
  service_name: string
  event_type: string
  configuration: Record<string, any>
}

interface ZapImportJson {
  name: string
  description?: string
  steps: ZapImportStep[]
}

interface ValidationError {
  field: string
  message: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse multipart form data or JSON
    let zapConfig: ZapImportJson

    const contentType = req.headers.get('content-type')
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate file type
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        return new Response(
          JSON.stringify({ error: 'File must be a JSON file' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'File size must be less than 1MB' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Parse JSON content
      try {
        const textContent = await file.text()
        zapConfig = JSON.parse(textContent)
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else if (contentType?.includes('application/json')) {
      // Handle direct JSON payload
      try {
        zapConfig = await req.json()
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be multipart/form-data or application/json' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate the zap configuration
    const validationErrors = validateZapConfig(zapConfig)
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validationErrors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if there's AI processing in the workflow
    const hasAiProcessing = zapConfig.steps.some(step => 
      step.service_name === 'openrouter' && step.event_type === 'process_with_ai'
    )

    // Process steps to ensure Telegram message templates are generated
    const processedSteps = zapConfig.steps.map((step, index) => {
      if (step.service_name === 'telegram' && step.event_type === 'send_message' && step.configuration.message_title) {
        // Generate the message template if not already present
        if (!step.configuration.message_template) {
          step.configuration.message_template = generateTelegramMessageTemplate(
            step.configuration.message_title,
            hasAiProcessing
          )
        }
      }
      return {
        ...step,
        step_order: index
      }
    })

    // Start transaction to create zap and steps
    const { data: zapData, error: zapError } = await supabase
      .from('zaps')
      .insert({
        user_id: user.id,
        name: zapConfig.name,
        description: zapConfig.description || '',
        is_active: false // Import as inactive by default for safety
      })
      .select()
      .single()

    if (zapError) {
      console.error('Error creating zap:', zapError)
      throw new Error(`Failed to create zap: ${zapError.message}`)
    }

    // Create the steps
    const stepsToInsert = processedSteps.map(step => ({
      zap_id: zapData.id,
      step_order: step.step_order,
      step_type: step.step_type,
      service_name: step.service_name,
      event_type: step.event_type,
      configuration: step.configuration
    }))

    const { data: stepsData, error: stepsError } = await supabase
      .from('zap_steps')
      .insert(stepsToInsert)
      .select()

    if (stepsError) {
      console.error('Error creating zap steps:', stepsError)
      
      // Cleanup: delete the zap if steps creation failed
      await supabase
        .from('zaps')
        .delete()
        .eq('id', zapData.id)
      
      throw new Error(`Failed to create zap steps: ${stepsError.message}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Zap imported successfully',
        zap: {
          ...zapData,
          steps: stepsData
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Zap import error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function validateZapConfig(config: any): ValidationError[] {
  const errors: ValidationError[] = []

  // Check required fields
  if (!config.name || typeof config.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required and must be a string' })
  }

  if (config.name && config.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be 100 characters or less' })
  }

  if (config.description && typeof config.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' })
  }

  if (config.description && config.description.length > 500) {
    errors.push({ field: 'description', message: 'Description must be 500 characters or less' })
  }

  // Check steps
  if (!Array.isArray(config.steps)) {
    errors.push({ field: 'steps', message: 'Steps must be an array' })
    return errors // Can't continue validation without steps array
  }

  if (config.steps.length === 0) {
    errors.push({ field: 'steps', message: 'At least one step is required' })
  }

  if (config.steps.length > 10) {
    errors.push({ field: 'steps', message: 'Maximum 10 steps allowed' })
  }

  // Validate each step
  config.steps.forEach((step: any, index: number) => {
    const stepPrefix = `steps[${index}]`
    
    if (!step.step_type || !['trigger', 'action'].includes(step.step_type)) {
      errors.push({ 
        field: `${stepPrefix}.step_type`, 
        message: 'Step type must be either "trigger" or "action"' 
      })
    }

    if (!step.service_name || typeof step.service_name !== 'string') {
      errors.push({ 
        field: `${stepPrefix}.service_name`, 
        message: 'Service name is required and must be a string' 
      })
    }

    if (!step.event_type || typeof step.event_type !== 'string') {
      errors.push({ 
        field: `${stepPrefix}.event_type`, 
        message: 'Event type is required and must be a string' 
      })
    }

    if (!step.configuration || typeof step.configuration !== 'object') {
      errors.push({ 
        field: `${stepPrefix}.configuration`, 
        message: 'Configuration is required and must be an object' 
      })
    }

    // Service-specific validation
    validateStepConfiguration(step, index, errors)
  })

  // Validate workflow structure
  const triggerSteps = config.steps.filter((step: any) => step.step_type === 'trigger')
  if (triggerSteps.length === 0) {
    errors.push({ field: 'steps', message: 'At least one trigger step is required' })
  }
  
  if (triggerSteps.length > 1) {
    errors.push({ field: 'steps', message: 'Only one trigger step is allowed' })
  }

  return errors
}

function validateStepConfiguration(step: any, index: number, errors: ValidationError[]): void {
  const stepPrefix = `steps[${index}]`
  const { service_name, event_type, configuration } = step

  // Gmail validation
  if (service_name === 'gmail') {
    if (event_type === 'new_email') {
      if (!configuration.keywords && !configuration.from_email) {
        errors.push({
          field: `${stepPrefix}.configuration`,
          message: 'Gmail trigger requires either keywords or from_email'
        })
      }
    } else if (event_type === 'send_email') {
      if (!configuration.to_email) {
        errors.push({
          field: `${stepPrefix}.configuration.to_email`,
          message: 'Gmail send_email requires to_email'
        })
      }
      if (!configuration.subject_template) {
        errors.push({
          field: `${stepPrefix}.configuration.subject_template`,
          message: 'Gmail send_email requires subject_template'
        })
      }
      if (!configuration.body_template) {
        errors.push({
          field: `${stepPrefix}.configuration.body_template`,
          message: 'Gmail send_email requires body_template'
        })
      }
    } else if (event_type === 'send_reply') {
      if (!configuration.body_template) {
        errors.push({
          field: `${stepPrefix}.configuration.body_template`,
          message: 'Gmail send_reply requires body_template'
        })
      }
    }
  }

  // OpenRouter (AI) validation
  if (service_name === 'openrouter' && event_type === 'process_with_ai') {
    if (!configuration.model) {
      errors.push({
        field: `${stepPrefix}.configuration.model`,
        message: 'OpenRouter process_with_ai requires model'
      })
    }
    if (!configuration.prompt) {
      errors.push({
        field: `${stepPrefix}.configuration.prompt`,
        message: 'OpenRouter process_with_ai requires prompt'
      })
    }
  }

  // Notion validation
  if (service_name === 'notion' && event_type === 'create_page') {
    if (!configuration.database_id && !configuration.page_id) {
      errors.push({
        field: `${stepPrefix}.configuration`,
        message: 'Notion create_page requires either database_id or page_id'
      })
    }
    if (!configuration.title_template) {
      errors.push({
        field: `${stepPrefix}.configuration.title_template`,
        message: 'Notion create_page requires title_template'
      })
    }
  }

  // Telegram validation
  if (service_name === 'telegram' && event_type === 'send_message') {
    if (!configuration.message_title && !configuration.message_template) {
      errors.push({
        field: `${stepPrefix}.configuration`,
        message: 'Telegram send_message requires either message_title or message_template'
      })
    }
  }
}

function generateTelegramMessageTemplate(title: string, hasAiProcessing: boolean = false): string {
  const contentVariable = hasAiProcessing ? '{{ai_content}}' : '{{body}}'
  
  return `📧 <b>${title}</b>\n\n` +
    `<b>From:</b> {{sender}}\n` +
    `<b>Subject:</b> {{subject}}\n` +
    `<b>Time:</b> {{timestamp}}\n\n` +
    `${contentVariable}\n\n` +
    `<i>⚡ Automated by Autofy</i>`
}
