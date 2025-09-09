# Autofy Workflow System - Complete Setup Guide

## 🚀 Quick Start

### 1. Test the System
```bash
cd backend
python fix_workflow_system.py
```

### 2. Start the Server
```bash
python start_server.py
```

### 3. Access the API
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🔧 System Architecture

### Core Components
- **WorkflowExecutor**: Executes individual workflow steps
- **WorkflowMonitor**: Continuously monitors active workflows
- **Tools**: Gmail, Notion, AI, Telegram integrations
- **FastAPI Server**: REST API endpoints

### Workflow Flow
1. User creates workflow with trigger (Gmail keywords)
2. User activates workflow (status = 'active')
3. WorkflowMonitor automatically starts monitoring
4. Gmail checked every 2 minutes for matching emails
5. Matching emails trigger workflow execution
6. Steps executed: Gmail → AI Processing → Notion Page Creation
7. Execution count updated, detailed logs generated

## 📊 Monitoring & Logging

### API Endpoints for Monitoring
```
GET /api/workflows/monitoring/status     # Overall monitoring status
GET /api/workflows/{id}/logs            # Workflow-specific logs
GET /api/workflows/{id}/status          # Execution statistics
POST /api/workflows/{id}/test-execute   # Manual test execution
```

### Log Levels
- **INFO**: General workflow operations
- **SUCCESS**: Successful completions
- **ERROR**: Failures and errors
- **WARNING**: Non-critical issues

### Sample Log Output
```
✅ Found 3 new emails for user abc123
🔄 Executing Step 1: gmail.fetch_emails (User: abc123)
✅ Step 1 (gmail.fetch_emails) completed successfully
🔄 Executing Step 2: ai.process_content (User: abc123)
✅ Step 2 (ai.process_content) completed successfully
🔄 Executing Step 3: notion.create_page (User: abc123)
✅ Step 3 (notion.create_page) completed successfully
🎉 Workflow 'Email to Notion' execution successful (User: abc123)
```

## 🔄 Multi-User Support

### User Workflow Lifecycle
1. **Registration**: User signs up via `/api/auth/signup`
2. **Integration**: User connects Gmail, Notion via OAuth
3. **Workflow Creation**: User creates workflows via `/api/workflows`
4. **Activation**: User sets workflow status to 'active'
5. **Automatic Monitoring**: System starts monitoring automatically
6. **Execution**: Workflows run based on triggers
7. **Deactivation**: User can stop workflows anytime

### Concurrent Operations
- Multiple users can have active workflows simultaneously
- Each user's workflows run independently
- Separate logging and execution tracking per user
- Individual integration credentials per user

## 🛠️ Configuration

### Environment Variables (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
OPENAI_API_KEY=your_openai_key
```

### Database Tables Required
- `profiles` - User profiles
- `workflows` - Workflow definitions
- `workflow_steps` - Individual workflow steps
- `integrations` - User service integrations
- `workflow_executions` - Execution history
- `workflow_execution_logs` - Detailed logs

## 🧪 Testing

### Manual Testing
```bash
# Test system components
python simple_test.py

# Full system test
python fix_workflow_system.py

# Test specific workflow
curl -X POST "http://localhost:8000/api/workflows/{workflow_id}/test-execute" \
  -H "Authorization: Bearer {token}"
```

### Automated Testing
```bash
# Run the comprehensive test
python test_workflow_system.py
```

## 🔍 Troubleshooting

### Common Issues

1. **Import Errors**
   - Run `python simple_test.py` to identify missing dependencies
   - Install missing packages: `pip install -r requirements.txt`

2. **Database Connection Failed**
   - Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
   - Verify Supabase project is active

3. **OAuth Integration Issues**
   - Verify Google/Notion client credentials in .env
   - Check redirect URIs in OAuth app settings

4. **Workflow Not Executing**
   - Ensure workflow status is 'active'
   - Check user has valid Gmail integration
   - Verify trigger configuration (keywords, etc.)

### Debug Commands
```bash
# Check system status
curl http://localhost:8000/health

# Check monitoring status
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/workflows/monitoring/status

# View workflow logs
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/workflows/{workflow_id}/logs
```

## 📈 Performance & Scaling

### Current Limits
- Gmail API: 250 quota units per user per 100 seconds
- Notion API: 3 requests per second per integration
- Concurrent workflows: No hard limit (memory dependent)

### Optimization Tips
- Use specific Gmail keywords to reduce API calls
- Batch Notion operations when possible
- Monitor execution logs for performance bottlenecks

## 🔐 Security

### Authentication
- JWT tokens for API access
- OAuth 2.0 for service integrations
- Encrypted credential storage in database

### Data Privacy
- User data isolated by user_id
- Integration credentials encrypted
- Logs contain no sensitive data

## 🎯 Next Steps

1. **Start the server**: `python start_server.py`
2. **Create a user account** via the API
3. **Connect integrations** (Gmail, Notion)
4. **Create your first workflow**
5. **Activate it and watch it work!**

The system is now fully functional with comprehensive monitoring, logging, and multi-user support as requested.
