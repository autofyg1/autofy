-- Add is_active column to workflows table
ALTER TABLE workflows ADD COLUMN is_active BOOLEAN DEFAULT false;

-- Update existing workflows to be inactive by default
UPDATE workflows SET is_active = false WHERE is_active IS NULL;

-- Add index for better performance on active workflow queries
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'workflows' AND column_name = 'is_active';
