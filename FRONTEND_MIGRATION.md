# Frontend Migration Guide: Integration with New LangChain Backend

This guide walks you through migrating your Autofy frontend to work with the new LangChain/LangGraph backend and updated Supabase database schema.

## 🎯 What's Changed

### Database Schema Updates
- **Profiles**: Enhanced user profile management with credits, plans, and onboarding
- **Integrations**: New structure for managing third-party service connections
- **Workflows**: Renamed from "zaps" with enhanced tracking and execution history
- **Chat System**: Complete chat session and message management for AI workflow creation
- **Audit Logging**: Comprehensive tracking of all user actions

### Backend Integration
- **API Client**: New TypeScript client for communicating with Python backend
- **Authentication**: Enhanced auth context with profile management
- **Hooks Updates**: All custom hooks now use the new API endpoints
- **Chat System**: New chat functionality for AI-powered workflow creation

## 🔧 Migration Steps

### 1. Environment Configuration

Update your `.env` file with the new backend configuration:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API Configuration (New LangChain Backend)
VITE_BACKEND_URL=http://localhost:8000

# OAuth Configuration
VITE_GMAIL_CLIENT_ID=your_gmail_client_id
VITE_NOTION_CLIENT_ID=your_notion_client_id

# Development Settings
VITE_DEBUG=true
```

### 2. Updated Components and Hooks

The following files have been migrated to work with the new system:

#### Core Libraries
- ✅ `src/lib/supabase.ts` - Updated types for new database schema
- ✅ `src/lib/api-client.ts` - New API client for backend communication

#### Authentication System
- ✅ `src/contexts/AuthContext.tsx` - Enhanced with profile management
- ✅ Profile creation and management automatically handled

#### Custom Hooks
- ✅ `src/hooks/useZaps.ts` - Updated to use new workflow endpoints
- ✅ `src/hooks/useIntegrations.ts` - Updated for new integration management
- ✅ `src/hooks/useChat.ts` - **NEW** - Complete chat system for AI workflow creation

#### Components
- ✅ `src/components/WorkflowBotChat.tsx` - Updated to use new chat system
- ✅ All components now use backward-compatible interfaces

### 3. Key Changes in Component Usage

#### WorkflowBotChat Component
```tsx
// OLD Usage
<WorkflowBotChat userId={user.id} onZapCreated={handleZapCreated} />

// NEW Usage  
<WorkflowBotChat onZapCreated={handleZapCreated} className="h-96" />
```

#### Authentication Context
```tsx
// NEW: Access to profile data
const { user, profile, loading, refreshProfile } = useAuth();

// Check onboarding status
if (profile && !profile.onboarding_completed) {
  // Show onboarding flow
}

// Check credits
if (profile && profile.credits_used >= profile.credits_limit) {
  // Show upgrade prompt
}
```

#### Integration Management
```tsx
// The useIntegrations hook works the same way but now calls the new backend
const { integrations, connectIntegration, disconnectIntegration, isConnected } = useIntegrations();
```

## 🧪 Testing the Migration

### 1. Start the Backend

First, make sure the new Python backend is running:

```bash
cd backend
python validate_migration.py  # Validate the setup first
python main.py                # Start the backend server
```

The backend should be available at `http://localhost:8000`

### 2. Test Frontend Integration

Start your frontend development server:

```bash
npm run dev
```

### 3. Test Key Workflows

#### Authentication Flow
1. Sign up/Sign in should work normally
2. Profile should be automatically created in the new `profiles` table
3. Check browser console for any auth errors

#### Dashboard
1. Existing workflows should load (transformed from new API)
2. Create new workflow should work through the API
3. Toggle workflow status (note: currently simulated locally)
4. Delete workflow should work through the API

#### Integrations Page
1. View connected integrations
2. Connect new integrations (Gmail, Notion, etc.)
3. Test integration connections
4. Disconnect integrations

#### AI Workflow Creation
1. Open the WorkflowBotChat component
2. Send a message like "Create a workflow to save Gmail emails to Notion"
3. The bot should respond and potentially create a workflow
4. Created workflows should appear in the dashboard

### 4. API Testing

You can test the backend API directly:

```bash
# Health check
curl http://localhost:8000/health

# Get workflows (requires auth token)
curl -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
     http://localhost:8000/api/workflows

# Send chat message (requires auth token)
curl -X POST \
     -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message": "Help me create an email automation workflow"}' \
     http://localhost:8000/api/chat/message
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: No authentication token available
```
**Solution**: Make sure you're signed in and the Supabase session is valid.

#### 2. Backend Connection Issues
```
Error: Failed to fetch from http://localhost:8000
```
**Solution**: 
- Verify backend is running on port 8000
- Check `VITE_BACKEND_URL` in your `.env` file
- Ensure CORS is configured correctly in the backend

#### 3. Profile Creation Errors
```
Error: Profile not found
```
**Solution**: 
- Check if the `profiles` table exists in Supabase
- Verify RLS policies allow profile creation
- Check browser console for detailed errors

#### 4. Integration Connection Issues
```
Error: Failed to connect integration
```
**Solution**:
- Verify the new integration endpoints are working
- Check if the backend can reach the integration service
- Ensure credentials are properly formatted

#### 5. Chat System Issues
```
Error: Failed to create chat session
```
**Solution**:
- Verify the chat tables exist in Supabase
- Check if the backend chat endpoints are working
- Ensure the LangGraph workflow manager is initialized

### Development Tips

#### Debugging API Calls
Add this to your browser console to debug API calls:
```javascript
// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = (...args) => {
  console.log('Fetch request:', args);
  return originalFetch(...args).then(response => {
    console.log('Fetch response:', response);
    return response;
  });
};
```

#### Backend Logs
Monitor backend logs for detailed error information:
```bash
cd backend
python main.py 2>&1 | tee backend.log
```

#### Database Inspection
Check your Supabase tables directly:
```sql
-- Check profiles
SELECT * FROM profiles WHERE id = 'your-user-id';

-- Check integrations  
SELECT * FROM integrations WHERE user_id = 'your-user-id';

-- Check workflows
SELECT * FROM workflows WHERE user_id = 'your-user-id';

-- Check chat sessions
SELECT * FROM chat_sessions WHERE user_id = 'your-user-id';
```

## 🔄 Rollback Strategy

If you encounter issues, you can rollback to the old system:

1. **Revert Environment Variables**:
   ```env
   # Comment out or remove:
   # VITE_BACKEND_URL=http://localhost:8000
   ```

2. **Revert Hook Changes**: 
   - Restore original `useZaps.ts` and `useIntegrations.ts` from git
   - Remove references to `useChat.ts`

3. **Revert Components**:
   - Restore original `WorkflowBotChat.tsx`
   - Update component props as needed

4. **Database**: The new database schema is backward compatible, so old queries should still work.

## 📈 Performance Considerations

### Optimizations Applied
- **API Client**: Centralized HTTP client with proper error handling
- **Auth Tokens**: Automatic token refresh and management
- **Chat System**: Efficient message loading and state management
- **Integration Testing**: Cached integration status to reduce API calls

### Monitoring
- All API calls are logged in development mode
- Backend provides comprehensive health check endpoint
- Database operations are optimized with proper indexing

## ✅ Post-Migration Checklist

- [ ] Backend is running and healthy (`/health` endpoint returns 200)
- [ ] Database migration is complete (all tables exist with proper RLS)
- [ ] Authentication works (login/signup/profile creation)
- [ ] Workflows can be listed, created, and deleted
- [ ] Integrations can be connected and managed
- [ ] Chat system works for AI workflow creation
- [ ] All frontend routes are accessible
- [ ] No console errors during normal usage
- [ ] Production environment variables are configured

## 🚀 Next Steps

After successful migration:

1. **Performance Testing**: Load test the new system with realistic data
2. **User Acceptance Testing**: Have users test critical workflows
3. **Monitoring Setup**: Implement proper logging and monitoring
4. **Documentation**: Update user-facing documentation
5. **Feature Enhancement**: Add new AI-powered features using LangChain capabilities

## 🤝 Support

If you encounter issues during migration:

1. **Check the logs** in both frontend console and backend output
2. **Verify database schema** matches the expected structure  
3. **Test individual components** in isolation
4. **Review the migration validation** output from `validate_migration.py`

Remember: This migration provides a solid foundation for advanced AI automation features while maintaining backward compatibility with existing user data and workflows!
