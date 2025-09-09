#!/usr/bin/env python3
"""
Simple server startup script for Autofy backend
"""

import sys
import os
import asyncio
import uvicorn
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def check_environment():
    """Check if environment is properly configured"""
    print("🔍 Checking environment...")
    
    # Check .env file
    env_file = backend_dir / ".env"
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    print("✅ .env file found")
    
    # Test basic imports
    try:
        from config.settings import settings
        from config.database import get_supabase
        print("✅ Configuration loaded")
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False
    
    # Test database connection
    try:
        supabase = get_supabase()
        response = supabase.table('profiles').select('count', count='exact').limit(0).execute()
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("Check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
        return False
    
    return True

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Autofy Backend Server...")
    
    if not check_environment():
        print("❌ Environment check failed. Please fix the issues above.")
        return
    
    print("✅ Environment check passed")
    print("📡 Starting server on http://localhost:8000")
    print("📚 API docs will be available at http://localhost:8000/docs")
    print("\n" + "="*50)
    
    # Start server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    start_server()
