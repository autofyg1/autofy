"""
Database configuration and connection setup for Supabase
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from supabase import create_client, Client
from .settings import settings


class DatabaseManager:
    """Database connection manager"""
    
    def __init__(self):
        self._engine = None
        self._session_factory = None
        self._supabase_client = None
    
    @property
    def engine(self):
        """Get or create the database engine"""
        if not self._engine:
            if not settings.database_url:
                raise ValueError("DATABASE_URL not configured")
            
            self._engine = create_async_engine(
                settings.database_url,
                echo=settings.debug,
                future=True,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=300
            )
        return self._engine
    
    @property
    def session_factory(self):
        """Get or create the session factory"""
        if not self._session_factory:
            self._session_factory = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self._session_factory
    
    @property
    def supabase(self) -> Client:
        """Get or create the Supabase client"""
        if not self._supabase_client:
            config = settings.supabase_config
            self._supabase_client = create_client(
                config["url"], 
                config["key"]
            )
        return self._supabase_client
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session"""
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def close(self):
        """Close database connections"""
        if self._engine:
            await self._engine.dispose()


# Global database manager
db_manager = DatabaseManager()


# Dependency for FastAPI
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions"""
    async for session in db_manager.get_session():
        yield session


def get_supabase() -> Client:
    """FastAPI dependency for Supabase client"""
    return db_manager.supabase


# Database Models for the new schema
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class Profile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str = 'UTC'
    plan_type: str = 'free'
    credits_used: int = 0
    credits_limit: int = 1000
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: datetime


class Integration(BaseModel):
    id: str
    user_id: str
    service_name: str
    display_name: str
    credentials: dict
    configuration: dict = {}
    status: str = 'active'
    last_tested_at: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: dict = {}
    created_at: datetime
    updated_at: datetime


class Workflow(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    status: str = 'draft'
    trigger_type: str
    trigger_config: dict = {}
    tags: List[str] = []
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    last_executed_at: Optional[datetime] = None
    created_from_chat: bool = False
    chat_session_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class WorkflowStep(BaseModel):
    id: str
    workflow_id: str
    step_order: int
    step_type: str
    service_name: str
    action_name: str
    configuration: dict
    conditions: dict = {}
    error_handling: dict = {"retry": True, "max_retries": 3}
    is_enabled: bool = True
    created_at: datetime
    updated_at: datetime


class WorkflowExecution(BaseModel):
    id: str
    workflow_id: str
    user_id: str
    trigger_data: dict = {}
    execution_status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_steps: int = 0
    completed_steps: int = 0
    failed_steps: int = 0
    step_results: List[dict] = []
    error_message: Optional[str] = None
    error_step_id: Optional[str] = None
    metadata: dict = {}
    credits_used: int = 0


class ChatSession(BaseModel):
    id: str
    user_id: str
    session_name: Optional[str] = None
    intent: Optional[str] = None
    context: dict = {}
    status: str = 'active'
    workflow_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ChatMessage(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    metadata: dict = {}
    created_at: datetime
