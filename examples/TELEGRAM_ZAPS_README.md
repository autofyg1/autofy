# 📱 Telegram Zap Automations

This directory contains comprehensive Telegram automation examples for FlowBot. These Zaps enable seamless email-to-Telegram workflows with AI processing and smart filtering.

## 🚀 Available Automations

### 1. 📧 Email to Telegram with AI Summary
**File:** `telegram-email-notifications.json`
- **Purpose:** Receive email notifications with AI-generated summaries
- **Features:** Smart filtering, priority detection, emoji formatting
- **Use Case:** General email monitoring with intelligence

### 2. 📬 Simple Email to Telegram  
**File:** `telegram-simple-notifications.json`
- **Purpose:** Direct email forwarding without AI processing
- **Features:** Fast notifications, email previews, minimal processing
- **Use Case:** Quick notifications for support/customer emails

### 3. 📧➡️📱➡️📝 Email to Telegram + Notion
**File:** `telegram-email-notion-backup.json`
- **Purpose:** Multi-step automation with Telegram alerts and Notion backup
- **Features:** Business email analysis, dual-destination processing
- **Use Case:** Business workflows requiring documentation and alerts

### 4. 🌟 VIP Email Alert System
**File:** `telegram-vip-email-filter.json`
- **Purpose:** Executive-level email filtering with priority intelligence
- **Features:** VIP detection, urgency levels, executive formatting
- **Use Case:** C-level executives and managers

### 5. 🎧 Customer Support Escalation
**File:** `telegram-support-escalation.json`
- **Purpose:** Support ticket creation with sentiment analysis
- **Features:** Emotion detection, SLA prioritization, ticket creation
- **Use Case:** Customer service teams

### 6. 🔧 Debug & Monitor System
**File:** `telegram-debug-monitor.json`
- **Purpose:** Development monitoring and system debugging
- **Features:** Technical analysis, system info, developer alerts
- **Use Case:** Development and DevOps teams

## 📋 Prerequisites

### 1. Telegram Connection
- Connect your Telegram account via FlowBot integrations
- Generate and use the Telegram link token
- Ensure active chat connection in `telegram_chats` table

### 2. Required Integrations
- **Gmail:** OAuth connection for email triggers
- **OpenRouter:** API key for AI processing (optional)
- **Notion:** OAuth connection for backup automations (optional)

### 3. Environment Variables
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_SECRET_TOKEN=your_webhook_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 🔧 Setup Instructions

### Step 1: Telegram Bot Setup
1. Create a Telegram bot via [@BotFather](https://t.me/botfather)
2. Get your bot token and add to environment variables
3. Set webhook URL to your Supabase function

### Step 2: Connect Telegram to FlowBot
1. Go to FlowBot integrations page
2. Click "Connect" next to Telegram
3. Generate a link token
4. Click the deep link to connect your chat
5. Verify connection in your Telegram chat list

### Step 3: Import Zap Configuration
1. Copy the desired JSON configuration
2. Create new Zap in FlowBot interface
3. Paste configuration or manually set up steps
4. Test the configuration with debug emails

### Step 4: Customize Templates
Update message templates with your preferences:
```json
{
  "message_template": "🔥 <b>URGENT EMAIL</b>\n\n📧 <b>From:</b> {{sender}}\n📌 <b>Subject:</b> {{subject}}\n\n{{ai_content}}\n\n<i>⚡ Your Custom Footer</i>",
  "parse_mode": "HTML"
}
```

## 🎯 Template Variables

All Telegram message templates support these variables:

### Basic Email Variables
- `{{sender}}` - Email sender address
- `{{subject}}` - Email subject line
- `{{timestamp}}` - Email received timestamp
- `{{body}}` - Full email body content
- `{{body_preview}}` - First 200 characters of email
- `{{id}}` - Unique email ID

### AI Processing Variables (when used)
- `{{ai_content}}` - AI-processed content
- `{{ai_model}}` - AI model used for processing
- `{{ai_processed_at}}` - AI processing timestamp

## 🎨 Message Formatting

### HTML Formatting (Recommended)
```html
<b>Bold Text</b>
<i>Italic Text</i>
<u>Underlined Text</u>
<code>Monospace Code</code>
<pre>Code Block</pre>
<a href="url">Link Text</a>
```

### Emoji Guidelines
- 🔥 Critical/Urgent
- ⚡ System/Automation
- 📧 Email Related
- 🤖 AI Processing
- 👤 Person/User
- 📊 Data/Analytics
- 💼 Business
- 🎯 Action Required

## 🔍 Debug and Monitoring

### Enable Debug Mode
Add to your Zap metadata:
```json
{
  "metadata": {
    "debug_mode": true,
    "console_logging": true
  }
}
```

### Check Logs
- **Supabase Logs:** Functions > zap-executor > Logs
- **Telegram Logs:** Functions > telegram-send-message > Logs
- **Database Logs:** Check `processed_emails` table

### Test Commands
Send emails with these subjects to test:
- "Test FlowBot Automation"
- "Debug Telegram Integration" 
- "VIP Test Message"
- "Support Test Issue"

## 🚨 Troubleshooting

### Common Issues

#### 1. Messages Not Sending
- Check Telegram bot token
- Verify chat connection in `telegram_chats`
- Check Supabase function logs
- Ensure user has active Telegram connection

#### 2. AI Processing Errors  
- Verify OpenRouter API key
- Check model availability
- Review prompt formatting
- Monitor token limits

#### 3. Template Variable Errors
- Use exact variable names: `{{sender}}` not `{sender}`
- Check for typos in variable names
- Ensure HTML tags are properly closed
- Test with simple templates first

### Debug Steps
1. **Test Simple Template First:**
   ```json
   {
     "message_template": "Test: {{subject}} from {{sender}}"
   }
   ```

2. **Check Service Status:**
   - Gmail connection active?
   - OpenRouter API responding?  
   - Telegram bot reachable?

3. **Monitor Execution:**
   - Check zap execution logs
   - Verify processed_emails table
   - Test with debug Zap configuration

## 📊 Performance Tips

### Optimization Guidelines
- Use specific email keywords to reduce processing
- Set appropriate `max_results` limits (5-20 recommended)
- Choose efficient AI models for faster processing
- Enable notification control for non-urgent messages

### Rate Limiting
- Telegram: 30 messages/second per bot
- OpenRouter: Depends on plan and model
- Gmail: 250 quota units per user per 100 seconds

## 🔐 Security Best Practices

1. **Environment Variables:** Never commit tokens to code
2. **User Validation:** Verify user owns Telegram chat
3. **Message Sanitization:** Escape HTML in user content  
4. **Access Control:** Limit who can connect Telegram
5. **Audit Logs:** Monitor all Telegram message sends

## 📈 Advanced Configuration

### Multi-Chat Support
Send to specific chats:
```json
{
  "chat_id": "your_specific_chat_id"
}
```

### Conditional Logic
Use AI to control message flow:
```
If urgent, respond with "URGENT: [message]"
If not important, respond with "SKIP: Low priority"
```

### Custom Formatting
Create branded message templates:
```json
{
  "message_template": "🏢 <b>ACME Corp Alert</b>\n\n📧 <b>New Email:</b> {{subject}}\n\n{{ai_content}}\n\n<i>🤖 Powered by FlowBot | ACME IT Dept</i>"
}
```

## 🆘 Support

- **Documentation:** Check FlowBot docs
- **Debug Logs:** Enable debug_mode in metadata
- **Test Environment:** Use debug Zap for testing
- **Community:** Join FlowBot Discord/Telegram groups

---

**Happy Automating! 🚀**

*These Telegram automations will transform how you handle email workflows. Start with simple notifications and gradually build more sophisticated AI-powered systems.*
