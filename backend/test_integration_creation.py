#!/usr/bin/env python3
"""
Integration Creation Test Script

This script tests the integration creation process directly to identify
where the OAuth flow is failing after token exchange.
"""

import asyncio
import sys
import json
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

try:
    from config.settings import settings
    from config.database import get_supabase
    from services.integration_service import IntegrationService
    print("✅ Successfully imported dependencies")
except ImportError as e:
    print(f"❌ Failed to import dependencies: {e}")
    sys.exit(1)

async def test_integration_creation():
    """Test integration creation with mock credentials"""
    print("\n=== INTEGRATION CREATION TEST ===")
    
    try:
        # Get Supabase client
        supabase = get_supabase()
        print("✅ Supabase client initialized")
        
        # Create integration service
        integration_service = IntegrationService(supabase)
        print("✅ Integration service created")
        
        # Test user ID - using a hardcoded UUID for testing
        # In real scenario, this would come from the authenticated user
        test_user_id = "00000000-0000-0000-0000-000000000000"
        
        # Check if user exists in auth system
        try:
            # Try to get user from Supabase auth
            user_response = supabase.auth.admin.get_user_by_id(test_user_id)
            if user_response.user:
                print(f"✅ Test user exists: {user_response.user.email}")
            else:
                print("❌ Test user not found in auth system")
                
                # Let's try to find any existing user
                print("🔍 Looking for existing users...")
                users_response = supabase.auth.admin.list_users()
                if users_response.users and len(users_response.users) > 0:
                    test_user_id = users_response.users[0].id
                    print(f"✅ Using existing user: {users_response.users[0].email} (ID: {test_user_id})")
                else:
                    print("❌ No users found in the system. Please create a user account first.")
                    return False
                    
        except Exception as auth_error:
            print(f"⚠️  Auth check failed: {auth_error}")
            print("Proceeding with mock user ID...")
        
        # Mock OAuth credentials (similar to what Gmail would return)
        mock_credentials = {
            "access_token": "mock_access_token_12345",
            "refresh_token": "mock_refresh_token_12345",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "test scope"
        }
        
        print(f"🧪 Testing with user ID: {test_user_id}")
        print(f"🧪 Mock credentials: {list(mock_credentials.keys())}")
        
        # Test Gmail integration creation
        print("\n--- Testing Gmail Integration ---")
        try:
            gmail_integration = await integration_service.create_integration(
                user_id=test_user_id,
                service_name="gmail",
                display_name="Gmail",
                credentials=mock_credentials,
                configuration={}
            )
            print(f"✅ Gmail integration created successfully!")
            print(f"  - ID: {gmail_integration.id}")
            print(f"  - Service: {gmail_integration.service_name}")
            print(f"  - Status: {gmail_integration.status}")
            print(f"  - Created at: {gmail_integration.created_at}")
            
        except Exception as e:
            print(f"❌ Gmail integration creation failed:")
            print(f"  - Error type: {type(e).__name__}")
            print(f"  - Error message: {str(e)}")
            return False
        
        # Test Notion integration creation
        print("\n--- Testing Notion Integration ---")
        try:
            notion_integration = await integration_service.create_integration(
                user_id=test_user_id,
                service_name="notion",
                display_name="Notion",
                credentials=mock_credentials,
                configuration={}
            )
            print(f"✅ Notion integration created successfully!")
            print(f"  - ID: {notion_integration.id}")
            print(f"  - Service: {notion_integration.service_name}")
            print(f"  - Status: {notion_integration.status}")
            print(f"  - Created at: {notion_integration.created_at}")
            
        except Exception as e:
            print(f"❌ Notion integration creation failed:")
            print(f"  - Error type: {type(e).__name__}")
            print(f"  - Error message: {str(e)}")
            return False
        
        # Test fetching integrations
        print("\n--- Testing Integration Retrieval ---")
        try:
            integrations = await integration_service.get_integrations(test_user_id)
            print(f"✅ Found {len(integrations)} integrations for user")
            for integration in integrations:
                print(f"  - {integration.service_name}: {integration.status}")
                
        except Exception as e:
            print(f"❌ Integration retrieval failed: {e}")
            return False
        
        print("\n✅ All integration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with unexpected error:")
        print(f"  - Error type: {type(e).__name__}")
        print(f"  - Error message: {str(e)}")
        import traceback
        print(f"  - Traceback: {traceback.format_exc()}")
        return False

async def test_database_connection():
    """Test basic database connectivity"""
    print("\n=== DATABASE CONNECTION TEST ===")
    
    try:
        supabase = get_supabase()
        
        # Test basic query
        result = supabase.table('profiles').select('count', count='exact').limit(0).execute()
        print(f"✅ Database connection successful")
        print(f"  - Profiles table exists")
        print(f"  - Total profiles: {result.count}")
        
        # Test integrations table
        integrations_result = supabase.table('integrations').select('count', count='exact').limit(0).execute()
        print(f"✅ Integrations table exists")
        print(f"  - Total integrations: {integrations_result.count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

async def main():
    """Main test function"""
    print("🧪 Starting Integration Creation Tests...\n")
    
    # Test database connection first
    db_ok = await test_database_connection()
    if not db_ok:
        print("❌ Database tests failed. Exiting.")
        sys.exit(1)
    
    # Test integration creation
    integration_ok = await test_integration_creation()
    
    if integration_ok:
        print("\n🎉 All tests passed! Integration creation is working.")
        sys.exit(0)
    else:
        print("\n❌ Tests failed. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
