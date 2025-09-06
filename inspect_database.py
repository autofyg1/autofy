#!/usr/bin/env python3
"""
Simple database inspection
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

def inspect_database():
    """Inspect database for issues"""
    print("🔍 Database Inspection")
    print("=" * 50)
    
    try:
        from config.database import get_supabase
        
        supabase = get_supabase()
        print("✅ Supabase client created")
        
        # Try to get profiles table info by attempting an insert that will fail
        # This will show us constraint violations
        try:
            # Try inserting with invalid data to see what constraints exist
            result = supabase.table('profiles').insert({
                'id': '00000000-0000-0000-0000-000000000000',  # Definitely invalid
                'email': 'test@example.com'
            }).execute()
            print("🤔 Unexpected: Insert succeeded")
            
        except Exception as e:
            print(f"📋 Profiles table constraints (from failed insert): {e}")
            
        # Try to see what happens with an empty profiles insert
        try:
            result = supabase.table('profiles').insert({}).execute()
            print("🤔 Unexpected: Empty insert succeeded")
        except Exception as e:
            print(f"📋 Required fields (from empty insert): {e}")
            
        # Check if there are any existing profiles
        try:
            result = supabase.table('profiles').select('*').execute()
            print(f"👥 Existing profiles: {len(result.data)}")
            if result.data:
                print("Sample profile structure:")
                sample = result.data[0]
                for key, value in sample.items():
                    print(f"  {key}: {type(value).__name__}")
        except Exception as e:
            print(f"❌ Cannot read profiles: {e}")
            
        return True
        
    except Exception as e:
        print(f"❌ Inspection failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    inspect_database()
