#!/usr/bin/env python3
"""
Debug database connection and profile creation
"""

import sys
import os
from pathlib import Path
import traceback

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("🔍 Debugging Database Connection...")
print(f"Backend directory: {backend_dir}")
print(f"Current directory: {os.getcwd()}")

# Check if .env file exists
env_file = backend_dir / ".env"
print(f"Environment file exists: {env_file.exists()}")

if env_file.exists():
    print(f"Environment file size: {env_file.stat().st_size} bytes")

try:
    # Test loading environment
    print("\n📦 Loading settings...")
    from config.settings import settings
    
    print(f"✅ Settings loaded successfully")
    print(f"Debug mode: {settings.debug}")
    print(f"Supabase URL exists: {bool(settings.supabase_url)}")
    print(f"Supabase Service Key exists: {bool(settings.supabase_service_key)}")
    
    if settings.supabase_url:
        print(f"Supabase URL: {settings.supabase_url[:50]}...")
    
    # Test Supabase connection
    print("\n🔗 Testing Supabase connection...")
    from config.database import get_supabase
    
    supabase = get_supabase()
    print("✅ Supabase client created")
    
    # Test basic query
    result = supabase.table('profiles').select('count', count='exact').limit(0).execute()
    print(f"✅ Database connection successful")
    print(f"Profiles table query result: {result}")
    
    # Test profile creation
    print("\n👤 Testing profile creation...")
    from services.profile_service import ProfileService
    
    profile_service = ProfileService(supabase)
    
    # Try to create a test profile using direct Supabase call
    import uuid
    from datetime import datetime, timezone
    
    test_user_id = str(uuid.uuid4())
    test_email = "test-debug@example.com"
    test_name = "Debug Test User"
    
    print(f"Creating profile for user: {test_user_id}")
    print(f"Email: {test_email}")
    print(f"Name: {test_name}")
    
    try:
        # Create profile data
        now = datetime.now(timezone.utc)
        profile_data = {
            'id': test_user_id,
            'email': test_email,
            'full_name': test_name,
            'timezone': 'UTC',
            'plan_type': 'free',
            'credits_used': 0,
            'credits_limit': 1000,
            'onboarding_completed': False,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        print(f"Profile data: {profile_data}")
        
        # Insert profile
        result = supabase.table('profiles').insert(profile_data).execute()
        print(f"✅ Profile created successfully")
        print(f"Result: {result}")
        
        # Clean up - delete the test profile
        supabase.table('profiles').delete().eq('id', test_user_id).execute()
        print("✅ Test profile cleaned up")
        
    except Exception as profile_error:
        print(f"❌ Profile creation failed: {profile_error}")
        traceback.print_exc()

except Exception as e:
    print(f"❌ Error: {e}")
    traceback.print_exc()

print("\n🏁 Debug complete!")
