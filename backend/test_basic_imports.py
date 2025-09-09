#!/usr/bin/env python3
"""
Basic import test to diagnose what's not working
"""

import sys
import traceback

def test_basic_imports():
    """Test all critical imports one by one"""
    print("🔍 Testing basic imports...")
    
    # Test 1: Basic Python modules
    try:
        import os
        import json
        import asyncio
        print("✅ Basic Python modules: OK")
    except Exception as e:
        print(f"❌ Basic Python modules failed: {e}")
        return False
    
    # Test 2: FastAPI and dependencies
    try:
        from fastapi import FastAPI
        from pydantic import BaseModel
        print("✅ FastAPI and Pydantic: OK")
    except Exception as e:
        print(f"❌ FastAPI/Pydantic failed: {e}")
        return False
    
    # Test 3: Supabase
    try:
        from supabase import Client, create_client
        print("✅ Supabase: OK")
    except Exception as e:
        print(f"❌ Supabase failed: {e}")
        return False
    
    # Test 4: Configuration
    try:
        from config.settings import settings
        print("✅ Settings configuration: OK")
    except Exception as e:
        print(f"❌ Settings configuration failed: {e}")
        traceback.print_exc()
        return False
    
    # Test 5: Database
    try:
        from config.database import get_supabase
        print("✅ Database configuration: OK")
    except Exception as e:
        print(f"❌ Database configuration failed: {e}")
        traceback.print_exc()
        return False
    
    # Test 6: Services
    try:
        from services.workflow_executor import WorkflowExecutor
        print("✅ WorkflowExecutor: OK")
    except Exception as e:
        print(f"❌ WorkflowExecutor failed: {e}")
        traceback.print_exc()
        return False
    
    try:
        from services.workflow_monitor import WorkflowMonitor
        print("✅ WorkflowMonitor: OK")
    except Exception as e:
        print(f"❌ WorkflowMonitor failed: {e}")
        traceback.print_exc()
        return False
    
    # Test 7: Tools
    try:
        from tools.gmail_tool import GmailWorkflowTool
        print("✅ GmailWorkflowTool: OK")
    except Exception as e:
        print(f"❌ GmailWorkflowTool failed: {e}")
        traceback.print_exc()
        return False
    
    print("🎉 All basic imports successful!")
    return True

def test_supabase_connection():
    """Test Supabase connection"""
    print("\n🔍 Testing Supabase connection...")
    
    try:
        from config.database import get_supabase
        supabase = get_supabase()
        
        # Test basic query
        response = supabase.table('profiles').select('count', count='exact').limit(0).execute()
        print("✅ Supabase connection: OK")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        traceback.print_exc()
        return False

def test_workflow_system():
    """Test workflow system initialization"""
    print("\n🔍 Testing workflow system initialization...")
    
    try:
        from config.database import get_supabase
        from services.workflow_executor import WorkflowExecutor
        from services.workflow_monitor import WorkflowMonitor
        
        supabase = get_supabase()
        executor = WorkflowExecutor(supabase)
        monitor = WorkflowMonitor(supabase, executor)
        
        print("✅ Workflow system initialization: OK")
        return True
    except Exception as e:
        print(f"❌ Workflow system initialization failed: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 AUTOFY BACKEND DIAGNOSTIC TEST")
    print("=" * 50)
    
    success = True
    success &= test_basic_imports()
    success &= test_supabase_connection()
    success &= test_workflow_system()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 ALL TESTS PASSED - System should work!")
    else:
        print("❌ SOME TESTS FAILED - Issues need to be fixed")
    
    print("\nNext steps:")
    print("1. If tests pass, try: python main.py")
    print("2. If tests fail, check the error messages above")
