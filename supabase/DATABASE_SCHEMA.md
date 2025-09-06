# 🗄️ Autofy Database Schema Design

This document outlines the complete database schema for the new Autofy LangChain system.

## 📊 Database Tables Overview

### 1. **Users & Authentication**
- `profiles` - Extended user profile information
- `user_preferences` - User settings and preferences

### 2. **Service Integrations** 
- `integrations` - Third-party service connections (Gmail, Notion, Telegram, etc.)
- `integration_templates` - Pre-configured integration templates

### 3. **Workflows & Automation**
- `workflows` - User-created automation workflows (renamed from "zaps")
- `workflow_steps` - Individual steps within workflows
- `workflow_executions` - Execution history and logs
- `workflow_templates` - Pre-built workflow templates

### 4. **Chat & AI**
- `chat_sessions` - AI chat bot sessions for workflow creation
- `chat_messages` - Individual messages in chat sessions

### 5. **System & Monitoring**
- `api_keys` - User API key management
- `audit_logs` - System audit trail
- `system_status` - Health monitoring

---

## 📋 Detailed Table Specifications

### **profiles**
Extended user information beyond Supabase Auth
```sql
id              UUID PRIMARY KEY REFERENCES auth.users(id)
email           TEXT NOT NULL
full_name       TEXT
avatar_url      TEXT
timezone        TEXT DEFAULT 'UTC'
plan_type       TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise'))
credits_used    INTEGER DEFAULT 0
credits_limit   INTEGER DEFAULT 1000
onboarding_completed BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### **user_preferences**
User settings and configuration
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
preference_key  TEXT NOT NULL
preference_value JSONB NOT NULL
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id, preference_key)
```

### **integrations**
Third-party service connections
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
service_name    TEXT NOT NULL CHECK (service_name IN ('gmail', 'notion', 'telegram', 'openai', 'anthropic', 'gemini', 'openrouter'))
display_name    TEXT NOT NULL
credentials     JSONB NOT NULL  -- Encrypted credentials
configuration   JSONB DEFAULT '{}'::JSONB
status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'expired'))
last_tested_at  TIMESTAMPTZ
error_message   TEXT
metadata        JSONB DEFAULT '{}'::JSONB
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id, service_name)
```

### **integration_templates**
Pre-configured integration setups
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
service_name    TEXT NOT NULL
template_name   TEXT NOT NULL
description     TEXT
configuration   JSONB NOT NULL
required_scopes TEXT[]
setup_guide     TEXT
is_active       BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(service_name, template_name)
```

### **workflows**
User automation workflows
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
name            TEXT NOT NULL
description     TEXT
status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived'))
trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'email'))
trigger_config  JSONB DEFAULT '{}'::JSONB
tags            TEXT[] DEFAULT ARRAY[]::TEXT[]
total_executions INTEGER DEFAULT 0
successful_executions INTEGER DEFAULT 0
failed_executions INTEGER DEFAULT 0
last_executed_at TIMESTAMPTZ
average_duration INTERVAL
created_from_chat BOOLEAN DEFAULT FALSE
chat_session_id UUID REFERENCES chat_sessions(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### **workflow_steps**
Individual steps within workflows
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE
step_order      INTEGER NOT NULL
step_type       TEXT NOT NULL CHECK (step_type IN ('trigger', 'action', 'condition', 'delay'))
service_name    TEXT NOT NULL
action_name     TEXT NOT NULL
configuration   JSONB NOT NULL
conditions      JSONB DEFAULT '{}'::JSONB
error_handling  JSONB DEFAULT '{"retry": true, "max_retries": 3}'::JSONB
is_enabled      BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(workflow_id, step_order)
```

### **workflow_executions**
Execution history and detailed logs
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE
user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
trigger_data    JSONB DEFAULT '{}'::JSONB
execution_status TEXT NOT NULL CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled'))
started_at      TIMESTAMPTZ DEFAULT NOW()
completed_at    TIMESTAMPTZ
duration        INTERVAL
total_steps     INTEGER DEFAULT 0
completed_steps INTEGER DEFAULT 0
failed_steps    INTEGER DEFAULT 0
step_results    JSONB DEFAULT '[]'::JSONB
error_message   TEXT
error_step_id   UUID REFERENCES workflow_steps(id)
metadata        JSONB DEFAULT '{}'::JSONB
credits_used    INTEGER DEFAULT 0
```

### **workflow_templates**
Pre-built workflow templates
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT NOT NULL
description     TEXT
category        TEXT NOT NULL
difficulty      TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
required_integrations TEXT[] NOT NULL
template_data   JSONB NOT NULL  -- Complete workflow configuration
preview_image   TEXT
use_count       INTEGER DEFAULT 0
is_featured     BOOLEAN DEFAULT FALSE
created_by      UUID REFERENCES profiles(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### **chat_sessions**
AI chat bot sessions
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
session_name    TEXT
intent          TEXT  -- 'workflow_creation', 'help', 'troubleshooting'
context         JSONB DEFAULT '{}'::JSONB
status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
workflow_id     UUID REFERENCES workflows(id)  -- If session resulted in workflow creation
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### **chat_messages**
Individual chat messages
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE
role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system'))
content         TEXT NOT NULL
metadata        JSONB DEFAULT '{}'::JSONB  -- Token usage, model info, etc.
embedding       vector(1536)  -- For semantic search (pgvector)
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### **api_keys**
User API key management
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
key_name        TEXT NOT NULL
key_prefix      TEXT NOT NULL  -- First 8 chars of key for identification
key_hash        TEXT NOT NULL  -- Hashed full key
permissions     TEXT[] DEFAULT ARRAY['read']::TEXT[]
last_used_at    TIMESTAMPTZ
usage_count     INTEGER DEFAULT 0
expires_at      TIMESTAMPTZ
is_active       BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id, key_name)
```

### **audit_logs**
System audit trail
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES profiles(id)
action          TEXT NOT NULL
resource_type   TEXT NOT NULL  -- 'workflow', 'integration', 'execution', etc.
resource_id     UUID
details         JSONB DEFAULT '{}'::JSONB
ip_address      INET
user_agent      TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### **system_status**
Health monitoring and status
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
service_name    TEXT NOT NULL
status          TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down'))
response_time   INTEGER  -- in milliseconds
error_message   TEXT
metadata        JSONB DEFAULT '{}'::JSONB
checked_at      TIMESTAMPTZ DEFAULT NOW()
```

---

## 🔐 Row Level Security (RLS) Policies

### **profiles**
- Users can read/update their own profile
- Service role has full access

### **integrations**
- Users can CRUD their own integrations
- Credentials are never exposed in select queries

### **workflows & workflow_steps**
- Users can CRUD their own workflows and steps
- Public templates are readable by all authenticated users

### **workflow_executions**
- Users can read their own execution logs
- Only service role can insert/update execution records

### **chat_sessions & chat_messages**
- Users can CRUD their own chat data
- Embeddings are only accessible to service role

### **audit_logs**
- Users can read logs related to their actions
- Only service role can insert audit logs

---

## 📈 Indexes for Performance

```sql
-- User data lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_integrations_user_service ON integrations(user_id, service_name);

-- Workflow queries  
CREATE INDEX idx_workflows_user_status ON workflows(user_id, status);
CREATE INDEX idx_workflow_steps_workflow_order ON workflow_steps(workflow_id, step_order);

-- Execution queries
CREATE INDEX idx_executions_workflow_created ON workflow_executions(workflow_id, created_at DESC);
CREATE INDEX idx_executions_user_status ON workflow_executions(user_id, execution_status);

-- Chat queries
CREATE INDEX idx_chat_sessions_user_created ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_session_created ON chat_messages(session_id, created_at);

-- Vector similarity search (requires pgvector extension)
CREATE INDEX idx_chat_messages_embedding ON chat_messages USING ivfflat (embedding vector_cosine_ops);

-- Audit and monitoring
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_system_status_service_checked ON system_status(service_name, checked_at DESC);
```

---

## 🚀 Initial Data Seeds

### **integration_templates**
Pre-configured integrations for popular services

### **workflow_templates**  
Common automation patterns like:
- Gmail → Notion (save emails)
- Gmail → AI → Telegram (email summaries)
- Scheduled → AI → Multiple services (reports)

### **system_status**
Initial health check entries for all services

---

This schema provides:
- ✅ Complete user management with profiles and preferences
- ✅ Secure integration storage with encryption
- ✅ Flexible workflow system supporting complex automations  
- ✅ Comprehensive execution logging and monitoring
- ✅ AI-powered chat system with semantic search
- ✅ API key management for third-party access
- ✅ Full audit trail and system monitoring
- ✅ Template system for quick workflow creation
