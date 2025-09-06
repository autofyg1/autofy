#!/usr/bin/env python3
"""
Test Supabase connection and basic operations
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

def test_supabase_connection():
    """Test basic Supabase connection"""
    print("🔍 Testing Supabase Connection")
    print("=" * 50)
    
    try:
        from config.database import get_supabase
        
        supabase = get_supabase()
        print("✅ Supabase client created")
        
        # Test basic table query
        try:
            profiles_response = supabase.table('profiles').select('*').limit(1).execute()
            print(f"✅ Profiles table accessible: {len(profiles_response.data)} records")
        except Exception as e:
            print(f"❌ Profiles table error: {e}")
        
        # Check if we can access auth users (this requires service role)
        try:
            # This is a direct SQL query to check auth.users
            auth_users_response = supabase.rpc('get_auth_users_count').execute()
            print(f"✅ Auth users accessible")
        except Exception as e:
            print(f"⚠️ Auth users not accessible via RPC: {e}")
            
        # Test if we can create a very simple auth user (different email)
        try:
            test_email = f"connectivity-test-{hash('test') % 10000}@example.com"
            print(f"🧪 Testing auth signup with: {test_email}")
            
            # Try the simplest possible signup
            auth_response = supabase.auth.sign_up({
                "email": test_email,
                "password": "testpassword123"
            })
            
            if auth_response.user:
                print(f"✅ Basic auth signup works: {auth_response.user.id}")
                
                # Try to clean up
                try:
                    supabase.table('profiles').delete().eq('id', auth_response.user.id).execute()
                except:
                    pass
                    
            else:
                print(f"❌ Auth signup failed: {auth_response}")
                
        except Exception as auth_error:
            print(f"❌ Auth signup error: {auth_error}")
            
        return True
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_supabase_connection()
