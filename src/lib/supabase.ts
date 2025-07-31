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

export interface Database {
  public: {
    Tables: {
      integrations: {
        Row: Integration;
        Insert: Omit<Integration, 'id' | 'connected_at' | 'updated_at'>;
        Update: Partial<Omit<Integration, 'id' | 'user_id' | 'connected_at'>>;
      };
    };
  };
}