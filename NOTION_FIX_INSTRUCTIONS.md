# Fix Notion Integration Issue

## Problem
Your Notion integration is failing because the system is trying to create pages in what it thinks is a database, but the ID `245c6d54-3dcf-805b-9b0e-f5c372f58e3c` actually points to a Notion page, not a database.

## Solution
I've updated the Notion service to:
1. **Auto-detect** whether the provided ID is a database or a page
2. **Handle both cases** appropriately:
   - For databases: Create pages with properties as before
   - For pages: Create child pages under the parent page

## Steps to Fix

### 1. Set Environment Variable
You need to set your Supabase service role key as an environment variable.

**On Windows (PowerShell):**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

**On Windows (Command Prompt):**
```cmd
set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**On Mac/Linux:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

### 2. Fix Existing Zap Configurations
Run the fix script to convert your existing `database_id` to `page_id`:

```bash
node fix-zap-config.js
```

This script will:
- Find all Notion zap steps with the problematic database_id
- Convert them to use `page_id` instead
- Verify the changes

### 3. Test the Fix
Run the test script to verify everything works:

```bash
node test-notion-fix.js
```

### 4. Alternative Manual Fix
If you prefer to fix it manually through your app interface:
1. Go to your zap configuration
2. Change the configuration from `database_id: "245c6d54-3dcf-805b-9b0e-f5c372f58e3c"` 
3. To `page_id: "245c6d54-3dcf-805b-9b0e-f5c372f58e3c"`

## What Changed

### Before (Failing):
```json
{
  "database_id": "245c6d54-3dcf-805b-9b0e-f5c372f58e3c",
  "title_template": "Email from {{sender}}: {{subject}}",
  "content_template": "{{body}}"
}
```

### After (Working):
```json
{
  "page_id": "245c6d54-3dcf-805b-9b0e-f5c372f58e3c",
  "title_template": "Email from {{sender}}: {{subject}}",
  "content_template": "{{body}}"
}
```

## How It Works Now

1. **Auto-Detection**: The service first tries to access the ID as a database
2. **Fallback**: If that fails (404), it tries as a page
3. **Appropriate API Call**: Based on detection, it uses the correct Notion API format:
   - Database pages: `parent: { database_id: "..." }` with properties
   - Child pages: `parent: { page_id: "..." }` with title property

## Verification

After running the fix, your zaps should:
✅ No longer get the "object_not_found" error
✅ Successfully create child pages under your Notion page
✅ Process emails and create pages as expected

## Need Help?

If you encounter any issues:
1. Check that your Notion integration has access to the page
2. Verify the page ID is correct in your browser URL
3. Ensure your SUPABASE_SERVICE_ROLE_KEY is set correctly
4. Check the edge function logs in your Supabase dashboard
