#!/usr/bin/env python3
"""
Check valid trigger_type values in workflows table
"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def check_trigger_types():
    """Check what trigger_type values are allowed"""
    print("🔍 CHECKING TRIGGER TYPE CONSTRAINTS")
    print("=" * 45)
    
    try:
        from config.database import get_supabase
        
        supabase = get_supabase()
        
        # Check existing workflows to see what trigger_type values work
        print("1️⃣ Checking existing workflows...")
        existing_workflows = supabase.table("workflows").select("trigger_type").execute()
        
        if existing_workflows.data:
            trigger_types = set(wf['trigger_type'] for wf in existing_workflows.data if wf['trigger_type'])
            print(f"Existing trigger_types: {list(trigger_types)}")
        else:
            print("No existing workflows found")
        
        # Try different trigger_type values to find valid ones
        print("\n2️⃣ Testing valid trigger_type values...")
        
        test_workflow_base = {
            'user_id': '31313e18-a155-4e56-a02b-c8339b790a1c',
            'name': 'test workflow',
            'description': 'test',
            'status': 'draft'
        }
        
        # Common trigger types to test
        test_types = ['email', 'manual', 'schedule', 'webhook', 'timer', 'event']
        
        valid_types = []
        
        for trigger_type in test_types:
            try:
                test_workflow = {
                    **test_workflow_base,
                    'trigger_type': trigger_type,
                    'id': f'test-{trigger_type}'
                }
                
                # Try to insert
                result = supabase.table("workflows").insert(test_workflow).execute()
                
                if result.data:
                    valid_types.append(trigger_type)
                    print(f"   ✅ {trigger_type} - VALID")
                    
                    # Clean up test workflow
                    supabase.table("workflows").delete().eq("id", f'test-{trigger_type}').execute()
                else:
                    print(f"   ❌ {trigger_type} - INVALID")
                    
            except Exception as e:
                if "check constraint" in str(e).lower():
                    print(f"   ❌ {trigger_type} - INVALID (constraint violation)")
                else:
                    print(f"   ❌ {trigger_type} - ERROR: {e}")
        
        print(f"\n✅ Valid trigger_types: {valid_types}")
        
        # Try to create the workflow with a valid trigger_type
        if valid_types:
            print(f"\n3️⃣ Creating workflow with trigger_type: {valid_types[0]}")
            
            missing_workflow = {
                'id': '122dd9da-327a-4313-95ba-61a2f376a1e9',
                'user_id': '31313e18-a155-4e56-a02b-c8339b790a1c',
                'name': 'gmail to notion',
                'description': 'Email processing workflow',
                'status': 'active',
                'trigger_type': valid_types[0],  # Use first valid type
                'trigger_config': '{"keywords": "urgent", "from_email": "", "subject_contains": ""}'
            }
            
            try:
                result = supabase.table("workflows").insert(missing_workflow).execute()
                if result.data:
                    print("✅ Successfully created missing workflow!")
                    return True
                else:
                    print("❌ Failed to create workflow")
                    return False
            except Exception as e:
                print(f"❌ Error creating workflow: {e}")
                return False
        else:
            print("❌ No valid trigger_types found")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    check_trigger_types()
