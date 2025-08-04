/*
  # Create zaps and zap_steps tables for workflow automation

  1. New Tables
    - `zaps`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, zap name)
      - `description` (text, optional description)
      - `is_active` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `last_run_at` (timestamptz, nullable)
      - `total_runs` (integer, default 0)
    
    - `zap_steps`
      - `id` (uuid, primary key)
      - `zap_id` (uuid, foreign key to zaps)
      - `step_order` (integer, order of execution)
      - `step_type` (text, 'trigger' or 'action')
      - `service_name` (text, e.g., 'gmail', 'notion')
      - `event_type` (text, e.g., 'new_email', 'create_page')
      - `configuration` (jsonb, step-specific config)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage only their own zaps
*/

CREATE TABLE IF NOT EXISTS zaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_run_at timestamptz,
  total_runs integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zap_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zap_id uuid REFERENCES zaps(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('trigger', 'action')),
  service_name text NOT NULL,
  event_type text NOT NULL,
  configuration jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE zaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE zap_steps ENABLE ROW LEVEL SECURITY;

-- Zaps policies
CREATE POLICY "Users can manage own zaps"
  ON zaps
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Zap steps policies
CREATE POLICY "Users can manage own zap steps"
  ON zap_steps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zaps 
      WHERE zaps.id = zap_steps.zap_id 
      AND zaps.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zaps 
      WHERE zaps.id = zap_steps.zap_id 
      AND zaps.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS zaps_user_id_idx ON zaps(user_id);
CREATE INDEX IF NOT EXISTS zaps_is_active_idx ON zaps(is_active);
CREATE INDEX IF NOT EXISTS zap_steps_zap_id_idx ON zap_steps(zap_id);
CREATE INDEX IF NOT EXISTS zap_steps_order_idx ON zap_steps(zap_id, step_order);

-- Create trigger to automatically update updated_at for zaps
CREATE TRIGGER update_zaps_updated_at
  BEFORE UPDATE ON zaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();