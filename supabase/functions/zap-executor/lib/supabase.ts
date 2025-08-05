import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Create Supabase client instance (will be reused across services)
export const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Types for our database
export interface Integration {
  id: string
  user_id: string
  service_name: string
  credentials: Record<string, any>
  connected_at: string
  updated_at: string
}

export interface Zap {
  id: string
  user_id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_run_at?: string
  total_runs: number
  steps?: ZapStep[]
}

export interface ZapStep {
  id: string
  zap_id: string
  step_order: number
  step_type: 'trigger' | 'action'
  service_name: string
  event_type: string
  configuration: Record<string, any>
  created_at: string
}
