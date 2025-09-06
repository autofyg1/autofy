#!/usr/bin/env python3
"""
Check database schema for issues
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

def check_database_schema():
    """Check database schema and potential issues"""
    print("🔍 Checking Database Schema")
    print("=" * 50)
    
    try:
        from config.database import get_supabase
        
        supabase = get_supabase()
        print("✅ Supabase client created")
        
        # Check profiles table structure
        try:
            # Use SQL to describe the profiles table
            result = supabase.rpc('exec_sql', {
                'sql': """
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'profiles' AND table_schema = 'public'
                ORDER BY ordinal_position;
                """
            }).execute()
            
            print("📋 Profiles table structure:")
            for row in result.data:
                print(f"  - {row['column_name']}: {row['data_type']} {'NULL' if row['is_nullable'] == 'YES' else 'NOT NULL'}")
                
        except Exception as e:
            print(f"⚠️ Could not get table structure via RPC: {e}")
            
        # Check for triggers that might be causing issues
        try:
            result = supabase.rpc('exec_sql', {
                'sql': """
                SELECT trigger_name, event_manipulation, action_statement
                FROM information_schema.triggers 
                WHERE trigger_schema = 'public' OR trigger_schema = 'auth'
                ORDER BY trigger_name;
                """
            }).execute()
            
            print(f"\n🔧 Database triggers ({len(result.data)}):")
            for row in result.data:
                print(f"  - {row['trigger_name']}: {row['event_manipulation']}")
                print(f"    Action: {row['action_statement'][:100]}...")
                
        except Exception as e:
            print(f"⚠️ Could not get triggers: {e}")
            
        # Check RLS policies on profiles table
        try:
            result = supabase.rpc('exec_sql', {
                'sql': """
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
                FROM pg_policies 
                WHERE tablename = 'profiles';
                """
            }).execute()
            
            print(f"\n🔐 RLS Policies on profiles table ({len(result.data)}):")
            for row in result.data:
                print(f"  - {row['policyname']}: {row['cmd']} for {row['roles']}")
                
        except Exception as e:
            print(f"⚠️ Could not get RLS policies: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    check_database_schema()
