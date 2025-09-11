#!/usr/bin/env python3
"""
Check workflow execution step results
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from config.database import get_supabase
import json

def main():
    try:
        supabase = get_supabase()
        
        print("=== CHECKING WORKFLOW EXECUTION STEP RESULTS ===")
        
        # Get recent execution step results, especially failed ones
        step_results = supabase.table('workflow_execution_step_results')\
            .select('*')\
            .order('created_at', desc=True)\
            .limit(20)\
            .execute()
        
        print(f"Found {len(step_results.data)} recent step results:")
        print()
        
        for result in step_results.data:
            print(f"Execution ID: {result.get('execution_id')}")
            print(f"Step ID: {result.get('step_id')}")
            print(f"Status: {result.get('status')}")
            print(f"Started: {result.get('started_at')}")
            print(f"Completed: {result.get('completed_at')}")
            
            # Show error message if any
            if result.get('error_message'):
                print(f"ERROR: {result.get('error_message')}")
            
            # Show result if any
            if result.get('result'):
                print("Result:")
                try:
                    step_result = json.loads(result.get('result')) if isinstance(result.get('result'), str) else result.get('result')
                    print(json.dumps(step_result, indent=2))
                except:
                    print(result.get('result'))
            
            print("=" * 70)
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
