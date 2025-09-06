#!/usr/bin/env python3
"""
Migration validation script for Autofy LangChain backend.
This script tests all components to ensure the migration was successful.
"""

import asyncio
import sys
import json
import os
from typing import Dict, Any, List
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from config.settings import settings
    from config.database import get_supabase, db_manager
    from services import (
        ProfileService,
        IntegrationService,
        WorkflowService,
        ChatService,
        AuthService
    )
    from tools.registry import get_all_tools, get_tool_info
    from workflows.manager import WorkflowManager
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Make sure you're running this from the backend directory and all dependencies are installed.")
    sys.exit(1)


class MigrationValidator:
    """Validates the migration to LangChain backend"""
    
    def __init__(self):
        self.results: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": {},
            "summary": {"passed": 0, "failed": 0, "total": 0}
        }
        self.supabase = None
    
    def log_test(self, test_name: str, success: bool, details: str = None, error: str = None):
        """Log test result"""
        self.results["tests"][test_name] = {
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if success:
            self.results["summary"]["passed"] += 1
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            self.results["summary"]["failed"] += 1
            print(f"❌ {test_name}")
            if error:
                print(f"   Error: {error}")
        
        self.results["summary"]["total"] += 1
    
    async def test_environment(self):
        """Test environment configuration"""
        print("\n🔧 Testing Environment Configuration...")
        
        # Test required environment variables
        required_vars = [
            "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
            "OPENAI_API_KEY"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            self.log_test(
                "Environment Variables",
                False,
                error=f"Missing variables: {', '.join(missing_vars)}"
            )
        else:
            self.log_test(
                "Environment Variables",
                True,
                details=f"All {len(required_vars)} required variables present"
            )
    
    async def test_database_connection(self):
        """Test database connections"""
        print("\n🗄️ Testing Database Connections...")
        
        try:
            self.supabase = get_supabase()
            
            # Test basic connection
            result = self.supabase.table('profiles').select('count', count='exact').limit(0).execute()
            
            self.log_test(
                "Supabase Connection",
                True,
                details="Successfully connected to Supabase"
            )
            
            # Test database manager
            async with db_manager.get_session() as session:
                self.log_test(
                    "Database Manager",
                    True,
                    details="Database session manager working"
                )
                
        except Exception as e:
            self.log_test(
                "Database Connection",
                False,
                error=str(e)
            )
    
    async def test_database_schema(self):
        """Test database schema"""
        print("\n📊 Testing Database Schema...")
        
        if not self.supabase:
            self.log_test("Database Schema", False, error="No database connection")
            return
        
        required_tables = [
            'profiles', 'user_preferences', 'integrations', 'workflows',
            'workflow_steps', 'workflow_executions', 'chat_sessions',
            'chat_messages', 'api_keys', 'audit_logs'
        ]
        
        try:
            missing_tables = []
            
            for table in required_tables:
                try:
                    self.supabase.table(table).select('count', count='exact').limit(0).execute()
                except Exception:
                    missing_tables.append(table)
            
            if missing_tables:
                self.log_test(
                    "Database Schema",
                    False,
                    error=f"Missing tables: {', '.join(missing_tables)}"
                )
            else:
                self.log_test(
                    "Database Schema",
                    True,
                    details=f"All {len(required_tables)} tables present"
                )
                
        except Exception as e:
            self.log_test("Database Schema", False, error=str(e))
    
    async def test_services(self):
        """Test service layer"""
        print("\n⚙️ Testing Service Layer...")
        
        if not self.supabase:
            self.log_test("Services", False, error="No database connection")
            return
        
        services_to_test = [
            ("ProfileService", ProfileService),
            ("IntegrationService", IntegrationService),
            ("WorkflowService", WorkflowService),
            ("ChatService", ChatService),
            ("AuthService", AuthService)
        ]
        
        for service_name, service_class in services_to_test:
            try:
                service = service_class(self.supabase)
                # Basic instantiation test
                self.log_test(
                    f"Service: {service_name}",
                    True,
                    details="Service instantiated successfully"
                )
            except Exception as e:
                self.log_test(
                    f"Service: {service_name}",
                    False,
                    error=str(e)
                )
    
    async def test_langchain_tools(self):
        """Test LangChain tools"""
        print("\n🔗 Testing LangChain Tools...")
        
        try:
            tools = get_all_tools()
            tool_info = get_tool_info()
            
            self.log_test(
                "LangChain Tools Registry",
                True,
                details=f"Found {len(tools)} tools across {len(tool_info)} categories"
            )
            
            # Test individual tool categories
            expected_categories = ['gmail', 'notion', 'telegram', 'ai_processing']
            
            for category in expected_categories:
                category_tools = [t for t in tools if t.get('category') == category]
                if category_tools:
                    self.log_test(
                        f"Tools: {category.title()}",
                        True,
                        details=f"{len(category_tools)} tools available"
                    )
                else:
                    self.log_test(
                        f"Tools: {category.title()}",
                        False,
                        error=f"No tools found for {category}"
                    )
                    
        except Exception as e:
            self.log_test("LangChain Tools", False, error=str(e))
    
    async def test_langgraph_workflows(self):
        """Test LangGraph workflows"""
        print("\n🔄 Testing LangGraph Workflows...")
        
        try:
            workflow_manager = WorkflowManager()
            
            # Test workflow manager initialization
            self.log_test(
                "WorkflowManager",
                True,
                details="WorkflowManager instantiated successfully"
            )
            
            # Test workflow graph compilation
            if hasattr(workflow_manager, 'workflow_graph'):
                self.log_test(
                    "Workflow Graph",
                    True,
                    details="Workflow graph compiled successfully"
                )
            else:
                self.log_test(
                    "Workflow Graph",
                    False,
                    error="Workflow graph not found"
                )
                
            # Test chat graph compilation  
            if hasattr(workflow_manager, 'chat_graph'):
                self.log_test(
                    "Chat Graph",
                    True,
                    details="Chat graph compiled successfully"
                )
            else:
                self.log_test(
                    "Chat Graph",
                    False,
                    error="Chat graph not found"
                )
                
        except Exception as e:
            self.log_test("LangGraph Workflows", False, error=str(e))
    
    async def test_integration_endpoints(self):
        """Test integration with third-party services (basic connectivity)"""
        print("\n🌐 Testing Third-party Integrations...")
        
        # Test if API keys are configured
        api_keys_status = {
            "OpenAI": bool(os.getenv('OPENAI_API_KEY')),
            "Anthropic": bool(os.getenv('ANTHROPIC_API_KEY')),
            "Google": bool(os.getenv('GOOGLE_API_KEY')),
            "Gmail": bool(os.getenv('GMAIL_CLIENT_ID')),
            "Notion": bool(os.getenv('NOTION_CLIENT_ID')),
            "Telegram": bool(os.getenv('TELEGRAM_BOT_TOKEN'))
        }
        
        configured_keys = sum(api_keys_status.values())
        total_keys = len(api_keys_status)
        
        self.log_test(
            "API Keys Configuration",
            configured_keys > 0,
            details=f"{configured_keys}/{total_keys} API keys configured",
            error=f"Only {configured_keys}/{total_keys} API keys configured" if configured_keys == 0 else None
        )
        
        # Individual API key tests
        for service, configured in api_keys_status.items():
            self.log_test(
                f"API Key: {service}",
                configured,
                details="Configured" if configured else None,
                error="Not configured" if not configured else None
            )
    
    async def test_sample_operations(self):
        """Test sample operations to ensure everything works together"""
        print("\n🧪 Testing Sample Operations...")
        
        if not self.supabase:
            self.log_test("Sample Operations", False, error="No database connection")
            return
        
        try:
            # Test profile service operations
            profile_service = ProfileService(self.supabase)
            
            # We can't test actual operations without a valid user, but we can test method existence
            methods_to_check = ['get_profile', 'create_profile', 'update_profile']
            for method in methods_to_check:
                if hasattr(profile_service, method):
                    self.log_test(
                        f"ProfileService.{method}",
                        True,
                        details="Method exists"
                    )
                else:
                    self.log_test(
                        f"ProfileService.{method}",
                        False,
                        error="Method missing"
                    )
        
        except Exception as e:
            self.log_test("Sample Operations", False, error=str(e))
    
    async def run_all_tests(self):
        """Run all migration validation tests"""
        print("🚀 Starting Migration Validation...\n")
        print("=" * 60)
        
        # Run all tests
        await self.test_environment()
        await self.test_database_connection()
        await self.test_database_schema()
        await self.test_services()
        await self.test_langchain_tools()
        await self.test_langgraph_workflows()
        await self.test_integration_endpoints()
        await self.test_sample_operations()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📋 MIGRATION VALIDATION SUMMARY")
        print("=" * 60)
        
        summary = self.results["summary"]
        print(f"Total Tests: {summary['total']}")
        print(f"Passed: {summary['passed']} ✅")
        print(f"Failed: {summary['failed']} ❌")
        
        if summary['failed'] == 0:
            print("\n🎉 ALL TESTS PASSED! Migration appears successful.")
            print("You can now proceed with testing the full application.")
        else:
            print(f"\n⚠️  {summary['failed']} tests failed. Please review the errors above.")
            print("Check the migration guide for troubleshooting steps.")
        
        # Save detailed results
        results_file = "migration_validation_results.json"
        with open(results_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        return summary['failed'] == 0


async def main():
    """Main function"""
    validator = MigrationValidator()
    
    try:
        success = await validator.run_all_tests()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\n⛔ Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error during validation: {e}")
        sys.exit(1)
    finally:
        # Cleanup database connections
        try:
            await db_manager.close()
        except:
            pass


if __name__ == "__main__":
    asyncio.run(main())
