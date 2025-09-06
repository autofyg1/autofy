#!/usr/bin/env python3
"""
OAuth Configuration Diagnostic Script

This script checks if the required OAuth environment variables are set
and provides guidance on fixing any configuration issues.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

try:
    from config.settings import settings
    print("✅ Successfully loaded settings")
except ImportError as e:
    print(f"❌ Failed to import settings: {e}")
    sys.exit(1)

def check_oauth_config():
    """Check OAuth configuration for Gmail and Notion"""
    print("\n=== OAuth Configuration Diagnostic ===")
    
    # Check Gmail OAuth config
    print("\n🔍 Gmail OAuth Configuration:")
    gmail_client_id = settings.google_client_id
    gmail_client_secret = settings.google_client_secret
    
    if gmail_client_id and gmail_client_secret:
        print(f"✅ GOOGLE_CLIENT_ID: Present ({gmail_client_id[:20]}...)")
        print(f"✅ GOOGLE_CLIENT_SECRET: Present ({gmail_client_secret[:10]}...)")
    else:
        print(f"❌ GOOGLE_CLIENT_ID: {'Present' if gmail_client_id else 'MISSING'}")
        print(f"❌ GOOGLE_CLIENT_SECRET: {'Present' if gmail_client_secret else 'MISSING'}")
        print("   → Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file")
    
    # Check Notion OAuth config
    print("\n🔍 Notion OAuth Configuration:")
    notion_client_id = settings.notion_client_id
    notion_client_secret = settings.notion_client_secret
    
    if notion_client_id and notion_client_secret:
        print(f"✅ NOTION_CLIENT_ID: Present ({notion_client_id[:20]}...)")
        print(f"✅ NOTION_CLIENT_SECRET: Present ({notion_client_secret[:10]}...)")
    else:
        print(f"❌ NOTION_CLIENT_ID: {'Present' if notion_client_id else 'MISSING'}")
        print(f"❌ NOTION_CLIENT_SECRET: {'Present' if notion_client_secret else 'MISSING'}")
        print("   → Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in your .env file")
    
    # Check other important settings
    print("\n🔍 Other Important Settings:")
    print(f"✅ DEBUG: {settings.debug}")
    print(f"✅ BACKEND_URL: {settings.backend_url}")
    print(f"✅ SUPABASE_URL: {'Present' if settings.supabase_url else 'MISSING'}")
    print(f"✅ SUPABASE_SERVICE_KEY: {'Present' if settings.supabase_service_key else 'MISSING'}")
    
    # Check .env file
    print("\n🔍 Environment File Check:")
    env_paths = [
        backend_dir / ".env",
        Path(".env"),
        Path("backend/.env")
    ]
    
    env_found = False
    for env_path in env_paths:
        if env_path.exists():
            print(f"✅ Found .env file: {env_path}")
            env_found = True
            
            # Read and display relevant lines
            try:
                with open(env_path, 'r') as f:
                    lines = f.readlines()
                    
                relevant_vars = [
                    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
                    'NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET',
                    'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'
                ]
                
                print("   Relevant environment variables:")
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        for var in relevant_vars:
                            if line.startswith(f'{var}='):
                                value = line.split('=', 1)[1]
                                if value and value != 'your_value_here':
                                    print(f"   ✅ {var}: Set")
                                else:
                                    print(f"   ❌ {var}: Not set or placeholder")
                                break
            except Exception as e:
                print(f"   ⚠️  Could not read .env file: {e}")
            break
    
    if not env_found:
        print("❌ No .env file found")
        print("   → Create a .env file in the backend/ directory with your OAuth credentials")
    
    # Summary
    print("\n=== Summary ===")
    
    missing_vars = []
    if not gmail_client_id or not gmail_client_secret:
        missing_vars.extend(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'])
    if not notion_client_id or not notion_client_secret:
        missing_vars.extend(['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'])
    
    if missing_vars:
        print("❌ OAuth Configuration Issues Found")
        print(f"   Missing: {', '.join(missing_vars)}")
        print("\n📋 Action Required:")
        print("1. Create/update backend/.env file with the missing OAuth credentials")
        print("2. Get OAuth credentials from:")
        print("   - Google: https://console.developers.google.com/")
        print("   - Notion: https://www.notion.so/my-integrations")
        print("3. Restart the backend server after updating .env")
        return False
    else:
        print("✅ OAuth Configuration Looks Good!")
        return True

if __name__ == "__main__":
    success = check_oauth_config()
    sys.exit(0 if success else 1)
