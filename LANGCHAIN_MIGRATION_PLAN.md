# 🚀 LangChain & LangGraph Migration Plan for Autofy

## Overview
This document outlines the migration strategy to replace the current Supabase + custom automation system with LangChain for third-party integrations and LangGraph for AI workflow automation.

## 🎯 Migration Goals

1. **Replace all third-party service calls with LangChain tools**
2. **Replace custom workflow engine with LangGraph state machines**
3. **Replace manual LLM integrations with LangChain LLM abstractions**
4. **Maintain all existing functionality while improving reliability and scalability**

## 🏗️ Architecture Overview

### Current vs Future Architecture

#### Current Architecture:
```
Frontend (React) → Supabase Client → Edge Functions → Custom Services
                                                   ↓
                                          Custom Workflow Engine
                                                   ↓
                                    Direct API calls to Gmail/Notion/Telegram/OpenRouter
```

#### Future Architecture with LangChain/LangGraph:
```
Frontend (React) → LangChain Backend → LangGraph Workflows
                                              ↓
                                    LangChain Tools & Integrations
                                    (Gmail, Notion, Telegram, LLMs)
```

## 📋 Migration Components

### 1. LangChain Tool Integrations

#### A. Gmail Tool (`tools/gmail_tool.py`)
```python
from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from typing import List, Dict, Any

class GmailFetchTool(BaseTool):
    name = "gmail_fetch"
    description = "Fetch emails from Gmail with filters"
    
class GmailSendTool(BaseTool):
    name = "gmail_send" 
    description = "Send email via Gmail"
    
class GmailReplyTool(BaseTool):
    name = "gmail_reply"
    description = "Reply to email via Gmail"
```

#### B. Notion Tool (`tools/notion_tool.py`)
```python
class NotionCreatePageTool(BaseTool):
    name = "notion_create_page"
    description = "Create page in Notion database"
```

#### C. Telegram Tool (`tools/telegram_tool.py`) 
```python
class TelegramSendTool(BaseTool):
    name = "telegram_send"
    description = "Send message via Telegram"
```

#### D. AI Processing Tool (`tools/ai_tool.py`)
```python
class AIProcessingTool(BaseTool):
    name = "ai_process"
    description = "Process content with AI models"
```

### 2. LangGraph Workflow State Machine

#### Workflow State Definition (`graph/state.py`)
```python
from typing import Dict, List, Any, Optional
from langchain.schema import BaseMessage
from typing_extensions import TypedDict

class WorkflowState(TypedDict):
    # Input data
    user_id: str
    zap_id: str
    trigger_data: Dict[str, Any]
    
    # Execution state
    current_step: int
    total_steps: int
    step_results: List[Dict[str, Any]]
    
    # Context variables
    variables: Dict[str, Any]
    error: Optional[str]
    
    # Messages for AI processing
    messages: List[BaseMessage]
```

#### Main Workflow Graph (`graph/workflow.py`)
```python
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
from .state import WorkflowState
from .nodes import (
    fetch_zap_config,
    prepare_execution_context,
    execute_workflow_step,
    handle_ai_processing,
    handle_error,
    finalize_execution
)

def create_workflow_graph(tools):
    workflow = StateGraph(WorkflowState)
    tool_executor = ToolExecutor(tools)
    
    # Add nodes
    workflow.add_node("fetch_config", fetch_zap_config)
    workflow.add_node("prepare_context", prepare_execution_context)
    workflow.add_node("execute_step", lambda state: execute_workflow_step(state, tool_executor))
    workflow.add_node("ai_processing", handle_ai_processing)
    workflow.add_node("handle_error", handle_error)
    workflow.add_node("finalize", finalize_execution)
    
    # Define flow
    workflow.set_entry_point("fetch_config")
    workflow.add_edge("fetch_config", "prepare_context")
    workflow.add_edge("prepare_context", "execute_step")
    
    # Conditional edges for workflow control
    workflow.add_conditional_edges(
        "execute_step",
        determine_next_step,
        {
            "continue": "execute_step",
            "ai_processing": "ai_processing", 
            "error": "handle_error",
            "finish": "finalize"
        }
    )
    
    workflow.add_edge("ai_processing", "execute_step")
    workflow.add_edge("handle_error", END)
    workflow.add_edge("finalize", END)
    
    return workflow.compile()
```

### 3. Backend Service Layer

#### FastAPI Backend (`main.py`)
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .graph.workflow import create_workflow_graph
from .tools import get_all_tools
from .config import settings

app = FastAPI(title="Autofy LangChain Backend")

# Initialize tools and workflow
tools = get_all_tools()
workflow = create_workflow_graph(tools)

class ZapExecutionRequest(BaseModel):
    user_id: str
    zap_id: str
    trigger_data: dict

@app.post("/execute-zap")
async def execute_zap(request: ZapExecutionRequest):
    initial_state = {
        "user_id": request.user_id,
        "zap_id": request.zap_id,
        "trigger_data": request.trigger_data,
        "current_step": 0,
        "total_steps": 0,
        "step_results": [],
        "variables": {},
        "error": None,
        "messages": []
    }
    
    result = await workflow.ainvoke(initial_state)
    return result
```

## 🔧 Implementation Plan

### Phase 1: Setup and Dependencies
- [ ] Create new `backend/` directory with Python environment
- [ ] Install LangChain, LangGraph, FastAPI dependencies
- [ ] Setup environment configuration for API keys

### Phase 2: LangChain Tool Development
- [ ] Implement Gmail LangChain tools
- [ ] Implement Notion LangChain tools  
- [ ] Implement Telegram LangChain tools
- [ ] Implement AI processing tools with multiple LLM providers

### Phase 3: LangGraph Workflow Engine
- [ ] Create workflow state definitions
- [ ] Implement workflow nodes and conditional logic
- [ ] Add error handling and retry mechanisms
- [ ] Create workflow execution graph

### Phase 4: Backend API Service
- [ ] Implement FastAPI backend service
- [ ] Create API endpoints for workflow execution
- [ ] Add authentication and user management
- [ ] Implement database connectivity

### Phase 5: Frontend Integration
- [ ] Update frontend to call new LangChain backend
- [ ] Migrate from Supabase functions to new API
- [ ] Update workflow chat bot to use new system
- [ ] Maintain existing UI/UX

### Phase 6: Testing and Migration
- [ ] Unit tests for all tools and workflows
- [ ] Integration tests for complete workflows
- [ ] Performance testing and optimization
- [ ] Gradual migration from old system

## 📁 New Directory Structure

```
zappy/
├── backend/                    # New LangChain backend
│   ├── main.py                 # FastAPI application
│   ├── config/
│   │   ├── settings.py         # Configuration management
│   │   └── database.py         # Database connections
│   ├── tools/                  # LangChain tools
│   │   ├── gmail_tool.py
│   │   ├── notion_tool.py
│   │   ├── telegram_tool.py
│   │   └── ai_tool.py
│   ├── graph/                  # LangGraph workflows
│   │   ├── state.py            # State definitions
│   │   ├── workflow.py         # Main workflow graph
│   │   ├── nodes.py            # Workflow nodes
│   │   └── conditions.py       # Conditional logic
│   ├── services/               # Business logic
│   │   ├── auth.py
│   │   ├── zap_manager.py
│   │   └── user_manager.py
│   ├── api/                    # API routes
│   │   ├── workflows.py
│   │   ├── integrations.py
│   │   └── chat.py
│   └── requirements.txt
├── frontend/                   # Existing React frontend
│   └── src/
│       └── lib/
│           └── langchain-api.ts # New API client
├── supabase/                   # Keep for database only
│   └── migrations/
└── docs/
    └── langchain-migration/
```

## 🔑 Environment Variables

### New Backend Environment (.env)
```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...

# LLM Providers
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...

# Service Integrations
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NOTION_API_KEY=...
TELEGRAM_BOT_TOKEN=...

# Application
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
SECRET_KEY=...
```

## 🚀 Benefits of Migration

1. **Standardized Integrations**: LangChain provides robust, well-tested integrations
2. **Better AI Orchestration**: LangGraph offers sophisticated workflow control
3. **Improved Reliability**: Built-in retry mechanisms and error handling
4. **Scalability**: Better handling of concurrent workflow executions
5. **Extensibility**: Easy to add new services and AI models
6. **Monitoring**: Better observability and debugging capabilities

## 📊 Migration Timeline

- **Week 1-2**: Setup and tool development
- **Week 3-4**: LangGraph workflow implementation
- **Week 5-6**: Backend API and integration
- **Week 7-8**: Frontend updates and testing
- **Week 9-10**: Migration and optimization

## 🔍 Testing Strategy

1. **Unit Tests**: Each tool and workflow node
2. **Integration Tests**: Complete workflow execution
3. **Load Tests**: Concurrent execution performance
4. **User Acceptance Tests**: Feature parity validation
5. **Migration Tests**: Data integrity during transition

This migration will transform your Autofy platform into a more robust, scalable, and maintainable AI automation system using industry-standard LangChain and LangGraph frameworks.
