# Autofy Workflow Bot - Setup and Usage Guide

The Autofy Workflow Bot is an AI-powered conversational interface that helps users create valid Autofy JSON workflows (zaps) through natural language conversation. It uses Gemini AI for chat and embeddings, Supabase for data storage, and pgvector for semantic search.

## 🏗️ Architecture Overview

- **Frontend**: React component with TypeScript
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI**: Google Gemini API for chat and embeddings
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **Authentication**: Supabase Auth

## 📋 Prerequisites

- Supabase project with database access
- Google Gemini API key
- Node.js/npm for frontend development
- Deno for edge functions (if testing locally)

## 🚀 Installation & Setup

### 1. Database Setup

Run the provided migration files in your Supabase SQL editor:

```sql
-- Run supabase/migrations/20240102000001_create_chat_schema.sql
-- Run supabase/migrations/20240102000002_create_match_messages_function.sql
```

This creates:
- `chat_sessions` table for conversation sessions
- `chat_messages` table with pgvector embeddings
- `match_messages` function for semantic search
- Proper RLS policies for user data isolation

### 2. Environment Variables

Add these to your Supabase project settings:

```bash
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# These should already exist in your Supabase project:
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Deploy Edge Functions

Deploy the edge functions to Supabase:

```bash
# Deploy chat-bot function
supabase functions deploy chat-bot

# Deploy create-zap function
supabase functions deploy create-zap
```

### 4. Frontend Integration

Install the React component in your project:

```bash
npm install @supabase/supabase-js lucide-react
```

Add the component to your app:

```tsx
import WorkflowBotChat from './components/WorkflowBotChat';

function App() {
  const handleZapCreated = (zap: any) => {
    console.log('New zap created:', zap);
    // Refresh your workflows list or show success message
  };

  return (
    <div className="h-screen p-4">
      <WorkflowBotChat
        userId={user.id}
        onZapCreated={handleZapCreated}
      />
    </div>
  );
}
```

## 💬 How to Use the Bot

### Starting a Conversation

The bot will greet you with information about what it can do. You can start by describing what you want to automate:

**Examples:**
- "Create a zap to save important Gmail emails to Notion"
- "I want to get Telegram notifications for urgent emails"
- "Help me set up an AI email summarizer"
- "Create a workflow that processes emails with AI and sends summaries to Telegram"

### Bot Capabilities

1. **Intent Understanding**: Interprets natural language requests
2. **Required Field Collection**: Asks for missing configuration data
3. **Default Value Assignment**: Fills optional fields automatically
4. **JSON Generation**: Creates valid Autofy workflow JSON
5. **Real-time Validation**: Checks JSON against schema rules
6. **Secure Secrets**: Automatically replaces sensitive data with `{{secrets.KEY}}` references

### Supported Services

- **Gmail**: Trigger (new_email), Actions (send_email, send_reply)
- **Notion**: Action (create_page)
- **OpenRouter**: Action (process_with_ai)
- **Telegram**: Action (send_message)

### Example Conversation Flow

```
User: "Create a workflow that summarizes important emails with AI and saves them to Notion"

Bot: "I'll help you create an AI email summarization workflow! I need some information:

1. What keywords should trigger this workflow? (e.g., 'urgent', 'important', 'action required')
2. What's your Notion database ID where you want to save the summaries?

You can find your Notion database ID in the URL when viewing your database."

User: "Keywords: urgent, important, deadline. Database ID: a1b2c3d4e5f6"

Bot: "Perfect! I'll create a 3-step workflow:
1. Gmail trigger for emails containing those keywords
2. OpenRouter AI to summarize the email
3. Notion action to save the summary

Here's your workflow JSON: [shows complete JSON]

This workflow includes secure secret references for your API keys. Would you like me to create this zap in your dashboard?"
```

## 🔒 Security Features

### Automatic Secret Detection

The bot automatically identifies sensitive data patterns:
- API keys, tokens, passwords
- Long alphanumeric strings (20+ characters)
- JWT tokens
- Base64-encoded values (30+ characters)

### Secret Reference Format

Sensitive values are replaced with: `{{secrets.SECRET_KEY}}`

Examples:
- `"api_key": "{{secrets.OPENROUTER_API_KEY}}"`
- `"bot_token": "{{secrets.TELEGRAM_BOT_TOKEN}}"`
- `"integration_token": "{{secrets.NOTION_API_KEY}}"`

### Environment Setup

The bot can generate an environment template for your secrets:

```bash
# Environment variables for Autofy workflow secrets
OPENROUTER_API_KEY=your_openrouter_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
NOTION_API_KEY=your_notion_integration_token_here
```

## 🎯 Features

### Conversational Interface
- Natural language processing
- Context-aware responses
- Multi-turn conversations
- Error handling and clarification

### Smart Validation
- Real-time JSON validation
- Schema compliance checking
- Required field verification
- Service-specific configuration validation

### Memory & Context
- Conversation history storage
- Semantic search with pgvector
- Related conversation recall
- Session management

### User Experience
- Copy JSON to clipboard
- Download JSON files
- One-click zap creation
- Visual validation feedback
- Error messages with guidance

## 🔧 API Endpoints

### Chat Bot Endpoint
```
POST /functions/v1/chat-bot
```

**Request:**
```json
{
  "user_message": "Create a Gmail to Notion zap",
  "session_id": "optional-session-uuid",
  "create_new_session": false,
  "session_topic": "Workflow Creation"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "reply": "AI response text",
  "validation": {
    "isValid": true,
    "errors": [],
    "zapData": { /* validated zap JSON */ }
  }
}
```

### Create Zap Endpoint
```
POST /functions/v1/create-zap
```

**Request:**
```json
{
  "zap_data": { /* complete zap JSON */ },
  "session_id": "optional-session-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "zap": {
    "id": "created-zap-id",
    "name": "Zap name",
    "is_active": false
  },
  "message": "Success message"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **"Missing or invalid authorization header"**
   - Ensure user is authenticated with Supabase Auth
   - Check JWT token is being sent in Authorization header

2. **"Invalid zap structure"**
   - Bot detected malformed JSON in response
   - Try rephrasing your request or ask for clarification

3. **Embedding errors**
   - Check Gemini API key is valid and has quota
   - Verify network connectivity to Google APIs

4. **Database connection issues**
   - Verify Supabase credentials
   - Check RLS policies are properly configured

### Debug Mode

Enable logging in edge functions:
```typescript
console.log('Debug info:', { sessionId, validation });
```

## 📊 Monitoring

### Key Metrics to Track
- Conversation success rate
- Zap creation rate
- User session duration
- Most common user intents
- Validation error patterns

### Database Queries for Analytics
```sql
-- Most active users
SELECT user_id, COUNT(*) as message_count
FROM chat_messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY message_count DESC;

-- Popular zap types
SELECT s.service_name, s.event_type, COUNT(*) as usage_count
FROM workflows w
CROSS JOIN LATERAL jsonb_array_elements(w.steps) s
WHERE w.created_from_chat = true
GROUP BY s.service_name, s.event_type
ORDER BY usage_count DESC;
```

## 🎓 Best Practices

### For Users
1. Be specific about your automation goals
2. Provide concrete examples when asked
3. Have your service IDs ready (Notion database ID, etc.)
4. Test generated workflows before activating

### For Developers
1. Monitor API quotas (Gemini, Supabase)
2. Regularly clean up old conversation data
3. Update service configurations as APIs change
4. Implement rate limiting for heavy users

## 🔄 Updates and Maintenance

### Adding New Services
1. Update `ZAP_JSON_FORMAT.md` with new service schema
2. Add service validation to `create-zap` function
3. Update system prompt with new service info
4. Add secret mappings if needed

### Model Updates
1. Test new Gemini model versions
2. Adjust temperature/parameters if needed
3. Update embedding dimensions if using different model
4. Retrain on new conversation patterns

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs for edge function errors
3. Verify your environment variables are correct
4. Test with simple workflows first

The Autofy Workflow Bot makes creating complex automations as easy as having a conversation. Happy automating! 🚀
