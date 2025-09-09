#!/usr/bin/env python3

import asyncio
import json
import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from config.database import get_supabase
from services.workflow_executor import WorkflowExecutor

async def test_email_detection():
    supabase = get_supabase()
    
    try:
        # Get active workflow
        workflows = supabase.table('workflows').select('*').eq('is_active', True).execute()
        if not workflows.data:
            print("No active workflows found!")
            return
            
        workflow = workflows.data[0]
        user_id = workflow['user_id']
        workflow_id = workflow['id']
        
        print(f"Testing email detection for workflow: {workflow['name']}")
        print(f"User ID: {user_id}")
        
        # Get trigger step
        steps = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).eq('step_type', 'trigger').execute()
        if not steps.data:
            print("No trigger step found!")
            return
            
        trigger_step = steps.data[0]
        config = trigger_step['configuration']
        if isinstance(config, str):
            config = json.loads(config)
            
        keywords = config.get('keywords', '')
        from_email = config.get('from_email', '')
        subject_contains = config.get('subject_contains', '')
        
        print(f"Searching for emails with:")
        print(f"  Keywords: '{keywords}'")
        print(f"  From: '{from_email}'")
        print(f"  Subject contains: '{subject_contains}'")
        
        # Test different time ranges
        time_ranges = [
            ("Last 1 hour", timedelta(hours=1)),
            ("Last 6 hours", timedelta(hours=6)),
            ("Last 24 hours", timedelta(hours=24)),
            ("Last 7 days", timedelta(days=7))
        ]
        
        executor = WorkflowExecutor(supabase)
        
        for range_name, time_delta in time_ranges:
            since_time = datetime.now() - time_delta
            print(f"\n=== Testing {range_name} (since {since_time}) ===")
            
            emails = await executor.check_gmail_emails(
                user_id=user_id,
                keywords=keywords,
                from_email=from_email,
                subject_contains=subject_contains,
                since=since_time
            )
            
            print(f"Found {len(emails)} emails")
            for i, email in enumerate(emails):
                print(f"  Email {i+1}:")
                print(f"    Subject: {email.get('subject', 'No subject')}")
                print(f"    From: {email.get('from', 'Unknown sender')}")
                print(f"    Date: {email.get('date', 'Unknown date')}")
                print(f"    Body preview: {email.get('body', '')[:100]}...")
                print()
                
        # Test force execution
        print("\n=== Testing Force Execution ===")
        from services.workflow_monitor import WorkflowMonitor
        monitor = WorkflowMonitor(supabase, executor)
        
        result = await monitor.force_execute_workflow(workflow_id)
        print(f"Force execution result: {result}")
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_email_detection())
