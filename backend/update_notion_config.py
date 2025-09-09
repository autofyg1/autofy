#!/usr/bin/env python3

import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

try:
    from supabase import create_client
    print("✅ Supabase imported successfully")
except ImportError as e:
    print(f"❌ Failed to import supabase: {e}")
    sys.exit(1)

def main():
    supabase_url = os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Target workflow ID from frontend logs
        workflow_id = '573bc639-6ebf-4523-a595-c6af80976394'
        
        # Get existing steps
        existing_steps = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).execute()
        print(f"📋 Found {len(existing_steps.data)} steps")
        
        # Find the Notion step
        notion_step = None
        for step in existing_steps.data:
            if step['service_name'] == 'notion':
                notion_step = step
                break
        
        if notion_step:
            print(f"🔧 Updating Notion step: {notion_step['id']}")
            
            # Update with proper configuration
            updated_config = {
                'database_id': 'sample_database_id_123',
                'title': 'New Email Alert from {{email.subject}}',
                'content': 'Urgent email received from {{email.from}}\n\nContent: {{email.body}}',
                'properties': {
                    'Status': 'New',
                    'Priority': 'High',
                    'Source': 'Gmail Automation'
                }
            }
            
            # Update the step
            result = supabase.table('workflow_steps').update({
                'configuration': updated_config
            }).eq('id', notion_step['id']).execute()
            
            print(f"✅ Updated Notion step configuration")
            print(f"📋 New config: {json.dumps(updated_config, indent=2)}")
            
        else:
            print("❌ No Notion step found")
        
        # Verify the update
        final_steps = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).execute()
        for step in final_steps.data:
            if step['service_name'] == 'notion':
                print(f"✅ Verified Notion step config: {step['configuration']}")
                break
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
