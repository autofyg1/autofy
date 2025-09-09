#!/usr/bin/env python3
"""
Simple test to identify what's preventing the workflow system from working
"""

import sys
import os
import traceback

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test critical imports step by step"""
    print("🔍 Testing imports...")
    
    try:
        # Test 1: Basic imports
        import asyncio
        import json
        from datetime import datetime
        print("✅ Basic Python modules")
    except Exception as e:
        print(f"❌ Basic imports failed: {e}")
        return False
    
    try:
        # Test 2: FastAPI
        from fastapi import FastAPI
        print("✅ FastAPI")
    except Exception as e:
        print(f"❌ FastAPI failed: {e}")
        return False
    
    try:
        # Test 3: Supabase
        from supabase import Client, create_client
        print("✅ Supabase")
    except Exception as e:
        print(f"❌ Supabase failed: {e}")
        return False
    
    try:
        # Test 4: Settings
        from config.settings import settings
        print("✅ Settings")
    except Exception as e:
        print(f"❌ Settings failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        # Test 5: Database
        from config.database import get_supabase
        print("✅ Database config")
    except Exception as e:
        print(f"❌ Database config failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        # Test 6: WorkflowExecutor
        from services.workflow_executor import WorkflowExecutor
        print("✅ WorkflowExecutor")
    except Exception as e:
        print(f"❌ WorkflowExecutor failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        # Test 7: WorkflowMonitor
        from services.workflow_monitor import WorkflowMonitor
        print("✅ WorkflowMonitor")
    except Exception as e:
        print(f"❌ WorkflowMonitor failed: {e}")
        traceback.print_exc()
        return False
    
    return True

def test_system_initialization():
    """Test system initialization"""
    print("\n🔧 Testing system initialization...")
    
    try:
        from config.database import get_supabase
        from services.workflow_executor import WorkflowExecutor
        from services.workflow_monitor import WorkflowMonitor
        
        # Initialize components
        supabase = get_supabase()
        print("✅ Supabase client created")
        
        executor = WorkflowExecutor(supabase)
        print("✅ WorkflowExecutor initialized")
        
        monitor = WorkflowMonitor(supabase, executor)
        print("✅ WorkflowMonitor initialized")
        
        return True
        
    except Exception as e:
        print(f"❌ System initialization failed: {e}")
        traceback.print_exc()
        return False

def test_database_connection():
    """Test database connection"""
    print("\n🗄️ Testing database connection...")
    
    try:
        from config.database import get_supabase
        supabase = get_supabase()
        
        # Test basic query
        response = supabase.table('profiles').select('count', count='exact').limit(0).execute()
        print("✅ Database connection successful")
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        traceback.print_exc()
        return False

def main():
    print("🚀 AUTOFY WORKFLOW SYSTEM DIAGNOSTIC")
    print("=" * 50)
    
    # Run tests
    imports_ok = test_imports()
    if not imports_ok:
        print("\n❌ Import tests failed - cannot proceed")
        return
    
    db_ok = test_database_connection()
    if not db_ok:
        print("\n❌ Database connection failed - check your .env file")
        return
    
    system_ok = test_system_initialization()
    if not system_ok:
        print("\n❌ System initialization failed")
        return
    
    print("\n" + "=" * 50)
    print("🎉 ALL TESTS PASSED!")
    print("\nThe workflow system should work. Try starting the server:")
    print("python main.py")

if __name__ == "__main__":
    main()
