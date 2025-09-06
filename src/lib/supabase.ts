import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh
    autoRefreshToken: true,
    // Persist auth session to localStorage
    persistSession: true,
    // Detect session from URL on signin
    detectSessionInUrl: true,
    // Increase refresh margin to refresh tokens earlier
    refreshTokenMargin: 60 // seconds
  },
  // Add retry configuration for better resilience
  global: {
    headers: {
      'x-application-name': 'autofy-frontend'
    }
  }
});

// Make supabase available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

// Types for the new database schema
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  timezone: string;
  plan_type: string;
  credits_used: number;
  credits_limit: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  user_id: string;
  service_name: string;
  display_name: string;
  credentials: Record<string, any>;
  configuration: Record<string, any>;
  status: string;
  last_tested_at?: string;
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  tags: string[];
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  last_executed_at?: string;
  created_from_chat: boolean;
  chat_session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  step_type: string;
  service_name: string;
  action_name: string;
  configuration: Record<string, any>;
  conditions: Record<string, any>;
  error_handling: Record<string, any>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  user_id: string;
  trigger_data: Record<string, any>;
  execution_status: string;
  started_at: string;
  completed_at?: string;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  step_results: any[];
  error_message?: string;
  error_step_id?: string;
  metadata: Record<string, any>;
  credits_used: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_name?: string;
  intent?: string;
  context: Record<string, any>;
  status: string;
  workflow_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Legacy types for backward compatibility
export interface Zap extends Workflow {
  is_active: boolean;
  total_runs: number;
  last_run_at?: string;
  steps?: ZapStep[];
}

export interface ZapStep extends WorkflowStep {
  zap_id: string;
  event_type: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      integrations: {
        Row: Integration;
        Insert: Omit<Integration, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Integration, 'id' | 'user_id' | 'created_at'>>;
      };
      workflows: {
        Row: Workflow;
        Insert: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'total_executions' | 'successful_executions' | 'failed_executions' | 'last_executed_at'>;
        Update: Partial<Omit<Workflow, 'id' | 'user_id' | 'created_at'>>;
      };
      workflow_steps: {
        Row: WorkflowStep;
        Insert: Omit<WorkflowStep, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkflowStep, 'id' | 'workflow_id' | 'created_at'>>;
      };
      workflow_executions: {
        Row: WorkflowExecution;
        Insert: Omit<WorkflowExecution, 'id' | 'created_at'>;
        Update: Partial<Omit<WorkflowExecution, 'id' | 'workflow_id' | 'user_id'>>;
      };
      chat_sessions: {
        Row: ChatSession;
        Insert: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatSession, 'id' | 'user_id' | 'created_at'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at'>;
        Update: Partial<Omit<ChatMessage, 'id' | 'session_id' | 'created_at'>>;
      };
    };
  };
}
