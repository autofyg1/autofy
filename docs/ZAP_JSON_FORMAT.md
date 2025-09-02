# Zap JSON Format Specification

This document defines the JSON format for importing Zaps via file upload. The format is designed to match the existing Zap structure in your Supabase database.

## Basic Structure

```json
{
  "name": "Your Zap Name",
  "description": "Optional description of what this Zap does",
  "steps": [
    // Array of step objects (see below)
  ]
}
```

## Required Fields

- **name** (string): The name of your Zap (max 100 characters)
- **steps** (array): Array of step objects (minimum 1, maximum 10 steps)

## Optional Fields

- **description** (string): Description of your Zap (max 500 characters)

## Step Structure

Each step in the `steps` array must have the following structure:

```json
{
  "step_type": "trigger" | "action",
  "service_name": "service_name",
  "event_type": "event_type",
  "configuration": {
    // Service-specific configuration object
  }
}
```

### Step Requirements

- **step_type**: Must be either "trigger" or "action"
- **service_name**: The name of the service (gmail, notion, openrouter, telegram, etc.)
- **event_type**: The specific event for the service
- **configuration**: Object containing service-specific settings

### Workflow Rules

1. **One Trigger Required**: Each Zap must have exactly one trigger step
2. **Multiple Actions Allowed**: You can have multiple action steps
3. **Step Order**: Steps are executed in the order they appear in the array

## Supported Services and Events

### Gmail
#### Trigger: `new_email`
```json
{
  "step_type": "trigger",
  "service_name": "gmail",
  "event_type": "new_email",
  "configuration": {
    "keywords": "urgent, important, action",  // Required if no from_email
    "from_email": "boss@company.com"         // Required if no keywords
  }
}
```

#### Action: `send_email`
```json
{
  "step_type": "action",
  "service_name": "gmail",
  "event_type": "send_email",
  "configuration": {
    "to_email": "recipient@example.com",           // Required
    "subject_template": "Re: {{subject}}",        // Required
    "body_template": "Thank you for: {{body}}",   // Required
    "is_html": "false"                            // Optional: "true" or "false"
  }
}
```

#### Action: `send_reply`
```json
{
  "step_type": "action",
  "service_name": "gmail",
  "event_type": "send_reply",
  "configuration": {
    "body_template": "Thanks for your email: {{body}}", // Required
    "custom_to_email": "override@example.com",          // Optional
    "is_html": "false"                                  // Optional: "true" or "false"
  }
}
```

### OpenRouter (AI Processing)
```json
{
  "step_type": "action",
  "service_name": "openrouter",
  "event_type": "process_with_ai",
  "configuration": {
    "model": "meta-llama/llama-3.2-3b-instruct:free",     // Required
    "prompt": "Summarize this email: {{body}}",           // Required
    "max_tokens": 500,                                    // Optional (default: 1000)
    "temperature": 0.7                                    // Optional (default: 0.7)
  }
}
```

### Notion
```json
{
  "step_type": "action",
  "service_name": "notion",
  "event_type": "create_page",
  "configuration": {
    "database_id": "your-notion-database-id",                      // Required (or page_id)
    "page_id": "your-notion-page-id",                             // Required (or database_id)
    "title_template": "Email from {{sender}}: {{subject}}",       // Required
    "content_template": "{{body}}\n\nAI Summary: {{ai_content}}"  // Optional
  }
}
```

### Telegram
```json
{
  "step_type": "action",
  "service_name": "telegram",
  "event_type": "send_message",
  "configuration": {
    "message_title": "New Email Alert",                    // Required (or message_template)
    "message_template": "Custom template: {{subject}}",    // Required (or message_title)
    "parse_mode": "HTML",                                  // Optional: "HTML", "Markdown", "MarkdownV2"
    "disable_web_page_preview": "true",                    // Optional: "true" or "false"
    "disable_notification": "false",                       // Optional: "true" or "false"
    "chat_id": "specific-chat-id"                          // Optional: send to specific chat
  }
}
```

## Template Variables

You can use these template variables in your configuration templates:

### Always Available
- `{{subject}}` - Email subject
- `{{sender}}` - Email sender address
- `{{body}}` - Email content
- `{{timestamp}}` - Email timestamp
- `{{date}}` - Email date

### Available After AI Processing
- `{{ai_content}}` - AI-processed content (only available after an OpenRouter step)
- `{{ai_model}}` - Name of the AI model used
- `{{ai_processed_at}}` - Timestamp when AI processing occurred

## Example Complete Zaps

### Simple Email to Notion
```json
{
  "name": "Important Emails to Notion",
  "description": "Save important emails to my Notion database",
  "steps": [
    {
      "step_type": "trigger",
      "service_name": "gmail",
      "event_type": "new_email",
      "configuration": {
        "keywords": "important, urgent, action required"
      }
    },
    {
      "step_type": "action",
      "service_name": "notion",
      "event_type": "create_page",
      "configuration": {
        "database_id": "your-notion-database-id",
        "title_template": "📧 {{subject}}",
        "content_template": "**From:** {{sender}}\n**Date:** {{timestamp}}\n\n{{body}}"
      }
    }
  ]
}
```

### AI-Enhanced Email Workflow
```json
{
  "name": "AI Email Summarizer",
  "description": "Summarize emails with AI and send to Telegram",
  "steps": [
    {
      "step_type": "trigger",
      "service_name": "gmail",
      "event_type": "new_email",
      "configuration": {
        "keywords": "meeting, project, deadline"
      }
    },
    {
      "step_type": "action",
      "service_name": "openrouter",
      "event_type": "process_with_ai",
      "configuration": {
        "model": "meta-llama/llama-3.2-3b-instruct:free",
        "prompt": "Summarize this email in 2-3 bullet points: {{body}}",
        "max_tokens": 200,
        "temperature": 0.3
      }
    },
    {
      "step_type": "action",
      "service_name": "telegram",
      "event_type": "send_message",
      "configuration": {
        "message_title": "Email Summary",
        "parse_mode": "HTML"
      }
    }
  ]
}
```

## Validation Rules

1. **File Requirements**:
   - Must be a valid JSON file (.json extension)
   - File size must be under 1MB
   - JSON must be properly formatted

2. **Zap Requirements**:
   - Name is required and cannot be empty
   - Must have at least one step
   - Maximum 10 steps allowed
   - Exactly one trigger step required

3. **Service Requirements**:
   - Each service has specific required configuration fields
   - Invalid configurations will be rejected with detailed error messages

## Import Behavior

- **Safety First**: Imported Zaps are created as **inactive** by default
- **User Ownership**: Zaps are automatically assigned to the authenticated user
- **Template Generation**: Telegram message templates are auto-generated if only `message_title` is provided
- **Error Handling**: Detailed validation errors are provided if the import fails

## Error Examples

If your JSON is invalid, you'll receive detailed error messages:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required and must be a string"
    },
    {
      "field": "steps[0].configuration.keywords",
      "message": "Gmail trigger requires either keywords or from_email"
    }
  ]
}
```

## Tips for Creating JSON Files

1. **Start with Examples**: Use the provided example JSON files as templates
2. **Validate JSON**: Use an online JSON validator before importing
3. **Test Small**: Start with simple 2-step workflows before creating complex ones
4. **Use Templates**: Make use of template variables for dynamic content
5. **Check Service Docs**: Refer to each service's documentation for specific configuration options

## File Extensions and Formats

- **Supported**: `.json` files
- **Content-Type**: `application/json` or `multipart/form-data`
- **Encoding**: UTF-8
- **Max Size**: 1MB

This format ensures compatibility with your existing Zap infrastructure while providing a user-friendly way to import pre-configured workflows.
