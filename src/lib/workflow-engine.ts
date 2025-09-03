// Workflow execution engine for processing zap steps
import { supabase } from './supabase';
import { sendEmail, sendReply, processEmailTemplate } from './gmail-api';
import { sendTelegramNotification } from './telegram-workflow';

export interface WorkflowContext {
  userId: string;
  originalData?: any; // Data from trigger (e.g., email data)
  variables: Record<string, any>; // Dynamic variables accumulated during workflow
  triggerMessageId?: string; // Original email message ID for replies
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute a single workflow step
 */
export async function executeWorkflowStep(
  stepConfig: any,
  context: WorkflowContext
): Promise<ExecutionResult> {
  try {
    const { service_name, event_type, configuration } = stepConfig;

    switch (service_name) {
      case 'gmail':
        return await executeGmailAction(event_type, configuration, context);
      
      case 'openrouter':
        return await executeAIProcessing(event_type, configuration, context);
      
      case 'notion':
        return await executeNotionAction(event_type, configuration, context);
      
      case 'telegram':
        return await executeTelegramAction(event_type, configuration, context);
      
      default:
        return {
          success: false,
          error: `Unsupported service: ${service_name}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown execution error'
    };
  }
}

/**
 * Execute Gmail actions (send_email, send_reply)
 */
async function executeGmailAction(
  actionType: string,
  config: any,
  context: WorkflowContext
): Promise<ExecutionResult> {
  try {
    switch (actionType) {
      case 'send_email':
        const processedSubject = processEmailTemplate(config.subject_template, context.variables);
        const processedBody = processEmailTemplate(config.body_template, context.variables);
        
        const sendResult = await sendEmail({
          to: config.to_email,
          subject: processedSubject,
          body: processedBody,
          isHtml: config.is_html === 'true'
        });
        
        return {
          success: true,
          data: {
            messageId: sendResult.messageId,
            threadId: sendResult.threadId,
            sentTo: config.to_email
          }
        };

      case 'send_reply':
        if (!context.triggerMessageId) {
          throw new Error('Cannot send reply: No original message ID found');
        }
        
        const processedReplyBody = processEmailTemplate(config.body_template, context.variables);
        
        const replyResult = await sendReply(
          context.triggerMessageId,
          processedReplyBody,
          config.custom_to_email || undefined
        );
        
        return {
          success: true,
          data: {
            messageId: replyResult.messageId,
            threadId: replyResult.threadId,
            isReply: true
          }
        };

      default:
        throw new Error(`Unsupported Gmail action: ${actionType}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gmail action failed'
    };
  }
}

/**
 * Execute AI processing actions
 */
async function executeAIProcessing(
  actionType: string,
  config: any,
  context: WorkflowContext
): Promise<ExecutionResult> {
  try {
    if (actionType !== 'process_with_ai') {
      throw new Error(`Unsupported AI action: ${actionType}`);
    }

    // Validate required configuration
    if (!config.model) {
      throw new Error('AI model is required for process_with_ai action');
    }
    
    if (!config.prompt) {
      throw new Error('AI prompt is required for process_with_ai action');
    }

    // Process the AI prompt with context variables
    const processedPrompt = processTemplate(config.prompt, context.variables);
    
    // Validate processed prompt is not empty
    if (!processedPrompt.trim()) {
      throw new Error('Processed AI prompt is empty after template resolution');
    }
    
    // Get OpenRouter API key from environment variables or integrations
    const openrouterApiKey = import.meta.env?.VITE_OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Sanitize and validate parameters
    const maxTokens = config.max_tokens ? Math.min(Math.max(parseInt(config.max_tokens), 1), 4096) : 1000;
    const temperature = config.temperature ? Math.min(Math.max(parseFloat(config.temperature), 0), 2) : 0.7;

    const requestBody = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: processedPrompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    };

    // Retry logic for API calls
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Autofy Workflow Engine'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`AI API error (attempt ${attempt}): ${response.status} ${errorText}`);
          
          // Check if this is a rate limit error
          if (response.status === 429) {
            if (attempt < maxRetries) {
              // Wait with exponential backoff for rate limit
              const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
              console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          throw error;
        }

        const aiResponse = await response.json();
        
        // Validate AI response structure
        if (!aiResponse.choices || !Array.isArray(aiResponse.choices) || aiResponse.choices.length === 0) {
          throw new Error('Invalid AI response: no choices returned');
        }
        
        const aiContent = aiResponse.choices[0]?.message?.content;
        if (!aiContent || typeof aiContent !== 'string') {
          throw new Error('Invalid AI response: no content in first choice');
        }

        // Add AI content to context variables for subsequent steps
        context.variables.ai_content = aiContent;
        context.variables.ai_model = config.model;
        context.variables.ai_processed_at = new Date().toISOString();
        // Remove the reference to actionSteps since it's not in scope
        // context.variables[`step_output`] = aiContent; // Generic step output variable

        return {
          success: true,
          data: {
            aiContent,
            model: config.model,
            processedAt: new Date().toISOString(),
            tokenUsage: aiResponse.usage || {},
            output: aiContent // Standardized output field
          }
        };
        
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const waitTime = 1000 * attempt; // Simple linear backoff
          console.log(`AI processing attempt ${attempt} failed, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI processing failed'
    };
  }
}

/**
 * Execute Notion actions
 */
async function executeNotionAction(
  actionType: string,
  config: any,
  context: WorkflowContext
): Promise<ExecutionResult> {
  try {
    if (actionType !== 'create_page') {
      throw new Error(`Unsupported Notion action: ${actionType}`);
    }

    // Get Notion access token
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('service', 'notion')
      .single();

    if (!integration) {
      throw new Error('Notion integration not found');
    }

    // Process templates
    const processedTitle = processTemplate(config.title_template, context.variables);
    const processedContent = config.content_template ? 
      processTemplate(config.content_template, context.variables) : '';

    // Create the page in Notion
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          database_id: config.database_id
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: processedTitle
                }
              }
            ]
          }
        },
        children: processedContent ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: processedContent
                  }
                }
              ]
            }
          }
        ] : []
      })
    });

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      throw new Error(`Notion page creation failed: ${errorText}`);
    }

    const notionResult = await notionResponse.json();

    return {
      success: true,
      data: {
        pageId: notionResult.id,
        url: notionResult.url,
        title: processedTitle
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Notion action failed'
    };
  }
}

/**
 * Execute Telegram actions
 */
async function executeTelegramAction(
  actionType: string,
  config: any,
  context: WorkflowContext
): Promise<ExecutionResult> {
  try {
    if (actionType !== 'send_message') {
      throw new Error(`Unsupported Telegram action: ${actionType}`);
    }

    // Process the message template with context variables
    const processedMessage = config.message_template ? 
      processTemplate(config.message_template, context.variables) :
      `📧 ${config.message_title}\n\nFrom: ${context.variables.sender}\nSubject: ${context.variables.subject}\n\n${context.variables.ai_content || context.variables.body}`;

    const telegramOptions = {
      chatId: config.chat_id || undefined,
      parseMode: config.parse_mode as 'HTML' | 'Markdown' | 'MarkdownV2' || 'HTML',
      disableWebPagePreview: config.disable_web_page_preview === 'true',
      disableNotification: config.disable_notification === 'true'
    };

    const result = await sendTelegramNotification(context.userId, processedMessage, telegramOptions);

    return {
      success: result.success,
      data: result.success ? { messageSent: true } : undefined,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Telegram action failed'
    };
  }
}

/**
 * Process template variables in any string, including step output references
 */
function processTemplate(
  template: string, 
  variables: Record<string, any>, 
  stepResults?: Array<{stepId: string; service: string; action: string; data?: any}>
): string {
  let processed = template;
  
  // First, process regular variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, String(value || ''));
  });
  
  // Then, process step output references like {{steps.2.output}}
  if (stepResults) {
    // Match patterns like {{steps.N.output}}, {{steps.N.data.field}}, etc.
    const stepOutputPattern = /{{steps\.(\d+)\.(\w+)(?:\.(\w+))?}}/g;
    let match;
    
    while ((match = stepOutputPattern.exec(processed)) !== null) {
      const stepIndex = parseInt(match[1]) - 1; // Convert to 0-based index
      const outputType = match[2]; // 'output', 'data', etc.
      const field = match[3]; // Optional nested field
      
      let replacementValue = '';
      
      if (stepIndex >= 0 && stepIndex < stepResults.length) {
        const stepResult = stepResults[stepIndex];
        
        switch (outputType) {
          case 'output':
            // Get the primary output based on service type
            if (stepResult.data) {
              if (stepResult.service === 'openrouter') {
                replacementValue = stepResult.data.aiContent || '';
              } else if (stepResult.service === 'gmail') {
                replacementValue = stepResult.data.messageId || stepResult.data.threadId || '';
              } else if (stepResult.service === 'notion') {
                replacementValue = stepResult.data.pageId || stepResult.data.url || '';
              } else if (stepResult.service === 'telegram') {
                replacementValue = stepResult.data.messageSent ? 'Message sent successfully' : '';
              } else {
                // Generic fallback - try to find a reasonable output
                replacementValue = stepResult.data.output || stepResult.data.result || JSON.stringify(stepResult.data);
              }
            }
            break;
            
          case 'data':
            if (field && stepResult.data && stepResult.data[field] !== undefined) {
              replacementValue = String(stepResult.data[field]);
            } else if (!field && stepResult.data) {
              replacementValue = JSON.stringify(stepResult.data);
            }
            break;
            
          case 'service':
            replacementValue = stepResult.service || '';
            break;
            
          case 'action':
            replacementValue = stepResult.action || '';
            break;
            
          case 'success':
            replacementValue = stepResult.data ? 'true' : 'false';
            break;
            
          default:
            // Try to find the field in the step result data
            if (stepResult.data && stepResult.data[outputType] !== undefined) {
              replacementValue = String(stepResult.data[outputType]);
            }
            break;
        }
      } else {
        console.warn(`Step ${stepIndex + 1} not found or not yet executed for placeholder ${match[0]}`);
      }
      
      // Replace the placeholder with the resolved value
      processed = processed.replace(match[0], replacementValue);
    }
  }
  
  return processed;
}

/**
 * Execute a complete workflow (all steps in sequence)
 */
export async function executeWorkflow(zapId: string, triggerData: any): Promise<ExecutionResult> {
  try {
    // Get the zap and its steps
    const { data: zapData, error } = await supabase
      .from('zaps')
      .select(`
        *,
        steps:zap_steps(*)
      `)
      .eq('id', zapId)
      .single();

    if (error || !zapData) {
      throw new Error('Zap not found or error fetching zap data');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Initialize workflow context
    const context: WorkflowContext = {
      userId: user.id,
      originalData: triggerData,
      variables: {
        // Standard email variables
        subject: triggerData.subject || '',
        sender: triggerData.sender || '',
        body: triggerData.body || '',
        timestamp: triggerData.timestamp || new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      },
      triggerMessageId: triggerData.messageId
    };

    // Sort steps by order and execute them sequentially (skip trigger step)
    const actionSteps = zapData.steps
      .filter((step: any) => step.step_type === 'action')
      .sort((a: any, b: any) => a.step_order - b.step_order);

    const results = [];

    for (const step of actionSteps) {
      // Update step configuration to resolve any step output placeholders
      const updatedStepConfig = {
        ...step,
        configuration: processStepConfiguration(step.configuration, context.variables, results)
      };
      
      const result = await executeWorkflowStep(updatedStepConfig, context);
      results.push({
        stepId: step.id,
        service: step.service_name,
        action: step.event_type,
        success: result.success,
        data: result.data,
        error: result.error
      });

      // If step fails, stop execution
      if (!result.success) {
        break;
      }
    }

    // Update zap run statistics
    await supabase
      .from('zaps')
      .update({ 
        last_run_at: new Date().toISOString(),
        total_runs: zapData.total_runs + 1
      })
      .eq('id', zapId);

    const allSuccessful = results.every(r => r.success);

    return {
      success: allSuccessful,
      data: {
        zapId,
        executedSteps: results.length,
        results
      },
      error: allSuccessful ? undefined : 'Some workflow steps failed'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Workflow execution failed'
    };
  }
}

/**
 * Process step configuration to resolve placeholders
 */
function processStepConfiguration(
  configuration: any,
  variables: Record<string, any>,
  stepResults?: Array<{stepId: string; service: string; action: string; data?: any}>
): any {
  const processed = { ...configuration };
  
  // Process each configuration field that might contain templates
  Object.entries(processed).forEach(([key, value]) => {
    if (typeof value === 'string') {
      processed[key] = processTemplate(value, variables, stepResults);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      processed[key] = processStepConfiguration(value, variables, stepResults);
    }
  });
  
  return processed;
}

/**
 * Test a workflow step configuration
 */
export async function testWorkflowStep(
  stepConfig: any,
  testData: any = {}
): Promise<ExecutionResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const testContext: WorkflowContext = {
    userId: user.id,
    variables: {
      subject: 'Test Email Subject',
      sender: 'test@example.com',
      body: 'This is a test email body content.',
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      ai_content: 'Test AI response content',
      ...testData
    }
  };

  return executeWorkflowStep(stepConfig, testContext);
}
