#!/usr/bin/env python3
"""
Debug script to help identify user and workflow issues
"""
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.database import get_supabase

async def debug_gmail_issues():
    """Debug Gmail integration issues"""
    supabase = get_supabase()
    
    print("=== GMAIL INTEGRATION DEBUGGING ===\n")
    
    # 1. Check all users
    print("1. All Users:")
    try:
        users_result = supabase.auth.admin.list_users()
        print(f"Found {len(users_result.users)} users:")
        for user in users_result.users:
            print(f"  - User ID: {user.id}, Email: {user.email}")
    except Exception as e:
        print(f"Error fetching users: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # 2. Check Gmail integrations
    print("2. Gmail Integrations:")
    try:
        gmail_integrations = supabase.table('integrations').select('*').eq('service_name', 'gmail').execute()
        print(f"Found {len(gmail_integrations.data)} Gmail integrations:")
        for integration in gmail_integrations.data:
            print(f"  - User ID: {integration['user_id']}")
            print(f"    Display Name: {integration.get('display_name', 'N/A')}")
            print(f"    Has credentials: {'credentials' in integration and integration['credentials'] is not None}")
            print()
    except Exception as e:
        print(f"Error fetching Gmail integrations: {e}")
    
    print("="*50 + "\n")
    
    # 3. Check workflows that might use Gmail
    print("3. Workflows with Gmail steps:")
    try:
        workflows = supabase.table('workflows').select('*').execute()
        for workflow in workflows.data:
            print(f"Workflow: {workflow['name']} (ID: {workflow['id']})")
            
            # Check workflow steps
            steps = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow['id']).execute()
            gmail_steps = [step for step in steps.data if 'gmail' in str(step.get('configuration', '')).lower() or step.get('service_name') == 'gmail']
            
            if gmail_steps:
                print(f"  - Has {len(gmail_steps)} Gmail-related steps")
                for step in gmail_steps:
                    print(f"    Step: {step.get('service_name')} - {step.get('action_name')}")
            print()
    except Exception as e:
        print(f"Error fetching workflows: {e}")
    
    print("="*50 + "\n")
    
    # 4. Suggest fixes
    print("4. SUGGESTED FIXES:")
    print("   a) Make sure users have Gmail integrations set up before running workflows")
    print("   b) Add proper error handling for missing integrations")
    print("   c) Check that workflow steps are configured with valid user contexts")

if __name__ == "__main__":
    asyncio.run(debug_gmail_issues())
