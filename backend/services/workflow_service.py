"""
Workflow service for managing workflows and executions
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import json
from supabase import Client
from config.database import Workflow, WorkflowStep, WorkflowExecution


class WorkflowService:
    """Service for managing workflows and their executions"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def get_workflows(self, user_id: str, status: Optional[str] = None) -> List[Workflow]:
        """Get user workflows, optionally filtered by status"""
        try:
            query = self.supabase.table('workflows').select('*').eq('user_id', user_id).order('updated_at', desc=True)
            
            if status:
                query = query.eq('status', status)
            
            result = query.execute()
            workflows = []
            
            for workflow_data in result.data:
                # Parse trigger_config JSON if it's a string
                # tags is already an array from PostgreSQL, no need to parse
                if isinstance(workflow_data.get('trigger_config'), str):
                    workflow_data['trigger_config'] = json.loads(workflow_data['trigger_config'])
                
                workflows.append(Workflow(**workflow_data))
            
            return workflows
            
        except Exception as e:
            print(f"Error fetching workflows for user {user_id}: {e}")
            return []
    
    async def get_workflow(self, workflow_id: str, user_id: str) -> Optional[Workflow]:
        """Get specific workflow by ID"""
        try:
            result = self.supabase.table('workflows').select('*').eq('id', workflow_id).eq('user_id', user_id).single().execute()
            
            if result.data:
                workflow_data = result.data
                # Parse JSON fields
                # tags is already an array from PostgreSQL, no need to parse
                if isinstance(workflow_data.get('trigger_config'), str):
                    workflow_data['trigger_config'] = json.loads(workflow_data['trigger_config'])
                
                return Workflow(**workflow_data)
            return None
            
        except Exception as e:
            print(f"Error fetching workflow {workflow_id}: {e}")
            return None
    
    async def create_workflow(self, user_id: str, name: str, description: str = None, 
                            trigger_type: str = 'manual', trigger_config: Dict[str, Any] = None,
                            tags: List[str] = None, is_active: bool = False, created_from_chat: bool = False,
                            chat_session_id: str = None) -> Workflow:
        """Create a new workflow"""
        now = datetime.now(timezone.utc)
        workflow_id = str(uuid.uuid4())
        
        workflow_data = {
            'id': workflow_id,
            'user_id': user_id,
            'name': name,
            'description': description,
            'status': 'draft',
            'trigger_type': trigger_type,
            'trigger_config': json.dumps(trigger_config or {}),
            'tags': tags or [],  # PostgreSQL will handle the array conversion
            'is_active': is_active,
            'total_executions': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'last_executed_at': None,
            'created_from_chat': created_from_chat,
            'chat_session_id': chat_session_id,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        try:
            result = self.supabase.table('workflows').insert(workflow_data).execute()
            created_workflow = result.data[0]
            
            # Convert JSON strings back to proper types
            # tags is already an array from PostgreSQL, no need to parse
            created_workflow['trigger_config'] = json.loads(created_workflow['trigger_config'])
            
            return Workflow(**created_workflow)
            
        except Exception as e:
            print(f"Error creating workflow: {e}")
            raise
    
    async def update_workflow(self, workflow_id: str, user_id: str, updates: Dict[str, Any]) -> Workflow:
        """Update workflow"""
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert complex fields to JSON strings for storage
        if 'trigger_config' in updates:
            updates['trigger_config'] = json.dumps(updates['trigger_config'])
        # tags is handled as a PostgreSQL array, no need to convert to JSON
        
        try:
            result = self.supabase.table('workflows').update(updates).eq('id', workflow_id).eq('user_id', user_id).execute()
            updated_workflow = result.data[0]
            
            # Convert JSON strings back to proper types
            # tags is already an array from PostgreSQL, no need to parse
            if isinstance(updated_workflow.get('trigger_config'), str):
                updated_workflow['trigger_config'] = json.loads(updated_workflow['trigger_config'])
            
            return Workflow(**updated_workflow)
            
        except Exception as e:
            print(f"Error updating workflow: {e}")
            raise
    
    async def delete_workflow(self, workflow_id: str, user_id: str) -> bool:
        """Delete workflow and its steps"""
        try:
            # Delete workflow steps first
            self.supabase.table('workflow_steps').delete().eq('workflow_id', workflow_id).execute()
            
            # Delete workflow
            result = self.supabase.table('workflows').delete().eq('id', workflow_id).eq('user_id', user_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error deleting workflow: {e}")
            return False
    
    async def get_workflow_steps(self, workflow_id: str) -> List[WorkflowStep]:
        """Get workflow steps in order"""
        try:
            result = self.supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).order('step_order').execute()
            
            steps = []
            for step_data in result.data:
                # Parse JSON fields
                if isinstance(step_data.get('configuration'), str):
                    step_data['configuration'] = json.loads(step_data['configuration'])
                if isinstance(step_data.get('conditions'), str):
                    step_data['conditions'] = json.loads(step_data['conditions'])
                if isinstance(step_data.get('error_handling'), str):
                    step_data['error_handling'] = json.loads(step_data['error_handling'])
                
                steps.append(WorkflowStep(**step_data))
            
            return steps
            
        except Exception as e:
            print(f"Error fetching workflow steps for {workflow_id}: {e}")
            return []
    
    async def update_workflow_status(self, workflow_id: str, is_active: bool) -> bool:
        """Update workflow active status"""
        try:
            # Update both is_active and status fields for consistency
            status_value = 'active' if is_active else 'paused'
            
            result = self.supabase.table('workflows').update({
                'is_active': is_active,
                'status': status_value,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', workflow_id).execute()
            
            return len(result.data) > 0
        except Exception as e:
            print(f"Error updating workflow status: {e}")
            return False

    async def create_workflow_step(self, workflow_id: str, step_order: int, step_type: str,
                                 service_name: str, action_name: str, configuration: Dict[str, Any],
                                 conditions: Dict[str, Any] = None, error_handling: Dict[str, Any] = None) -> WorkflowStep:
        """Create a new workflow step"""
        now = datetime.now(timezone.utc)
        step_id = str(uuid.uuid4())
        
        step_data = {
            'id': step_id,
            'workflow_id': workflow_id,
            'step_order': step_order,
            'step_type': step_type,
            'service_name': service_name,
            'action_name': action_name,
            'configuration': json.dumps(configuration),
            'conditions': json.dumps(conditions or {}),
            'error_handling': json.dumps(error_handling or {"retry": True, "max_retries": 3}),
            'is_enabled': True,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        try:
            result = self.supabase.table('workflow_steps').insert(step_data).execute()
            created_step = result.data[0]
            
            # Convert JSON strings back to dicts
            created_step['configuration'] = json.loads(created_step['configuration'])
            created_step['conditions'] = json.loads(created_step['conditions'])
            created_step['error_handling'] = json.loads(created_step['error_handling'])
            
            return WorkflowStep(**created_step)
            
        except Exception as e:
            print(f"Error creating workflow step: {e}")
            raise

    async def update_workflow_step(self, step_id: str, updates: Dict[str, Any]) -> Optional[WorkflowStep]:
        """Update a workflow step"""
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert complex fields to JSON strings for storage
        if 'configuration' in updates:
            updates['configuration'] = json.dumps(updates['configuration'])
        if 'conditions' in updates:
            updates['conditions'] = json.dumps(updates['conditions'])
        if 'error_handling' in updates:
            updates['error_handling'] = json.dumps(updates['error_handling'])
        
        try:
            result = self.supabase.table('workflow_steps').update(updates).eq('id', step_id).execute()
            
            if result.data:
                updated_step = result.data[0]
                
                # Convert JSON strings back to proper types
                if isinstance(updated_step.get('configuration'), str):
                    updated_step['configuration'] = json.loads(updated_step['configuration'])
                if isinstance(updated_step.get('conditions'), str):
                    updated_step['conditions'] = json.loads(updated_step['conditions'])
                if isinstance(updated_step.get('error_handling'), str):
                    updated_step['error_handling'] = json.loads(updated_step['error_handling'])
                
                return WorkflowStep(**updated_step)
            return None
            
        except Exception as e:
            print(f"Error updating workflow step {step_id}: {e}")
            raise
    
    async def update_workflow_statistics(self, workflow_id: str, execution_status: str) -> None:
        """Update workflow execution statistics"""
        try:
            # Get current workflow stats directly without user_id filter to avoid RLS issues
            result = self.supabase.table('workflows').select('total_executions, successful_executions, failed_executions').eq('id', workflow_id).single().execute()
            
            if not result.data:
                print(f"Workflow {workflow_id} not found for statistics update")
                return
            
            current_stats = result.data
            
            updates = {
                'total_executions': (current_stats.get('total_executions', 0) or 0) + 1,
                'last_executed_at': datetime.now(timezone.utc).isoformat()
            }
            
            if execution_status == 'completed':
                updates['successful_executions'] = (current_stats.get('successful_executions', 0) or 0) + 1
            elif execution_status == 'failed':
                updates['failed_executions'] = (current_stats.get('failed_executions', 0) or 0) + 1
            
            self.supabase.table('workflows').update(updates).eq('id', workflow_id).execute()
            
        except Exception as e:
            print(f"Error updating workflow statistics: {e}")
    
    async def create_execution(self, workflow_id: str, user_id: str, trigger_data: Dict[str, Any] = None) -> WorkflowExecution:
        """Create a new workflow execution"""
        now = datetime.now(timezone.utc)
        execution_id = str(uuid.uuid4())
        
        # Get workflow steps count
        steps = await self.get_workflow_steps(workflow_id)
        
        execution_data = {
            'id': execution_id,
            'workflow_id': workflow_id,
            'user_id': user_id,
            'trigger_data': json.dumps(trigger_data or {}),
            'execution_status': 'running',
            'started_at': now.isoformat(),
            'completed_at': None,
            'total_steps': len(steps),
            'completed_steps': 0,
            'failed_steps': 0,
            'step_results': json.dumps([]),
            'error_message': None,
            'error_step_id': None,
            'metadata': json.dumps({}),
            'credits_used': 0
        }
        
        try:
            result = self.supabase.table('workflow_executions').insert(execution_data).execute()
            created_execution = result.data[0]
            
            # Convert JSON strings back to proper types
            created_execution['trigger_data'] = json.loads(created_execution['trigger_data'])
            created_execution['step_results'] = json.loads(created_execution['step_results'])
            created_execution['metadata'] = json.loads(created_execution['metadata'])
            
            return WorkflowExecution(**created_execution)
            
        except Exception as e:
            print(f"Error creating workflow execution: {e}")
            raise
    
    async def update_execution(self, execution_id: str, updates: Dict[str, Any]) -> Optional[WorkflowExecution]:
        """Update workflow execution"""
        # Convert complex fields to JSON strings for storage
        if 'trigger_data' in updates:
            updates['trigger_data'] = json.dumps(updates['trigger_data'])
        if 'step_results' in updates:
            updates['step_results'] = json.dumps(updates['step_results'])
        if 'metadata' in updates:
            updates['metadata'] = json.dumps(updates['metadata'])
        
        try:
            result = self.supabase.table('workflow_executions').update(updates).eq('id', execution_id).execute()
            
            if not result.data:
                print(f"No execution found with ID {execution_id}")
                return None
                
            updated_execution = result.data[0]
            
            # Convert JSON strings back to proper types
            if isinstance(updated_execution.get('trigger_data'), str):
                updated_execution['trigger_data'] = json.loads(updated_execution['trigger_data'])
            if isinstance(updated_execution.get('step_results'), str):
                updated_execution['step_results'] = json.loads(updated_execution['step_results'])
            if isinstance(updated_execution.get('metadata'), str):
                updated_execution['metadata'] = json.loads(updated_execution['metadata'])
            
            return WorkflowExecution(**updated_execution)
            
        except Exception as e:
            print(f"Error updating workflow execution: {e}")
            return None
    
    async def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get workflow execution by ID"""
        try:
            result = self.supabase.table('workflow_executions').select('*').eq('id', execution_id).single().execute()
            
            if result.data:
                execution_data = result.data
                # Parse JSON fields
                if isinstance(execution_data.get('trigger_data'), str):
                    execution_data['trigger_data'] = json.loads(execution_data['trigger_data'])
                if isinstance(execution_data.get('step_results'), str):
                    execution_data['step_results'] = json.loads(execution_data['step_results'])
                if isinstance(execution_data.get('metadata'), str):
                    execution_data['metadata'] = json.loads(execution_data['metadata'])
                
                return WorkflowExecution(**execution_data)
            return None
            
        except Exception as e:
            print(f"Error fetching workflow execution {execution_id}: {e}")
            return None
    
    async def get_workflow_executions(self, workflow_id: str, limit: int = 50) -> List[WorkflowExecution]:
        """Get workflow executions"""
        try:
            result = self.supabase.table('workflow_executions').select('*').eq('workflow_id', workflow_id).order('started_at', desc=True).limit(limit).execute()
            
            executions = []
            for execution_data in result.data:
                # Parse JSON fields
                if isinstance(execution_data.get('trigger_data'), str):
                    execution_data['trigger_data'] = json.loads(execution_data['trigger_data'])
                if isinstance(execution_data.get('step_results'), str):
                    execution_data['step_results'] = json.loads(execution_data['step_results'])
                if isinstance(execution_data.get('metadata'), str):
                    execution_data['metadata'] = json.loads(execution_data['metadata'])
                
                executions.append(WorkflowExecution(**execution_data))
            
            return executions
            
        except Exception as e:
            print(f"Error fetching workflow executions for {workflow_id}: {e}")
            return []
    
    async def log_execution_step(self, execution_id: str, step_id: str, status: str, result: Dict[str, Any] = None, error_message: str = None) -> None:
        """Log the execution step result"""
        try:
            # Get current execution to update step counts
            execution = await self.get_execution(execution_id)
            if not execution:
                print(f"Execution {execution_id} not found for step logging")
                return
            
            # Update step counts
            updates = {}
            if status == 'completed':
                updates['completed_steps'] = execution.completed_steps + 1
            elif status == 'failed':
                updates['failed_steps'] = execution.failed_steps + 1
                if error_message:
                    updates['error_message'] = error_message
                    updates['error_step_id'] = step_id
            
            # Add result to step_results if provided
            if result:
                current_results = execution.step_results or []
                current_results.append({
                    'step_id': step_id,
                    'status': status,
                    'result': result,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
                updates['step_results'] = json.dumps(current_results)
            
            # Update execution
            await self.update_execution(execution_id, updates)
            
        except Exception as e:
            print(f"Error logging execution step: {e}")
    
    async def update_execution_status(self, execution_id: str, status: str, error_message: str = None) -> None:
        """Update execution status"""
        try:
            updates = {
                'execution_status': status
            }
            
            if status in ['completed', 'failed']:
                updates['completed_at'] = datetime.now(timezone.utc).isoformat()
            
            if error_message:
                updates['error_message'] = error_message
            
            await self.update_execution(execution_id, updates)
            
        except Exception as e:
            print(f"Error updating execution status: {e}")
    
    async def update_workflow_stats(self, workflow_id: str, execution_status: str) -> None:
        """Update workflow execution statistics"""
        await self.update_workflow_statistics(workflow_id, execution_status)
    
    async def get_executions(self, workflow_id: str, limit: int = 50) -> List[WorkflowExecution]:
        """Get workflow executions - alias for get_workflow_executions"""
        return await self.get_workflow_executions(workflow_id, limit)
