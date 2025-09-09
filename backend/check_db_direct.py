#!/usr/bin/env python3

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables first
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
    
    print(f"🔗 Supabase URL: {supabase_url}")
    print(f"🔑 Service Key: {'***' + supabase_key[-10:] if supabase_key else 'None'}")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Supabase client created")
        
        # Check workflows
        print("\n📋 Checking workflows...")
        workflows_result = supabase.table('workflows').select('*').execute()
        print(f"Found {len(workflows_result.data)} workflows:")
        for workflow in workflows_result.data:
            print(f"  - {workflow['name']} (ID: {workflow['id']})")
        
        # Check workflow steps
        print("\n🔧 Checking workflow steps...")
        steps_result = supabase.table('workflow_steps').select('*').execute()
        print(f"Found {len(steps_result.data)} workflow steps:")
        for step in steps_result.data:
            print(f"  - Step {step['step_order']} for workflow {step['workflow_id']}: {step['action_name']}")
        
        # Check specific workflow
        target_workflow_id = '573bc639-6ebf-4523-a595-c6af80976394'
        print(f"\n🎯 Checking steps for workflow {target_workflow_id}...")
        specific_steps = supabase.table('workflow_steps').select('*').eq('workflow_id', target_workflow_id).execute()
        print(f"Found {len(specific_steps.data)} steps for this workflow:")
        for step in specific_steps.data:
            print(f"  - Step {step['step_order']}: {step['step_type']} - {step['action_name']}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
