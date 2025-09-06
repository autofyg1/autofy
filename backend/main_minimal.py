"""
Minimal FastAPI application for testing authentication
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from config.settings import settings
from config.database import get_supabase
from supabase import Client

# Import services
from services.auth_service import AuthService
from services.profile_service import ProfileService


# Pydantic models for request/response
class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class SignInRequest(BaseModel):
    email: str
    password: str


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


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        # Test database connection
        supabase = get_supabase()
        supabase.table('profiles').select('count', count='exact').limit(0).execute()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": "connected",
                "auth": "ready"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


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
        
        # Wait a moment for the auth user to be available in database
        import asyncio
        await asyncio.sleep(0.5)
        
        # Create profile using ProfileService  
        profile_service = ProfileService(supabase)
        try:
            profile = await profile_service.create_profile(
                user_id=user.id,
                email=user.email,
                full_name=request.full_name or user.user_metadata.get('full_name')
            )
        except ValueError as ve:
            if "does not exist in authentication system" in str(ve):
                # Retry once after another brief delay
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
        print(f"Signup error: {e}")
        # Return more specific error messages
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        elif "password" in str(e).lower():
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        else:
            raise HTTPException(status_code=500, detail=f"Error creating account: {str(e)}")


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main_minimal:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )
