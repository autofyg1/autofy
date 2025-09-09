import requests
import json

def get_workflows():
    """Get all workflows from the API"""
    auth_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjRrNkJnbUw3Qm9tNEFjbTciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FobGZwa3JvcHpocHZseGxuZHNvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMTMxM2UxOC1hMTU1LTRlNTYtYTAyYi1jODMzOWI3OTBhMWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3MTc1NDk4LCJpYXQiOjE3NTcxNzE4OTgsImVtYWlsIjoiYmFuc2FseXVnYWwzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJiYW5zYWx5dWdhbDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ill1Z2FsIEJhbnNhbCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzEzMTNlMTgtYTE1NS00ZTU2LWEwMmItYzgzMzliNzkwYTFjIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTcxNzE4OTh9XSwic2Vzc2lvbl9pZCI6IjlkZTNjMDgwLTlmNDctNDVlNy04YWY1LThiMTEwOGI0YTQxYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.FqE-qsoa5Xt9l_GMNuD-rj47XsqhIKXrp1cDF82kCTI"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get('http://localhost:8000/api/workflows', headers=headers)
    
    if response.status_code == 200:
        workflows = response.json()
        print("Your workflows:")
        for workflow in workflows:
            print(f"  ID: {workflow['id']}")
            print(f"  Name: {workflow['name']}")
            print(f"  Status: {workflow['status']}")
            print(f"  Description: {workflow.get('description', 'No description')}")
            print()
        return workflows
    else:
        print(f"Failed to get workflows: {response.text}")
        return None

def add_workflow_steps(workflow_id):
    """Add Gmail to Notion steps to the workflow"""
    auth_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjRrNkJnbUw3Qm9tNEFjbTciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FobGZwa3JvcHpocHZseGxuZHNvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMTMxM2UxOC1hMTU1LTRlNTYtYTAyYi1jODMzOWI3OTBhMWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3MTc1NDk4LCJpYXQiOjE3NTcxNzE4OTgsImVtYWlsIjoiYmFuc2FseXVnYWwzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJiYW5zYWx5dWdhbDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ill1Z2FsIEJhbnNhbCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzEzMTNlMTgtYTE1NS00ZTU2LWEwMmItYzgzMzliNzkwYTFjIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTcxNzE4OTh9XSwic2Vzc2lvbl9pZCI6IjlkZTNjMDgwLTlmNDctNDVlNy04YWY1LThiMTEwOGI0YTQxYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.FqE-qsoa5Xt9l_GMNuD-rj47XsqhIKXrp1cDF82kCTI"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    # Step 1: Gmail Trigger
    gmail_trigger = {
        "workflow_id": workflow_id,
        "step_order": 1,
        "step_type": "trigger",
        "service_name": "gmail",
        "action_name": "new_email",
        "configuration": {
            "keywords": "important",
            "from_email": "",
            "subject_contains": ""
        },
        "conditions": {}
    }
    
    # Step 2: Notion Action
    notion_action = {
        "workflow_id": workflow_id,
        "step_order": 2,
        "step_type": "action",
        "service_name": "notion",
        "action_name": "create_page",
        "configuration": {
            "database_id": "YOUR_NOTION_DATABASE_ID",  # Replace with your actual database ID
            "title_template": "Email: {{email.subject}}",
            "content_template": "From: {{email.from}}\\n\\nContent:\\n{{email.body}}"
        },
        "conditions": {}
    }
    
    # Add Gmail trigger
    print(f"Adding Gmail trigger step to workflow {workflow_id}...")
    response = requests.post(
        f'http://localhost:8000/api/workflows/{workflow_id}/steps',
        json=gmail_trigger,
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Gmail trigger step added successfully!")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Failed to add Gmail trigger: {response.status_code} - {response.text}")
        return False
    
    # Add Notion action
    print(f"\\nAdding Notion action step to workflow {workflow_id}...")
    response = requests.post(
        f'http://localhost:8000/api/workflows/{workflow_id}/steps',
        json=notion_action,
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Notion action step added successfully!")
        print(f"Response: {response.json()}")
        return True
    else:
        print(f"❌ Failed to add Notion action: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    print("=== WORKFLOW STEP ADDER ===")
    
    # First, get all workflows
    workflows = get_workflows()
    
    if workflows and len(workflows) > 0:
        print(f"\\nFound {len(workflows)} workflow(s).")
        
        # If only one workflow, use it automatically
        if len(workflows) == 1:
            workflow_id = workflows[0]['id']
            print(f"\\nUsing workflow: {workflows[0]['name']} ({workflow_id})")
            add_workflow_steps(workflow_id)
        else:
            # Let user choose
            print("\\nWhich workflow would you like to add steps to?")
            for i, workflow in enumerate(workflows):
                print(f"{i + 1}. {workflow['name']} ({workflow['id']})")
            
            try:
                choice = int(input("\\nEnter choice (number): ")) - 1
                if 0 <= choice < len(workflows):
                    workflow_id = workflows[choice]['id']
                    print(f"\\nAdding steps to: {workflows[choice]['name']}")
                    add_workflow_steps(workflow_id)
                else:
                    print("Invalid choice")
            except ValueError:
                print("Invalid input")
    else:
        print("No workflows found or error occurred")
