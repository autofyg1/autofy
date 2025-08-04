import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Integration {
  id: string;
  user_id: string;
  service_name: string;
  credentials: Record<string, any>;
  connected_at: string;
  updated_at: string;
}

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

export interface Database {
  public: {
    Tables: {
      integrations: {
        Row: Integration;
        Insert: Omit<Integration, 'id' | 'connected_at' | 'updated_at'>;
        Update: Partial<Omit<Integration, 'id' | 'user_id' | 'connected_at'>>;
      };
      zaps: {
        Row: Zap;
        Insert: Omit<Zap, 'id' | 'created_at' | 'updated_at' | 'last_run_at' | 'total_runs'>;
        Update: Partial<Omit<Zap, 'id' | 'user_id' | 'created_at'>>;
      };
      zap_steps: {
        Row: ZapStep;
        Insert: Omit<ZapStep, 'id' | 'created_at'>;
        Update: Partial<Omit<ZapStep, 'id' | 'zap_id' | 'created_at'>>;
      };
    };
  };
}