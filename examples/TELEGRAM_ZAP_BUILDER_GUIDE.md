# 📱 Using Telegram in Zap Builder - Complete Guide

This guide will walk you through creating Telegram automations using FlowBot's visual Zap Builder interface.

## 🚀 Quick Start

### Prerequisites
1. **Connected Telegram Account** - Go to Integrations page and connect your Telegram
2. **Connected Gmail Account** - Required for email triggers
3. **OpenRouter API Key** - Optional, for AI processing

### Basic Setup Steps
1. Open **Zap Builder** from the sidebar
2. Click on a step to select it
3. Choose **Telegram** from the apps sidebar
4. Configure your message template
5. Save & Activate your Zap

---

## 🎯 Step-by-Step Tutorial

### Step 1: Create a New Zap
1. Navigate to **Dashboard** → **Create New Zap** or go directly to `/zap-builder`
2. Enter a **Zap Name**: "My Email to Telegram Automation"
3. Add an optional **Description**: "Send important emails to Telegram"

### Step 2: Configure the Trigger
1. **Click on Trigger 1** (the first blue step)
2. **Select Gmail** from the apps sidebar
3. **Choose "New Email"** from the trigger dropdown
4. **Configure keywords**: `important, urgent, meeting, deadline`
5. **Optional**: Add specific sender email
6. Step will show ✅ **Configured** when complete

### Step 3: Add AI Processing (Optional)
1. **Click "Add Action"** to create a new step
2. **Select "AI Processing"** from the apps sidebar
3. **Choose "Process with AI"** from the actions dropdown
4. **Select AI Model**: "Llama 3.2 3B (Recommended)"
5. **Add Prompt**:
   ```
   📧 Analyze this email and provide:
   
   🎯 SUMMARY: (2-3 sentences)
   ⚡ URGENCY: High/Medium/Low
   📋 ACTION ITEMS: (bullet points if any)
   ⏰ DEADLINES: (if mentioned)
   
   Keep it concise for Telegram.
   ```
6. **Optional**: Set max tokens (400) and temperature (0.3)

### Step 4: Configure Telegram Action
1. **Click "Add Action"** or select existing action step
2. **Select "Telegram"** from the apps sidebar (🟢 Connected indicator should show)
3. **Choose "Send Message"** from the actions dropdown
4. **Configure Message Template**:

#### Basic Template:
```html
📧 <b>New Email Alert</b>

📤 <b>From:</b> {{sender}}
📝 <b>Subject:</b> {{subject}}
🕒 <b>Time:</b> {{timestamp}}

{{ai_content}}

<i>🤖 FlowBot Automation</i>
```

#### Advanced Template (with AI):
```html
📧 <b>Smart Email Alert</b>

📤 <b>From:</b> {{sender}}
📌 <b>Subject:</b> {{subject}}
🕒 <b>Received:</b> {{timestamp}}

🤖 <b>AI Analysis:</b>
{{ai_content}}

📄 <b>Preview:</b>
{{body_preview}}

<i>⚡ Powered by FlowBot AI</i>
```

5. **Message Format**: Select "HTML (Recommended)"
6. **Disable Link Previews**: "Yes (Recommended)"
7. **Silent Notification**: "Normal notification"
8. **Chat ID**: Leave empty to send to all connected chats

### Step 5: Save & Activate
1. **Review all steps** - each should show ✅ Configured
2. **Click "Save & Activate Zap"**
3. **Test**: Send yourself an email with your trigger keywords
4. **Check Telegram** for the automated message

---

## 🎨 Message Templates & Variables

### Available Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `{{sender}}` | Email sender address | `john@company.com` |
| `{{subject}}` | Email subject line | `Meeting Tomorrow` |
| `{{timestamp}}` | Email received time | `2024-01-15T10:30:00Z` |
| `{{body}}` | Full email content | Full email text |
| `{{body_preview}}` | First 200 characters | Preview text... |
| `{{id}}` | Unique email ID | Internal ID |
| `{{ai_content}}` | AI processed content | *(if AI step included)* |
| `{{ai_model}}` | AI model used | `llama-3.2-3b` |
| `{{ai_processed_at}}` | AI processing time | Timestamp |

### HTML Formatting Guide
```html
<b>Bold Text</b>           → **Bold Text**
<i>Italic Text</i>         → *Italic Text*  
<u>Underlined</u>          → Underlined
<code>Code Text</code>     → `Code Text`
<pre>Code Block</pre>      → Code Block
<a href="url">Link</a>    → Link
```

### Emoji Best Practices
- 📧 Email related
- 🤖 AI processing  
- ⚡ System/automation
- 🔥 Urgent/critical
- 📱 Telegram/mobile
- ✅ Success/completed
- ❌ Error/failed
- 🎯 Important/focus

---

## 🔧 Advanced Configuration

### Multi-Step Automation Example
```
1. Trigger: Gmail → New Email (keywords: "invoice, payment, billing")
2. Action: AI Processing → Analyze for financial importance
3. Action: Telegram → Send formatted alert
4. Action: Notion → Create record in Finance database
```

### Conditional Logic with AI
Use AI prompts to control message flow:
```
Analyze this email. If it's spam or promotional, respond with "SKIP: Not important".
Otherwise, provide a summary with urgency level.
```

### Custom Chat Targeting
1. **Get Chat ID**: Use the debug Zap to see chat IDs in logs
2. **Specific Chat**: Enter chat ID in the "Specific Chat ID" field
3. **Multiple Chats**: Leave empty to send to all connected chats

### Message Template Library

#### 📧 Simple Notification
```html
📧 <b>{{subject}}</b>

From: {{sender}}
Time: {{timestamp}}

<i>📱 FlowBot</i>
```

#### 🔥 Urgent Alert
```html
🔥 <b>URGENT EMAIL</b>

📤 {{sender}}
📝 {{subject}}

🤖 {{ai_content}}

<b>⚡ Immediate attention required</b>
```

#### 💼 Business Format
```html
💼 <b>Business Email</b>

<b>From:</b> {{sender}}
<b>Subject:</b> {{subject}}
<b>Received:</b> {{timestamp}}

<b>Analysis:</b>
{{ai_content}}

<i>📊 Business Automation</i>
```

---

## 🚨 Troubleshooting

### Common Issues

#### ❌ "Telegram Not Connected"
**Solution:**
1. Go to **Integrations** page
2. Click **Connect** next to Telegram
3. Generate link token and click the deep link
4. Return to Zap Builder and refresh

#### ❌ "No Active Chats Found" 
**Solution:**
1. Check `telegram_chats` table for active connections
2. Re-link your chat if needed
3. Test with telegram-debug-monitor.json

#### ❌ "Message Template Error"
**Solution:**
1. Check for unclosed HTML tags: `<b>text</b>`
2. Verify variable names: `{{sender}}` not `{sender}`
3. Test with simple template first
4. Check for special characters

#### ❌ "Variables Not Replaced"
**Solution:**
1. Ensure exact spelling: `{{timestamp}}` not `{{time}}`
2. Check step order - AI variables only available after AI step
3. Use debug Zap to see available variables

### Debug Tips

#### 1. Test Simple First
Start with basic template:
```html
Test: {{subject}} from {{sender}}
```

#### 2. Check Logs
- **Supabase Functions** → **zap-executor** → **Logs**
- **Telegram Function** → **telegram-send-message** → **Logs**

#### 3. Use Debug Zap
Import `telegram-debug-monitor.json` for detailed logging.

#### 4. Verify Connections
```javascript
// Check in browser console on Integrations page
console.log('Telegram connected:', telegram.isConnected());
console.log('Active chats:', telegram.getActiveChatCount());
```

---

## 📊 Best Practices

### Performance
- **Specific Keywords**: Use precise trigger keywords to reduce processing
- **Limit Max Results**: Keep Gmail max results under 20 for faster execution  
- **Efficient AI Models**: Use Llama 3.2 3B for good balance of speed/quality
- **Template Length**: Keep messages under 4096 characters (Telegram limit)

### Security
- **Sensitive Data**: Avoid including passwords or API keys in messages
- **Chat Verification**: Only send to verified, connected chats
- **Content Filtering**: Use AI to filter out sensitive information

### User Experience  
- **Clear Formatting**: Use bold/italic for better readability
- **Emoji Usage**: Consistent emoji system for easy recognition
- **Message Length**: Keep important info at the top
- **Action Items**: Make next steps clear and actionable

### Reliability
- **Error Handling**: Test various email types and edge cases
- **Backup Actions**: Consider parallel Notion/email backup
- **Rate Limits**: Be aware of Telegram's 30 messages/second limit
- **Monitoring**: Use debug Zaps for system health monitoring

---

## 🎯 Example Use Cases

### 1. **Executive Assistant**
- **Trigger**: VIP sender emails
- **AI**: Priority and urgency analysis  
- **Telegram**: Formatted executive summary
- **Use**: C-level email monitoring

### 2. **Customer Support**
- **Trigger**: Support emails with sentiment keywords
- **AI**: Sentiment analysis and category detection
- **Telegram**: Alert with customer priority info
- **Use**: Escalation management

### 3. **Sales Team** 
- **Trigger**: Emails with "proposal", "quote", "contract"
- **AI**: Deal analysis and next steps
- **Telegram**: Sales opportunity alerts
- **Use**: Revenue pipeline monitoring

### 4. **Development Team**
- **Trigger**: Error reports, bug reports, system alerts
- **AI**: Technical severity assessment
- **Telegram**: Developer notifications with priority
- **Use**: Incident management

---

## 📈 Monitoring & Analytics

### Success Metrics
- **Message Delivery Rate**: Check Telegram function logs
- **Processing Time**: Monitor zap execution duration
- **Error Rate**: Track failed automations
- **User Engagement**: Response to Telegram alerts

### Optimization
1. **A/B Test Templates**: Try different formats and measure effectiveness
2. **Keyword Refinement**: Adjust trigger keywords based on results  
3. **AI Prompt Tuning**: Optimize prompts for better summaries
4. **Performance Monitoring**: Track execution times and optimize

---

## 🆘 Support Resources

- **Debug Logs**: Enable `debug_mode: true` in Zap metadata
- **Test Configurations**: Use provided JSON examples
- **Community**: FlowBot Discord/Telegram support channels
- **Documentation**: Full API reference and guides

---

**🎉 Congratulations!** You now know how to create powerful Telegram automations using FlowBot's Zap Builder. Start with simple templates and gradually build more sophisticated AI-powered workflows.

Happy automating! 🚀📱
