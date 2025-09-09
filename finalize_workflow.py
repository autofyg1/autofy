import requests
import json

def update_workflow_status():
    """Update workflow status to active"""
    workflow_id = "122dd9da-327a-4313-95ba-61a2f376a1e9"
    auth_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjRrNkJnbUw3Qm9tNEFjbTciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FobGZwa3JvcHpocHZseGxuZHNvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMTMxM2UxOC1hMTU1LTRlNTYtYTAyYi1jODMzOWI3OTBhMWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3MTc1NDk4LCJpYXQiOjE3NTcxNzE4OTgsImVtYWlsIjoiYmFuc2FseXVnYWwzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJiYW5zYWx5dWdhbDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ill1Z2FsIEJhbnNhbCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzEzMTNlMTgtYTE1NS00ZTU2LWEwMmItYzgzMzliNzkwYTFjIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTcxNzE4OTh9XSwic2Vzc2lvbl9pZCI6IjlkZTNjMDgwLTlmNDctNDVlNy04YWY1LThiMTEwOGI0YTQxYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.FqE-qsoa5Xt9l_GMNuD-rj47XsqhIKXrp1cDF82kCTI"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    # Update workflow to active status
    update_data = {
        "status": "active"
    }
    
    response = requests.patch(
        f'http://localhost:8000/api/workflows/{workflow_id}',
        json=update_data,
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Workflow status updated to ACTIVE!")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Failed to update workflow status: {response.status_code} - {response.text}")

def update_notion_database_id():
    """Update the Notion step with actual database ID"""
    step_id = "b09d0609-fffd-41bc-89db-e3453828aee5"  # Notion step ID from the previous response
    auth_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjRrNkJnbUw3Qm9tNEFjbTciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FobGZwa3JvcHpocHZseGxuZHNvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMTMxM2UxOC1hMTU1LTRlNTYtYTAyYi1jODMzOWI3OTBhMWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3MTc1NDk4LCJpYXQiOjE3NTcxNzE4OTgsImVtYWlsIjoiYmFuc2FseXVnYWwzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJiYW5zYWx5dWdhbDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ill1Z2FsIEJhbnNhbCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzEzMTNlMTgtYTE1NS00ZTU2LWEwMmItYzgzMzliNzkwYTFjIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTcxNzE4OTh9XSwic2Vzc2lvbl9pZCI6IjlkZTNjMDgwLTlmNDctNDVlNy04YWY1LThiMTEwOGI0YTQxYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.FqE-qsoa5Xt9l_GMNuD-rj47XsqhIKXrp1cDF82kCTI"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    print("\\n=== UPDATING NOTION DATABASE ID ===")
    print("To find your Notion Database ID:")
    print("1. Go to your Notion workspace")
    print("2. Create a new database or use an existing one")
    print("3. Copy the database URL (should look like: https://www.notion.so/Your-Database-Name-1234567890abcdef1234567890abcdef)")
    print("4. The database ID is the 32-character string at the end (1234567890abcdef1234567890abcdef)")
    
    database_id = input("\\nEnter your Notion Database ID: ").strip()
    
    if len(database_id) != 32:
        print("⚠️  Database ID should be 32 characters long. Please check and try again.")
        return
    
    # Update configuration
    update_data = {
        "configuration": {
            "database_id": database_id,
            "title_template": "📧 Email: {{email.subject}}",
            "content_template": "**From:** {{email.from}}\\n\\n**Received:** {{email.timestamp}}\\n\\n**Content:**\\n{{email.body}}"
        }
    }
    
    response = requests.patch(
        f'http://localhost:8000/api/workflow-steps/{step_id}',
        json=update_data,
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Notion database ID updated successfully!")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Failed to update notion configuration: {response.status_code} - {response.text}")

def get_workflow_details():
    """Get the current workflow details"""
    workflow_id = "122dd9da-327a-4313-95ba-61a2f376a1e9"
    auth_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjRrNkJnbUw3Qm9tNEFjbTciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FobGZwa3JvcHpocHZseGxuZHNvLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMTMxM2UxOC1hMTU1LTRlNTYtYTAyYi1jODMzOWI3OTBhMWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3MTc1NDk4LCJpYXQiOjE3NTcxNzE4OTgsImVtYWlsIjoiYmFuc2FseXVnYWwzQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJiYW5zYWx5dWdhbDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ill1Z2FsIEJhbnNhbCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMzEzMTNlMTgtYTE1NS00ZTU2LWEwMmItYzgzMzliNzkwYTFjIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTcxNzE4OTh9XSwic2Vzc2lvbl9pZCI6IjlkZTNjMDgwLTlmNDctNDVlNy04YWY1LThiMTEwOGI0YTQxYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.FqE-qsoa5Xt9l_GMNuD-rj47XsqhIKXrp1cDF82kCTI"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f'http://localhost:8000/api/workflows/{workflow_id}', headers=headers)
    
    if response.status_code == 200:
        workflow = response.json()
        print("=== CURRENT WORKFLOW STATUS ===")
        print(f"Name: {workflow['name']}")
        print(f"Status: {workflow['status']}")
        print(f"Description: {workflow.get('description', 'No description')}")
        
        # Get workflow steps
        steps_response = requests.get(f'http://localhost:8000/api/workflows/{workflow_id}/steps', headers=headers)
        if steps_response.status_code == 200:
            steps = steps_response.json()
            print(f"\\nSteps ({len(steps)} total):")
            for step in steps:
                print(f"  {step['step_order']}. {step['step_type'].title()}: {step['service_name']} - {step['action_name']}")
                print(f"     Config: {step['configuration']}")
        else:
            print("Could not retrieve steps")
    else:
        print(f"Failed to get workflow details: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("=== WORKFLOW FINALIZER ===")
    
    # Show current status
    get_workflow_details()
    
    print("\\n" + "="*50)
    print("What would you like to do?")
    print("1. Update workflow status to ACTIVE")
    print("2. Update Notion Database ID")
    print("3. Do both")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == "1":
        update_workflow_status()
    elif choice == "2":
        update_notion_database_id()
    elif choice == "3":
        update_workflow_status()
        update_notion_database_id()
    else:
        print("Invalid choice")
