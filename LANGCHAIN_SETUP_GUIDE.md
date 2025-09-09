# 🚀 LangChain & LangGraph Migration Setup Guide

This guide will help you migrate your Autofy project from the current Supabase + custom automation setup to the new LangChain and LangGraph powered backend.

## 📋 Prerequisites

- Python 3.9+ (for the new backend)
- Node.js 18+ (for the existing frontend)
- Your existing Supabase database and credentials
- API keys for at least one LLM provider (OpenAI, Anthropic, Gemini, or OpenRouter)

## 🔧 Step 1: Backend Setup

### 1.1 Create Python Virtual Environment

```bash
# Navigate to the project directory
cd zappy

# Create virtual environment for the backend
python -m venv backend/venv

# Activate virtual environment (Windows)
backend/venv/Scripts/activate
source venv/Scripts/activate


# Activate virtual environment (macOS/Linux)
source backend/venv/bin/activate
```

### 1.2 Install Python Dependencies

```bash
# Install all required packages
cd backend
pip install -r requirements.txt
```

### 1.3 Configure Environment Variables

```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit the .env file with your actual credentials
# You MUST configure these variables:
```

**Required Environment Variables:**

```bash
# Database (use your existing Supabase setup)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres

# At least ONE LLM provider is required:
OPENAI_API_KEY=your-openai-api-key-here          # Recommended
ANTHROPIC_API_KEY=your-anthropic-api-key-here    # Alternative
GEMINI_API_KEY=your-gemini-api-key-here          # Alternative  
OPENROUTER_API_KEY=your-openrouter-api-key-here  # Free tier available

# Google OAuth (for Gmail - use your existing keys)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Other services (optional, use existing keys if you have them)
NOTION_API_KEY=your-notion-integration-token
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Application settings
DEBUG=true
SECRET_KEY=your-super-secret-key-change-this-in-production
```

### 1.4 Test Backend Setup

```bash
# Run the setup test
cd backend
python start.py
```

This will:
- ✅ Check all environment variables
- ✅ Test database connection
- ✅ Initialize all LangChain tools
- ✅ Test LangGraph workflow manager
- 🚀 Start the development server on http://localhost:8000

## 🔧 Step 2: Frontend Integration

### 2.1 Add Environment Variable

Add this to your existing frontend `.env` file:

```bash
# Add to your existing .env file
VITE_LANGCHAIN_BACKEND_URL=http://localhost:8000
```

### 2.2 Update Frontend Dependencies

Your existing `package.json` is already set up, but you might want to add the new backend URL configuration:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:full-stack": "concurrently \"npm run dev\" \"cd backend && python start.py\"",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 2.3 Test Frontend Integration

```bash
# In a new terminal, start your existing frontend
npm run dev

# Test the new API integration
# The frontend can now use both the old Supabase system and new LangChain backend
```

## 🔄 Step 3: Migration Strategy

### 3.1 Gradual Migration Approach

The new LangChain backend is designed to work alongside your existing Supabase setup:

1. **Phase 1**: Keep existing workflows running on Supabase
2. **Phase 2**: Route new workflows through LangChain backend
3. **Phase 3**: Gradually migrate existing workflows
4. **Phase 4**: Deprecate old Supabase functions

### 3.2 Workflow Execution Options

```typescript
// In your frontend components, you now have two options:

// Option 1: Use existing Supabase workflow engine (current)
import { executeWorkflow } from './lib/workflow-engine';

// Option 2: Use new LangChain backend (recommended for new workflows)
import { executeWorkflow, sendWorkflowChatMessage } from './lib/langchain-api';

// Test if LangChain backend is available
import { isBackendHealthy } from './lib/langchain-api';

if (await isBackendHealthy()) {
  // Use new LangChain backend
  const result = await executeWorkflow(userId, zapId, triggerData);
} else {
  // Fallback to existing system
  const result = await originalExecuteWorkflow(zapId, triggerData);
}
```

### 3.3 Chat Bot Migration

The new LangChain backend includes an improved chat bot that can create workflows:

```typescript
// New LangChain-powered chat bot
import { sendWorkflowChatMessage } from './lib/langchain-api';

const response = await sendWorkflowChatMessage(
  userId,
  sessionId,
  "Create a workflow that saves important emails to Notion"
);

if (response?.workflow_created) {
  console.log(`Created new workflow: ${response.zap_id}`);
}
```

## 🧪 Step 4: Testing and Validation

### 4.1 Backend Health Check

Test your backend is working:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "workflow_manager": {
      "compiled_graphs": ["execution", "chat"],
      "available_tools": 15,
      "workflow_types": ["execution", "chat"]
    },
    "tools": {
      "total": 15,
      "services": ["gmail", "notion", "telegram", "ai"]
    }
  }
}
```

### 4.2 Test Workflow Execution

```bash
# Test workflow execution
curl -X POST http://localhost:8000/api/execute-zap \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "zap_id": "your-zap-id",
    "trigger_data": {"test": true}
  }'
```

### 4.3 Test Chat Interface

```bash
# Test chat bot
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "session_id": "test-session",
    "message": "Create a Gmail to Notion workflow"
  }'
```

## 🛠️ Step 5: Development Workflow

### 5.1 Running Both Systems

For development, you can run both systems simultaneously:

```bash
# Terminal 1: Start LangChain backend
cd backend
python start.py

# Terminal 2: Start React frontend  
npm run dev

# Terminal 3: Start Supabase local (if using)
supabase start
```

### 5.2 Environment Configuration

For development, your frontend `.env` should include:

```bash
# Existing Supabase config
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# New LangChain backend
VITE_LANGCHAIN_BACKEND_URL=http://localhost:8000

# LLM keys (if calling from frontend)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## 📊 Step 6: Migration Benefits

After migration, you'll have:

### ✅ **Standardized Integrations**
- All service integrations use LangChain's robust, well-tested tools
- Consistent error handling and retry mechanisms
- Better authentication and credential management

### ✅ **Advanced AI Orchestration**  
- LangGraph provides sophisticated workflow control flow
- Built-in state management and error recovery
- Support for complex multi-step AI workflows

### ✅ **Improved Chat Bot**
- More intelligent workflow creation through conversation
- Better understanding of user intent
- Automated validation and error correction

### ✅ **Better Monitoring**
- Structured execution logs and metrics
- Built-in debugging and tracing capabilities
- Performance monitoring and optimization

### ✅ **Scalability**
- Better handling of concurrent workflow executions
- Efficient resource management
- Horizontal scaling capabilities

## 🔍 Step 7: Troubleshooting

### Common Issues and Solutions

#### Backend Won't Start
```bash
# Check Python version
python --version  # Should be 3.9+

# Check if all dependencies installed
pip list | grep langchain

# Check environment variables
python -c "from backend.config.settings import settings; print('✅ Config loaded')"
```

#### Database Connection Issues
```bash
# Test Supabase connection
python -c "
from backend.config.database import get_supabase
supabase = get_supabase()
result = supabase.table('integrations').select('count', count='exact').execute()
print(f'✅ Connected! Found {result.count} integrations')
"
```

#### LLM Provider Issues
```bash
# Test OpenAI (example)
python -c "
from backend.config.settings import settings
print('OpenAI key configured:', bool(settings.openai_api_key))
"
```

#### Frontend Integration Issues
```bash
# Test backend connectivity from frontend
npm run dev
# Then visit: http://localhost:3000
# Open browser console and run:
# fetch('http://localhost:8000/health').then(r => r.json()).then(console.log)
```

## 🎯 Step 8: Next Steps

After successful setup:

1. **Create your first LangChain workflow** using the chat interface
2. **Test existing workflows** with the new backend
3. **Gradually migrate** high-value workflows to the new system
4. **Monitor performance** and optimize as needed
5. **Scale up** by adding more LLM providers and services

## 📚 Additional Resources

- [LangChain Documentation](https://python.langchain.com/docs/get_started/introduction)
- [LangGraph Guide](https://langchain-ai.github.io/langgraph/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Migration Planning Document](./LANGCHAIN_MIGRATION_PLAN.md)

---

## 🆘 Need Help?

If you encounter any issues during the migration:

1. Check the backend logs: `tail -f backend/autofy-backend.log`
2. Verify environment variables are correctly set
3. Test individual components using the troubleshooting steps above
4. The new system is designed to coexist with your existing setup, so you can always fall back to the original system if needed

**Your Autofy platform is now powered by LangChain and LangGraph! 🚀**
