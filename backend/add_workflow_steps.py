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
    print("Try: pip install supabase")
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
        
        # Check if workflow exists
        workflow_result = supabase.table('workflows').select('*').eq('id', workflow_id).execute()
        if not workflow_result.data:
            print(f"❌ Workflow {workflow_id} not found")
            return
        
        print(f"✅ Found workflow: {workflow_result.data[0]['name']}")
        
        # Check existing steps
        existing_steps = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).execute()
        print(f"📋 Current steps: {len(existing_steps.data)}")
        
        if len(existing_steps.data) == 0:
            print("🔧 Adding sample workflow steps...")
            
            # Add trigger step
            trigger_step = {
                'workflow_id': workflow_id,
                'step_order': 1,
                'step_type': 'trigger',
                'service_name': 'gmail',
                'action_name': 'new_email',
                'configuration': {
                    'keywords': 'urgent',
                    'from_email': '',
                    'subject_contains': ''
                },
                'conditions': {},
                'error_handling': {}
            }
            
            # Add action step
            action_step = {
                'workflow_id': workflow_id,
                'step_order': 2,
                'step_type': 'action',
                'service_name': 'notion',
                'action_name': 'create_page',
                'configuration': {
                    'database_id': 'sample_database_id_123',
                    'title': 'New Email Alert',
                    'content': 'Urgent email received',
                    'properties': {
                        'Status': 'New',
                        'Priority': 'High'
                    }
                },
                'conditions': {},
                'error_handling': {}
            }
            
            # Insert steps
            result1 = supabase.table('workflow_steps').insert(trigger_step).execute()
            result2 = supabase.table('workflow_steps').insert(action_step).execute()
            
            print(f"✅ Added trigger step: {result1.data[0]['id']}")
            print(f"✅ Added action step: {result2.data[0]['id']}")
            
        else:
            print("📋 Steps already exist:")
            for step in existing_steps.data:
                print(f"  - Step {step['step_order']}: {step['action_name']}")
        
        # Verify final state
        final_steps = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).execute()
        print(f"\n🎉 Final step count: {len(final_steps.data)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
