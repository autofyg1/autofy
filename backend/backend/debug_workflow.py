#!/usr/bin/env python3

import asyncio
import json
from config.database import get_supabase

async def debug_workflow():
    supabase = get_supabase()
    
    try:
        # Get active workflows
        workflows = supabase.table('workflows').select('*').eq('is_active', True).execute()
        print('=== ACTIVE WORKFLOWS ===')
        for wf in workflows.data:
            print(f'ID: {wf["id"]}')
            print(f'Name: {wf["name"]}')
            print(f'Status: {wf["status"]}')
            print(f'Is Active: {wf["is_active"]}')
            print('---')
        
        if not workflows.data:
            print("No active workflows found!")
            return
            
        wf_id = workflows.data[0]['id']
        
        # Get workflow steps
        steps = supabase.table('workflow_steps').select('*').eq('workflow_id', wf_id).order('step_order').execute()
        print(f'=== STEPS for workflow {wf_id} ===')
        for step in steps.data:
            print(f'Order: {step["step_order"]} | Type: {step["step_type"]} | Service: {step["service_name"]} | Action: {step["action_name"]}')
            if step['step_type'] == 'trigger':
                print(f'Trigger Config: {step["configuration"]}')
            print('---')
        
        # Check recent executions
        executions = supabase.table('workflow_executions').select('*').eq('workflow_id', wf_id).order('created_at', desc=True).limit(5).execute()
        print(f'=== RECENT EXECUTIONS for workflow {wf_id} ===')
        if executions.data:
            for exec in executions.data:
                print(f'ID: {exec["id"]} | Status: {exec["status"]} | Created: {exec["created_at"]}')
                if exec.get('trigger_data'):
                    print(f'Trigger Data: {exec["trigger_data"]}')
                print('---')
        else:
            print("No executions found!")
        
        # Check workflow monitor logs
        logs = supabase.table('workflow_monitor_logs').select('*').order('created_at', desc=True).limit(10).execute()
        print('=== RECENT MONITOR LOGS ===')
        if logs.data:
            for log in logs.data:
                print(f'{log["created_at"]} | {log["level"]} | {log["message"]}')
        else:
            print("No monitor logs found!")
            
        # Test Gmail connection for the user
        print('\n=== TESTING GMAIL CONNECTION ===')
        user_id = workflows.data[0]['user_id']
        print(f'Testing Gmail for user: {user_id}')
        
        # Check Gmail integration
        gmail_integration = supabase.table('integrations').select('*').eq('user_id', user_id).eq('service_name', 'gmail').execute()
        if gmail_integration.data:
            print("Gmail integration found")
            print(f"Status: {gmail_integration.data[0]['status']}")
        else:
            print("No Gmail integration found!")
            
        # Test email checking
        from services.workflow_executor import WorkflowExecutor
        executor = WorkflowExecutor(supabase)
        
        # Get trigger step config
        trigger_step = None
        for step in steps.data:
            if step['step_type'] == 'trigger':
                trigger_step = step
                break
                
        if trigger_step:
            config = trigger_step['configuration']
            if isinstance(config, str):
                config = json.loads(config)
                
            print(f'Trigger Config: {config}')
            
            # Test Gmail check
            keywords = config.get('keywords', '')
            from_email = config.get('from_email', '')
            subject_contains = config.get('subject_contains', '')
            
            print(f'Searching for emails with:')
            print(f'  Keywords: {keywords}')
            print(f'  From: {from_email}')
            print(f'  Subject contains: {subject_contains}')
            
            emails = await executor.check_gmail_emails(
                user_id=user_id,
                keywords=keywords,
                from_email=from_email,
                subject_contains=subject_contains
            )
            
            print(f'Found {len(emails)} emails:')
            for i, email in enumerate(emails):
                print(f'  Email {i+1}: {email.get("subject", "No subject")} from {email.get("from", "Unknown")}')
                
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(debug_workflow())
