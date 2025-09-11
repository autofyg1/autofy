#!/usr/bin/env python3
"""
Check workflow execution logs
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from config.database import get_supabase
import json

def main():
    try:
        supabase = get_supabase()
        
        print("=== CHECKING WORKFLOW EXECUTION LOGS ===")
        
        # Get recent execution logs, especially failed ones
        logs = supabase.table('workflow_execution_logs')\
            .select('*')\
            .order('created_at', desc=True)\
            .limit(20)\
            .execute()
        
        print(f"Found {len(logs.data)} recent execution logs:")
        print()
        
        for log in logs.data:
            print(f"Execution ID: {log.get('execution_id')}")
            print(f"Step ID: {log.get('step_id')}")
            print(f"Level: {log.get('level')}")
            print(f"Message: {log.get('message')}")
            print(f"Timestamp: {log.get('created_at')}")
            
            # Show metadata if any
            if log.get('metadata'):
                print("Metadata:")
                try:
                    metadata = json.loads(log.get('metadata')) if isinstance(log.get('metadata'), str) else log.get('metadata')
                    print(json.dumps(metadata, indent=2))
                except:
                    print(log.get('metadata'))
            
            print("=" * 70)
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
