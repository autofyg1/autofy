-- Fix existing zap configurations to use page_id instead of database_id
-- for the specific ID that's causing issues

-- Update zap_steps where database_id is actually a page ID
UPDATE zap_steps 
SET configuration = jsonb_set(
    jsonb_set(
        configuration, 
        '{page_id}', 
        configuration->'database_id'
    ),
    '{database_id}',
    'null'::jsonb
)
WHERE service_name = 'notion' 
  AND event_type = 'create_page'
  AND configuration->>'database_id' = '245c6d54-3dcf-805b-9b0e-f5c372f58e3c';

-- Remove the database_id field entirely since it's null now
UPDATE zap_steps 
SET configuration = configuration - 'database_id'
WHERE service_name = 'notion' 
  AND event_type = 'create_page'
  AND configuration->'database_id' = 'null'::jsonb;

-- Verify the changes
SELECT 
    id,
    service_name,
    event_type,
    configuration
FROM zap_steps 
WHERE service_name = 'notion' 
  AND event_type = 'create_page';
