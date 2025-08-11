# Telegram Integration Guide for FlowBot

This guide covers the complete setup, deployment, and testing of the Telegram integration for FlowBot using Supabase Edge Functions.

## Overview

The Telegram integration allows users to:
- Link their Telegram chats to their FlowBot account using secure one-time tokens
- Receive automated messages from workflows in Telegram
- Store and manage chat history
- Send test messages to verify connectivity

## Architecture

### Database Tables
- `telegram_chats`: Stores linked chat information
- `telegram_messages`: Archives all incoming messages
- `telegram_link_tokens`: Manages one-time linking tokens

### Edge Functions
- `telegram-webhook`: Processes incoming Telegram updates
- `telegram-link-token`: Generates secure linking tokens
- `telegram-send-message`: Sends messages to linked chats

## Prerequisites

### 1. Create a Telegram Bot

1. Start a chat with [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the instructions
3. Choose a username for your bot (e.g., `flowbot_automation_bot`)
4. Save the bot token (e.g., `123456789:ABCdefGHIjklMNOPqrstUVWXYZ`)
5. Note your bot username (without the @)

### 2. Set Up Environment Variables

Add these environment variables to your Supabase project:

```bash
# In Supabase Dashboard > Settings > Environment Variables
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOPqrstUVWXYZ
TELEGRAM_BOT_USERNAME=flowbot_automation_bot
TELEGRAM_SECRET_TOKEN=your-secure-webhook-secret-token-here
```

**Generate a secure secret token:**
```bash
# Generate a random 32-character string
openssl rand -base64 32
```

## Deployment Steps

### 1. Deploy Database Migration

Run the database migration to create the required tables:

```bash
cd supabase
supabase db reset  # For local development
# OR for production
supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy all Telegram-related functions
supabase functions deploy telegram-webhook
supabase functions deploy telegram-link-token
supabase functions deploy telegram-send-message

# Set the environment variables
supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token_here
supabase secrets set TELEGRAM_BOT_USERNAME=your_bot_username_here
supabase secrets set TELEGRAM_SECRET_TOKEN=your_secret_token_here
```

### 3. Set Up Telegram Webhook

Configure your Telegram bot to send updates to your webhook:

```bash
# Replace with your actual values
BOT_TOKEN="your_bot_token_here"
WEBHOOK_URL="https://your-project-ref.supabase.co/functions/v1/telegram-webhook"
SECRET_TOKEN="your_secret_token_here"

# Set the webhook
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'$WEBHOOK_URL'",
    "secret_token": "'$SECRET_TOKEN'",
    "allowed_updates": ["message"],
    "drop_pending_updates": true
  }'
```

### 4. Verify Webhook Setup

```bash
# Check webhook info
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-project-ref.supabase.co/functions/v1/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "max_connections": 40,
    "allowed_updates": ["message"]
  }
}
```

## Testing the Integration

### 1. Test Webhook Connectivity

Check if your webhook is accessible:

```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/telegram-webhook" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: your_secret_token_here" \
  -d '{
    "update_id": 123,
    "message": {
      "message_id": 1,
      "from": {"id": 12345, "is_bot": false, "first_name": "Test"},
      "chat": {"id": 12345, "type": "private"},
      "date": 1640995200,
      "text": "/start"
    }
  }'
```

### 2. Test Link Token Generation

```bash
# Get user JWT token from your app
JWT_TOKEN="your_user_jwt_token"

curl -X POST "https://your-project-ref.supabase.co/functions/v1/telegram-link-token" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Test Message Sending

```bash
# Send a test message
curl -X POST "https://your-project-ref.supabase.co/functions/v1/telegram-send-message" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from FlowBot! 🤖",
    "user_id": "your_user_id_here"
  }'
```

## Frontend Integration Testing

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test User Flow

1. **Navigate to Integrations page**
   - Go to `/integrations`
   - Find the Telegram integration card

2. **Connect Telegram**
   - Click "Connect" on the Telegram card
   - Modal should open with instructions
   - Click "Generate Connection Link"
   - Verify the deep link is generated

3. **Link Chat**
   - Click "Open in Telegram"
   - Start the bot in Telegram
   - The bot should confirm successful linking

4. **Send Test Message**
   - Return to the FlowBot app
   - The modal should now show connected state
   - Enter a test message and send
   - Verify the message appears in Telegram

## Monitoring and Logging

### 1. View Function Logs

```bash
# View webhook logs
supabase functions logs telegram-webhook

# View link token logs
supabase functions logs telegram-link-token

# View send message logs
supabase functions logs telegram-send-message
```

### 2. Monitor Database

Check the database tables for data:

```sql
-- View connected chats
SELECT * FROM telegram_chats WHERE is_active = true;

-- View recent messages
SELECT * FROM telegram_messages 
ORDER BY timestamp DESC 
LIMIT 10;

-- View unused link tokens
SELECT * FROM telegram_link_tokens 
WHERE is_used = false 
AND expires_at > now();
```

## Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Updates
- **Check webhook URL**: Ensure it's publicly accessible
- **Verify secret token**: Must match in both Telegram and Supabase
- **Check bot token**: Ensure it's correct and active
- **Review CORS**: Make sure Edge Functions handle OPTIONS requests

#### 2. Link Token Generation Fails
- **Authentication**: Verify JWT token is valid
- **Environment variables**: Check `TELEGRAM_BOT_USERNAME` is set
- **Database access**: Ensure user has permission to insert tokens

#### 3. Messages Not Sending
- **Chat linking**: Verify chat is properly linked in database
- **Bot permissions**: Ensure bot can send messages to the chat
- **API limits**: Check for Telegram API rate limits

#### 4. Database Connection Issues
- **RLS policies**: Verify Row Level Security policies are correct
- **Service role**: Ensure Edge Functions use service role for database access

### Debug Commands

```bash
# Test bot token
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# Get webhook status
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"

# Delete webhook (for testing)
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook"

# Check function health
curl "https://your-project-ref.supabase.co/functions/v1/telegram-webhook" \
  -H "X-Telegram-Bot-Api-Secret-Token: invalid_token"
```

## Security Considerations

### 1. Secret Token Validation
- Always validate the `X-Telegram-Bot-Api-Secret-Token` header
- Use a cryptographically secure random token
- Rotate the secret token regularly

### 2. Data Privacy
- Store minimal user data required for functionality
- Implement data retention policies
- Provide user data deletion capabilities

### 3. Rate Limiting
- Implement rate limiting on webhook endpoint
- Monitor for suspicious activity
- Set up alerting for unusual patterns

### 4. Input Validation
- Validate all incoming webhook data
- Sanitize user inputs before storage
- Implement proper error handling

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migration deployed
- [ ] Edge Functions deployed
- [ ] Webhook configured with secret token
- [ ] SSL certificate valid for webhook URL
- [ ] Database RLS policies tested
- [ ] Error logging configured
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] User data retention policy defined
- [ ] Monitoring alerts set up
- [ ] Backup procedures established

## API Reference

### Webhook Payload Structure

```typescript
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      type: 'private' | 'group' | 'supergroup' | 'channel'
      username?: string
      first_name?: string
      last_name?: string
      title?: string
    }
    date: number
    text?: string
  }
}
```

### Send Message Request

```typescript
interface SendMessageRequest {
  chat_id?: string        // Send to specific chat
  user_id?: string       // Send to all user's chats
  message: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disable_web_page_preview?: boolean
  disable_notification?: boolean
}
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase function logs
3. Check Telegram Bot API documentation
4. Verify environment variable configuration

## Contributing

When contributing to the Telegram integration:
1. Follow TypeScript best practices
2. Add appropriate error handling and logging
3. Update tests for new functionality
4. Document any new environment variables
5. Ensure backward compatibility
