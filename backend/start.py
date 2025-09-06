#!/usr/bin/env python3
"""
Startup script for Autofy LangChain Backend
"""
import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config.settings import settings


def setup_logging():
    """Setup logging configuration"""
    log_level = logging.DEBUG if settings.debug else logging.INFO
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('autofy-backend.log') if not settings.debug else logging.StreamHandler()
        ]
    )
    
    # Suppress some noisy loggers in production
    if not settings.debug:
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        logging.getLogger("openai").setLevel(logging.WARNING)


def check_environment():
    """Check environment variables and configuration"""
    logger = logging.getLogger(__name__)
    
    logger.info("🔧 Checking environment configuration...")
    
    # Check required settings
    missing_vars = []
    
    if not settings.supabase_url:
        missing_vars.append("SUPABASE_URL")
    
    if not settings.supabase_service_key:
        missing_vars.append("SUPABASE_SERVICE_KEY")
    
    # Check at least one LLM provider
    llm_providers = [
        settings.openai_api_key,
        settings.anthropic_api_key, 
        settings.gemini_api_key,
        settings.openrouter_api_key
    ]
    
    if not any(llm_providers):
        missing_vars.append("At least one LLM provider API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY)")
    
    if missing_vars:
        logger.error("❌ Missing required environment variables:")
        for var in missing_vars:
            logger.error(f"   - {var}")
        logger.error("Please check your .env file and ensure all required variables are set.")
        sys.exit(1)
    
    logger.info("✅ Environment configuration looks good!")
    
    # Log available providers
    available_providers = []
    if settings.openai_api_key:
        available_providers.append("OpenAI")
    if settings.anthropic_api_key:
        available_providers.append("Anthropic")
    if settings.gemini_api_key:
        available_providers.append("Gemini")
    if settings.openrouter_api_key:
        available_providers.append("OpenRouter")
    
    logger.info(f"🤖 Available LLM providers: {', '.join(available_providers)}")


async def test_database_connection():
    """Test database connection"""
    logger = logging.getLogger(__name__)
    
    logger.info("🗄️  Testing database connection...")
    
    try:
        from config.database import get_supabase
        supabase = get_supabase()
        
        # Test connection with a simple query
        result = supabase.table("integrations").select("count", count="exact").execute()
        
        logger.info(f"✅ Database connection successful! Found {result.count} integrations in database.")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        logger.error("Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY")
        return False


async def test_tools_initialization():
    """Test tools initialization"""
    logger = logging.getLogger(__name__)
    
    logger.info("🔧 Testing tools initialization...")
    
    try:
        from tools import get_all_tools, get_tool_info, list_available_services
        
        tools = get_all_tools()
        tool_info = get_tool_info()
        services = list_available_services()
        
        logger.info(f"✅ Tools initialized successfully!")
        logger.info(f"   - {len(tools)} total tools available")
        logger.info(f"   - {len(services)} services supported: {', '.join(services)}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Tools initialization failed: {str(e)}")
        return False


async def test_workflow_manager():
    """Test workflow manager initialization"""
    logger = logging.getLogger(__name__)
    
    logger.info("⚡ Testing workflow manager...")
    
    try:
        from graph.workflow import get_workflow_manager
        
        workflow_manager = get_workflow_manager()
        status = workflow_manager.get_workflow_status()
        
        logger.info("✅ Workflow manager initialized successfully!")
        logger.info(f"   - Available workflow types: {', '.join(status['workflow_types'])}")
        logger.info(f"   - Tools available: {status['available_tools']}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Workflow manager initialization failed: {str(e)}")
        return False


def start_development_server():
    """Start development server"""
    import uvicorn
    
    logger = logging.getLogger(__name__)
    logger.info("🚀 Starting development server...")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )


def start_production_server():
    """Start production server"""
    import uvicorn
    
    logger = logging.getLogger(__name__)
    logger.info("🚀 Starting production server...")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        workers=int(os.getenv("WORKERS", 1)),
        log_level="info"
    )


async def main():
    """Main startup function"""
    print("🤖 Autofy LangChain Backend Starting...")
    print("=" * 50)
    
    # Setup logging
    setup_logging()
    logger = logging.getLogger(__name__)
    
    # Check environment
    check_environment()
    
    # Test components
    tests_passed = 0
    total_tests = 3
    
    if await test_database_connection():
        tests_passed += 1
    
    if await test_tools_initialization():
        tests_passed += 1
    
    if await test_workflow_manager():
        tests_passed += 1
    
    print("=" * 50)
    if tests_passed == total_tests:
        logger.info(f"✅ All {total_tests} startup tests passed!")
        logger.info("🚀 Backend is ready to start!")
        
        # Start appropriate server
        if settings.debug:
            start_development_server()
        else:
            start_production_server()
    else:
        logger.error(f"❌ {total_tests - tests_passed} startup tests failed!")
        logger.error("Please fix the issues above before starting the backend.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
