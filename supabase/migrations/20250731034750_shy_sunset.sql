/*
  # Create integrations table for user credentials

  1. New Tables
    - `integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `service_name` (text, e.g., "gmail", "notion")
      - `credentials` (jsonb, stores access tokens or mock values)
      - `connected_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `integrations` table
    - Add policy for users to manage only their own integrations
    - Add policy for authenticated users to read/write their data
*/

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name text NOT NULL,
  credentials jsonb DEFAULT '{}',
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own integrations
CREATE POLICY "Users can manage own integrations"
  ON integrations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to read their own integrations
CREATE POLICY "Users can read own integrations"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own integrations
CREATE POLICY "Users can insert own integrations"
  ON integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own integrations
CREATE POLICY "Users can update own integrations"
  ON integrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON integrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
CREATE INDEX IF NOT EXISTS integrations_service_name_idx ON integrations(service_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();