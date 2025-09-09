"""
Comprehensive Workflow Execution System
Handles continuous monitoring and execution of user workflows
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import uuid
from supabase import Client

from .workflow_executor import WorkflowExecutor
from models.workflow import Workflow, WorkflowStep, WorkflowExecution, WorkflowExecutionStatus

logger = logging.getLogger(__name__)

class WorkflowMonitor:
    """
    Monitors and executes active workflows continuously
    """
    
    def __init__(self, supabase: Client, workflow_executor: WorkflowExecutor):
        self.supabase = supabase
        self.workflow_executor = workflow_executor
        self.running_workflows: Dict[str, asyncio.Task] = {}
        self.execution_logs: List[Dict[str, Any]] = []
        self.monitoring_active = False
        
    async def start_monitoring(self):
        """Start the workflow monitoring system"""
        logger.info("🚀 Starting Workflow Monitor...")
        self.monitoring_active = True
        
        # Start monitoring loop
        monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        logger.info("✅ Workflow Monitor started successfully")
        return monitoring_task
    
    async def stop_monitoring(self):
        """Stop the workflow monitoring system"""
        logger.info("🛑 Stopping Workflow Monitor...")
        self.monitoring_active = False
        
        # Stop all running workflows
        for workflow_id, task in self.running_workflows.items():
            task.cancel()
            logger.info(f"Stopped workflow execution: {workflow_id}")
        
        self.running_workflows.clear()
        logger.info("✅ Workflow Monitor stopped successfully")
    
    async def _monitoring_loop(self):
        """Main monitoring loop that checks for active workflows"""
        while self.monitoring_active:
            try:
                # Get all active workflows
                active_workflows = await self._get_active_workflows()
                
                # Check each workflow
                for workflow in active_workflows:
                    workflow_id = workflow['id']
                    
                    # If workflow is not currently running, start it
                    if workflow_id not in self.running_workflows:
                        task = asyncio.create_task(
                            self._execute_workflow_continuously(workflow)
                        )
                        self.running_workflows[workflow_id] = task
                        
                        self._log_execution(
                            workflow_id=workflow_id,
                            user_id=workflow['user_id'],
                            level="INFO",
                            message=f"Started continuous execution for workflow: {workflow['name']}"
                        )
                
                # Remove stopped workflows
                stopped_workflows = []
                for workflow_id, task in self.running_workflows.items():
                    if task.done() or task.cancelled():
                        stopped_workflows.append(workflow_id)
                
                for workflow_id in stopped_workflows:
                    del self.running_workflows[workflow_id]
                
                # Wait before next check
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _get_active_workflows(self) -> List[Dict[str, Any]]:
        """Get all active workflows from database"""
        try:
            # Query for workflows that are either status='active' OR is_active=true
            response = self.supabase.table('workflows').select('*').or_('status.eq.active,is_active.eq.true').execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to get active workflows: {e}")
            return []
    
    async def _execute_workflow_continuously(self, workflow: Dict[str, Any]):
        """Continuously execute a specific workflow"""
        workflow_id = workflow['id']
        user_id = workflow['user_id']
        
        try:
            # Get workflow steps
            steps_response = self.supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).order('step_order').execute()
            steps = steps_response.data
            
            if not steps:
                self._log_execution(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    level="WARNING",
                    message="No steps found for workflow"
                )
                return
            
            # Find trigger step
            trigger_step = next((step for step in steps if step['step_type'] == 'trigger'), None)
            if not trigger_step:
                self._log_execution(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    level="ERROR",
                    message="No trigger step found for workflow"
                )
                return
            
            # Execute based on trigger type
            if trigger_step['service_name'] == 'gmail':
                await self._execute_gmail_workflow(workflow, steps, trigger_step)
            elif trigger_step['service_name'] == 'telegram':
                await self._execute_telegram_workflow(workflow, steps, trigger_step)
            else:
                self._log_execution(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    level="WARNING",
                    message=f"Unsupported trigger service: {trigger_step['service_name']}"
                )
        
        except asyncio.CancelledError:
            self._log_execution(
                workflow_id=workflow_id,
                user_id=user_id,
                level="INFO",
                message="Workflow execution cancelled"
            )
        except Exception as e:
            self._log_execution(
                workflow_id=workflow_id,
                user_id=user_id,
                level="ERROR",
                message=f"Workflow execution failed: {str(e)}"
            )
    
    async def _execute_gmail_workflow(self, workflow: Dict[str, Any], steps: List[Dict[str, Any]], trigger_step: Dict[str, Any]):
        """Execute Gmail-triggered workflow"""
        workflow_id = workflow['id']
        user_id = workflow['user_id']
        
        # Get user's Gmail integration
        gmail_integration = await self._get_user_integration(user_id, 'gmail')
        if not gmail_integration:
            self._log_execution(
                workflow_id=workflow_id,
                user_id=user_id,
                level="ERROR",
                message="Gmail integration not found for user"
            )
            return
        
        last_check = datetime.now() - timedelta(hours=24)  # Start checking from 24 hours ago to catch existing emails
        
        while self.monitoring_active:
            try:
                # Check for new emails
                trigger_config = trigger_step.get('configuration', {})
                
                # Parse configuration if it's a JSON string
                if isinstance(trigger_config, str):
                    try:
                        trigger_config = json.loads(trigger_config)
                    except (json.JSONDecodeError, TypeError):
                        self._log_execution(
                            workflow_id=workflow_id,
                            user_id=user_id,
                            level="ERROR",
                            message=f"Invalid trigger configuration format: {trigger_config}"
                        )
                        return
                
                # Ensure trigger_config is a dict
                if not isinstance(trigger_config, dict):
                    trigger_config = {}
                
                keywords = trigger_config.get('keywords', '')
                from_email = trigger_config.get('from_email', '')
                subject_contains = trigger_config.get('subject_contains', '')
                
                self._log_execution(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    level="INFO",
                    message=f"Checking Gmail for new emails with keywords: '{keywords}'"
                )
                
                # Use workflow executor to check emails
                new_emails = await self.workflow_executor.check_gmail_emails(
                    user_id=user_id,
                    keywords=keywords,
                    from_email=from_email,
                    subject_contains=subject_contains,
                    since=last_check
                )
                
                if new_emails:
                    self._log_execution(
                        workflow_id=workflow_id,
                        user_id=user_id,
                        level="SUCCESS",
                        message=f"Found {len(new_emails)} new emails matching criteria"
                    )
                    
                    # Process each email
                    for email in new_emails:
                        execution_id = str(uuid.uuid4())
                        
                        try:
                            # Execute workflow for this email
                            result = await self.workflow_executor.execute_workflow_steps(
                                workflow_id=workflow_id,
                                steps=steps,
                                trigger_data=email,
                                execution_id=execution_id
                            )
                            
                            if result['success']:
                                # Update workflow execution count
                                await self._update_workflow_execution_count(workflow_id)
                                
                                self._log_execution(
                                    workflow_id=workflow_id,
                                    user_id=user_id,
                                    level="SUCCESS",
                                    message=f"Workflow executed successfully for email: {email.get('subject', 'No subject')}",
                                    execution_id=execution_id
                                )
                            else:
                                self._log_execution(
                                    workflow_id=workflow_id,
                                    user_id=user_id,
                                    level="ERROR",
                                    message=f"Workflow execution failed: {result.get('error', 'Unknown error')}",
                                    execution_id=execution_id
                                )
                        
                        except Exception as e:
                            self._log_execution(
                                workflow_id=workflow_id,
                                user_id=user_id,
                                level="ERROR",
                                message=f"Failed to execute workflow for email: {str(e)}",
                                execution_id=execution_id
                            )
                
                last_check = datetime.now()
                
                # Wait before next check (check every 2 minutes for Gmail)
                await asyncio.sleep(120)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._log_execution(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    level="ERROR",
                    message=f"Error in Gmail workflow execution: {str(e)}"
                )
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def _execute_telegram_workflow(self, workflow: Dict[str, Any], steps: List[Dict[str, Any]], trigger_step: Dict[str, Any]):
        """Execute Telegram-triggered workflow"""
        workflow_id = workflow['id']
        user_id = workflow['user_id']
        
        # Similar implementation for Telegram
        # This would check for new Telegram messages and execute workflow
        self._log_execution(
            workflow_id=workflow_id,
            user_id=user_id,
            level="INFO",
            message="Telegram workflow execution not yet implemented"
        )
    
    async def _get_user_integration(self, user_id: str, service_name: str) -> Optional[Dict[str, Any]]:
        """Get user's integration for a specific service"""
        try:
            response = self.supabase.table('integrations').select('*').eq('user_id', user_id).eq('service_name', service_name).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to get user integration: {e}")
            return None
    
    async def _update_workflow_execution_count(self, workflow_id: str):
        """Update workflow execution count and last run time"""
        try:
            # Get current workflow
            response = self.supabase.table('workflows').select('total_executions').eq('id', workflow_id).execute()
            current_count = response.data[0]['total_executions'] if response.data else 0
            
            # Update count and timestamp
            self.supabase.table('workflows').update({
                'total_executions': (current_count or 0) + 1,
                'last_executed_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }).eq('id', workflow_id).execute()
            
        except Exception as e:
            logger.error(f"Failed to update workflow execution count: {e}")
    
    def _log_execution(self, workflow_id: str, user_id: str, level: str, message: str, execution_id: Optional[str] = None):
        """Log workflow execution details"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'workflow_id': workflow_id,
            'user_id': user_id,
            'execution_id': execution_id,
            'level': level,
            'message': message
        }
        
        self.execution_logs.append(log_entry)
        
        # Keep only last 1000 logs
        if len(self.execution_logs) > 1000:
            self.execution_logs = self.execution_logs[-1000:]
        
        # Also log to console
        if level == "SUCCESS":
            logger.info(f"✅ {message} [Workflow: {workflow_id}] [User: {user_id}]")
        elif level == "ERROR":
            logger.error(f"❌ {message} [Workflow: {workflow_id}] [User: {user_id}]")
        elif level == "WARNING":
            logger.warning(f"⚠️ {message} [Workflow: {workflow_id}] [User: {user_id}]")
        else:
            logger.info(f"ℹ️ {message} [Workflow: {workflow_id}] [User: {user_id}]")
        
        # Save to database for persistent logging
        try:
            # Check if workflow exists before logging
            workflow_check = self.supabase.table('workflows').select('id').eq('id', workflow_id).execute()
            if workflow_check.data:
                self.supabase.table('workflow_execution_logs').insert({
                    'id': str(uuid.uuid4()),
                    'workflow_id': workflow_id,
                    'user_id': user_id,
                    'execution_id': execution_id,
                    'level': level,
                    'message': message,
                    'created_at': datetime.now().isoformat()
                }).execute()
            else:
                logger.warning(f"Workflow {workflow_id} not found in database, skipping log save")
        except Exception as e:
            logger.error(f"Failed to save execution log to database: {e}")
    
    def get_execution_logs(self, workflow_id: Optional[str] = None, user_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get execution logs with optional filtering"""
        logs = self.execution_logs.copy()
        
        if workflow_id:
            logs = [log for log in logs if log['workflow_id'] == workflow_id]
        
        if user_id:
            logs = [log for log in logs if log['user_id'] == user_id]
        
        return logs[-limit:]  # Return most recent logs
    
    def get_running_workflows(self) -> List[str]:
        """Get list of currently running workflow IDs"""
        return list(self.running_workflows.keys())
    
    async def force_execute_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Force execute a workflow once (for testing)"""
        try:
            # Get workflow details
            workflow_response = self.supabase.table('workflows').select('*').eq('id', workflow_id).execute()
            if not workflow_response.data:
                return {'success': False, 'error': 'Workflow not found'}
            
            workflow = workflow_response.data[0]
            user_id = workflow['user_id']
            
            # Get workflow steps
            steps_response = self.supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).order('step_order').execute()
            steps = steps_response.data
            
            if not steps:
                return {'success': False, 'error': 'No steps found for workflow'}
            
            # Create test trigger data
            test_trigger_data = {
                'subject': 'Test Email Subject',
                'from': 'test@example.com',
                'body': 'This is a test email for workflow execution.',
                'timestamp': datetime.now().isoformat()
            }
            
            execution_id = str(uuid.uuid4())
            
            self._log_execution(
                workflow_id=workflow_id,
                user_id=user_id,
                level="INFO",
                message="Force executing workflow for testing",
                execution_id=execution_id
            )
            
            # Execute workflow
            result = await self.workflow_executor.execute_workflow_steps(
                workflow_id=workflow_id,
                steps=steps,
                trigger_data=test_trigger_data,
                execution_id=execution_id
            )
            
            if result['success']:
                await self._update_workflow_execution_count(workflow_id)
                
                self._log_execution(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    level="SUCCESS",
                    message="Force execution completed successfully",
                    execution_id=execution_id
                )
            else:
                self._log_execution(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    level="ERROR",
                    message=f"Force execution failed: {result.get('error', 'Unknown error')}",
                    execution_id=execution_id
                )
            
            return result
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
