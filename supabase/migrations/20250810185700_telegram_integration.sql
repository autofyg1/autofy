/*
  # Telegram Integration Tables

  1. New Tables
    - `telegram_chats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `chat_id` (text, Telegram chat ID)
      - `chat_type` (text, 'private', 'group', 'supergroup', 'channel')
      - `username` (text, optional)
      - `first_name` (text, optional)
      - `last_name` (text, optional)
      - `title` (text, optional - for groups)
      - `linked_at` (timestamptz, default now())
      - `is_active` (boolean, default true)
      - `metadata` (jsonb, additional chat info)

    - `telegram_messages`
      - `id` (uuid, primary key)
      - `chat_id` (text, Telegram chat ID)
      - `message_id` (integer, Telegram message ID)
      - `user_id` (uuid, foreign key to auth.users, nullable)
      - `from_telegram_user_id` (text, sender's Telegram user ID)
      - `from_username` (text, optional)
      - `from_first_name` (text, optional)
      - `from_last_name` (text, optional)
      - `text` (text, message text)
      - `message_type` (text, 'text', 'photo', 'document', etc.)
      - `timestamp` (timestamptz, when message was sent)
      - `created_at` (timestamptz, default now())
      - `metadata` (jsonb, additional message info)

    - `telegram_link_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `token` (text, unique token)
      - `created_at` (timestamptz, default now())
      - `expires_at` (timestamptz, default now() + interval '1 hour')
      - `used_at` (timestamptz, nullable)
      - `chat_id` (text, nullable - filled when token is used)
      - `is_used` (boolean, default false)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage only their own data
*/

-- Create telegram_chats table
CREATE TABLE IF NOT EXISTS telegram_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chat_id text NOT NULL,
  chat_type text NOT NULL,
  username text,
  first_name text,
  last_name text,
  title text,
  linked_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  UNIQUE(user_id, chat_id)
);

-- Create telegram_messages table
CREATE TABLE IF NOT EXISTS telegram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL,
  message_id integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_telegram_user_id text NOT NULL,
  from_username text,
  from_first_name text,
  from_last_name text,
  text text,
  message_type text NOT NULL DEFAULT 'text',
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(chat_id, message_id)
);

-- Create telegram_link_tokens table
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour'),
  used_at timestamptz,
  chat_id text,
  is_used boolean DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE telegram_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- Telegram chats policies
CREATE POLICY "Users can manage own telegram chats"
  ON telegram_chats
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Telegram messages policies
CREATE POLICY "Users can read their own telegram messages"
  ON telegram_messages
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM telegram_chats 
      WHERE telegram_chats.chat_id = telegram_messages.chat_id 
      AND telegram_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage telegram messages"
  ON telegram_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Telegram link tokens policies
CREATE POLICY "Users can manage own telegram link tokens"
  ON telegram_link_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read telegram link tokens"
  ON telegram_link_tokens
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update telegram link tokens"
  ON telegram_link_tokens
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS telegram_chats_user_id_idx ON telegram_chats(user_id);
CREATE INDEX IF NOT EXISTS telegram_chats_chat_id_idx ON telegram_chats(chat_id);
CREATE INDEX IF NOT EXISTS telegram_messages_chat_id_idx ON telegram_messages(chat_id);
CREATE INDEX IF NOT EXISTS telegram_messages_timestamp_idx ON telegram_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS telegram_link_tokens_token_idx ON telegram_link_tokens(token);
CREATE INDEX IF NOT EXISTS telegram_link_tokens_user_id_idx ON telegram_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS telegram_link_tokens_expires_at_idx ON telegram_link_tokens(expires_at);

-- Add trigger to automatically update updated_at for telegram_chats if needed
-- (Note: We don't have updated_at column, but if added later, this would be useful)

-- Function to clean up expired tokens (can be called via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_link_tokens 
  WHERE expires_at < now() AND is_used = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
