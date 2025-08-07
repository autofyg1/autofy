# AI Processing Setup Guide

## Overview

Zappy now supports AI processing as a middle action in your email automation workflows. This allows you to:

1. **Receive emails** (Gmail trigger)
2. **Process them with AI** (OpenRouter action) 
3. **Send results to other apps** (Notion, etc.)

## Features

- **Multiple AI Models**: Choose from various free models including Llama, Phi, Mistral, and more
- **Custom Prompts**: Define exactly how you want the AI to process your emails
- **Template Support**: Use placeholders like `{{subject}}`, `{{sender}}`, `{{body}}` in your prompts
- **Sequential Processing**: AI-processed content flows to subsequent actions
- **New Template Variables**: Access AI results with `{{ai_content}}`, `{{ai_model}}`, etc.

## Setup Instructions

### 1. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for a free account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the key for the next step

### 2. Configure Environment Variable

Add the OpenRouter API key to your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add a new variable:
   - Name: `OPENROUTER_API_KEY`
   - Value: Your OpenRouter API key

### 3. Deploy Updated Functions

Deploy the updated Supabase edge functions:

```bash
supabase functions deploy zap-executor
```

## Available AI Models (Free)

The following models are available at no cost through OpenRouter:

- **Llama 4 Maverick** - Latest and most capable model (Recommended)
- **Llama 4 Scout** - Fast and efficient for most tasks
- **Mistral Small 3.1 24B** - Excellent for complex reasoning and analysis
- **Kimi VL A3B Thinking** - Great for analytical tasks
- **Qwen3 Coder** - Specialized for code-related tasks

## Example Workflows

### 1. Email Summarization

**Workflow**: Gmail → AI Processing → Notion

**AI Prompt**:
```
Please summarize this email in 3 bullet points:

Subject: {{subject}}
From: {{sender}}
Content: {{body}}
```

**Notion Template**:
```
Email Summary from {{sender}}

Original Subject: {{subject}}
Received: {{timestamp}}

Summary:
{{ai_content}}

---
Processed by: {{ai_model}}
```

### 2. Action Item Extraction

**AI Prompt**:
```
Extract any action items or tasks from this email. If no action items are found, respond with "No action items found."

Email content: {{body}}
```

### 3. Sentiment Analysis

**AI Prompt**:
```
Analyze the sentiment of this email and classify it as Positive, Negative, or Neutral. Also provide a brief explanation.

Email: {{body}}
```

## Template Variables

### Original Email Variables
- `{{subject}}` - Email subject line
- `{{sender}}` - Email sender address
- `{{body}}` - Email content
- `{{timestamp}}` - When email was received

### AI Processing Variables (Available after AI step)
- `{{ai_content}}` - The AI-generated response
- `{{ai_model}}` - Which AI model was used
- `{{ai_processed_at}}` - When AI processing completed

## Best Practices

### Prompt Engineering
1. **Be Specific**: Clearly describe what you want the AI to do
2. **Use Examples**: Include examples in your prompt for better results
3. **Set Context**: Provide relevant context about the email content
4. **Limit Scope**: Focus on specific tasks rather than general analysis

### Model Selection
- **Llama 3.2 3B**: Best for most general tasks
- **Phi 3 Mini**: Choose for speed and simple tasks
- **Mistral 7B**: Good for complex reasoning tasks

### Token Management
- **Max Tokens**: Set appropriate limits (1000-2000 for most tasks)
- **Temperature**: Use 0.0-0.3 for factual tasks, 0.7-1.0 for creative tasks

## Troubleshooting

### Common Issues

1. **"OpenRouter API key not found"**
   - Ensure the environment variable is set in Supabase
   - Verify the variable name is exactly `OPENROUTER_API_KEY`

2. **"Model not available"**
   - Check if the model ID is correct
   - Some free models may have usage limits

3. **"AI processing failed"**
   - Check your prompt for invalid characters
   - Ensure the email content isn't too long
   - Verify your OpenRouter account has API access

### Monitoring

Monitor your AI processing in the Supabase logs:
1. Go to **Edge Functions** > **zap-executor**
2. Check the **Logs** tab for AI processing messages
3. Look for successful/failed AI processing events

## Rate Limits

OpenRouter free tier includes:
- Limited requests per day
- Rate limiting during peak hours
- Priority access for paid users

Monitor your usage in the OpenRouter dashboard and consider upgrading if needed.
