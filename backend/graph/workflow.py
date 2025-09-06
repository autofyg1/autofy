"""
Main LangGraph workflow definitions for Autofy
"""
from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools import get_all_tools
from .state import WorkflowState, ChatState
from .nodes import (
    # Workflow execution nodes
    fetch_zap_config,
    prepare_execution_context,
    execute_workflow_step,
    handle_ai_processing,
    handle_error,
    finalize_execution,
    # Chat nodes
    analyze_user_intent,
    check_user_integrations,
    generate_bot_response
)


def determine_next_workflow_step(state: WorkflowState) -> str:
    """Determine the next step in workflow execution"""
    # Check if workflow should continue
    if not state["should_continue"]:
        if state["execution_status"] == "failed":
            return "error"
        else:
            return "finish"
    
    # Check if all steps are completed
    if state["current_step"] >= state["total_steps"]:
        return "finish"
    
    # Check if current step needs special AI processing
    action_steps = state.get("action_steps", [])
    if state["current_step"] < len(action_steps):
        current_step = action_steps[state["current_step"]]
        if current_step["service_name"] in ["ai", "openrouter"]:
            return "ai_processing"
    
    # Continue with regular step execution
    return "continue"


def determine_chat_next_step(state: ChatState) -> str:
    """Determine next step in chat workflow"""
    if state["missing_integrations"]:
        return "respond"
    elif state["workflow_intent"] == "create_workflow":
        return "create_workflow" 
    else:
        return "respond"


def create_workflow_execution_graph() -> StateGraph:
    """Create the main workflow execution graph"""
    
    # Initialize tools and tool executor
    tools = get_all_tools()
    tool_executor = ToolExecutor(tools)
    
    # Create the workflow graph
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("fetch_config", fetch_zap_config)
    workflow.add_node("prepare_context", prepare_execution_context)
    workflow.add_node("execute_step", lambda state: execute_workflow_step(state, tool_executor))
    workflow.add_node("ai_processing", handle_ai_processing)
    workflow.add_node("handle_error", handle_error)
    workflow.add_node("finalize", finalize_execution)
    
    # Define the workflow flow
    workflow.set_entry_point("fetch_config")
    
    # Sequential flow for initial setup
    workflow.add_edge("fetch_config", "prepare_context")
    workflow.add_edge("prepare_context", "execute_step")
    
    # Conditional edges for workflow control
    workflow.add_conditional_edges(
        "execute_step",
        determine_next_workflow_step,
        {
            "continue": "execute_step",      # Continue to next step
            "ai_processing": "ai_processing", # Special AI processing
            "error": "handle_error",         # Handle errors
            "finish": "finalize"             # Finalize execution
        }
    )
    
    # AI processing flows back to step execution
    workflow.add_edge("ai_processing", "execute_step")
    
    # Terminal nodes
    workflow.add_edge("handle_error", END)
    workflow.add_edge("finalize", END)
    
    return workflow


def create_chat_workflow_graph() -> StateGraph:
    """Create the chat workflow creation graph"""
    
    # Create the chat workflow graph
    chat_workflow = StateGraph(ChatState)
    
    # Add nodes
    chat_workflow.add_node("analyze_intent", analyze_user_intent)
    chat_workflow.add_node("check_integrations", check_user_integrations)
    chat_workflow.add_node("generate_response", generate_bot_response)
    # Note: create_workflow_node would be added here for full implementation
    
    # Define the workflow flow
    chat_workflow.set_entry_point("analyze_intent")
    
    # Sequential flow
    chat_workflow.add_edge("analyze_intent", "check_integrations")
    
    # Conditional edges based on user needs
    chat_workflow.add_conditional_edges(
        "check_integrations",
        determine_chat_next_step,
        {
            "respond": "generate_response",
            "create_workflow": "generate_response",  # Simplified for now
        }
    )
    
    # Terminal node
    chat_workflow.add_edge("generate_response", END)
    
    return chat_workflow


def create_comprehensive_workflow_graph() -> StateGraph:
    """Create a comprehensive workflow graph with both execution and chat capabilities"""
    
    # This could be extended to handle both workflow execution and chat in one graph
    # For now, we'll use separate graphs for different purposes
    return create_workflow_execution_graph()


class WorkflowManager:
    """Manager class for workflow graphs"""
    
    def __init__(self):
        self.execution_graph = None
        self.chat_graph = None
        self._compiled_graphs = {}
    
    def get_execution_workflow(self) -> StateGraph:
        """Get compiled workflow execution graph"""
        if "execution" not in self._compiled_graphs:
            graph = create_workflow_execution_graph()
            self._compiled_graphs["execution"] = graph.compile()
        return self._compiled_graphs["execution"]
    
    def get_chat_workflow(self) -> StateGraph:
        """Get compiled chat workflow graph"""
        if "chat" not in self._compiled_graphs:
            graph = create_chat_workflow_graph()
            self._compiled_graphs["chat"] = graph.compile()
        return self._compiled_graphs["chat"]
    
    async def execute_workflow(self, user_id: str, zap_id: str, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a workflow"""
        from .state import create_initial_workflow_state
        
        # Create initial state
        initial_state = create_initial_workflow_state(user_id, zap_id, trigger_data)
        
        # Get compiled workflow
        workflow = self.get_execution_workflow()
        
        # Execute workflow
        result = await workflow.ainvoke(initial_state)
        
        return result
    
    async def process_chat_message(self, user_id: str, session_id: str, message: str) -> Dict[str, Any]:
        """Process a chat message for workflow creation"""
        from .state import create_initial_chat_state
        
        # Create initial state
        initial_state = create_initial_chat_state(user_id, session_id, message)
        
        # Get compiled chat workflow
        chat_workflow = self.get_chat_workflow()
        
        # Execute chat workflow
        result = await chat_workflow.ainvoke(initial_state)
        
        return result
    
    def get_workflow_status(self) -> Dict[str, Any]:
        """Get status of workflow manager"""
        return {
            "compiled_graphs": list(self._compiled_graphs.keys()),
            "available_tools": len(get_all_tools()),
            "workflow_types": ["execution", "chat"]
        }


# Global workflow manager instance
workflow_manager = WorkflowManager()


# Convenience functions
async def execute_zap_workflow(user_id: str, zap_id: str, trigger_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute a zap workflow"""
    if trigger_data is None:
        trigger_data = {}
    
    return await workflow_manager.execute_workflow(user_id, zap_id, trigger_data)


async def process_chat_for_workflow_creation(user_id: str, session_id: str, message: str) -> Dict[str, Any]:
    """Process chat message for workflow creation"""
    return await workflow_manager.process_chat_message(user_id, session_id, message)


def get_workflow_manager() -> WorkflowManager:
    """Get the global workflow manager"""
    return workflow_manager


# Export main functions
__all__ = [
    'WorkflowManager',
    'workflow_manager',
    'execute_zap_workflow',
    'process_chat_for_workflow_creation',
    'get_workflow_manager',
    'create_workflow_execution_graph',
    'create_chat_workflow_graph'
]
