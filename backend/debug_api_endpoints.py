#!/usr/bin/env python3
"""
Debug script to test the actual API endpoints and OAuth flow
"""
import asyncio
import httpx
import json
from datetime import datetime

async def test_api_endpoints():
    """Test the API endpoints that the frontend would call"""
    print("🔍 Testing API Endpoints")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n📡 Testing health endpoint...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get('http://localhost:8000/health', timeout=5.0)
        print(f"Health check: {response.status_code} - {response.json()['status'] if response.status_code == 200 else 'Failed'}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test 2: Check if we need authentication for integrations endpoint
    print("\n🔐 Testing integrations endpoint without auth...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get('http://localhost:8000/api/integrations', timeout=5.0)
        print(f"Integrations (no auth): {response.status_code}")
        if response.status_code == 401:
            print("✅ Correctly requires authentication")
        else:
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Integrations endpoint test failed: {e}")
    
    # Test 3: Test OAuth exchange endpoint without auth
    print("\n🔄 Testing OAuth exchange endpoint...")
    try:
        oauth_payload = {
            'service': 'gmail',
            'code': 'test_code',
            'redirect_uri': 'http://localhost:3000/oauth/callback/gmail',
            'state': 'test_state'
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'http://localhost:8000/api/oauth/exchange',
                json=oauth_payload,
                timeout=5.0
            )
        print(f"OAuth exchange (no auth): {response.status_code}")
        if response.status_code == 401:
            print("✅ Correctly requires authentication")
        else:
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"❌ OAuth exchange endpoint test failed: {e}")
    
    return True

async def check_database_directly():
    """Check what's actually in the database"""
    print("\n🗄️ Checking Database Directly")
    print("=" * 50)
    
    try:
        from config.database import get_supabase
        supabase = get_supabase()
        
        # Check profiles
        profiles_result = supabase.table('profiles').select('id, email').execute()
        print(f"👤 Profiles in database: {len(profiles_result.data)}")
        for profile in profiles_result.data:
            print(f"   - {profile['email']} ({profile['id']})")
        
        # Check integrations
        integrations_result = supabase.table('integrations').select('*').execute()
        print(f"\n🔗 Integrations in database: {len(integrations_result.data)}")
        for integration in integrations_result.data:
            print(f"   - {integration['display_name']} ({integration['service_name']})")
            print(f"     User ID: {integration['user_id']}")
            print(f"     Status: {integration['status']}")
            print(f"     Created: {integration['created_at']}")
            print(f"     Credentials: {type(integration['credentials'])} - {len(str(integration['credentials']))} chars")
        
        return len(profiles_result.data), len(integrations_result.data)
        
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return 0, 0

async def test_with_real_user():
    """Test with a real user from the database"""
    print("\n👤 Testing with Real User")
    print("=" * 50)
    
    try:
        from config.database import get_supabase
        supabase = get_supabase()
        
        # Get a real user
        profiles_result = supabase.table('profiles').select('*').limit(1).execute()
        if not profiles_result.data:
            print("❌ No profiles found in database")
            return False
        
        profile = profiles_result.data[0]
        print(f"Testing with user: {profile['email']}")
        
        # Try to get a real session token
        print("🔑 Attempting to create test session...")
        try:
            # Use admin to create a session (this simulates a logged-in user)
            test_password = "testpassword123"
            
            # First, let's try to sign in if the user exists
            try:
                sign_in_response = supabase.auth.sign_in_with_password({
                    "email": profile['email'],
                    "password": test_password
                })
                access_token = sign_in_response.session.access_token if sign_in_response.session else None
            except:
                # If sign in fails, we can't test with a real token
                print("⚠️  Cannot create real session for testing")
                access_token = None
            
            if access_token:
                print(f"✅ Got access token: {access_token[:20]}...")
                
                # Test getting integrations with real auth
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        'http://localhost:8000/api/integrations',
                        headers=headers,
                        timeout=10.0
                    )
                
                print(f"📋 Integrations API response: {response.status_code}")
                if response.status_code == 200:
                    integrations = response.json()
                    print(f"✅ Found {len(integrations)} integrations via API:")
                    for integration in integrations:
                        print(f"   - {integration['name']} ({integration['service']}): {integration['status']}")
                else:
                    print(f"❌ API call failed: {response.text}")
                
            else:
                print("⚠️  No access token available for API testing")
        
        except Exception as e:
            print(f"❌ Session creation failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Real user test failed: {e}")
        return False

async def simulate_oauth_flow():
    """Simulate the complete OAuth flow"""
    print("\n🚀 Simulating Complete OAuth Flow")
    print("=" * 50)
    
    try:
        from config.database import get_supabase
        from services.profile_service import ProfileService
        import uuid
        
        supabase = get_supabase()
        profile_service = ProfileService(supabase)
        
        # Create a temporary test user
        test_email = f"debug-test-{datetime.now().timestamp()}@example.com"
        print(f"👤 Creating temporary test user: {test_email}")
        
        auth_response = supabase.auth.admin.create_user({
            "email": test_email,
            "password": "debugtest123",
            "email_confirm": True,
            "user_metadata": {"full_name": "Debug Test User"}
        })
        
        if not auth_response.user:
            print("❌ Failed to create test user")
            return False
        
        user = auth_response.user
        print(f"✅ Test user created: {user.id}")
        
        try:
            # Create profile (might fail due to RLS, but let's try)
            try:
                profile = await profile_service.create_profile(
                    user_id=user.id,
                    email=user.email,
                    full_name="Debug Test User"
                )
                print(f"✅ Profile created: {profile.id}")
            except Exception as profile_error:
                print(f"⚠️  Profile creation failed (expected due to RLS): {profile_error}")
                print("Continuing test without profile...")
            
            # Get access token
            sign_in_response = supabase.auth.sign_in_with_password({
                "email": test_email,
                "password": "debugtest123"
            })
            
            if not sign_in_response.session:
                print("❌ Failed to get session")
                return False
            
            access_token = sign_in_response.session.access_token
            print(f"✅ Got access token: {access_token[:20]}...")
            
            # Step 1: Test OAuth exchange
            print("\n🔄 Step 1: Testing OAuth exchange...")
            oauth_payload = {
                'service': 'gmail',
                'code': 'mock_code_12345',
                'redirect_uri': 'http://localhost:3000/oauth/callback/gmail',
                'state': 'test_state'
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    'http://localhost:8000/api/oauth/exchange',
                    json=oauth_payload,
                    headers=headers,
                    timeout=10.0
                )
            
            print(f"OAuth exchange response: {response.status_code}")
            if response.status_code == 200:
                oauth_result = response.json()
                print(f"✅ OAuth exchange successful")
                print(f"Credentials keys: {list(oauth_result['credentials'].keys()) if 'credentials' in oauth_result else 'None'}")
                
                # Step 2: Test integration creation
                print("\n💾 Step 2: Testing integration creation...")
                integration_payload = {
                    'service_name': 'gmail',
                    'display_name': 'Gmail',
                    'credentials': oauth_result['credentials'],
                    'configuration': {}
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        'http://localhost:8000/api/integrations',
                        json=integration_payload,
                        headers=headers,
                        timeout=10.0
                    )
                
                print(f"Integration creation response: {response.status_code}")
                if response.status_code == 200:
                    integration_result = response.json()
                    print(f"✅ Integration created: {integration_result['id']}")
                    
                    # Step 3: Test integration retrieval
                    print("\n🔍 Step 3: Testing integration retrieval...")
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            'http://localhost:8000/api/integrations',
                            headers=headers,
                            timeout=10.0
                        )
                    
                    print(f"Integration retrieval response: {response.status_code}")
                    if response.status_code == 200:
                        integrations = response.json()
                        print(f"✅ Found {len(integrations)} integrations:")
                        for integration in integrations:
                            print(f"   - {integration['name']} ({integration['service']}): {integration['status']}")
                        
                        if len(integrations) > 0:
                            print("\n🎉 COMPLETE OAUTH FLOW WORKING!")
                            return True
                        else:
                            print("\n❌ No integrations found after creation")
                            return False
                    else:
                        print(f"❌ Integration retrieval failed: {response.text}")
                        return False
                else:
                    print(f"❌ Integration creation failed: {response.text}")
                    return False
            else:
                print(f"❌ OAuth exchange failed: {response.text}")
                return False
            
        finally:
            # Clean up test user
            try:
                supabase.auth.admin.delete_user(user.id)
                print(f"🧹 Cleaned up test user")
            except Exception as e:
                print(f"⚠️  Cleanup warning: {e}")
                
    except Exception as e:
        print(f"❌ OAuth flow simulation failed: {e}")
        return False

async def main():
    """Run all debug tests"""
    print("🐛 DEBUGGING OAUTH INTEGRATION ISSUE")
    print("=" * 60)
    
    # Test API endpoints
    await test_api_endpoints()
    
    # Check database directly
    profiles_count, integrations_count = await check_database_directly()
    
    # Test with real user if available
    if profiles_count > 0:
        await test_with_real_user()
    
    # Simulate complete OAuth flow
    oauth_success = await simulate_oauth_flow()
    
    print("\n" + "=" * 60)
    print("🏁 DEBUG RESULTS SUMMARY:")
    print(f"📊 Database: {profiles_count} profiles, {integrations_count} integrations")
    print(f"🔄 OAuth Flow: {'✅ Working' if oauth_success else '❌ Failed'}")
    
    if oauth_success:
        print("\n✅ The backend OAuth flow is working correctly!")
        print("The issue might be in:")
        print("1. Frontend OAuth callback logic")
        print("2. Frontend API communication")
        print("3. Frontend state management")
    else:
        print("\n❌ Found issues in the backend OAuth flow")
        print("Check the errors above for details")

if __name__ == "__main__":
    asyncio.run(main())
