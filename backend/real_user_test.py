#!/usr/bin/env python3
"""
Script to help debug the real OAuth flow issue with the actual user
"""
import asyncio
import httpx
from config.database import get_supabase
from services.integration_service import IntegrationService

async def check_real_user_state():
    """Check the current state of the real user"""
    print("🔍 Checking Real User State")
    print("=" * 50)
    
    supabase = get_supabase()
    integration_service = IntegrationService(supabase)
    
    # Get the real user
    profiles_result = supabase.table('profiles').select('*').execute()
    if not profiles_result.data:
        print("❌ No profiles found")
        return
    
    profile = profiles_result.data[0]
    user_id = profile['id']
    email = profile['email']
    
    print(f"👤 Real User: {email}")
    print(f"📧 User ID: {user_id}")
    
    # Check existing integrations
    integrations = await integration_service.get_integrations(user_id)
    print(f"\n🔗 Current Integrations: {len(integrations)}")
    for integration in integrations:
        print(f"  - {integration.display_name} ({integration.service_name})")
        print(f"    Status: {integration.status}")
        print(f"    Created: {integration.created_at}")
    
    # Check database directly too
    db_integrations = supabase.table('integrations').select('*').eq('user_id', user_id).execute()
    print(f"\n📊 Database Integrations: {len(db_integrations.data)}")
    for integration in db_integrations.data:
        print(f"  - {integration['display_name']} ({integration['service_name']})")
        print(f"    Status: {integration['status']}")
        print(f"    Credentials type: {type(integration['credentials'])}")
    
    print(f"\n💡 INSTRUCTIONS FOR TESTING:")
    print(f"1. Open your browser and go to the integrations page")
    print(f"2. Try to connect Gmail or Notion")
    print(f"3. Watch the browser console (F12 -> Console tab)")
    print(f"4. Look for any error messages")
    print(f"5. After the OAuth flow, check the backend console logs")
    print(f"6. Run this script again to see if integration was created")
    
    print(f"\n🔧 If OAuth fails, check:")
    print(f"- Browser console for errors")
    print(f"- Network tab for failed API calls") 
    print(f"- Backend console for detailed OAuth logs")
    
    return user_id

async def simulate_frontend_flow():
    """Simulate what the frontend does when it calls the integrations API"""
    print("\n🖥️ Simulating Frontend Integration Check")
    print("=" * 50)
    
    # This simulates what the frontend useIntegrations hook does
    try:
        # We can't easily get a real user token here, but we can check the API endpoint
        async with httpx.AsyncClient() as client:
            response = await client.get('http://localhost:8000/api/integrations', timeout=5.0)
        
        print(f"API Response Status: {response.status_code}")
        if response.status_code == 401:
            print("✅ API correctly requires authentication")
            print("This means the issue is either:")
            print("  1. Frontend not sending auth token properly")
            print("  2. OAuth exchange failing")
            print("  3. Integration creation failing")
        else:
            print(f"Unexpected response: {response.text[:200]}")
    
    except Exception as e:
        print(f"❌ API test failed: {e}")

def print_debugging_tips():
    """Print debugging tips for the user"""
    print("\n" + "=" * 60)
    print("🐛 DEBUGGING TIPS FOR OAUTH INTEGRATION ISSUE")
    print("=" * 60)
    
    print("\n1. 🌐 BROWSER CONSOLE DEBUGGING:")
    print("   - Open browser DevTools (F12)")
    print("   - Go to Console tab")
    print("   - Clear console")
    print("   - Try OAuth flow")
    print("   - Look for red error messages")
    print("   - Look for 'OAuth exchange failed' or 'Integration creation failed'")
    
    print("\n2. 🔗 NETWORK TAB DEBUGGING:")
    print("   - Go to Network tab in DevTools")
    print("   - Clear network log")
    print("   - Try OAuth flow")
    print("   - Look for failed requests (red status codes)")
    print("   - Check if /api/oauth/exchange returns 200")
    print("   - Check if /api/integrations POST returns 200")
    
    print("\n3. 🖥️ BACKEND LOGS:")
    print("   - The backend now has detailed OAuth debugging")
    print("   - When you try OAuth, you should see:")
    print("     '=== OAUTH EXCHANGE START ==='")
    print("     '=== INTEGRATION CREATION START ==='")
    print("   - If you don't see these, the frontend isn't calling the backend")
    
    print("\n4. 🔄 COMMON ISSUES:")
    print("   - Code expired: OAuth codes expire quickly (usually 10 minutes)")
    print("   - Wrong redirect URI: Must match exactly what's in Google/Notion console")
    print("   - Missing environment variables: Check .env file")
    print("   - Session expired: Try logging out and back in")
    
    print("\n5. 🎯 NEXT STEPS:")
    print("   - Try the OAuth flow now")
    print("   - Watch browser console for errors")
    print("   - Check backend console for logs")  
    print("   - Run this script again to see if integration was saved")

async def main():
    print("🚀 REAL USER OAUTH DEBUGGING HELPER")
    print("=" * 60)
    
    user_id = await check_real_user_state()
    await simulate_frontend_flow()
    print_debugging_tips()

if __name__ == "__main__":
    asyncio.run(main())
