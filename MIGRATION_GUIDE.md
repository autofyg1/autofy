# Complete Migration Guide: From Custom Backend to LangChain/LangGraph

This guide will help you migrate your Autofy project from the current custom backend to the new LangChain and LangGraph-powered system with an updated Supabase database schema.

## 🚀 Migration Overview

### What's New
- **LangChain Integration**: All third-party API calls now use LangChain tools for consistency and reliability
- **LangGraph Workflows**: Complex workflow orchestration using state machines and conditional logic
- **Enhanced Database Schema**: Comprehensive user profiles, integrations management, chat system, and audit logging
- **Improved Security**: Row Level Security (RLS), proper authentication flow, and user permissions
- **Better Scalability**: Async operations, connection pooling, and efficient database queries

### Key Components Migrated
- **Workflow Engine** → **LangGraph Workflows**
- **Custom API integrations** → **LangChain Tools** 
- **Basic database schema** → **Comprehensive multi-table schema**
- **Simple auth** → **Complete auth service with profile management**
- **Manual chat handling** → **Structured chat sessions and message management**

## 📋 Pre-Migration Checklist

### 1. Environment Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Verify environment variables
cp backend/.env.example backend/.env
```

### 2. Required Environment Variables
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]

# AI Services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
OPENROUTER_API_KEY=your_openrouter_key

# Third-party Services
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# App Config
DEBUG=true
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

## 🗄️ Database Migration

### 1. Apply New Schema
Execute the SQL schema from `supabase_schema.sql` in your Supabase SQL editor:

```sql
-- This will create all new tables, RLS policies, functions, and seed data
-- The file contains comprehensive schema for:
-- - User profiles and preferences
-- - Service integrations management  
-- - Workflows and executions
-- - Chat sessions and messages
-- - API keys and audit logging
-- - System monitoring
```

### 2. Data Migration Script
If you have existing data, create a migration script:

```python
# migration_script.py
import asyncio
from supabase import create_client
from services import ProfileService, WorkflowService, IntegrationService

async def migrate_existing_data():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Migrate users to new profile structure
    old_users = supabase.table('users').select('*').execute()
    
    profile_service = ProfileService(supabase)
    
    for user in old_users.data:
        await profile_service.create_profile(
            user_id=user['id'],
            email=user['email'],
            full_name=user.get('name'),
            # ... map other fields
        )
    
    # Migrate zaps to workflows
    # Migrate integrations
    # ... continue for other tables

if __name__ == "__main__":
    asyncio.run(migrate_existing_data())
```

## 🔧 Backend Migration Steps

### 1. Update Package Dependencies
The new `requirements.txt` includes:
- LangChain and LangGraph
- Updated FastAPI with async support
- Enhanced database drivers
- New service integrations

### 2. Update Configuration
- New settings structure in `config/settings.py`
- Database connection management in `config/database.py`
- Comprehensive logging configuration

### 3. Replace Core Components

#### Workflow Engine → LangGraph
**Before (Custom Engine):**
```typescript
// Old workflow-engine.ts
export class WorkflowEngine {
  async executeZap(zapConfig, triggerData) {
    // Custom execution logic
  }
}
```

**After (LangGraph):**
```python
# New workflows/manager.py
class WorkflowManager:
    async def execute_workflow(self, workflow_id: str, trigger_data: dict, user_id: str):
        # LangGraph state machine execution
        return await self.workflow_graph.ainvoke(...)
```

#### API Integrations → LangChain Tools
**Before (Direct API calls):**
```typescript
// Old direct API usage
const response = await fetch('https://api.gmail.com/...')
```

**After (LangChain Tools):**
```python
# New tools/gmail_tools.py  
class GmailTools:
    @tool
    async def fetch_emails(self, query: str) -> List[dict]:
        # LangChain tool with proper error handling, retries, etc.
```

### 4. Service Layer Implementation
New service classes provide clean separation:
- `ProfileService`: User profile management
- `IntegrationService`: Third-party service connections
- `WorkflowService`: Workflow CRUD and execution tracking
- `ChatService`: Chat session and message management
- `AuthService`: Authentication and authorization

## 🎨 Frontend Migration

### 1. Update API Client
Replace the existing API client with the new TypeScript client:

```typescript
// frontend/lib/api-client.ts
import { ApiClient } from './api-client'

const api = new ApiClient('http://localhost:8000')

// New usage
const workflows = await api.getWorkflows()
const execution = await api.executeWorkflow(workflowId, triggerData)
```

### 2. Update Components
Update React components to work with new API structure:

**Authentication:**
```typescript
// Use new auth endpoints
const user = await api.getCurrentUser()
const profile = await api.getProfile()
```

**Workflows:**
```typescript  
// New workflow management
const workflows = await api.getWorkflows()
const workflow = await api.createWorkflow(workflowData)
```

**Chat Interface:**
```typescript
// Enhanced chat with sessions
const session = await api.createChatSession()
const response = await api.sendMessage(message, session.id)
```

## 🧪 Testing Migration

### 1. Backend Testing
```bash
# Test database connections
python backend/test_database.py

# Test API endpoints
python backend/test_api.py

# Test LangChain tools
python backend/test_tools.py

# Test LangGraph workflows
python backend/test_workflows.py
```

### 2. Integration Testing  
```bash
# Test full workflow execution
curl -X POST http://localhost:8000/api/workflows/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "test-workflow", "trigger_data": {}}'

# Test chat functionality
curl -X POST http://localhost:8000/api/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a workflow to send daily email summaries"}'
```

### 3. Frontend Testing
```bash
# Start new backend
cd backend && python main.py

# Start frontend (update API URLs if needed)
cd frontend && npm run dev

# Test key user flows:
# - User authentication  
# - Workflow creation via chat
# - Integration management
# - Workflow execution
# - Chat history
```

## 🚀 Deployment

### 1. Production Environment Setup
Update your deployment configurations:

**Docker (if using):**
```dockerfile
# Update Dockerfile to include new Python dependencies
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
# ... rest of setup
```

**Environment Variables:**
Ensure all production environment variables are set with real values.

### 2. Database Migration in Production
```sql
-- Run schema migration during maintenance window
-- Test with a database backup first
-- Consider using Supabase migrations for version control
```

### 3. Gradual Rollout
1. Deploy new backend alongside old backend
2. Migrate user data in phases
3. Update frontend to use new APIs gradually
4. Monitor and rollback if needed
5. Deprecate old backend

## 📊 Benefits After Migration

### Performance Improvements
- **Async Operations**: All database and API calls are now async
- **Connection Pooling**: Efficient database connection management
- **Caching**: LangChain built-in caching for AI responses
- **Batch Operations**: Optimized database queries

### Reliability Improvements
- **Error Handling**: Comprehensive error handling and retries
- **State Management**: LangGraph ensures consistent workflow states
- **Transaction Safety**: Database transactions prevent data corruption
- **Audit Logging**: Complete audit trail for all operations

### Developer Experience
- **Type Safety**: Full TypeScript support on frontend and Python typing on backend
- **API Documentation**: Auto-generated OpenAPI documentation
- **Testing**: Comprehensive test coverage for all components
- **Monitoring**: Built-in health checks and monitoring endpoints

### Scalability
- **Horizontal Scaling**: Stateless design allows easy horizontal scaling
- **Database Optimization**: Proper indexing and query optimization
- **Caching Strategy**: Redis support for session and response caching
- **Rate Limiting**: Built-in rate limiting for API endpoints

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check connection string
   python -c "from config.database import get_supabase; print(get_supabase().table('profiles').select('count').execute())"
   ```

2. **LangChain Tool Errors**
   ```bash
   # Test individual tools
   python backend/test_tools.py gmail
   ```

3. **Authentication Issues**
   ```bash
   # Verify JWT tokens
   python -c "from services.auth_service import AuthService; # test auth"
   ```

4. **Migration Script Issues**
   - Always backup data before migration
   - Test migration on copy of production data first
   - Monitor logs during migration process

### Performance Issues
- Check database query performance with `EXPLAIN ANALYZE`
- Monitor API response times
- Use connection pooling appropriately
- Consider adding Redis cache for frequent queries

### Security Checklist
- [ ] All RLS policies are working correctly
- [ ] API keys are stored securely
- [ ] User data is properly isolated
- [ ] Audit logging is capturing all actions
- [ ] Rate limiting is configured
- [ ] CORS is configured correctly

## 📈 Next Steps

After successful migration:

1. **Monitoring Setup**: Implement proper logging and monitoring
2. **Performance Optimization**: Profile and optimize slow queries
3. **Feature Enhancement**: Add new AI-powered features using LangChain
4. **User Feedback**: Collect user feedback on new interface
5. **Documentation**: Update user documentation for new features

## 🤝 Support

If you encounter issues during migration:
1. Check the troubleshooting section above
2. Review logs in `backend/logs/` directory  
3. Test individual components in isolation
4. Verify environment configuration

Remember: This migration provides a solid foundation for scaling your AI automation platform with enterprise-grade architecture and modern best practices!
