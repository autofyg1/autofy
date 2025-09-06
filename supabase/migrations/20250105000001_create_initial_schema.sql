-- =====================================================
-- Autofy Initial Database Schema Migration
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- 1. USER PROFILES & PREFERENCES
-- =====================================================

-- Extended user profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    credits_used INTEGER DEFAULT 0,
    credits_limit INTEGER DEFAULT 1000,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- =====================================================
-- 2. SERVICE INTEGRATIONS
-- =====================================================

-- Integration templates (system-wide)
CREATE TABLE integration_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    template_name TEXT NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL,
    required_scopes TEXT[],
    setup_guide TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_name, template_name)
);

-- User integrations
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL CHECK (service_name IN ('gmail', 'notion', 'telegram', 'openai', 'anthropic', 'gemini', 'openrouter')),
    display_name TEXT NOT NULL,
    credentials JSONB NOT NULL,
    configuration JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'expired')),
    last_tested_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, service_name)
);

-- =====================================================
-- 3. CHAT SYSTEM (for AI workflow creation)
-- =====================================================

-- Chat sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_name TEXT,
    intent TEXT,
    context JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    workflow_id UUID, -- Will be set after workflows table is created
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages  
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    embedding vector(1536), -- For semantic search
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. WORKFLOWS & AUTOMATION
-- =====================================================

-- Workflow templates (system-wide)
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    required_integrations TEXT[] NOT NULL,
    template_data JSONB NOT NULL,
    preview_image TEXT,
    use_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'email')),
    trigger_config JSONB DEFAULT '{}'::JSONB,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    average_duration INTERVAL,
    created_from_chat BOOLEAN DEFAULT FALSE,
    chat_session_id UUID REFERENCES chat_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual workflow steps
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('trigger', 'action', 'condition', 'delay')),
    service_name TEXT NOT NULL,
    action_name TEXT NOT NULL,
    configuration JSONB NOT NULL,
    conditions JSONB DEFAULT '{}'::JSONB,
    error_handling JSONB DEFAULT '{"retry": true, "max_retries": 3}'::JSONB,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, step_order)
);

-- Workflow execution logs
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trigger_data JSONB DEFAULT '{}'::JSONB,
    execution_status TEXT NOT NULL CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration INTERVAL,
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    failed_steps INTEGER DEFAULT 0,
    step_results JSONB DEFAULT '[]'::JSONB,
    error_message TEXT,
    error_step_id UUID REFERENCES workflow_steps(id),
    metadata JSONB DEFAULT '{}'::JSONB,
    credits_used INTEGER DEFAULT 0
);

-- =====================================================
-- 5. SYSTEM MANAGEMENT
-- =====================================================

-- API key management
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['read']::TEXT[],
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key_name)
);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}'::JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System health monitoring
CREATE TABLE system_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    response_time INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add the workflow_id FK to chat_sessions (circular reference)
ALTER TABLE chat_sessions ADD CONSTRAINT fk_chat_sessions_workflow 
    FOREIGN KEY (workflow_id) REFERENCES workflows(id);

-- Add the created_at to workflow_executions 
ALTER TABLE workflow_executions
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User data lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_integrations_user_service ON integrations(user_id, service_name);
CREATE INDEX idx_integrations_status ON integrations(status) WHERE status != 'active';

-- Workflow queries
CREATE INDEX idx_workflows_user_status ON workflows(user_id, status);
CREATE INDEX idx_workflow_steps_workflow_order ON workflow_steps(workflow_id, step_order);

-- Execution queries  
CREATE INDEX idx_executions_workflow_created ON workflow_executions(workflow_id, created_at DESC);
CREATE INDEX idx_executions_user_status ON workflow_executions(user_id, execution_status);
CREATE INDEX idx_executions_status_started ON workflow_executions(execution_status, started_at DESC);

-- Chat queries
CREATE INDEX idx_chat_sessions_user_created ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_session_created ON chat_messages(session_id, created_at);

-- Vector similarity search (requires pgvector extension)
CREATE INDEX idx_chat_messages_embedding ON chat_messages USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Template queries
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_featured ON workflow_templates(is_featured) WHERE is_featured = TRUE;

-- Audit and monitoring
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_system_status_service_checked ON system_status(service_name, checked_at DESC);

-- =====================================================
-- CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public tables (no RLS)
-- integration_templates, workflow_templates, system_status are accessible to authenticated users
