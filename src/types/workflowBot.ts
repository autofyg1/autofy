// Type definitions for the Autofy Workflow Bot

export interface ChatSession {
  id: string;
  user_id: string;
  topic: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  embedding?: number[];
  created_at: string;
}

export interface ChatRequest {
  session_id?: string;
  user_message: string;
  create_new_session?: boolean;
  session_topic?: string;
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  validation?: ZapValidationResult;
}

export interface ZapValidationResult {
  isValid: boolean;
  errors: string[];
  zapData?: ZapWorkflow;
  zapCreated?: boolean;
  zapInfo?: any;
}

export interface ZapWorkflow {
  name: string;
  description?: string;
  steps: ZapStep[];
}

export interface ZapStep {
  step_type: 'trigger' | 'action';
  service_name: string;
  event_type: string;
  configuration: Record<string, any>;
}

export interface SecretReference {
  key: string;
  field: string;
  stepIndex: number;
  originalValue: string;
}

export interface SecretsValidationResult {
  isValid: boolean;
  errors: string[];
  secretsFound: SecretReference[];
  processedZap: ZapWorkflow;
}

// Service-specific configuration interfaces
export interface GmailTriggerConfig {
  keywords?: string;
  from_email?: string;
}

export interface GmailActionConfig {
  to_email?: string;
  subject_template?: string;
  body_template: string;
  custom_to_email?: string;
  is_html?: string;
}

export interface NotionConfig {
  database_id?: string;
  page_id?: string;
  title_template: string;
  content_template?: string;
}

export interface OpenRouterConfig {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

export interface TelegramConfig {
  message_title?: string;
  message_template?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: string;
  disable_notification?: string;
  chat_id?: string;
}

// Template variable types
export interface TemplateVariables {
  // Always available
  subject?: string;
  sender?: string;
  body?: string;
  timestamp?: string;
  date?: string;
  
  // Available after AI processing
  ai_content?: string;
  ai_model?: string;
  ai_processed_at?: string;
}

// Supported service types
export type SupportedService = 'gmail' | 'notion' | 'openrouter' | 'telegram';

export type GmailEventType = 'new_email' | 'send_email' | 'send_reply';
export type NotionEventType = 'create_page';
export type OpenRouterEventType = 'process_with_ai';
export type TelegramEventType = 'send_message';

export type EventType = GmailEventType | NotionEventType | OpenRouterEventType | TelegramEventType;

// Bot conversation state
export interface BotConversationState {
  currentStep: 'intent' | 'requirements' | 'configuration' | 'validation' | 'creation';
  collectedData: Partial<ZapWorkflow>;
  missingFields: string[];
  errors: string[];
}

// Analytics types
export interface ConversationAnalytics {
  session_count: number;
  message_count: number;
  zap_creation_rate: number;
  popular_services: Array<{ service: string; count: number }>;
  common_intents: Array<{ intent: string; count: number }>;
}
