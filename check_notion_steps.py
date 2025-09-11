#!/usr/bin/env python3
"""
Check Notion workflow steps configuration
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from config.database import get_supabase
import json

def main():
    try:
        supabase = get_supabase()
        
        print("=== CHECKING NOTION WORKFLOW STEPS ===")
        
        # Get all workflow steps with Notion
        steps = supabase.table('workflow_steps').select('*').eq('service_name', 'notion').execute()
        
        print(f"Found {len(steps.data)} Notion workflow steps:")
        print()
        
        for step in steps.data:
            print(f"Step ID: {step['id']}")
            print(f"Workflow ID: {step.get('workflow_id')}")
            print(f"Event Type: {step.get('event_type')}")
            print(f"Configuration:")
            print(json.dumps(step.get('configuration', {}), indent=2))
            print(f"Created: {step.get('created_at')}")
            print("=" * 50)
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
