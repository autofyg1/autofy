"""
Main FastAPI application for the LangChain backend
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
import httpx
import json as jsonlib

from config.settings import settings
from config.database import get_db_session, get_supabase
from tools import get_all_tools, get_tool_info, list_available_services
from graph.workflow import WorkflowManager
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client

# Import services
from services.auth_service import AuthService
from services.profile_service import ProfileService
from services.integration_service import IntegrationService
from services.workflow_service import WorkflowService
from services.chat_service import ChatService


# Pydantic models for request/response
class WorkflowExecuteRequest(BaseModel):
    workflow_id: str
    trigger_data: Dict[str, Any] = {}


class WorkflowCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str = 'manual'
    trigger_config: Dict[str, Any] = {}
    tags: List[str] = []


class WorkflowStepCreateRequest(BaseModel):
    workflow_id: str
    step_order: int
    step_type: str
    service_name: str
    action_name: str
    configuration: Dict[str, Any]
    conditions: Dict[str, Any] = {}
    error_handling: Dict[str, Any] = {}


class IntegrationCreateRequest(BaseModel):
    service_name: str
    display_name: str
    credentials: Dict[str, Any]
    configuration: Dict[str, Any] = {}


class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatSessionCreateRequest(BaseModel):
    session_name: Optional[str] = None
    intent: Optional[str] = None
    context: Dict[str, Any] = {}


class ChatResponse(BaseModel):
    message: str
    session_id: str
    suggestions: List[str] = []
    workflow_created: bool = False
    workflow_id: Optional[str] = None


class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class SignInRequest(BaseModel):
    email: str
    password: str


class OAuthExchangeRequest(BaseModel):
    service: str
    code: str
    redirect_uri: str
    state: Optional[str] = None


# Initialize workflow manager
workflow_manager = WorkflowManager()

# Security
security = HTTPBearer(auto_error=False)


# Dependency to get current user
async def get_current_user(authorization: Optional[str] = Header(None), supabase: Client = Depends(get_supabase)):
    """Get current user from authorization header"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace('Bearer ', '')
    auth_service = AuthService(supabase)
    user = await auth_service.get_current_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


# Create FastAPI app
app = FastAPI(
    title="LangChain Backend API",
    description="AI-powered workflow automation backend using LangChain and LangGraph",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication endpoints
@app.post("/api/auth/signup")
async def signup(
    request: SignUpRequest,
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Sign up a new user"""
    try:
        # Create user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name
                }
            }
        })
        
        if auth_response.user is None:
            raise HTTPException(status_code=400, detail="Failed to create user account")
        
        user = auth_response.user
        
        # Create profile using ProfileService with a brief retry to account for auth replication delay
        profile_service = ProfileService(supabase)
        profile = None
        try:
            profile = await profile_service.create_profile(
                user_id=user.id,
                email=user.email,
                full_name=request.full_name or user.user_metadata.get('full_name')
            )
        except ValueError as ve:
            # If auth record isn't visible yet in DB, wait and retry once
            if "does not exist in authentication system" in str(ve):
                import asyncio
                await asyncio.sleep(1.0)
                profile = await profile_service.create_profile(
                    user_id=user.id,
                    email=user.email,
                    full_name=request.full_name or user.user_metadata.get('full_name')
                )
            else:
                raise
        
        return {
            "success": True,
            "message": "Account created successfully. Please check your email for confirmation.",
            "user": {
                "id": user.id,
                "email": user.email,
                "email_confirmed_at": user.email_confirmed_at
            }
        }
        
    except Exception as e:
        # Attempt admin create_user fallback for specific Supabase errors
        err_text = str(e)
        print(f"Signup error: {err_text}")
        try:
            if "database error saving new user" in err_text.lower():
                # Use admin API to create the user directly (requires service role key)
                admin_response = supabase.auth.admin.create_user({
                    "email": request.email,
                    "password": request.password,
                    "email_confirm": False,
                    "user_metadata": {"full_name": request.full_name}
                })
                if not admin_response.user:
                    raise HTTPException(status_code=500, detail="Admin create_user failed")
                user = admin_response.user
                # Proceed to create profile (same flow as above)
                profile_service = ProfileService(supabase)
                profile = None
                try:
                    profile = await profile_service.create_profile(
                        user_id=user.id,
                        email=user.email,
                        full_name=request.full_name or user.user_metadata.get('full_name')
                    )
                except ValueError as ve:
                    if "does not exist in authentication system" in str(ve):
                        import asyncio
                        await asyncio.sleep(1.0)
                        profile = await profile_service.create_profile(
                            user_id=user.id,
                            email=user.email,
                            full_name=request.full_name or user.user_metadata.get('full_name')
                        )
                    else:
                        raise
                return {
                    "success": True,
                    "message": "Account created successfully via admin API.",
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "email_confirmed_at": user.email_confirmed_at
                    }
                }
        except HTTPException:
            raise
        except Exception as fallback_error:
            print(f"Signup admin fallback error: {fallback_error}")
        # Return more specific error messages
        if "already registered" in err_text.lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        elif "password" in err_text.lower():
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        else:
            raise HTTPException(status_code=500, detail=f"Error creating account: {err_text}")


@app.post("/api/auth/signin")
async def signin(
    request: SignInRequest,
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Sign in a user"""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_response.session or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        session = auth_response.session
        user = auth_response.user
        
        # Get or create user profile
        profile_service = ProfileService(supabase)
        profile = await profile_service.get_profile(user.id)
        
        if not profile:
            # Create profile for existing user who doesn't have one
            profile = await profile_service.create_profile(
                user_id=user.id,
                email=user.email,
                full_name=user.user_metadata.get('full_name')
            )
        
        return {
            "success": True,
            "session": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_in": session.expires_in,
                "token_type": session.token_type
            },
            "user": {
                "id": user.id,
                "email": user.email,
                "email_confirmed_at": user.email_confirmed_at
            },
            "profile": profile.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signin error: {e}")
        if "invalid" in str(e).lower() or "credentials" in str(e).lower():
            raise HTTPException(status_code=401, detail="Invalid email or password")
        else:
            raise HTTPException(status_code=500, detail=f"Error signing in: {str(e)}")


@app.post("/api/auth/signout")
async def signout(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Sign out current user"""
    try:
        # Get authorization header to extract token
        # Note: In a real implementation, you'd want to get the token more cleanly
        supabase.auth.sign_out()
        
        return {"success": True, "message": "Signed out successfully"}
        
    except Exception as e:
        print(f"Signout error: {e}")
        # Even if signout fails on the server, we consider it successful from client perspective
        return {"success": True, "message": "Signed out successfully"}


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        # Test database connection
        supabase = get_supabase()
        supabase.table('profiles').select('count', count='exact').limit(0).execute()
        
        tools = get_all_tools()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": "connected",
                "workflow_manager": "active",
                "tools_count": len(tools)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


# Workflow endpoints
@app.get("/api/workflows")
async def get_user_workflows(
    status: Optional[str] = None,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> List[Dict[str, Any]]:
    """Get user's workflows"""
    try:
        workflow_service = WorkflowService(supabase)
        workflows = await workflow_service.get_workflows(current_user['id'], status=status)
        
        return [{
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status,
            "trigger_type": workflow.trigger_type,
            "trigger_config": workflow.trigger_config,
            "tags": workflow.tags,
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at
        } for workflow in workflows]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch workflows: {str(e)}")


@app.get("/api/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Get a specific workflow"""
    try:
        workflow_service = WorkflowService(supabase)
        workflow = await workflow_service.get_workflow(workflow_id, current_user['id'])
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Get workflow steps
        steps = await workflow_service.get_workflow_steps(workflow_id)
        
        return {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status,
            "trigger_type": workflow.trigger_type,
            "trigger_config": workflow.trigger_config,
            "tags": workflow.tags,
            "steps": [{
                "id": step.id,
                "step_order": step.step_order,
                "step_type": step.step_type,
                "service_name": step.service_name,
                "action_name": step.action_name,
                "configuration": step.configuration,
                "conditions": step.conditions,
                "error_handling": step.error_handling
            } for step in steps],
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch workflow: {str(e)}")


@app.post("/api/workflows")
async def create_workflow(
    request: WorkflowCreateRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Create a new workflow"""
    try:
        workflow_service = WorkflowService(supabase)
        workflow = await workflow_service.create_workflow(
            user_id=current_user['id'],
            name=request.name,
            description=request.description,
            trigger_type=request.trigger_type,
            trigger_config=request.trigger_config,
            tags=request.tags
        )
        
        return {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status,
            "trigger_type": workflow.trigger_type,
            "trigger_config": workflow.trigger_config,
            "tags": workflow.tags,
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")


@app.delete("/api/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Delete a workflow"""
    try:
        workflow_service = WorkflowService(supabase)
        success = await workflow_service.delete_workflow(workflow_id, current_user['id'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Workflow not found")
            
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete workflow: {str(e)}")


@app.post("/api/workflows/execute")
async def execute_workflow(
    request: WorkflowExecuteRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Execute a workflow"""
    try:
        workflow_service = WorkflowService(supabase)
        
        # Verify workflow belongs to user
        workflow = await workflow_service.get_workflow(request.workflow_id, current_user['id'])
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Create execution record
        execution = await workflow_service.create_execution(
            workflow_id=request.workflow_id,
            user_id=current_user['id'],
            trigger_data=request.trigger_data
        )
        
        # Execute workflow using LangGraph
        result = await workflow_manager.execute_workflow(
            workflow_id=request.workflow_id,
            trigger_data=request.trigger_data,
            user_id=current_user['id']
        )
        
        return {
            "success": True, 
            "execution_id": execution.id, 
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


# Chat endpoints
@app.get("/api/chat/sessions")
async def get_chat_sessions(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> List[Dict[str, Any]]:
    """Get user's chat sessions"""
    try:
        chat_service = ChatService(supabase)
        sessions = await chat_service.get_sessions(current_user['id'])
        
        return [{
            "id": session.id,
            "session_name": session.session_name,
            "intent": session.intent,
            "context": session.context,
            "last_message_at": session.last_message_at,
            "message_count": session.message_count,
            "created_at": session.created_at,
            "updated_at": session.updated_at
        } for session in sessions]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat sessions: {str(e)}")


@app.post("/api/chat/sessions")
async def create_chat_session(
    request: ChatSessionCreateRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Create a new chat session"""
    try:
        chat_service = ChatService(supabase)
        session = await chat_service.create_session(
            user_id=current_user['id'],
            session_name=request.session_name,
            intent=request.intent or "general_assistance",
            context=request.context
        )
        
        return {
            "id": session.id,
            "session_name": session.session_name,
            "intent": session.intent,
            "context": session.context,
            "last_message_at": session.last_message_at,
            "message_count": session.message_count,
            "created_at": session.created_at,
            "updated_at": session.updated_at
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create chat session: {str(e)}")


@app.get("/api/chat/sessions/{session_id}/messages")
async def get_chat_messages(
    session_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> List[Dict[str, Any]]:
    """Get messages from a chat session"""
    try:
        chat_service = ChatService(supabase)
        
        # Verify session belongs to user
        session = await chat_service.get_session(session_id, current_user['id'])
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        messages = await chat_service.get_messages(session_id)
        
        return [{
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "metadata": message.metadata,
            "created_at": message.created_at
        } for message in messages]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat messages: {str(e)}")


@app.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Delete a chat session"""
    try:
        chat_service = ChatService(supabase)
        success = await chat_service.delete_session(session_id, current_user['id'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Chat session not found")
            
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat session: {str(e)}")


@app.post("/api/chat/message")
async def send_chat_message(
    request: ChatMessageRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> ChatResponse:
    """Process a chat message and return AI response"""
    try:
        chat_service = ChatService(supabase)
        
        # Get or create session
        if request.session_id:
            session = await chat_service.get_session(request.session_id, current_user['id'])
            if not session:
                raise HTTPException(status_code=404, detail="Chat session not found")
        else:
            session = await chat_service.create_session(
                user_id=current_user['id'],
                intent="general_assistance"
            )
        
        # Add user message to session
        await chat_service.add_message(
            session_id=session.id,
            role="user",
            content=request.message
        )
        
        # Process with LangGraph
        result = await workflow_manager.process_chat_message(
            message=request.message,
            session_id=session.id,
            user_id=current_user['id']
        )
        
        # Add AI response to session
        await chat_service.add_message(
            session_id=session.id,
            role="assistant",
            content=result["message"],
            metadata={
                "suggestions": result.get("suggestions", []),
                "workflow_created": result.get("workflow_created", False),
                "workflow_id": result.get("workflow_id")
            }
        )
        
        return ChatResponse(
            message=result["message"],
            session_id=session.id,
            suggestions=result.get("suggestions", []),
            workflow_created=result.get("workflow_created", False),
            workflow_id=result.get("workflow_id")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


@app.get("/api/tools")
async def get_available_tools() -> Dict[str, Any]:
    """Get available tools and their information"""
    try:
        tools_info = get_tool_info()
        return {"tools": tools_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tools: {str(e)}")


@app.get("/api/services")
async def get_available_services() -> Dict[str, Any]:
    """Get available services"""
    services = [
        {
            "name": "gmail",
            "display_name": "Gmail",
            "description": "Email automation and management",
            "category": "communication",
            "actions": ["fetch_emails", "send_email", "reply_to_email"]
        },
        {
            "name": "notion",
            "display_name": "Notion",
            "description": "Note-taking and database management", 
            "category": "productivity",
            "actions": ["create_page", "query_database", "update_page"]
        },
        {
            "name": "telegram",
            "display_name": "Telegram",
            "description": "Messaging and bot automation",
            "category": "communication",
            "actions": ["send_message", "get_updates", "send_photo"]
        }
    ]
    return {"services": services}


@app.get("/api/integrations")
async def get_user_integrations(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> List[Dict[str, Any]]:
    """Get user's integrations"""
    try:
        integration_service = IntegrationService(supabase)
        integrations = await integration_service.get_integrations(current_user['id'])
        
        return [{
            "id": integration.id,
            "service": integration.service_name,
            "name": integration.display_name,
            "status": integration.status,
            "connected_at": integration.created_at,
            "last_tested_at": integration.last_tested_at,
            "error_message": integration.error_message
        } for integration in integrations]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch integrations: {str(e)}")


@app.post("/api/integrations")
async def create_integration(
    request: IntegrationCreateRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Create a new integration"""
    print(f"\n=== INTEGRATION CREATION START ===")
    print(f"Service Name: {request.service_name}")
    print(f"Display Name: {request.display_name}")
    print(f"User ID: {current_user['id']}")
    print(f"Credentials Keys: {list(request.credentials.keys()) if request.credentials else 'None'}")
    print(f"Configuration Keys: {list(request.configuration.keys()) if request.configuration else 'None'}")
    
    try:
        integration_service = IntegrationService(supabase)
        
        print(f"Calling integration_service.create_integration...")
        integration = await integration_service.create_integration(
            user_id=current_user['id'],
            service_name=request.service_name,
            display_name=request.display_name,
            credentials=request.credentials,
            configuration=request.configuration
        )
        
        print(f"✅ Integration created successfully:")
        print(f"  - ID: {integration.id}")
        print(f"  - Service: {integration.service_name}")
        print(f"  - Status: {integration.status}")
        print(f"=== INTEGRATION CREATION END ===")
        
        return {
            "id": integration.id,
            "service": integration.service_name,
            "name": integration.display_name,
            "status": integration.status,
            "connected_at": integration.created_at,
            "last_tested_at": integration.last_tested_at,
            "error_message": integration.error_message
        }
        
    except Exception as e:
        print(f"❌ Integration creation failed:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"=== INTEGRATION CREATION ERROR END ===")
        raise HTTPException(status_code=500, detail=f"Failed to create integration: {str(e)}")


@app.post("/api/integrations/{integration_id}/test")
async def test_integration(
    integration_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Test an integration connection"""
    try:
        integration_service = IntegrationService(supabase)
        result = await integration_service.test_integration(integration_id, current_user['id'])
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Integration test failed: {str(e)}")


@app.delete("/api/integrations/{integration_id}")
async def delete_integration(
    integration_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Delete an integration"""
    try:
        integration_service = IntegrationService(supabase)
        success = await integration_service.delete_integration(integration_id, current_user['id'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Integration not found")
            
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete integration: {str(e)}")


# OAuth endpoints
@app.post("/api/oauth/exchange")
async def oauth_exchange(
    request: OAuthExchangeRequest,
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Exchange OAuth authorization code for access token"""
    print(f"\n=== OAUTH EXCHANGE START ===")
    print(f"Service: {request.service}")
    print(f"Code: {'present' if request.code else 'missing'}")
    print(f"Redirect URI: {request.redirect_uri}")
    print(f"State: {request.state}")
    print(f"User ID: {current_user['id']}")
    
    try:
        service = request.service.lower()
        
        # OAuth configurations
        oauth_configs = {
            'gmail': {
                'client_id': settings.google_client_id,
                'client_secret': settings.google_client_secret,
                'token_url': 'https://oauth2.googleapis.com/token',
                'scopes': [
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/gmail.send',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ]
            },
            'notion': {
                'client_id': settings.notion_client_id,
                'client_secret': settings.notion_client_secret,
                'token_url': 'https://api.notion.com/v1/oauth/token',
                'scopes': []
            }
        }
        
        if service not in oauth_configs:
            print(f"❌ OAuth service not supported: {service}")
            raise HTTPException(status_code=400, detail=f"OAuth not supported for service: {service}")
        
        config = oauth_configs[service]
        
        # Validate configuration
        print(f"Config validation for {service}:")
        print(f"  - Client ID: {'present' if config['client_id'] else 'MISSING'}")
        print(f"  - Client Secret: {'present' if config['client_secret'] else 'MISSING'}")
        print(f"  - Token URL: {config['token_url']}")
        
        if not config['client_id'] or not config['client_secret']:
            missing_vars = []
            if not config['client_id']:
                missing_vars.append(f"{service.upper()}_CLIENT_ID")
            if not config['client_secret']:
                missing_vars.append(f"{service.upper()}_CLIENT_SECRET")
            
            error_msg = f"Missing OAuth configuration for {service}: {', '.join(missing_vars)}. Please add these environment variables to your .env file and restart the server."
            print(f"❌ {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Prepare token exchange request
        token_data = {
            'code': request.code,
            'grant_type': 'authorization_code',
            'redirect_uri': request.redirect_uri
        }
        
        # Add service-specific parameters and headers
        if service == 'gmail':
            # Gmail uses client credentials in request body
            token_data['client_id'] = config['client_id']
            token_data['client_secret'] = config['client_secret']
            token_data['access_type'] = 'offline'
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        elif service == 'notion':
            # Notion uses Basic Auth header
            import base64
            auth_string = f"{config['client_id']}:{config['client_secret']}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            headers = {
                'Authorization': f'Basic {auth_b64}',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        else:
            # Default method (client credentials in body)
            token_data['client_id'] = config['client_id']
            token_data['client_secret'] = config['client_secret']
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        
        print(f"Making token exchange request to: {config['token_url']}")
        print(f"Request data keys: {list(token_data.keys())}")
        
        # Make token exchange request
        print(f"Making token exchange request...")
        print(f"URL: {config['token_url']}")
        print(f"Headers: {headers}")
        print(f"Data keys: {list(token_data.keys())}")
        print(f"Code preview: {request.code[:10]}...{request.code[-10:] if len(request.code) > 20 else request.code}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config['token_url'],
                data=token_data,
                headers=headers,
                timeout=30.0
            )
        
        print(f"Token exchange response status: {response.status_code}")
        print(f"Token exchange response headers: {dict(response.headers)}")
        
        if not response.is_success:
            error_data = response.text
            print(f"❌ Token exchange failed for {service}:")
            print(f"Status: {response.status_code}")
            print(f"Response: {error_data}")
            
            # Try to parse error response for better error message
            try:
                error_json = response.json()
                error_detail = error_json.get('error_description') or error_json.get('error') or error_data
            except:
                error_detail = error_data
            
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {error_detail}")
        
        tokens = response.json()
        print(f"✅ Token exchange successful for {service}")
        print(f"Received tokens: {list(tokens.keys())}")
        
        # Prepare credentials for storage
        credentials = {
            'access_token': tokens.get('access_token'),
            'refresh_token': tokens.get('refresh_token'),
            'token_type': tokens.get('token_type', 'Bearer'),
            'expires_in': tokens.get('expires_in'),
            'scope': tokens.get('scope')
        }
        
        # Remove None values
        credentials = {k: v for k, v in credentials.items() if v is not None}
        
        print(f"✅ OAuth exchange completed successfully")
        print(f"Credentials keys: {list(credentials.keys())}")
        print(f"=== OAUTH EXCHANGE END ===")
        
        return {'credentials': credentials}
        
    except HTTPException:
        print(f"=== OAUTH EXCHANGE HTTP ERROR ===")
        raise
    except Exception as e:
        print(f"❌ OAuth exchange unexpected error: {e}")
        print(f"Error type: {type(e).__name__}")
        print(f"=== OAUTH EXCHANGE ERROR END ===")
        raise HTTPException(status_code=500, detail=f"OAuth exchange failed: {str(e)}")


# User Profile Endpoints
@app.get("/api/profile")
async def get_user_profile(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get user profile"""
    try:
        profile_service = ProfileService(supabase)
        profile = await profile_service.get_profile(current_user['id'])
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return profile.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


@app.put("/api/profile")
async def update_user_profile(
    updates: Dict[str, Any],
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update user profile"""
    try:
        profile_service = ProfileService(supabase)
        profile = await profile_service.update_profile(current_user['id'], updates)
        return profile.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


# Additional endpoints for testing in debug mode
@app.post("/api/test/tool/{tool_name}")
async def test_tool(tool_name: str, test_data: Dict[str, Any]):
    """Test a specific tool (development only)"""
    if not settings.debug:
        raise HTTPException(status_code=404, detail="Test endpoints only available in debug mode")
    
    try:
        from tools import get_tool_by_name
        tool = get_tool_by_name(tool_name)
        result = await tool.arun(**test_data)
        
        return {
            "success": True,
            "tool_name": tool_name,
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tool test failed: {str(e)}")




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )
