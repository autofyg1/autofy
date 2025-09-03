import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "npm:@google/generative-ai";
import { corsHeaders } from "../_shared/cors.ts";

// Secrets handling utilities
const SENSITIVE_FIELD_PATTERNS = [
  /api[_\-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /auth/i,
  /credential/i,
  /private[_\-]?key/i,
  /access[_\-]?key/i,
  /service[_\-]?key/i,
];

const SERVICE_SECRET_MAPPINGS: Record<string, Record<string, string>> = {
  openrouter: {
    'api_key': 'OPENROUTER_API_KEY',
    'authorization': 'OPENROUTER_API_KEY'
  },
  telegram: {
    'bot_token': 'TELEGRAM_BOT_TOKEN',
    'api_key': 'TELEGRAM_BOT_TOKEN'
  },
  notion: {
    'api_key': 'NOTION_API_KEY',
    'authorization': 'NOTION_API_KEY',
    'integration_token': 'NOTION_API_KEY'
  },
  gmail: {
    'client_secret': 'GMAIL_CLIENT_SECRET',
    'refresh_token': 'GMAIL_REFRESH_TOKEN',
    'access_token': 'GMAIL_ACCESS_TOKEN'
  }
};

// Interface definitions
interface ChatRequest {
  session_id?: string;
  user_message: string;
  create_new_session?: boolean;
  session_topic?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
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

// Helper functions to call the shared Gemini Load Balancer edge function
const SHARED_FUNCTION_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/shared`;

async function callSharedFunction(action: string, payload: any): Promise<any> {
  const response = await fetch(SHARED_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
    },
    body: JSON.stringify({ action, ...payload })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Shared function call failed: ${errorData.error || response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Shared function returned error');
  }

  return result;
}

// Dynamic system prompt that includes user's available integrations and data
async function buildSystemPrompt(userId: string): Promise<string> {
  // Get user's available integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('service_name, credentials')
    .eq('user_id', userId);

  // Get user's Telegram chats
  const { data: telegramChats } = await supabase
    .from('telegram_chats')
    .select('chat_id, chat_type, username, first_name, title')
    .eq('user_id', userId)
    .eq('is_active', true);

  // Get user's Notion databases (if they have notion integration)
  const { data: notionDbs } = await supabase
    .from('integrations')
    .select('credentials')
    .eq('user_id', userId)
    .eq('service_name', 'notion')
    .single();

  const availableServices = integrations?.map(i => i.service_name) || [];
  const hasIntegrations = availableServices.length > 0;
  
  let servicesList = '';
  if (hasIntegrations) {
    servicesList = `\n\nAVAILABLE INTEGRATIONS:\nThe user has connected: ${availableServices.join(', ')}\nDO NOT ask for API keys, tokens, or credentials for these services - they are already connected!`;
  } else {
    servicesList = `\n\nNO INTEGRATIONS CONNECTED:\nThe user hasn't connected any services yet. Guide them to connect services first before creating zaps.`;
  }

  // Add Telegram chat information
  if (telegramChats && telegramChats.length > 0) {
    const chatInfo = telegramChats.map(chat => {
      const name = chat.title || chat.first_name || chat.username || `${chat.chat_type} chat`;
      return `${name} (ID: ${chat.chat_id})`;
    }).join(', ');
    servicesList += `\n\nTELEGRAM CHATS AVAILABLE:\nThe user has ${telegramChats.length} active chat(s): ${chatInfo}\nDO NOT ask for chat_id - use the available chat IDs or omit for all chats.`;
  } else if (availableServices.includes('telegram')) {
    servicesList += `\n\nTELEGRAM: Connected but no active chats found. Guide user to connect chats first.`;
  }

  // Add Notion database hints
  if (availableServices.includes('notion')) {
    servicesList += `\n\nNOTION: Connected - ask user for their database ID where they want to store data. Explain they can find it in their Notion database URL.`;
  }

return `You are an expert Autofy Workflow Bot assistant that helps users create valid Autofy JSON workflows (zaps) through natural conversation.

CRITICAL CONVERSATION RULES:
- ALWAYS read the full conversation history before responding
- If the user has already provided information (like database ID, keywords, etc.), DO NOT ask for it again
- Pay attention to previous messages and build upon them
- If you see the user has provided a database ID or other required info in earlier messages, use it directly
- Do not repeat questions that have already been answered in the conversation

Your primary responsibilities:
1. Understand user intent (e.g., "create a zap for Gmail → Notion")
2. Check if required integrations are connected and use available user data
3. Ask ONLY for missing functional parameters that cannot be auto-detected AND have not been provided in conversation
4. Auto-fill fields with user's existing data when possible
5. Generate valid JSON in the Autofy format using {{integration.SERVICE_NAME}} for credentials
6. Validate JSON before suggesting it to the user

SUPPORTED SERVICES AND EVENTS:
- Gmail: trigger (new_email), actions (send_email, send_reply)
- Notion: action (create_page)
- OpenRouter: action (process_with_ai)
- Telegram: action (send_message)

SMART DATA USAGE:
- For Telegram: If user has connected chats, DO NOT ask for chat_id - omit it to send to all chats or use available chat IDs
- For Gmail: Only ask for functional filters (keywords, from_email) not credentials. Use "keywords" field for search terms.
- For Notion: Only ask for database_id (explain it's in their Notion database URL). Use title_template for page titles.
- For OpenRouter: Ask for model preference and prompt, use sensible defaults for other parameters

CREDENTIAL HANDLING:
- Use {{integration.gmail}} for Gmail credentials (client_id, client_secret, refresh_token, etc.)
- Use {{integration.notion}} for Notion credentials (integration_token, api_key)
- Use {{integration.telegram}} for Telegram credentials (bot_token)
- Use {{integration.openrouter}} for OpenRouter credentials (api_key)
- NEVER ask users for API keys, tokens, or passwords - use integration references

CORRECT NOTION FORMAT:
- Use title_template NOT properties.title
- Use content_template for page content
- Use database_id for target database
- Example: {"title_template": "Email: {{subject}}", "content_template": "From: {{sender}}\n\n{{body}}"}

CORRECT GMAIL FORMAT:
- Use "keywords" field for email filtering, NOT "search"
- Example: {"keywords": "urgent, important", "from_email": ""}

VALIDATION RULES:
- Name is required (max 100 chars)
- Exactly one trigger step required
- Maximum 10 steps allowed
- Each step needs: step_type, service_name, event_type, configuration
- Only ask for functional parameters that can't be auto-detected
- Credentials should use {{integration.service_name}} format

DEFAULT VALUES:
- name: "Zap-{timestamp}" if not provided
- description: "Auto-generated Zap from {trigger_service} to {action_services}"
- Use current timestamp for unique naming
- For Telegram: parse_mode: "HTML", disable_web_page_preview: "true"
- For OpenRouter: temperature: 0.7, max_tokens: 1000

When creating zaps:
1. Check if required services are in the user's connected integrations
2. If services aren't connected, guide them to connect first
3. Use available user data (chats, databases) instead of asking
4. Ask ONLY for essential functional parameters you cannot auto-detect
5. Generate JSON with {{integration.service_name}} for all credential fields
6. Apply sensible defaults for optional parameters
7. Use correct field names (keywords not search, title_template not properties.title)
8. Validate and present to user

EXAMPLE SMART CONFIGURATIONS:
- Gmail trigger: {"keywords": "urgent, important"} (credentials auto-added)
- Notion action: {"database_id": "user-provided-db-id", "title_template": "Email: {{subject}}"} (credentials auto-added)
- Telegram action: {"message_template": "New email: {{subject}}"} (credentials auto-added)
- OpenRouter: {"model": "llama-3.2-3b-instruct:free", "prompt": "Summarize: {{body}}"} (credentials auto-added)

IMPORTANT: Generate MINIMAL JSON - only include user-functional fields. Credential fields like api_key, bot_token, etc. are automatically added during processing.

IMPORTANT: Always use the correct field names as shown in examples above. Do not use deprecated formats.

Be conversational and efficient. Minimize questions by using available data and smart defaults.${servicesList}`;
}

// Keep a basic fallback prompt
const BASIC_SYSTEM_PROMPT = `You are an expert Autofy Workflow Bot assistant that helps users create valid Autofy JSON workflows (zaps) through natural conversation.

Focus on functional requirements like database IDs and keywords. Use {{integration.service_name}} format for all credentials.

Always be conversational and helpful.`;

async function generateEmbedding(text: string): Promise<number[]> {
  const result = await callSharedFunction('generateEmbedding', { text });
  return result.embedding;
}

async function getOrCreateSession(userId: string, sessionId?: string, topic?: string): Promise<string> {
  if (sessionId) {
    // Verify session exists and belongs to user
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (session) return sessionId;
  }

  // Create new session
  const { data: newSession } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      topic: topic || 'Zap Creation Session'
    })
    .select('id')
    .single();

  return newSession!.id;
}

async function getRecentMessages(sessionId: string, limit: number = 10): Promise<ChatMessage[]> {
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  return messages || [];
}

async function getSimilarMessages(embedding: number[], threshold: number = 0.75, limit: number = 5): Promise<ChatMessage[]> {
  const { data: similarMessages } = await supabase.rpc('match_messages', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit
  });

  return (similarMessages || []).map((msg: any) => ({
    role: msg.role,
    content: msg.content,
    created_at: msg.created_at
  }));
}

function validateZapJson(zapData: any): ZapValidationResult {
  const errors: string[] = [];
  
  // Check required fields
  if (!zapData.name || typeof zapData.name !== 'string') {
    errors.push('Name is required and must be a string');
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
  
  // Validate each step
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
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    zapData: errors.length === 0 ? zapData : undefined
  };
}

function generateDefaultZapName(): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  return `Zap-${timestamp}`;
}

function generateDefaultDescription(triggerService: string, actionServices: string[]): string {
  if (actionServices.length === 1) {
    return `Auto-generated Zap from ${triggerService} to ${actionServices[0]}`;
  }
  return `Auto-generated Zap from ${triggerService} to ${actionServices.join(', ')}`;
}

function isSensitiveField(fieldName: string, value?: string): boolean {
  // Whitelist of fields that should NEVER be considered sensitive (user data)
  const userDataFields = [
    'database_id', 'page_id', 'workspace_id', 'chat_id', 'channel_id',
    'to_email', 'from_email', 'subject', 'keywords', 'search_query',
    'title_template', 'content_template', 'message_template', 'prompt',
    'model', 'temperature', 'max_tokens', 'parse_mode'
  ];
  
  // If it's a known user data field, it's not sensitive
  if (userDataFields.includes(fieldName.toLowerCase())) {
    return false;
  }
  
  // Check field name patterns for actual credential fields
  const fieldMatches = SENSITIVE_FIELD_PATTERNS.some(pattern => 
    pattern.test(fieldName)
  );

  if (fieldMatches) return true;

  // Check value patterns if provided - but be more conservative
  if (value) {
    // JWT tokens (very specific pattern)
    if (/^eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]*$/.test(value)) {
      return true;
    }

    // Only consider very long random strings as API keys (50+ chars)
    // This excludes database IDs which are typically 32 chars
    if (value.length > 50 && /^[A-Za-z0-9_\-+/=]{50,}$/.test(value)) {
      return true;
    }
  }

  return false;
}

function suggestSecretKey(serviceName: string, fieldName: string): string {
  const serviceMapping = SERVICE_SECRET_MAPPINGS[serviceName.toLowerCase()];
  
  if (serviceMapping && serviceMapping[fieldName.toLowerCase()]) {
    return serviceMapping[fieldName.toLowerCase()];
  }

  // Generate a reasonable secret key name
  const cleanServiceName = serviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanFieldName = fieldName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  
  return `${cleanServiceName}_${cleanFieldName}`;
}

async function enrichZapWithUserData(zapData: any, userId: string): Promise<any> {
  const processedZap = JSON.parse(JSON.stringify(zapData)); // Deep clone

  if (!processedZap.steps || !Array.isArray(processedZap.steps)) {
    return processedZap;
  }

  // Get user's telegram chats for auto-population
  const { data: telegramChats } = await supabase
    .from('telegram_chats')
    .select('chat_id, chat_type, username, first_name, title')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1); // Get the first active chat for default

  processedZap.steps.forEach((step: any) => {
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

    // Auto-populate Telegram chat_id if not provided
    if (step.service_name === 'telegram' && step.event_type === 'send_message') {
      if (!step.configuration.chat_id && telegramChats && telegramChats.length > 0) {
        // Don't set chat_id - let it send to all user's chats
        // This is handled by the telegram service automatically
      }
      
      // Ensure integration reference for bot_token
      if (!step.configuration.bot_token) {
        step.configuration.bot_token = `{{integration.telegram}}`;
      }
    }

    // Auto-populate integration references for credentials
    // Only convert actual credential fields, not user data fields
    const credentialFieldsToCheck = {
      gmail: ['client_id', 'client_secret', 'refresh_token', 'access_token'],
      notion: ['api_key', 'integration_token', 'authorization'],
      telegram: ['bot_token'],
      openrouter: ['api_key', 'authorization']
    };
    
    const serviceCredFields = credentialFieldsToCheck[step.service_name as keyof typeof credentialFieldsToCheck];
    if (serviceCredFields) {
      serviceCredFields.forEach(credField => {
        const value = step.configuration[credField];
        if (typeof value === 'string' && value.trim() && !value.startsWith('{{')) {
          if (isSensitiveField(credField, value)) {
            step.configuration[credField] = `{{integration.${step.service_name}}}`;
          }
        }
      });
    }

    // Only add essential credential fields if they're truly missing
    // Don't auto-add credentials for every service - only when actually needed
    if (step.service_name === 'telegram' && step.event_type === 'send_message') {
      if (!step.configuration.bot_token) {
        step.configuration.bot_token = `{{integration.telegram}}`;
      }
    }
    
    // For other services, let the create-zap function handle credential addition
    // This prevents double-adding and overriding user values
  });

  return processedZap;
}

function processSecretsInZap(zapData: any): any {
  const processedZap = JSON.parse(JSON.stringify(zapData)); // Deep clone

  if (!processedZap.steps || !Array.isArray(processedZap.steps)) {
    return processedZap;
  }

  processedZap.steps.forEach((step: any) => {
    if (!step.configuration || typeof step.configuration !== 'object') {
      return;
    }

    Object.entries(step.configuration).forEach(([fieldName, value]) => {
      if (typeof value === 'string' && value.trim() && !value.startsWith('{{')) {
        if (isSensitiveField(fieldName, value)) {
          // Use integration reference format instead of secrets
          const integrationReference = `{{integration.${step.service_name}}}`;
          
          // Replace the value with integration reference
          step.configuration[fieldName] = integrationReference;
        }
      }
    });
  });

  return processedZap;
}

async function generateChatResponse(messages: ChatMessage[], userMessage: string, userId: string): Promise<string> {
  const conversationHistory = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Build dynamic system prompt with user's integrations
  let systemPrompt: string;
  try {
    systemPrompt = await buildSystemPrompt(userId);
  } catch (error) {
    console.error('Error building system prompt:', error);
    systemPrompt = BASIC_SYSTEM_PROMPT;
  }

    // Enhanced context extraction from conversation to prevent re-asking
    const conversationText = messages.map(m => m.content).join(' ');
    let contextualInfo = '';
    
    // Create a comprehensive context map from conversation
    const providedContext = {
      database_ids: [],
      keywords: [],
      models: [],
      emails: [],
      chat_ids: [],
      message_templates: [],
      prompts: [],
      requirements: []
    };
    
    // Extract various types of provided information
    // Database IDs (32 char hex strings)
    const dbIdMatches = conversationText.match(/[a-f0-9]{32}/g);
    if (dbIdMatches) {
      providedContext.database_ids = [...new Set(dbIdMatches)];
    }
    
    // Email addresses
    const emailMatches = conversationText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches) {
      providedContext.emails = [...new Set(emailMatches)];
    }
    
    // Keywords patterns
    const keywordPatterns = [
      /keywords?[:\s]+["']([^"']+)["']/gi,
      /filter[\s]+(for|by)[:\s]*["']([^"']+)["']/gi,
      /search[\s]+(for|by)[:\s]*["']([^"']+)["']/gi
    ];
    
    keywordPatterns.forEach(pattern => {
      const matches = conversationText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const extracted = match.match(/["']([^"']+)["']/)?.[1];
          if (extracted) providedContext.keywords.push(extracted);
        });
      }
    });
    
    // AI models mentioned
    const modelPatterns = [
      /llama[\w\d\-\.\/:]*\b/gi,
      /gpt[\w\d\-\.\/:]*\b/gi,
      /claude[\w\d\-\.\/:]*\b/gi,
      /gemini[\w\d\-\.\/:]*\b/gi,
      /meta[\-\/]llama[\w\d\-\.\/:]*\b/gi
    ];
    
    modelPatterns.forEach(pattern => {
      const matches = conversationText.match(pattern);
      if (matches) {
        providedContext.models.push(...matches);
      }
    });
    
    // Chat IDs (negative numbers for Telegram groups)
    const chatIdMatches = conversationText.match(/\-?\d{8,}/g);
    if (chatIdMatches) {
      providedContext.chat_ids = [...new Set(chatIdMatches)];
    }
    
    // Message templates
    const templateMatches = conversationText.match(/message[\s]*template[:\s]*["']([^"']+)["']/gi);
    if (templateMatches) {
      templateMatches.forEach(match => {
        const template = match.match(/["']([^"']+)["']/)?.[1];
        if (template) providedContext.message_templates.push(template);
      });
    }
    
    // AI prompts
    const promptMatches = conversationText.match(/prompt[:\s]*["']([^"']+)["']/gi);
    if (promptMatches) {
      promptMatches.forEach(match => {
        const prompt = match.match(/["']([^"']+)["']/)?.[1];
        if (prompt) providedContext.prompts.push(prompt);
      });
    }
    
    // Build comprehensive context info
    if (providedContext.database_ids.length > 0) {
      contextualInfo += `\n\nIMPORTANT CONTEXT FROM CONVERSATION:`;
      contextualInfo += `\n- Database IDs already provided: ${providedContext.database_ids.join(', ')}`;
      contextualInfo += `\n- DO NOT ask for database ID again - use one of these provided IDs`;
    }
    
    if (providedContext.keywords.length > 0) {
      contextualInfo += `\n- Keywords already provided: "${providedContext.keywords.join('", "')}"`;
      contextualInfo += `\n- DO NOT ask for keywords again - use the provided ones`;
    }
    
    if (providedContext.models.length > 0) {
      contextualInfo += `\n- AI Models mentioned: ${providedContext.models.join(', ')}`;
      contextualInfo += `\n- Consider using one of these models if applicable`;
    }
    
    if (providedContext.emails.length > 0) {
      contextualInfo += `\n- Email addresses mentioned: ${providedContext.emails.join(', ')}`;
      contextualInfo += `\n- Use these if relevant for email filtering or sending`;
    }
    
    if (providedContext.prompts.length > 0) {
      contextualInfo += `\n- AI Prompts provided: "${providedContext.prompts.join('", "')}"`;
      contextualInfo += `\n- Use these prompts instead of asking for new ones`;
    }
    
    if (providedContext.message_templates.length > 0) {
      contextualInfo += `\n- Message templates provided: "${providedContext.message_templates.join('", "')}"`;
      contextualInfo += `\n- Use these templates instead of asking for new ones`;
    }

  // Use Gemini Load Balancer for chat response generation via shared function
  // Create a session ID from userId for consistent conversation context
  const sessionId = `chat_${userId}`;
  
  const result = await callSharedFunction('generateResponse', {
    sessionId,
    message: userMessage,
    systemPrompt: `${systemPrompt}${contextualInfo}`,
    options: {
      model: "gemini-2.0-flash-exp",
      temperature: 0.7,
      topP: 0.8,
      maxOutputTokens: 2048
    }
  });
  
  return result.response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Chat bot function called');
    
    const { session_id, user_message, create_new_session, session_topic }: ChatRequest = await req.json();
    console.log('Request parsed:', { user_message: user_message?.slice(0, 50) + '...' });
    
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing auth header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.log('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authenticated:', user.id);

    // Generate embedding for the user message
    console.log('Generating embedding...');
    let userMessageEmbedding: number[];
    try {
      userMessageEmbedding = await generateEmbedding(user_message);
      console.log('Embedding generated successfully');
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }

    // Get or create session
    console.log('Getting/creating session...');
    let currentSessionId: string;
    try {
      currentSessionId = await getOrCreateSession(
        user.id, 
        create_new_session ? undefined : session_id, 
        session_topic
      );
      console.log('Session ready:', currentSessionId);
    } catch (error) {
      console.error('Error with session:', error);
      throw new Error(`Session error: ${error.message}`);
    }

    // Store user message
    console.log('Storing user message...');
    try {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'user',
        content: user_message,
        embedding: userMessageEmbedding
      });
      console.log('User message stored');
    } catch (error) {
      console.error('Error storing user message:', error);
      throw new Error(`Failed to store message: ${error.message}`);
    }

    // Get recent conversation history
    console.log('Getting recent messages...');
    let recentMessages: ChatMessage[];
    try {
      recentMessages = await getRecentMessages(currentSessionId, 10);
      console.log('Recent messages retrieved:', recentMessages.length);
    } catch (error) {
      console.error('Error getting recent messages:', error);
      recentMessages = []; // Continue without history
    }
    
    // Get semantically similar messages for context
    console.log('Getting similar messages...');
    let similarMessages: ChatMessage[];
    try {
      // Lower threshold from 0.75 to 0.65 for better recall as mentioned in BUG_FIXES
      similarMessages = await getSimilarMessages(userMessageEmbedding, 0.65, 5);
      console.log('Similar messages retrieved:', similarMessages.length);
    } catch (error) {
      console.error('Error getting similar messages:', error);
      similarMessages = []; // Continue without similar messages
    }
    
    // Combine messages for context (avoiding duplicates)
    const allMessages = [...recentMessages];
    const recentMessageIds = new Set(recentMessages.map((_, index) => index));
    
    similarMessages.forEach(msg => {
      if (!recentMessages.some(recent => recent.content === msg.content)) {
        allMessages.push(msg);
      }
    });

    // Generate AI response
    console.log('Generating AI response...');
    let botResponse: string;
    try {
      botResponse = await generateChatResponse(allMessages, user_message, user.id);
      console.log('AI response generated');
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }

    // Store bot response with embedding
    const botResponseEmbedding = await generateEmbedding(botResponse);
    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      role: 'assistant',
      content: botResponse,
      embedding: botResponseEmbedding
    });

    // Check if the response contains a JSON zap - simple heuristic
    let validationResult: ZapValidationResult | null = null;
    if (botResponse.includes('{') && botResponse.includes('"steps"')) {
      try {
        // Extract JSON from response (simple extraction)
        const jsonMatch = botResponse.match(/```json\n([\s\S]*?)\n```/) || 
                         botResponse.match(/```\n([\s\S]*?)\n```/) ||
                         [null, botResponse.match(/\{[\s\S]*\}/)?.[0]];
        
        if (jsonMatch?.[1]) {
          let zapData = JSON.parse(jsonMatch[1]);
          
          // Enrich zap with user's available data
          zapData = await enrichZapWithUserData(zapData, user.id);
          
          // Process any remaining secrets
          zapData = processSecretsInZap(zapData);
          
          validationResult = validateZapJson(zapData);
        }
      } catch (error) {
        console.error('Error parsing potential JSON:', error);
      }
    }

    return new Response(
      JSON.stringify({
        session_id: currentSessionId,
        reply: botResponse,
        validation: validationResult
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Chat bot error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
