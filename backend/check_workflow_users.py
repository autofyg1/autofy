#!/usr/bin/env python3
from config.database import get_supabase

print('Checking workflow user_id assignments...')
supabase = get_supabase()

workflows = supabase.table('workflows').select('id, name, user_id').execute()
print(f'Found {len(workflows.data)} workflows:')

for workflow in workflows.data:
    print(f'  - {workflow["name"]} (ID: {workflow["id"]})')
    print(f'    User ID: {workflow.get("user_id", "MISSING!")}')
    print()

print("\nChecking Gmail integrations again:")
gmail_integrations = supabase.table('integrations').select('user_id, service_name').eq('service_name', 'gmail').execute()
valid_user_ids = [integration['user_id'] for integration in gmail_integrations.data]
print(f"Valid Gmail user IDs: {valid_user_ids}")

print("\nAnalysis:")
for workflow in workflows.data:
    workflow_user_id = workflow.get("user_id")
    if workflow_user_id:
        if workflow_user_id in valid_user_ids:
            print(f"✅ {workflow['name']} - User has Gmail integration")
        else:
            print(f"❌ {workflow['name']} - User {workflow_user_id} has NO Gmail integration")
    else:
        print(f"❌ {workflow['name']} - No user_id assigned!")
