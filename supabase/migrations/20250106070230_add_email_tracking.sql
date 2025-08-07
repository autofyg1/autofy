/*
  # Add email processing tracking

  1. New Table
    - `processed_emails`
      - `id` (uuid, primary key)
      - `email_id` (text, Gmail message ID)
      - `zap_id` (uuid, foreign key to zaps)
      - `user_id` (uuid, foreign key to auth.users)
      - `processed_at` (timestamptz, default now())
      - `email_subject` (text, for reference)
      - `email_sender` (text, for reference)

  2. Indexes
    - Unique index on (email_id, zap_id) to prevent duplicate processing
    - Index on user_id for efficient queries
    - Index on processed_at for cleanup queries

  3. Security
    - Enable RLS
    - Users can only access their own processed emails
*/

CREATE TABLE IF NOT EXISTS processed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id text NOT NULL,
  zap_id uuid REFERENCES zaps(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  processed_at timestamptz DEFAULT now(),
  email_subject text,
  email_sender text
);

-- Create unique index to prevent duplicate processing
CREATE UNIQUE INDEX IF NOT EXISTS processed_emails_unique_idx 
ON processed_emails(email_id, zap_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS processed_emails_user_id_idx ON processed_emails(user_id);
CREATE INDEX IF NOT EXISTS processed_emails_processed_at_idx ON processed_emails(processed_at);
CREATE INDEX IF NOT EXISTS processed_emails_zap_id_idx ON processed_emails(zap_id);

-- Enable Row Level Security
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own processed emails"
  ON processed_emails
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add cleanup function to remove old records (optional, keeps last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_processed_emails()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM processed_emails 
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$;
