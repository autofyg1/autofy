-- =====================================================
-- Initial Data Seeds for Autofy
-- =====================================================

-- =====================================================
-- INTEGRATION TEMPLATES
-- =====================================================

INSERT INTO integration_templates (service_name, template_name, description, configuration, required_scopes, setup_guide) VALUES
-- Gmail Templates
('gmail', 'basic_gmail', 'Basic Gmail integration for reading and sending emails', 
 '{"scopes": ["https://www.googleapis.com/auth/gmail.modify"], "auth_type": "oauth2"}',
 ARRAY['https://www.googleapis.com/auth/gmail.modify'],
 'Configure Gmail OAuth with your Google Cloud Console credentials'),

-- Notion Templates  
('notion', 'basic_notion', 'Basic Notion integration for database operations',
 '{"auth_type": "oauth2", "version": "2022-06-28"}',
 ARRAY['read', 'insert'],
 'Create a Notion integration at https://www.notion.so/my-integrations'),

-- Telegram Templates
('telegram', 'bot_integration', 'Telegram bot integration for sending messages',
 '{"auth_type": "bot_token"}',
 ARRAY[]::TEXT[],
 'Create a bot via @BotFather on Telegram and get your bot token'),

-- OpenAI Templates
('openai', 'gpt_integration', 'OpenAI GPT integration for AI text processing',
 '{"api_base": "https://api.openai.com/v1", "default_model": "gpt-3.5-turbo"}',
 ARRAY[]::TEXT[],
 'Get your API key from https://platform.openai.com/api-keys'),

-- Anthropic Templates
('anthropic', 'claude_integration', 'Anthropic Claude integration for AI processing',
 '{"api_base": "https://api.anthropic.com", "default_model": "claude-3-sonnet-20240229"}',
 ARRAY[]::TEXT[],
 'Get your API key from https://console.anthropic.com'),

-- Gemini Templates
('gemini', 'gemini_integration', 'Google Gemini integration for AI processing',
 '{"api_base": "https://generativelanguage.googleapis.com", "default_model": "gemini-pro"}',
 ARRAY[]::TEXT[],
 'Get your API key from https://makersuite.google.com/app/apikey'),

-- OpenRouter Templates
('openrouter', 'openrouter_integration', 'OpenRouter integration for multiple AI models',
 '{"api_base": "https://openrouter.ai/api/v1", "default_model": "meta-llama/llama-3.2-3b-instruct:free"}',
 ARRAY[]::TEXT[],
 'Get your API key from https://openrouter.ai/keys');

-- =====================================================
-- WORKFLOW TEMPLATES
-- =====================================================

INSERT INTO workflow_templates (name, description, category, difficulty, required_integrations, template_data, is_featured) VALUES

-- Gmail to Notion Template
('Save Important Emails to Notion', 'Automatically save emails with specific keywords to a Notion database', 'productivity', 'beginner',
 ARRAY['gmail', 'notion'],
 '{
   "trigger": {
     "type": "manual",
     "service": "gmail",
     "action": "fetch",
     "config": {
       "keywords": "important,urgent",
       "max_results": 10
     }
   },
   "steps": [
     {
       "step_type": "action",
       "service_name": "notion",
       "action_name": "create_page",
       "configuration": {
         "database_id": "{{user_input:notion_database_id}}",
         "title": "📧 {{subject}}",
         "content": "**From:** {{sender}}\n**Date:** {{timestamp}}\n\n{{body}}"
       }
     }
   ]
 }'::jsonb,
 true),

-- AI Email Summarization Template
('AI Email Summarizer with Telegram', 'AI processes emails and sends summaries to Telegram', 'ai', 'intermediate',
 ARRAY['gmail', 'openrouter', 'telegram'],
 '{
   "trigger": {
     "type": "manual", 
     "service": "gmail",
     "action": "fetch",
     "config": {
       "keywords": "{{user_input:email_keywords}}",
       "max_results": 5
     }
   },
   "steps": [
     {
       "step_type": "action",
       "service_name": "ai",
       "action_name": "process",
       "configuration": {
         "provider": "openrouter",
         "model": "meta-llama/llama-3.2-3b-instruct:free",
         "prompt": "Summarize this email in 2-3 bullet points: {{body}}",
         "temperature": 0.3
       }
     },
     {
       "step_type": "action", 
       "service_name": "telegram",
       "action_name": "send",
       "configuration": {
         "message": "📧 Email Summary: {{subject}}\n\n{{ai_content}}\n\nFrom: {{sender}}"
       }
     }
   ]
 }'::jsonb,
 true),

-- Auto Reply Template
('Smart Email Auto-Reply', 'AI generates and sends automatic email replies', 'automation', 'advanced',
 ARRAY['gmail', 'openai'],
 '{
   "trigger": {
     "type": "manual",
     "service": "gmail", 
     "action": "fetch",
     "config": {
       "keywords": "{{user_input:trigger_keywords}}",
       "max_results": 3
     }
   },
   "steps": [
     {
       "step_type": "action",
       "service_name": "ai",
       "action_name": "process", 
       "configuration": {
         "provider": "openai",
         "model": "gpt-3.5-turbo",
         "prompt": "Generate a professional email reply to: {{body}}",
         "temperature": 0.7
       }
     },
     {
       "step_type": "action",
       "service_name": "gmail",
       "action_name": "reply",
       "configuration": {
         "body": "{{ai_content}}",
         "is_html": false
       }
     }
   ]
 }'::jsonb,
 true),

-- Daily Summary Template  
('Daily AI Report', 'Generate daily summaries of your activities', 'reporting', 'intermediate',
 ARRAY['notion', 'openrouter', 'telegram'],
 '{
   "trigger": {
     "type": "scheduled",
     "config": {
       "schedule": "daily",
       "time": "09:00"
     }
   },
   "steps": [
     {
       "step_type": "action",
       "service_name": "notion", 
       "action_name": "query_database",
       "configuration": {
         "database_id": "{{user_input:tasks_database_id}}",
         "filter": {
           "property": "Date",
           "date": {
             "equals": "today"
           }
         }
       }
     },
     {
       "step_type": "action",
       "service_name": "ai",
       "action_name": "process",
       "configuration": {
         "provider": "openrouter", 
         "model": "meta-llama/llama-3.2-3b-instruct:free",
         "prompt": "Create a daily summary report from this data: {{step_1_output}}",
         "temperature": 0.5
       }
     },
     {
       "step_type": "action",
       "service_name": "telegram",
       "action_name": "send", 
       "configuration": {
         "message": "📊 Daily Report\n\n{{ai_content}}"
       }
     }
   ]
 }'::jsonb,
 false);

-- =====================================================
-- SYSTEM STATUS INITIAL DATA
-- =====================================================

INSERT INTO system_status (service_name, status, response_time, metadata) VALUES
('database', 'healthy', 25, '{"version": "PostgreSQL 15", "connections": 10}'),
('langchain_backend', 'healthy', 150, '{"version": "1.0.0", "tools": 15}'),
('gmail_api', 'healthy', 300, '{"quota_remaining": 95}'),
('notion_api', 'healthy', 200, '{"rate_limit": "ok"}'), 
('telegram_api', 'healthy', 100, '{"bot_status": "active"}'),
('openai_api', 'healthy', 500, '{"model": "gpt-3.5-turbo"}'),
('openrouter_api', 'healthy', 400, '{"free_models": 7}');

-- =====================================================
-- DEFAULT USER PREFERENCES
-- =====================================================

-- Function to set default preferences for new users
CREATE OR REPLACE FUNCTION set_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default preferences for new user
    INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES
    (NEW.id, 'theme', '"light"'),
    (NEW.id, 'notifications_email', 'true'),  
    (NEW.id, 'notifications_browser', 'true'),
    (NEW.id, 'default_ai_provider', '"openrouter"'),
    (NEW.id, 'workflow_execution_limit', '100'),
    (NEW.id, 'auto_save_workflows', 'true'),
    (NEW.id, 'show_onboarding', 'true'),
    (NEW.id, 'timezone', '"UTC"');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set default preferences
CREATE TRIGGER set_default_preferences_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_default_user_preferences();

-- =====================================================
-- SAMPLE CHAT MESSAGES FOR TESTING
-- =====================================================

-- Note: In production, you wouldn't seed chat messages
-- This is just for development/testing purposes

-- Create a sample chat session for testing (this would normally be created by users)
-- INSERT INTO chat_sessions (id, user_id, session_name, intent, status) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', '00000000-0000-0000-0000-000000000000', 'Test Session', 'workflow_creation', 'active');

-- =====================================================
-- UPDATE TEMPLATE USE COUNTS (for popular templates)
-- =====================================================

UPDATE workflow_templates 
SET use_count = FLOOR(RANDOM() * 50 + 10)::INTEGER 
WHERE is_featured = true;
