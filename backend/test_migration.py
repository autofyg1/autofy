#!/usr/bin/env python3
"""
Comprehensive test script to validate LangChain migration
"""
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config.settings import settings
from config.database import get_supabase
from tools import get_all_tools, get_tool_info, list_available_services
from graph.workflow import get_workflow_manager


class MigrationTester:
    """Test suite for validating the LangChain migration"""
    
    def __init__(self):
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
        
        if passed:
            self.passed_tests += 1
        else:
            self.failed_tests += 1
            
    def print_summary(self):
        """Print test summary"""
        total = self.passed_tests + self.failed_tests
        print("\n" + "="*50)
        print("🧪 MIGRATION TEST SUMMARY")
        print("="*50)
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/total*100):.1f}%")
        
        if self.failed_tests == 0:
            print("\n🎉 All tests passed! Migration is successful!")
        else:
            print(f"\n⚠️ {self.failed_tests} tests failed. Review issues above.")
        
    def test_environment_config(self):
        """Test environment configuration"""
        try:
            # Test basic settings
            assert settings.app_name, "App name not set"
            assert settings.backend_url, "Backend URL not set"
            self.log_test("Environment Config", True, f"App: {settings.app_name}")
            
            # Test database config
            db_config = settings.supabase_config
            assert db_config["url"], "Supabase URL not configured"
            assert db_config["key"], "Supabase service key not configured"
            self.log_test("Database Config", True, "Supabase credentials configured")
            
            # Test LLM providers
            llm_providers = []
            if settings.openai_api_key:
                llm_providers.append("OpenAI")
            if settings.anthropic_api_key:
                llm_providers.append("Anthropic")
            if settings.gemini_api_key:
                llm_providers.append("Gemini")
            if settings.openrouter_api_key:
                llm_providers.append("OpenRouter")
                
            assert len(llm_providers) > 0, "No LLM providers configured"
            self.log_test("LLM Providers", True, f"Available: {', '.join(llm_providers)}")
            
        except Exception as e:
            self.log_test("Environment Config", False, str(e))

    def test_database_connection(self):
        """Test database connectivity"""
        try:
            supabase = get_supabase()
            
            # Test basic connection
            result = supabase.table("integrations").select("count", count="exact").execute()
            self.log_test("Database Connection", True, f"Found {result.count} integrations")
            
            # Test zaps table
            zaps_result = supabase.table("zaps").select("count", count="exact").execute()
            self.log_test("Zaps Table Access", True, f"Found {zaps_result.count} zaps")
            
        except Exception as e:
            self.log_test("Database Connection", False, str(e))

    def test_tools_initialization(self):
        """Test LangChain tools"""
        try:
            # Test tool registry
            tools = get_all_tools()
            assert len(tools) > 0, "No tools loaded"
            self.log_test("Tools Registry", True, f"{len(tools)} tools loaded")
            
            # Test tool info
            tool_info = get_tool_info()
            assert len(tool_info) > 0, "No tool info available"
            self.log_test("Tool Info", True, f"{len(tool_info)} tools documented")
            
            # Test services
            services = list_available_services()
            expected_services = ["gmail", "notion", "telegram", "ai"]
            for service in expected_services:
                if service in services:
                    self.log_test(f"{service.title()} Tools", True, "Available")
                else:
                    self.log_test(f"{service.title()} Tools", False, "Missing")
                    
        except Exception as e:
            self.log_test("Tools Initialization", False, str(e))

    def test_workflow_manager(self):
        """Test LangGraph workflow manager"""
        try:
            workflow_manager = get_workflow_manager()
            status = workflow_manager.get_workflow_status()
            
            # Test status
            assert "available_tools" in status, "Workflow manager not properly initialized"
            assert status["available_tools"] > 0, "No tools available to workflow manager"
            
            self.log_test("Workflow Manager", True, f"{status['available_tools']} tools available")
            
            # Test workflow graphs
            execution_workflow = workflow_manager.get_execution_workflow()
            assert execution_workflow, "Execution workflow not compiled"
            self.log_test("Execution Workflow", True, "Compiled successfully")
            
            chat_workflow = workflow_manager.get_chat_workflow()  
            assert chat_workflow, "Chat workflow not compiled"
            self.log_test("Chat Workflow", True, "Compiled successfully")
            
        except Exception as e:
            self.log_test("Workflow Manager", False, str(e))

    async def test_individual_tools(self):
        """Test individual LangChain tools"""
        from tools import get_tool_by_name
        
        # Test AI model list tool (should work without credentials)
        try:
            ai_list_tool = get_tool_by_name("ai_list_models")
            result_str = await ai_list_tool._arun(user_id="test", provider=None)
            result = json.loads(result_str)
            
            assert result.get("success"), "AI list models failed"
            assert "models" in result, "No models returned"
            
            self.log_test("AI Models Tool", True, f"Found {result['total_models']} models")
            
        except Exception as e:
            self.log_test("AI Models Tool", False, str(e))

    async def test_mock_workflow_execution(self):
        """Test workflow execution with mock data"""
        try:
            workflow_manager = get_workflow_manager()
            
            # Create mock initial state
            from graph.state import create_initial_workflow_state
            
            mock_state = create_initial_workflow_state(
                user_id="test-user",
                zap_id="test-zap",
                trigger_data={"test": True, "subject": "Test Email", "sender": "test@example.com"}
            )
            
            assert mock_state["user_id"] == "test-user", "Mock state not created properly"
            assert "variables" in mock_state, "Variables not initialized"
            
            self.log_test("Mock Workflow State", True, "State created successfully")
            
        except Exception as e:
            self.log_test("Mock Workflow State", False, str(e))

    def test_api_compatibility(self):
        """Test API response format compatibility"""
        try:
            # Test response format matches expected structure
            from main import ZapExecutionResponse, ChatResponse, HealthResponse
            
            # Create sample responses
            zap_response = ZapExecutionResponse(
                success=True,
                execution_id="test-123",
                status="completed"
            )
            
            chat_response = ChatResponse(
                success=True,
                bot_response="Test response",
                session_id="session-123",
                workflow_created=False
            )
            
            health_response = HealthResponse(
                status="healthy",
                version="1.0.0",
                services={"test": "ok"}
            )
            
            self.log_test("API Response Models", True, "All models validate correctly")
            
        except Exception as e:
            self.log_test("API Response Models", False, str(e))

    def test_migration_compatibility(self):
        """Test compatibility with existing Autofy structures"""
        try:
            # Test that we can process existing zap JSON structures
            sample_zap = {
                "id": "test-zap-id",
                "name": "Test Zap",
                "description": "Test workflow",
                "steps": [
                    {
                        "step_type": "trigger",
                        "service_name": "gmail",
                        "event_type": "new_email",
                        "configuration": {"keywords": "test"}
                    },
                    {
                        "step_type": "action", 
                        "service_name": "notion",
                        "event_type": "create_page",
                        "configuration": {
                            "database_id": "test-db",
                            "title": "{{subject}}",
                            "content": "{{body}}"
                        }
                    }
                ]
            }
            
            # Validate structure
            assert "steps" in sample_zap, "Steps not found"
            assert len(sample_zap["steps"]) > 0, "No steps defined"
            
            # Check if we support the services mentioned
            services = list_available_services()
            for step in sample_zap["steps"]:
                service = step["service_name"]
                if service not in services:
                    self.log_test(f"Service {service} Support", False, "Not supported")
                    return
            
            self.log_test("Migration Compatibility", True, "Existing zap structure supported")
            
        except Exception as e:
            self.log_test("Migration Compatibility", False, str(e))


async def main():
    """Run all migration tests"""
    print("🤖 Autofy LangChain Migration Validation")
    print("=" * 50)
    
    tester = MigrationTester()
    
    # Run synchronous tests
    print("\n🔧 Configuration Tests")
    tester.test_environment_config()
    tester.test_database_connection()
    
    print("\n🛠️ Component Tests")
    tester.test_tools_initialization()
    tester.test_workflow_manager()
    
    print("\n🧪 Functionality Tests")
    await tester.test_individual_tools()
    await tester.test_mock_workflow_execution()
    
    print("\n🔄 Compatibility Tests")
    tester.test_api_compatibility()
    tester.test_migration_compatibility()
    
    # Print summary
    tester.print_summary()
    
    # Exit with appropriate code
    if tester.failed_tests > 0:
        print(f"\n❌ {tester.failed_tests} tests failed. Migration needs attention.")
        sys.exit(1)
    else:
        print("\n🚀 Migration validation complete! System ready for use.")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
