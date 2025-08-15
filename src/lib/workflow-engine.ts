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

    // Process the AI prompt with context variables
    const processedPrompt = processTemplate(config.prompt, context.variables);
    
    // Get OpenRouter API key from environment variables or integrations
    const openrouterApiKey = process.env.VITE_OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const requestBody = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: processedPrompt
        }
      ],
      max_tokens: config.max_tokens ? parseInt(config.max_tokens) : 1000,
      temperature: config.temperature ? parseFloat(config.temperature) : 0.7
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Zappy Email Automation'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI processing failed: ${errorText}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || 'No response generated';

    // Add AI content to context variables for subsequent steps
    context.variables.ai_content = aiContent;
    context.variables.ai_model = config.model;
    context.variables.ai_processed_at = new Date().toISOString();

    return {
      success: true,
      data: {
        aiContent,
        model: config.model,
        processedAt: new Date().toISOString()
      }
    };
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
 * Process template variables in any string
 */
function processTemplate(template: string, variables: Record<string, any>): string {
  let processed = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, String(value || ''));
  });
  
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
      const result = await executeWorkflowStep(step, context);
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
