"""
LangGraph workflow state definitions for Autofy
"""
from typing import Dict, List, Any, Optional
from typing_extensions import TypedDict
from datetime import datetime


class WorkflowState(TypedDict):
    """State for workflow execution"""
    # Input data
    user_id: str
    zap_id: str
    trigger_data: Dict[str, Any]
    
    # Execution state
    current_step: int
    total_steps: int
    step_results: List[Dict[str, Any]]
    
    # Context variables for template processing
    variables: Dict[str, Any]
    
    # Error handling
    error: Optional[str]
    retry_count: int
    max_retries: int
    
    # Workflow control
    should_continue: bool
    execution_status: str  # "running", "completed", "failed", "paused"
    
    # Metadata
    started_at: str
    updated_at: str
    completed_at: Optional[str]


class ChatState(TypedDict):
    """State for chat bot workflow creation"""
    # User context
    user_id: str
    session_id: str
    
    # Conversation data
    user_message: str
    bot_response: str
    conversation_history: List[Dict[str, str]]
    
    # Workflow creation context
    workflow_intent: Optional[str]
    required_services: List[str]
    missing_integrations: List[str]
    workflow_config: Optional[Dict[str, Any]]
    
    # Validation
    is_valid_workflow: bool
    validation_errors: List[str]
    
    # Output
    created_zap_id: Optional[str]
    should_create_zap: bool


class StepExecutionResult(TypedDict):
    """Result of a single step execution"""
    step_id: str
    step_order: int
    step_type: str  # "trigger" or "action"
    service_name: str
    event_type: str
    
    # Execution result
    success: bool
    data: Optional[Dict[str, Any]]
    error: Optional[str]
    
    # Timing
    started_at: str
    completed_at: str
    duration_seconds: float
    
    # Output for next steps
    output: Optional[Any]  # Primary output for template variables


class ZapConfig(TypedDict):
    """Zap configuration structure"""
    id: str
    name: str
    description: str
    user_id: str
    is_active: bool
    
    # Steps configuration
    steps: List[Dict[str, Any]]
    
    # Metadata
    created_at: str
    updated_at: str
    last_run_at: Optional[str]
    total_runs: int


class IntegrationCheck(TypedDict):
    """Integration check result"""
    service_name: str
    is_connected: bool
    error: Optional[str]
    credentials_valid: bool
    last_checked: str


class ValidationResult(TypedDict):
    """Workflow validation result"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    
    # Service requirements
    required_services: List[str]
    missing_integrations: List[str]
    
    # Step validation
    step_errors: Dict[int, List[str]]  # step_order -> errors
    
    # Estimated execution
    estimated_duration: Optional[float]
    estimated_cost: Optional[float]


# State update helper functions
def create_initial_workflow_state(user_id: str, zap_id: str, trigger_data: Dict[str, Any]) -> WorkflowState:
    """Create initial workflow state"""
    now = datetime.now().isoformat()
    
    return WorkflowState(
        user_id=user_id,
        zap_id=zap_id,
        trigger_data=trigger_data,
        current_step=0,
        total_steps=0,
        step_results=[],
        variables={
            # Standard trigger variables
            "timestamp": now,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": datetime.now().strftime("%H:%M:%S"),
            **trigger_data  # Merge trigger data into variables
        },
        error=None,
        retry_count=0,
        max_retries=3,
        should_continue=True,
        execution_status="running",
        started_at=now,
        updated_at=now,
        completed_at=None
    )


def create_initial_chat_state(user_id: str, session_id: str, user_message: str) -> ChatState:
    """Create initial chat state"""
    return ChatState(
        user_id=user_id,
        session_id=session_id,
        user_message=user_message,
        bot_response="",
        conversation_history=[],
        workflow_intent=None,
        required_services=[],
        missing_integrations=[],
        workflow_config=None,
        is_valid_workflow=False,
        validation_errors=[],
        created_zap_id=None,
        should_create_zap=False
    )


def create_step_result(
    step_config: Dict[str, Any],
    success: bool,
    data: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    output: Optional[Any] = None
) -> StepExecutionResult:
    """Create step execution result"""
    now = datetime.now().isoformat()
    
    return StepExecutionResult(
        step_id=step_config.get("id", ""),
        step_order=step_config.get("step_order", 0),
        step_type=step_config.get("step_type", "action"),
        service_name=step_config.get("service_name", ""),
        event_type=step_config.get("event_type", ""),
        success=success,
        data=data,
        error=error,
        started_at=now,
        completed_at=now,
        duration_seconds=0.0,
        output=output
    )


def update_workflow_state(
    state: WorkflowState,
    step_result: Optional[StepExecutionResult] = None,
    error: Optional[str] = None,
    should_continue: Optional[bool] = None,
    status: Optional[str] = None
) -> WorkflowState:
    """Update workflow state with new information"""
    updated_state = state.copy()
    updated_state["updated_at"] = datetime.now().isoformat()
    
    if step_result:
        updated_state["step_results"].append(step_result)
        updated_state["current_step"] = len(updated_state["step_results"])
        
        # Add step output to variables if available
        if step_result["success"] and step_result["output"]:
            step_key = f"step_{step_result['step_order']}_output"
            updated_state["variables"][step_key] = step_result["output"]
            
            # Service-specific variable mapping
            if step_result["service_name"] == "ai_process" and step_result["data"]:
                updated_state["variables"]["ai_content"] = step_result["data"].get("content", "")
            elif step_result["service_name"] == "gmail" and step_result["data"]:
                if "emails" in step_result["data"]:
                    # Gmail fetch result
                    emails = step_result["data"]["emails"]
                    if emails:
                        latest_email = emails[0]
                        updated_state["variables"].update({
                            "subject": latest_email.get("subject", ""),
                            "sender": latest_email.get("sender", ""),
                            "body": latest_email.get("body", "")
                        })
    
    if error:
        updated_state["error"] = error
        updated_state["execution_status"] = "failed"
    
    if should_continue is not None:
        updated_state["should_continue"] = should_continue
    
    if status:
        updated_state["execution_status"] = status
        if status == "completed":
            updated_state["completed_at"] = datetime.now().isoformat()
    
    return updated_state


def extract_variables_from_step_results(step_results: List[StepExecutionResult]) -> Dict[str, Any]:
    """Extract variables from step results for template processing"""
    variables = {}
    
    for result in step_results:
        if result["success"] and result["data"]:
            step_key = f"step_{result['step_order']}"
            
            # Generic step output
            if result["output"]:
                variables[f"{step_key}_output"] = result["output"]
            
            # Service-specific extractions
            if result["service_name"] == "gmail":
                if "emails" in result["data"]:
                    # Gmail fetch
                    emails = result["data"]["emails"]
                    if emails:
                        email = emails[0]  # Use first email
                        variables.update({
                            "subject": email.get("subject", ""),
                            "sender": email.get("sender", ""),
                            "body": email.get("body", ""),
                            "timestamp": email.get("timestamp", "")
                        })
                elif "message_id" in result["data"]:
                    # Gmail send/reply
                    variables[f"{step_key}_message_id"] = result["data"]["message_id"]
            
            elif result["service_name"] == "ai":
                # AI processing
                if "content" in result["data"]:
                    variables["ai_content"] = result["data"]["content"]
                    variables[f"{step_key}_ai_content"] = result["data"]["content"]
            
            elif result["service_name"] == "notion":
                # Notion operations
                if "page" in result["data"]:
                    page = result["data"]["page"]
                    variables[f"{step_key}_notion_page_id"] = page.get("id", "")
                    variables[f"{step_key}_notion_url"] = page.get("url", "")
            
            elif result["service_name"] == "telegram":
                # Telegram operations
                if "successful_sends" in result["data"]:
                    variables[f"{step_key}_telegram_sent"] = result["data"]["successful_sends"]
    
    return variables
