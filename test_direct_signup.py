#!/usr/bin/env python3
"""
Test direct signup functionality
"""

import sys
import traceback
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

async def test_direct_signup():
    """Test signup functionality directly"""
    print("🧪 Testing direct signup functionality...")
    
    try:
        # Import our backend components
        from config.settings import settings
        from config.database import get_supabase
        from services.profile_service import ProfileService
        from main_minimal import SignUpRequest
        
        print("✅ All imports successful")
        print(f"Settings loaded: debug={settings.debug}")
        
        # Get Supabase client
        supabase = get_supabase()
        print("✅ Supabase client created")
        
        # Test our signup logic directly
        request = SignUpRequest(
            email="direct-test@example.com",
            password="testpassword123",
            full_name="Direct Test User"
        )
        
        print(f"📝 Testing signup with: {request.email}")
        
        # Create user with Supabase Auth
        print("🔐 Creating auth user...")
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name
                }
            }
        })
        
        if auth_response.user is None:
            print("❌ Failed to create auth user")
            return False
            
        user = auth_response.user
        print(f"✅ Auth user created: {user.id}")
        
        # Wait a moment
        import asyncio
        print("⏳ Waiting for auth user to be available...")
        await asyncio.sleep(1.0)
        
        # Create profile
        print("👤 Creating profile...")
        profile_service = ProfileService(supabase)
        
        try:
            profile = await profile_service.create_profile(
                user_id=user.id,
                email=user.email,
                full_name=request.full_name or user.user_metadata.get('full_name')
            )
            print(f"✅ Profile created successfully: {profile.id}")
            
            # Clean up - delete the test user
            try:
                supabase.table('profiles').delete().eq('id', user.id).execute()
                print("✅ Test profile cleaned up")
            except:
                print("⚠️ Could not clean up test profile")
            
            return True
            
        except Exception as profile_error:
            print(f"❌ Profile creation failed: {profile_error}")
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import asyncio
    
    print("🔍 Direct Signup Test")
    print("=" * 50)
    
    result = asyncio.run(test_direct_signup())
    
    if result:
        print("\n✅ Direct signup test PASSED!")
    else:
        print("\n❌ Direct signup test FAILED!")
