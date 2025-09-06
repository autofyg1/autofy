-- =====================================================
-- Functions for Profile Management
-- =====================================================

-- Function to create user profile when they sign up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile when user signs up
CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Function to handle profile updates from auth
CREATE OR REPLACE FUNCTION update_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET 
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name),
        avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', profiles.avatar_url),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile when user data changes
CREATE TRIGGER update_profile_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile();

-- =====================================================
-- Helper Functions for Credentials
-- =====================================================

-- Function to safely select integration without exposing credentials
CREATE OR REPLACE FUNCTION get_user_integrations(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    service_name TEXT,
    display_name TEXT,
    status TEXT,
    last_tested_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.service_name,
        i.display_name,
        i.status,
        i.last_tested_at,
        i.error_message,
        i.metadata,
        i.created_at,
        i.updated_at
    FROM integrations i
    WHERE i.user_id = user_uuid
    AND i.user_id = auth.uid(); -- Additional security check
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for backend to get full integration details (including credentials)
CREATE OR REPLACE FUNCTION get_integration_with_credentials(user_uuid UUID, service TEXT)
RETURNS TABLE (
    id UUID,
    service_name TEXT,
    display_name TEXT,
    credentials JSONB,
    configuration JSONB,
    status TEXT,
    metadata JSONB
) AS $$
BEGIN
    -- This function can only be called with service role
    IF auth.jwt() ->> 'role' != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: service role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        i.id,
        i.service_name,
        i.display_name,
        i.credentials,
        i.configuration,
        i.status,
        i.metadata
    FROM integrations i
    WHERE i.user_id = user_uuid
    AND i.service_name = service;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Audit Log Helper Function
-- =====================================================

-- Function to log user actions
CREATE OR REPLACE FUNCTION log_user_action(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Vector Search Function for Chat Messages
-- =====================================================

-- Function to search similar chat messages using embeddings
CREATE OR REPLACE FUNCTION search_similar_messages(
    query_embedding vector(1536),
    p_user_id UUID,
    similarity_threshold FLOAT DEFAULT 0.8,
    max_results INT DEFAULT 5
)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.content,
        (cm.embedding <=> query_embedding) AS similarity,
        cm.created_at
    FROM chat_messages cm
    JOIN chat_sessions cs ON cs.id = cm.session_id
    WHERE cs.user_id = p_user_id
    AND cm.embedding IS NOT NULL
    AND (cm.embedding <=> query_embedding) < (1 - similarity_threshold)
    ORDER BY cm.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Workflow Statistics Helper Functions
-- =====================================================

-- Function to update workflow execution statistics
CREATE OR REPLACE FUNCTION update_workflow_stats(
    p_workflow_id UUID,
    p_success BOOLEAN,
    p_duration INTERVAL
) RETURNS VOID AS $$
BEGIN
    UPDATE workflows
    SET 
        total_executions = total_executions + 1,
        successful_executions = CASE WHEN p_success THEN successful_executions + 1 ELSE successful_executions END,
        failed_executions = CASE WHEN NOT p_success THEN failed_executions + 1 ELSE failed_executions END,
        last_executed_at = NOW(),
        average_duration = CASE 
            WHEN average_duration IS NULL THEN p_duration
            ELSE ((average_duration * (total_executions - 1)) + p_duration) / total_executions
        END,
        updated_at = NOW()
    WHERE id = p_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user workflow statistics
CREATE OR REPLACE FUNCTION get_user_workflow_stats(p_user_id UUID)
RETURNS TABLE (
    total_workflows BIGINT,
    active_workflows BIGINT,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_workflows,
        COUNT(*) FILTER (WHERE status = 'active') as active_workflows,
        COALESCE(SUM(w.total_executions), 0) as total_executions,
        COALESCE(SUM(w.successful_executions), 0) as successful_executions,  
        COALESCE(SUM(w.failed_executions), 0) as failed_executions,
        CASE 
            WHEN SUM(w.total_executions) > 0 THEN 
                ROUND((SUM(w.successful_executions)::NUMERIC / SUM(w.total_executions)) * 100, 2)
            ELSE 0
        END as success_rate
    FROM workflows w
    WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
