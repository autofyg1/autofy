"""
Workflow models for the automation system
"""
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class WorkflowStatus(str, Enum):
    """Workflow status enumeration"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class WorkflowExecutionStatus(str, Enum):
    """Workflow execution status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowStepType(str, Enum):
    """Workflow step type enumeration"""
    TRIGGER = "trigger"
    ACTION = "action"
    CONDITION = "condition"


class Workflow(BaseModel):
    """Workflow model"""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.DRAFT
    user_id: str
    trigger_type: Optional[str] = None
    trigger_config: Dict[str, Any] = {}
    tags: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_executed_at: Optional[datetime] = None
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0


class WorkflowStep(BaseModel):
    """Workflow step model"""
    id: Optional[str] = None
    workflow_id: str
    step_order: int
    step_type: WorkflowStepType
    service_name: str
    action_name: str
    configuration: Dict[str, Any] = {}
    conditions: Dict[str, Any] = {}
    created_at: Optional[datetime] = None


class WorkflowExecution(BaseModel):
    """Workflow execution model"""
    id: Optional[str] = None
    workflow_id: str
    status: WorkflowExecutionStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    trigger_data: Dict[str, Any] = {}
    execution_context: Dict[str, Any] = {}
    error_message: Optional[str] = None
    logs: List[Dict[str, Any]] = []


class WorkflowExecutionLog(BaseModel):
    """Workflow execution log entry"""
    id: Optional[str] = None
    execution_id: str
    workflow_id: str
    step_id: Optional[str] = None
    level: str  # INFO, WARNING, ERROR
    message: str
    data: Dict[str, Any] = {}
    timestamp: datetime
