#!/usr/bin/env python3
"""
Test script to simulate the OAuth callback flow and debug integration creation issues
"""
import asyncio
import uuid
from datetime import datetime, timezone
from config.database import get_supabase
from services.auth_service import AuthService  
from services.profile_service import ProfileService
from services.integration_service import IntegrationService

async def test_oauth_flow():
    """Test the complete OAuth flow"""
    print("🧪 Testing OAuth Flow Simulation")
    print("=" * 50)
    
    # Initialize services
    supabase = get_supabase()
    auth_service = AuthService(supabase)
    profile_service = ProfileService(supabase)
    integration_service = IntegrationService(supabase)
    
    try:
        # Create a test user first (simulating signup)
        test_email = f"test-oauth-{uuid.uuid4()}@example.com"
        print(f"\n📝 Creating test user: {test_email}")
        
        # Create auth user
        auth_response = supabase.auth.admin.create_user({
            "email": test_email,
            "password": "test123456",
            "email_confirm": True,
            "user_metadata": {"full_name": "Test OAuth User"}
        })
        
        if not auth_response.user:
            raise Exception("Failed to create test user")
        
        user = auth_response.user
        print(f"✅ Test user created: {user.id}")
        
        # Create profile
        profile = await profile_service.create_profile(
            user_id=user.id,
            email=user.email,
            full_name="Test OAuth User"
        )
        print(f"✅ Profile created: {profile.id}")
        
        # Simulate OAuth token exchange success
        mock_credentials = {
            'access_token': f'ya29.mock_access_token_{datetime.now().timestamp()}',
            'refresh_token': f'mock_refresh_token_{datetime.now().timestamp()}',
            'token_type': 'Bearer',
            'expires_in': 3599,
            'scope': 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
        }
        
        print(f"\n🔑 Mock OAuth credentials prepared:")
        print(f"  - Access token: {mock_credentials['access_token'][:20]}...")
        print(f"  - Refresh token: {mock_credentials['refresh_token'][:20]}...")
        print(f"  - Token type: {mock_credentials['token_type']}")
        print(f"  - Expires in: {mock_credentials['expires_in']} seconds")
        
        # Test creating Gmail integration
        print(f"\n📧 Creating Gmail integration...")
        gmail_integration = await integration_service.create_integration(
            user_id=user.id,
            service_name='gmail',
            display_name='Gmail',
            credentials=mock_credentials,
            configuration={}
        )
        print(f"✅ Gmail integration created:")
        print(f"  - ID: {gmail_integration.id}")
        print(f"  - Service: {gmail_integration.service_name}")
        print(f"  - Status: {gmail_integration.status}")
        print(f"  - Created at: {gmail_integration.created_at}")
        
        # Test creating Notion integration  
        notion_credentials = {
            'access_token': f'secret_mock_notion_token_{datetime.now().timestamp()}',
            'token_type': 'Bearer',
            'bot_id': f'bot_{uuid.uuid4()}',
            'workspace_name': 'Test Workspace',
            'workspace_icon': '🧪',
            'workspace_id': str(uuid.uuid4())
        }
        
        print(f"\n📝 Creating Notion integration...")
        notion_integration = await integration_service.create_integration(
            user_id=user.id,
            service_name='notion',
            display_name='Notion',
            credentials=notion_credentials,
            configuration={}
        )
        print(f"✅ Notion integration created:")
        print(f"  - ID: {notion_integration.id}")
        print(f"  - Service: {notion_integration.service_name}")
        print(f"  - Status: {notion_integration.status}")
        print(f"  - Created at: {notion_integration.created_at}")
        
        # Verify integrations can be retrieved
        print(f"\n🔍 Retrieving user integrations...")
        user_integrations = await integration_service.get_integrations(user.id)
        print(f"✅ Found {len(user_integrations)} integrations:")
        for integration in user_integrations:
            print(f"  - {integration.display_name} ({integration.service_name}): {integration.status}")
        
        # Clean up test user
        print(f"\n🧹 Cleaning up test user...")
        supabase.auth.admin.delete_user(user.id)
        print("✅ Test user cleaned up")
        
        print(f"\n🎉 OAuth flow test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ OAuth flow test failed:")
        print(f"  - Error type: {type(e).__name__}")
        print(f"  - Error message: {str(e)}")
        return False

async def test_existing_user_flow():
    """Test OAuth flow with existing users"""
    print("\n" + "=" * 50)
    print("🧪 Testing OAuth Flow with Existing Users")
    print("=" * 50)
    
    supabase = get_supabase()
    integration_service = IntegrationService(supabase)
    
    try:
        # Get existing profiles
        result = supabase.table('profiles').select('*').limit(5).execute()
        profiles = result.data
        
        if not profiles:
            print("⚠️  No existing profiles found. Skipping existing user test.")
            return False
        
        print(f"📊 Found {len(profiles)} existing profiles")
        
        # Test with the first existing profile
        test_profile = profiles[0]
        user_id = test_profile['id']
        print(f"\n👤 Testing with existing user: {test_profile['email']} ({user_id})")
        
        # Check existing integrations
        existing_integrations = await integration_service.get_integrations(user_id)
        print(f"📋 User currently has {len(existing_integrations)} integrations:")
        for integration in existing_integrations:
            print(f"  - {integration.display_name} ({integration.service_name}): {integration.status}")
        
        # Test creating a new integration for this user
        test_credentials = {
            'access_token': f'test_token_{datetime.now().timestamp()}',
            'refresh_token': f'test_refresh_{datetime.now().timestamp()}',
            'token_type': 'Bearer',
            'expires_in': 3599
        }
        
        service_name = 'gmail'
        # Check if gmail integration already exists
        existing_gmail = any(i.service_name == service_name for i in existing_integrations)
        
        if existing_gmail:
            print(f"⚠️  {service_name.title()} integration already exists. Skipping creation test.")
        else:
            print(f"\n📧 Creating {service_name.title()} integration for existing user...")
            new_integration = await integration_service.create_integration(
                user_id=user_id,
                service_name=service_name,
                display_name=service_name.title(),
                credentials=test_credentials,
                configuration={}
            )
            print(f"✅ {service_name.title()} integration created:")
            print(f"  - ID: {new_integration.id}")
            print(f"  - Service: {new_integration.service_name}")
            print(f"  - Status: {new_integration.status}")
            
            # Clean up - delete the test integration
            delete_success = await integration_service.delete_integration(new_integration.id, user_id)
            print(f"🧹 Test integration cleanup: {'✅ Success' if delete_success else '❌ Failed'}")
        
        print(f"\n🎉 Existing user OAuth flow test completed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Existing user OAuth flow test failed:")
        print(f"  - Error type: {type(e).__name__}")
        print(f"  - Error message: {str(e)}")
        return False

async def main():
    """Run all OAuth flow tests"""
    print("🚀 Starting OAuth Flow Debug Tests")
    print("=" * 60)
    
    test1_success = await test_oauth_flow()
    test2_success = await test_existing_user_flow()
    
    print("\n" + "=" * 60)
    print("📋 Test Results Summary:")
    print(f"  - New User OAuth Flow: {'✅ PASS' if test1_success else '❌ FAIL'}")
    print(f"  - Existing User OAuth Flow: {'✅ PASS' if test2_success else '❌ FAIL'}")
    
    if test1_success and test2_success:
        print("\n🎉 All OAuth flow tests passed! Integration creation is working correctly.")
    else:
        print("\n⚠️  Some OAuth flow tests failed. Check the logs above for details.")

if __name__ == "__main__":
    asyncio.run(main())
