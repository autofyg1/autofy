-- =====================================================
-- Row Level Security Policies for Autofy
-- =====================================================

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles  
    FOR UPDATE USING (auth.uid() = id);

-- Service role can manage all profiles
CREATE POLICY "Service role can manage profiles" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- USER PREFERENCES POLICIES  
-- =====================================================

CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage preferences" ON user_preferences
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- INTEGRATIONS POLICIES
-- =====================================================

-- Users can view their integrations (but credentials are filtered)
CREATE POLICY "Users can view own integrations" ON integrations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create integrations
CREATE POLICY "Users can create own integrations" ON integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their integrations  
CREATE POLICY "Users can update own integrations" ON integrations
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their integrations
CREATE POLICY "Users can delete own integrations" ON integrations
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all integrations
CREATE POLICY "Service role can manage integrations" ON integrations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- WORKFLOWS POLICIES
-- =====================================================

CREATE POLICY "Users can manage own workflows" ON workflows
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage workflows" ON workflows
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- WORKFLOW STEPS POLICIES
-- =====================================================

-- Users can manage steps for their own workflows
CREATE POLICY "Users can manage own workflow steps" ON workflow_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workflows 
            WHERE workflows.id = workflow_steps.workflow_id 
            AND workflows.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage workflow steps" ON workflow_steps
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- WORKFLOW EXECUTIONS POLICIES
-- =====================================================

-- Users can view their own execution logs
CREATE POLICY "Users can view own executions" ON workflow_executions
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update execution records
CREATE POLICY "Service role can manage executions" ON workflow_executions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- CHAT SESSIONS POLICIES
-- =====================================================

CREATE POLICY "Users can manage own chat sessions" ON chat_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage chat sessions" ON chat_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- CHAT MESSAGES POLICIES
-- =====================================================

-- Users can view messages from their sessions
CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Users can insert messages to their sessions
CREATE POLICY "Users can create own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Service role can manage all messages (for AI responses and embeddings)
CREATE POLICY "Service role can manage chat messages" ON chat_messages
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- API KEYS POLICIES
-- =====================================================

CREATE POLICY "Users can manage own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage API keys" ON api_keys
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================

-- Users can view logs related to their actions
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert audit logs
CREATE POLICY "Service role can manage audit logs" ON audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- PUBLIC TABLES (No RLS, but require authentication)
-- =====================================================

-- Integration templates are readable by authenticated users
CREATE POLICY "Authenticated users can view integration templates" ON integration_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Workflow templates are readable by authenticated users
CREATE POLICY "Authenticated users can view workflow templates" ON workflow_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- System status is readable by authenticated users
CREATE POLICY "Authenticated users can view system status" ON system_status
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can manage public tables
CREATE POLICY "Service role can manage integration templates" ON integration_templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage workflow templates" ON workflow_templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage system status" ON system_status
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
