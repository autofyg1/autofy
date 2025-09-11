#!/usr/bin/env python3
"""
Check recent workflow executions and errors
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from config.database import get_supabase
import json

def main():
    try:
        supabase = get_supabase()
        
        print("=== CHECKING RECENT WORKFLOW EXECUTIONS ===")
        
        # Get recent workflow executions
        executions = supabase.table('workflow_executions')\
            .select('*')\
            .order('created_at', desc=True)\
            .limit(10)\
            .execute()
        
        print(f"Found {len(executions.data)} recent executions:")
        print()
        
        for execution in executions.data:
            print(f"Execution ID: {execution['id']}")
            print(f"Workflow ID: {execution.get('workflow_id')}")
            print(f"Status: {execution.get('status')}")
            print(f"Started: {execution.get('started_at')}")
            print(f"Completed: {execution.get('completed_at')}")
            
            # Show error details if any
            if execution.get('error_message'):
                print(f"ERROR: {execution.get('error_message')}")
            
            # Show results if any
            if execution.get('result'):
                print("Result:")
                try:
                    result = json.loads(execution.get('result')) if isinstance(execution.get('result'), str) else execution.get('result')
                    print(json.dumps(result, indent=2))
                except:
                    print(execution.get('result'))
            
            print("=" * 60)
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
