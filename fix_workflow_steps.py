#!/usr/bin/env python3
"""
Script to add Gmail to Notion workflow steps to an existing workflow
"""
import requests
import json
from datetime import datetime

def add_gmail_notion_steps():
    print("=== ADDING GMAIL TO NOTION WORKFLOW STEPS ===")
    print(f"Time: {datetime.now()}")
    
    # Your workflow ID from the screenshot (you'll need to replace this with your actual workflow ID)
    workflow_id = "123e4567-e89b-42d3-a456-426614174000"  # REPLACE WITH YOUR ACTUAL WORKFLOW ID
    
    # Authentication token
    auth_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjRrNkJnbUw3Qm9tNEFjbTciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FobGZwa3JvcHpocHZseGxuZHNvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMTMxM2UxOC1hMTU1LTRlNTYtYTAyYi1jODMzOWI3OTBhMWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3MTc1NDk4LCJpYXQiOjE3NTcxNzE4OTgsImVtYWlsIjoiYmFuc2FseXVnYWwzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJiYW5zYWx5dWdhbDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ill1Z2FsIEJhbnNhbCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzEzMTNlMTgtYTE1NS00ZTU2LWEwMmItYzgzMzliNzkwYTFjIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTcxNzE4OTh9XSwic2Vzc2lvbl9pZCI6IjlkZTNjMDgwLTlmNDctNDVlNy04YWY1LThiMTEwOGI0YTQxYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.FqE-qsoa5Xt9l_GMNuD-rj47XsqhIKXrp1cDF82kCTI"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    # Step 1: Gmail Trigger (monitors for new emails)
    gmail_trigger = {
        "step_order": 1,
        "step_type": "trigger",
        "service_name": "gmail",
        "action_name": "new_email",
        "configuration": {
            "keywords": "important",  # You can change this to any keywords you want to monitor
            "from_email": "",  # Optional: filter by sender
            "subject_contains": ""  # Optional: filter by subject
        },
        "conditions": {}
    }
    
    # Step 2: Notion Action (creates a new page)
    notion_action = {
        "step_order": 2,
        "step_type": "action", 
        "service_name": "notion",
        "action_name": "create_page",
        "configuration": {
            "database_id": "YOUR_NOTION_DATABASE_ID",  # You need to replace this with your Notion database ID
            "title_template": "Email: {{email.subject}}",
            "content_template": "From: {{email.from}}\\n\\nContent:\\n{{email.body}}"
        },
        "conditions": {}
    }
    
    try:
        # Add Gmail trigger step
        print("Adding Gmail trigger step...")
        response1 = requests.post(
            f'http://localhost:8000/api/workflows/{workflow_id}/steps',
            json=gmail_trigger,
            headers=headers,
            timeout=30
        )
        
        print(f"Gmail trigger response: {response1.status_code}")
        if response1.status_code == 200:
            print("✅ Gmail trigger step added successfully!")
            print(f"Step details: {response1.json()}")
        else:
            print(f"❌ Failed to add Gmail trigger: {response1.text}")
            return
        
        # Add Notion action step
        print("\\nAdding Notion action step...")
        response2 = requests.post(
            f'http://localhost:8000/api/workflows/{workflow_id}/steps',
            json=notion_action,
            headers=headers,
            timeout=30
        )
        
        print(f"Notion action response: {response2.status_code}")
        if response2.status_code == 200:
            print("✅ Notion action step added successfully!")
            print(f"Step details: {response2.json()}")
        else:
            print(f"❌ Failed to add Notion action: {response2.text}")
            return
            
        print("\\n🎉 SUCCESS! Your Gmail to Notion workflow now has steps!")
        print("\\nNext steps:")
        print("1. Get your Notion Database ID from your Notion workspace")
        print("2. Update the configuration with your actual database ID")
        print("3. Test the workflow by sending an email with the keyword 'important'")
            
    except Exception as e:
        print(f"❌ Exception occurred: {e}")

def get_workflow_id_from_api():
    """Helper function to get your workflow ID"""
    print("=== GETTING YOUR WORKFLOW ID ===")
    
    auth_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjRrNkJnbUw3Qm9tNEFjbTciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FobGZwa3JvcHpocHZseGxuZHNvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMTMxM2UxOC1hMTU1LTRlNTYtYTAyYi1jODMzOWI3OTBhMWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3MTc1NDk4LCJpYXQiOjE3NTcxNzE4OTgsImVtYWlsIjoiYmFuc2FseXVnYWwzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJiYW5zYWx5dWdhbDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ill1Z2FsIEJhbnNhbCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzEzMTNlMTgtYTE1NS00ZTU2LWEwMmItYzgzMzliNzkwYTFjIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTcxNzE4OTh9XSwic2Vzc2lvbl9pZCI6IjlkZTNjMDgwLTlmNDctNDVlNy04YWY1LThiMTEwOGI0YTQxYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.FqE-qsoa5Xt9l_GMNuD-rj47XsqhIKXrp1cDF82kCTI"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(
            'http://localhost:8000/api/workflows',
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            workflows = response.json()
            print("Your workflows:")
            for workflow in workflows:
                print(f"  - ID: {workflow['id']}")
                print(f"    Name: {workflow['name']}")
                print(f"    Status: {workflow['status']}")
                print(f"    Description: {workflow.get('description', 'No description')}")
                print()
        else:
            print(f"Failed to get workflows: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    print("Choose an option:")
    print("1. Get workflow IDs")
    print("2. Add steps to workflow")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        get_workflow_id_from_api()
    elif choice == "2":
        print("\\n⚠️  IMPORTANT: You need to update the workflow_id in the script first!")
        print("Run option 1 first to get your workflow ID, then update the script.")
        add_gmail_notion_steps()
    else:
        print("Invalid choice")
