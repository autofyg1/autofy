-- Create workflow_execution_logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    execution_id UUID,
    level VARCHAR(20) NOT NULL CHECK (level IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_workflow_id ON workflow_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_user_id ON workflow_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution_id ON workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_created_at ON workflow_execution_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_level ON workflow_execution_logs(level);

-- Enable RLS (Row Level Security)
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own workflow execution logs" ON workflow_execution_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert workflow execution logs" ON workflow_execution_logs
    FOR INSERT WITH CHECK (true);

-- Add execution tracking columns to workflows table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflows' AND column_name='total_executions') THEN
        ALTER TABLE workflows ADD COLUMN total_executions INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflows' AND column_name='last_executed_at') THEN
        ALTER TABLE workflows ADD COLUMN last_executed_at TIMESTAMPTZ;
    END IF;
END
$$;
