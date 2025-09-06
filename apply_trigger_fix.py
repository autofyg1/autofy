#!/usr/bin/env python3
"""
Apply the trigger fix to Supabase
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

def apply_trigger_fix():
    """Apply the trigger fix"""
    print("🔧 Applying Trigger Fix")
    print("=" * 50)
    
    try:
        from config.database import get_supabase
        
        supabase = get_supabase()
        print("✅ Supabase client created")
        
        # Read the fix SQL
        with open("fix_profile_trigger.sql", "r") as f:
            sql_fix = f.read()
        
        print("📝 Loaded fix SQL")
        
        # Try to execute the fix SQL
        # Note: This may not work via Python client, might need to be done in Supabase dashboard
        try:
            # Split the SQL into individual statements
            statements = [stmt.strip() for stmt in sql_fix.split(';') if stmt.strip()]
            
            for i, statement in enumerate(statements, 1):
                if statement:
                    print(f"🔄 Executing statement {i}/{len(statements)}")
                    result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                    print(f"✅ Statement {i} executed successfully")
            
            print("✅ All SQL statements executed successfully!")
            return True
            
        except Exception as sql_error:
            print(f"❌ SQL execution failed: {sql_error}")
            print("\n📋 Manual fix required:")
            print("1. Go to your Supabase dashboard")
            print("2. Navigate to SQL Editor")
            print("3. Run the contents of fix_profile_trigger.sql")
            print("\nAlternatively, try running each statement individually.")
            return False
        
    except Exception as e:
        print(f"❌ Fix application failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    apply_trigger_fix()
