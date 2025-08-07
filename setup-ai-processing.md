# AI Processing Feature Setup

## What's Been Added

I've successfully integrated AI processing into your Zappy email automation system! Here's what's new:

### 🎯 Features Added
1. **OpenRouter Service**: New service for AI email processing
2. **Sequential Processing**: Emails now flow through steps in order (Gmail → AI → Notion)
3. **Multiple AI Models**: Support for free models like Llama, Phi, Mistral
4. **Template Variables**: New `{{ai_content}}`, `{{ai_model}}` variables
5. **Error Handling**: Robust error handling and retry logic

### 📁 Files Created/Modified

#### New Files:
- `supabase/functions/zap-executor/services/openrouter.ts` - AI processing service
- `docs/AI_PROCESSING_SETUP.md` - Detailed setup guide
- `.env.example` - Environment configuration template
- `setup-ai-processing.md` - This setup file

#### Modified Files:
- `supabase/functions/zap-executor/services/zap-executor.ts` - Added AI processing support
- `supabase/functions/zap-executor/services/notion.ts` - Support for AI-processed emails
- `src/lib/zaps.ts` - Added OpenRouter service configuration

## 🚀 Setup Instructions

### Step 1: Get OpenRouter API Key
1. Go to https://openrouter.ai/
2. Sign up for a free account
3. Create an API key
4. Copy the key

### Step 2: Install Supabase CLI (if not already installed)

**Windows (PowerShell as Administrator):**
```powershell
# Install via npm (requires Node.js)
npm install -g supabase

# OR install via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Alternative - Direct download:**
1. Download from: https://github.com/supabase/cli/releases
2. Extract and add to PATH

### Step 3: Set Environment Variable

#### Option A: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Settings → Environment Variables
3. Add:
   - Name: `OPENROUTER_API_KEY`
   - Value: Your OpenRouter API key

#### Option B: Via CLI (after installing)
```bash
supabase secrets set OPENROUTER_API_KEY=your_api_key_here
```

### Step 4: Deploy Functions
```bash
# Deploy the updated zap-executor function
supabase functions deploy zap-executor

# Or deploy all functions
supabase functions deploy
```

### Step 5: Test the Feature

1. Create a new Zap in your Zappy interface
2. Add these steps:
   - **Trigger**: Gmail → New Email
   - **Action 1**: AI Processing → Process with AI
   - **Action 2**: Notion → Create Page

3. Configure each step:
   - **Gmail**: Set keywords/filters
   - **AI**: Choose model and write prompt
   - **Notion**: Use `{{ai_content}}` in templates

## 🔧 Example Workflow

### Email Summarization Zap

**Gmail Trigger:**
- Keywords: "meeting, project, deadline"

**AI Processing Action:**
- Model: Llama 3.2 3B
- Prompt: 
  ```
  Summarize this email in 3 bullet points focusing on action items and deadlines:
  
  Subject: {{subject}}
  From: {{sender}}
  Content: {{body}}
  ```

**Notion Action:**
- Database ID: Your database ID
- Title: "Email Summary: {{subject}}"
- Content:
  ```
  📧 From: {{sender}}
  📅 Received: {{timestamp}}
  
  ## AI Summary
  {{ai_content}}
  
  ## Original Email
  {{body}}
  
  ---
  Processed by: {{ai_model}} on {{ai_processed_at}}
  ```

## 🔍 Available AI Models (Free)

- `meta-llama/llama-3.2-3b-instruct:free` - Llama 3.2 3B
- `meta-llama/llama-3.2-1b-instruct:free` - Llama 3.2 1B  
- `microsoft/phi-3-mini-128k-instruct:free` - Phi 3 Mini
- `microsoft/phi-3-medium-128k-instruct:free` - Phi 3 Medium
- `mistralai/mistral-7b-instruct:free` - Mistral 7B
- `huggingface/zephyr-7b-beta:free` - Zephyr 7B
- `openchat/openchat-7b:free` - OpenChat 7B

## ⚙️ Template Variables

### Original Email Variables
- `{{subject}}` - Email subject
- `{{sender}}` - Email sender
- `{{body}}` - Email body
- `{{timestamp}}` - Received timestamp

### New AI Variables (after AI processing)
- `{{ai_content}}` - AI response
- `{{ai_model}}` - Model used
- `{{ai_processed_at}}` - Processing timestamp

## 🐛 Troubleshooting

### Common Issues:

1. **"OpenRouter API key not found"**
   - Check environment variable is set correctly
   - Redeploy functions after setting the key

2. **"Function deployment failed"**
   - Make sure you're in the project directory
   - Check Supabase CLI is authenticated: `supabase login`

3. **"AI processing failed"**
   - Check logs in Supabase dashboard
   - Verify prompt doesn't exceed model limits
   - Check OpenRouter account status

### Check Logs:
1. Go to Supabase Dashboard
2. Edge Functions → zap-executor
3. Logs tab
4. Look for AI processing messages

## 🎉 You're All Set!

Once you complete these steps, you'll have:
- ✅ AI-powered email processing
- ✅ Sequential workflow execution
- ✅ Rich template variables
- ✅ Multiple free AI models
- ✅ Error handling and monitoring

Your users can now create sophisticated email workflows that include AI analysis, summarization, and content transformation!
