#!/usr/bin/env python3
"""
Debug script to start the backend with proper error handling
"""

import sys
import traceback
from pathlib import Path

# Add the backend directory to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("🚀 Starting Autofy Backend Server...")
print(f"Backend directory: {backend_dir}")
print(f"Python path: {sys.path[0]}")

try:
    # Test imports first
    print("\n📦 Testing imports...")
    
    from config.settings import settings
    print("✅ Settings loaded")
    
    from config.database import get_supabase
    print("✅ Database config loaded")
    
    from services.auth_service import AuthService
    print("✅ Auth service loaded")
    
    from services.profile_service import ProfileService
    print("✅ Profile service loaded")
    
    # Test Supabase connection
    print("\n🔗 Testing Supabase connection...")
    supabase = get_supabase()
    result = supabase.table('profiles').select('count', count='exact').limit(0).execute()
    print(f"✅ Supabase connection successful. Profiles count: {result.count}")
    
    print("\n🌐 Starting FastAPI server...")
    
    # Import and start the app
    from main import app
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Missing dependencies. Please run: pip install -r backend/requirements.txt")
    traceback.print_exc()
    sys.exit(1)

except Exception as e:
    print(f"❌ Error starting backend: {e}")
    traceback.print_exc()
    sys.exit(1)
