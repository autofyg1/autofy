"""
LangGraph workflow nodes for Autofy workflow execution
"""
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from langgraph.prebuilt import ToolExecutor
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import get_supabase
from tools import get_all_tools, get_tool_by_name
from .state import (
    WorkflowState, 
    ChatState, 
    create_step_result, 
    update_workflow_state,
    extract_variables_from_step_results
)


async def fetch_zap_config(state: WorkflowState) -> WorkflowState:
    """Fetch zap configuration from database"""
    try:
        supabase = get_supabase()
        
        # TODO: Fetch zap and its steps (temporarily disabled for testing)
        # result = supabase.table("zaps").select("""
        #     *,
        #     steps:zap_steps(*)
        # """).eq("id", state["zap_id"]).single().execute()
        
        # Mock response for testing
        result = type('MockResult', (), {'data': {
            'id': state['zap_id'],
            'name': 'Test Workflow',
            'steps': []
        }})()
        
        if not result.data:
            error_msg = f"Zap {state['zap_id']} not found"
            return update_workflow_state(
                state,
                error=error_msg,
                should_continue=False,
                status="failed"
            )
        
        zap_data = result.data
        steps = sorted(zap_data.get("steps", []), key=lambda x: x["step_order"])
        
        # Filter only action steps (skip trigger steps for manual execution)
        action_steps = [step for step in steps if step["step_type"] == "action"]
        
        # Update state with configuration
        updated_state = state.copy()
        updated_state["total_steps"] = len(action_steps)
        updated_state["zap_config"] = zap_data
        updated_state["action_steps"] = action_steps
        
        return updated_state
        
    except Exception as e:
        error_msg = f"Failed to fetch zap config: {str(e)}"
        return update_workflow_state(
            state,
            error=error_msg,
            should_continue=False,
            status="failed"
        )


async def prepare_execution_context(state: WorkflowState) -> WorkflowState:
    """Prepare execution context and validate requirements"""
    try:
        supabase = get_supabase()
        user_id = state["user_id"]
        
        # Get user's integrations
        integrations_result = supabase.table("integrations").select("*").eq("user_id", user_id).execute()
        user_integrations = {
            integration["service_name"]: integration 
            for integration in (integrations_result.data or [])
        }
        
        # Check required services
        required_services = set()
        action_steps = state.get("action_steps", [])
        
        for step in action_steps:
            service_name = step["service_name"]
            required_services.add(service_name)
        
        # Validate integrations
        missing_integrations = []
        for service in required_services:
            if service not in user_integrations:
                missing_integrations.append(service)
        
        if missing_integrations:
            error_msg = f"Missing integrations: {', '.join(missing_integrations)}"
            return update_workflow_state(
                state,
                error=error_msg,
                should_continue=False,
                status="failed"
            )
        
        # Add integrations to state
        updated_state = state.copy()
        updated_state["user_integrations"] = user_integrations
        updated_state["required_services"] = list(required_services)
        
        return updated_state
        
    except Exception as e:
        error_msg = f"Failed to prepare execution context: {str(e)}"
        return update_workflow_state(
            state,
            error=error_msg,
            should_continue=False,
            status="failed"
        )


async def execute_workflow_step(state: WorkflowState, tool_executor: ToolExecutor) -> WorkflowState:
    """Execute a single workflow step"""
    try:
        action_steps = state.get("action_steps", [])
        current_step = state["current_step"]
        
        if current_step >= len(action_steps):
            # All steps completed
            return update_workflow_state(
                state,
                should_continue=False,
                status="completed"
            )
        
        step_config = action_steps[current_step]
        step_start_time = datetime.now()
        
        # Process step configuration with current variables
        processed_config = process_step_configuration(
            step_config["configuration"],
            state["variables"],
            state["step_results"]
        )
        
        # Determine tool name
        service_name = step_config["service_name"]
        event_type = step_config["event_type"]
        tool_name = f"{service_name}_{event_type}"
        
        # Prepare tool input
        tool_input = {
            "user_id": state["user_id"],
            **processed_config
        }
        
        # Execute tool
        try:
            tool = get_tool_by_name(tool_name)
            result_str = await tool._arun(**tool_input)
            result_data = json.loads(result_str) if isinstance(result_str, str) else result_str
            
            # Calculate execution time
            execution_time = (datetime.now() - step_start_time).total_seconds()
            
            # Create step result
            step_result = create_step_result(
                step_config=step_config,
                success=result_data.get("success", False),
                data=result_data,
                error=result_data.get("error") if not result_data.get("success") else None,
                output=extract_primary_output(service_name, event_type, result_data)
            )
            step_result["duration_seconds"] = execution_time
            
            # Update state
            updated_state = update_workflow_state(state, step_result=step_result)
            
            # Check if step failed
            if not result_data.get("success", False):
                # Handle step failure
                if state["retry_count"] < state["max_retries"]:
                    updated_state["retry_count"] += 1
                    updated_state["should_continue"] = True  # Retry the same step
                else:
                    updated_state["should_continue"] = False
                    updated_state["execution_status"] = "failed"
                    updated_state["error"] = f"Step {current_step + 1} failed: {result_data.get('error', 'Unknown error')}"
            
            return updated_state
            
        except Exception as tool_error:
            # Tool execution failed
            execution_time = (datetime.now() - step_start_time).total_seconds()
            
            step_result = create_step_result(
                step_config=step_config,
                success=False,
                error=str(tool_error)
            )
            step_result["duration_seconds"] = execution_time
            
            updated_state = update_workflow_state(state, step_result=step_result)
            
            if state["retry_count"] < state["max_retries"]:
                updated_state["retry_count"] += 1
                updated_state["should_continue"] = True
            else:
                updated_state["should_continue"] = False
                updated_state["execution_status"] = "failed"
                updated_state["error"] = f"Step {current_step + 1} failed: {str(tool_error)}"
            
            return updated_state
            
    except Exception as e:
        error_msg = f"Failed to execute workflow step: {str(e)}"
        return update_workflow_state(
            state,
            error=error_msg,
            should_continue=False,
            status="failed"
        )


async def handle_ai_processing(state: WorkflowState) -> WorkflowState:
    """Special handling for AI processing steps"""
    # This node can be used for complex AI orchestration
    # For now, it's handled in the regular step execution
    return state


async def handle_error(state: WorkflowState) -> WorkflowState:
    """Handle workflow errors and cleanup"""
    try:
        supabase = get_supabase()
        
        # Update zap with error information
        supabase.table("zaps").update({
            "last_run_at": datetime.now().isoformat(),
            "total_runs": state.get("zap_config", {}).get("total_runs", 0) + 1
        }).eq("id", state["zap_id"]).execute()
        
        # Log error for debugging
        print(f"Workflow {state['zap_id']} failed: {state.get('error', 'Unknown error')}")
        
        return update_workflow_state(state, status="failed")
        
    except Exception as e:
        print(f"Error handling failed: {str(e)}")
        return state


async def finalize_execution(state: WorkflowState) -> WorkflowState:
    """Finalize workflow execution and update statistics"""
    try:
        supabase = get_supabase()
        
        # Calculate execution statistics
        total_duration = 0
        successful_steps = 0
        failed_steps = 0
        
        for result in state["step_results"]:
            total_duration += result.get("duration_seconds", 0)
            if result["success"]:
                successful_steps += 1
            else:
                failed_steps += 1
        
        # Update zap statistics
        zap_config = state.get("zap_config", {})
        supabase.table("zaps").update({
            "last_run_at": datetime.now().isoformat(),
            "total_runs": zap_config.get("total_runs", 0) + 1
        }).eq("id", state["zap_id"]).execute()
        
        # Create execution log
        execution_log = {
            "zap_id": state["zap_id"],
            "user_id": state["user_id"],
            "started_at": state["started_at"],
            "completed_at": datetime.now().isoformat(),
            "total_duration_seconds": total_duration,
            "successful_steps": successful_steps,
            "failed_steps": failed_steps,
            "status": "completed",
            "step_results": state["step_results"]
        }
        
        # Store execution log (optional - depends on your logging requirements)
        # supabase.table("workflow_executions").insert(execution_log).execute()
        
        return update_workflow_state(state, status="completed")
        
    except Exception as e:
        error_msg = f"Failed to finalize execution: {str(e)}"
        return update_workflow_state(
            state,
            error=error_msg,
            status="failed"
        )


# Chat workflow nodes
async def analyze_user_intent(state: ChatState) -> ChatState:
    """Analyze user intent for workflow creation"""
    # This would use LangChain LLM to analyze intent
    # For now, simple keyword matching
    user_message = state["user_message"].lower()
    
    intent = None
    required_services = []
    
    # Simple intent detection
    if any(word in user_message for word in ["gmail", "email"]):
        required_services.append("gmail")
    if any(word in user_message for word in ["notion"]):
        required_services.append("notion")
    if any(word in user_message for word in ["telegram"]):
        required_services.append("telegram")
    if any(word in user_message for word in ["ai", "process", "analyze", "summarize"]):
        required_services.append("ai")
    
    if len(required_services) >= 2:
        intent = "create_workflow"
    elif len(required_services) == 1:
        intent = "single_service_action"
    else:
        intent = "general_question"
    
    updated_state = state.copy()
    updated_state["workflow_intent"] = intent
    updated_state["required_services"] = required_services
    
    return updated_state


async def check_user_integrations(state: ChatState) -> ChatState:
    """Check if user has required integrations"""
    try:
        supabase = get_supabase()
        user_id = state["user_id"]
        
        # Get user's integrations
        result = supabase.table("integrations").select("service_name").eq("user_id", user_id).execute()
        
        user_services = {integration["service_name"] for integration in (result.data or [])}
        required_services = set(state["required_services"])
        
        missing_integrations = list(required_services - user_services)
        
        updated_state = state.copy()
        updated_state["missing_integrations"] = missing_integrations
        
        return updated_state
        
    except Exception as e:
        updated_state = state.copy()
        updated_state["missing_integrations"] = state["required_services"]  # Assume all missing on error
        return updated_state


async def generate_bot_response(state: ChatState) -> ChatState:
    """Generate bot response using LangChain LLM"""
    # This would use the chat-bot logic with LangChain
    # For now, simple response generation
    
    if state["missing_integrations"]:
        bot_response = f"To create this workflow, you need to connect these services first: {', '.join(state['missing_integrations'])}"
    elif state["workflow_intent"] == "create_workflow":
        bot_response = "I can help you create that workflow! Let me gather some more details..."
    else:
        bot_response = "How can I help you with your automation needs?"
    
    updated_state = state.copy()
    updated_state["bot_response"] = bot_response
    
    return updated_state


# Helper functions
def process_step_configuration(
    config: Dict[str, Any], 
    variables: Dict[str, Any], 
    step_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Process step configuration by replacing template variables"""
    processed_config = {}
    
    for key, value in config.items():
        if isinstance(value, str):
            processed_value = value
            
            # Replace variables
            for var_name, var_value in variables.items():
                placeholder = f"{{{{{var_name}}}}}"
                processed_value = processed_value.replace(placeholder, str(var_value))
            
            # Replace step outputs
            for i, result in enumerate(step_results):
                if result["success"] and result["output"]:
                    step_placeholder = f"{{{{steps.{i+1}.output}}}}"
                    processed_value = processed_value.replace(step_placeholder, str(result["output"]))
            
            processed_config[key] = processed_value
        else:
            processed_config[key] = value
    
    return processed_config


def extract_primary_output(service_name: str, event_type: str, result_data: Dict[str, Any]) -> Any:
    """Extract primary output from service result for template variables"""
    if not result_data.get("success"):
        return None
    
    data = result_data.get("data", {})
    
    if service_name == "gmail":
        if event_type == "fetch":
            emails = data.get("emails", [])
            return emails[0] if emails else None
        elif event_type in ["send", "reply"]:
            return data.get("message_id")
    
    elif service_name == "ai" and event_type == "process":
        return data.get("content")
    
    elif service_name == "notion" and event_type == "create_page":
        page = data.get("page", {})
        return page.get("id")
    
    elif service_name == "telegram" and event_type == "send":
        return data.get("successful_sends", 0)
    
    # Default: return the whole data object
    return data
