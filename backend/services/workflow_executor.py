"""
Workflow Executor Service - Handles the execution of a single workflow run.
"""

import asyncio
import logging
import json
import uuid
import traceback
from typing import Dict, List, Any, Optional
from supabase import Client
from datetime import datetime, timezone

from services.workflow_service import WorkflowService
from tools.gmail_tool import GmailWorkflowTool
from tools.notion_tool import NotionWorkflowTool
from tools.ai_tool import AIWorkflowTool
from tools.telegram_tool import TelegramWorkflowTool

class WorkflowExecutor:
    """
    Executes a workflow and its steps when triggered by the WorkflowMonitor.
    This class does NOT monitor for triggers; it only executes.
    """
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.workflow_service = WorkflowService(supabase)
        self.logger = logging.getLogger(__name__)
        
        # Initialize tools
        self.tools = {
            'gmail': GmailWorkflowTool(supabase),
            'notion': NotionWorkflowTool(supabase),
            'ai': AIWorkflowTool(supabase),
            'telegram': TelegramWorkflowTool(supabase)
        }

    async def execute_workflow(self, workflow, steps: List, user_id: str, trigger_data: Dict):
        """
        Executes the complete workflow, logs the process, and updates the database.
        """
        self.logger.info(f"🎯 Starting execution for workflow: {workflow.name} (User: {user_id})")
        
        # Log trigger data details
        trigger_summary = {
            'subject': trigger_data.get('subject', 'N/A'),
            'from': trigger_data.get('from', 'N/A'),
            'timestamp': trigger_data.get('timestamp', 'N/A')
        }
        self.logger.info(f"📧 Trigger data: {trigger_summary}")

        try:
            # 1. Create the initial execution record
            execution = await self.workflow_service.create_execution(
                workflow_id=workflow.id,
                user_id=user_id,
                trigger_data=trigger_data
            )
            execution_id = execution.id
            self.logger.info(f"📝 Created execution record with ID: {execution_id}")

            context = {
                'trigger_data': trigger_data,
                'workflow_id': workflow.id,
                'execution_id': execution_id,
                'step_outputs': {},
                'user_id': user_id
            }

            # 2. Execute action steps
            action_steps = [step for step in steps if step.step_type == 'action']
            
            for step in action_steps:
                try:
                    self.logger.info(f"🔄 Executing Step {step.step_order}: {step.service_name}.{step.action_name} (User: {user_id})")
                    result = await self._execute_step(step, context, user_id)
                    
                    # Update context for subsequent steps
                    context['step_outputs'][str(step.step_order)] = result
                    
                    await self.workflow_service.log_execution_step(
                        execution_id=execution_id,
                        step_id=step.id,
                        status='completed',
                        result=result
                    )
                    
                    # Log detailed step completion
                    result_summary = str(result)[:100] + "..." if len(str(result)) > 100 else str(result)
                    self.logger.info(f"✅ Step {step.step_order} ({step.service_name}.{step.action_name}) completed successfully")
                    self.logger.debug(f"Step {step.step_order} result: {result_summary}")

                except Exception as step_error:
                    self.logger.error(f"❌ Step {step.step_order} failed: {step_error}")
                    await self.workflow_service.log_execution_step(
                        execution_id=execution_id,
                        step_id=step.id,
                        status='failed',
                        error_message=str(step_error)
                    )
                    # Re-raise the exception to stop the workflow execution
                    raise

            # 3. Mark execution as completed
            await self.workflow_service.update_execution_status(execution_id, 'completed')
            await self.workflow_service.update_workflow_statistics(workflow.id, 'completed')
            self.logger.info(f"🎉 Workflow '{workflow.name}' execution successful (User: {user_id}, Execution ID: {execution_id})")

        except Exception as e:
            # Handle case where execution_id might not be defined if creation failed
            error_id = locals().get('execution_id', 'unknown')
            self.logger.error(f"💥 Workflow '{workflow.name}' execution failed: {e} (User: {user_id}, Execution ID: {error_id})")
            traceback.print_exc()
            
            # Only update execution status if we have a valid execution_id
            if 'execution_id' in locals() and execution_id:
                await self.workflow_service.update_execution_status(execution_id, 'failed', error_message=str(e))
                await self.workflow_service.update_workflow_statistics(workflow.id, 'failed')

    def _resolve_template(self, template_string: str, context: Dict) -> str:
        """Resolves placeholders like {{trigger.body}} from context."""
        if not isinstance(template_string, str):
            return template_string

        # Simple placeholder replacement
        # Example: "New page about {{trigger_data.subject}}"
        for key, value in context.items():
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    placeholder = f"{{{{{key}.{sub_key}}}}}"
                    template_string = template_string.replace(placeholder, str(sub_value))
        return template_string

    async def _execute_step(self, step, context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Prepares and executes a single workflow step."""
        service_name = step.service_name
        action_name = step.action_name
        
        # Ensure configuration is a dictionary with robust parsing
        config = step.configuration
        
        # Handle different configuration formats
        if config is None:
            config = {}
        elif isinstance(config, str):
            try:
                config = json.loads(config)
            except json.JSONDecodeError as e:
                self.logger.error(f"Configuration for step {step.id} is not valid JSON: {e}")
                raise ValueError(f"Configuration for step {step.id} is not valid JSON: {config}")
        elif not isinstance(config, dict):
            self.logger.error(f"Configuration for step {step.id} is not a dictionary: {type(config)}")
            raise ValueError(f"Configuration for step {step.id} must be a dictionary, got {type(config)}")

        # Resolve any template placeholders in the config
        resolved_config = {}
        for key, value in config.items():
            if isinstance(value, str):
                resolved_config[key] = self._resolve_template(value, context)
            else:
                resolved_config[key] = value

        tool = self.tools.get(service_name)
        if not tool:
            raise ValueError(f"Tool not found for service: {service_name}")

        # Prepare the data packet for the tool
        step_data = {
            'user_id': user_id,
            'configuration': resolved_config,
            'context': context
        }

        # Dynamically call the correct tool method
        # e.g., calls notion_tool.create_page(step_data)
        tool_method = getattr(tool, action_name, None)
        if not tool_method or not callable(tool_method):
            raise AttributeError(f"Action '{action_name}' not found on tool '{service_name}'")
        
        self.logger.info(f"Executing tool: {service_name}.{action_name}")
        return await tool_method(step_data)

    async def _get_user_integration(self, user_id: str, service_name: str) -> Optional[Dict]:
        """Fetches active integration credentials for a user."""
        try:
            response = self.supabase.table('integrations').select('*').eq('user_id', user_id).eq('service_name', service_name).eq('status', 'active').single().execute()
            return response.data
        except Exception:
            self.logger.debug(f"No active integration found for {user_id} and {service_name}")
            return None

    async def check_gmail_emails(self, user_id: str, keywords: str = "", from_email: str = "", subject_contains: str = "", since=None):
        """Check Gmail for new emails - compatibility method for WorkflowMonitor"""
        try:
            # Use Gmail service to properly handle credentials and refresh
            from tools.gmail_tool import GmailService
            gmail_service = GmailService()
            try:
                # Get proper credentials with refresh capability
                creds = await gmail_service.get_gmail_credentials(user_id)
                
                # Build Gmail service
                from googleapiclient.discovery import build
                service = build('gmail', 'v1', credentials=creds)
                
                # Build search query
                query_parts = []
                if keywords:
                    query_parts.append(f"({keywords})")
                if from_email:
                    query_parts.append(f"from:{from_email}")
                if subject_contains:
                    query_parts.append(f"subject:({subject_contains})")
                
                # Add time filter - use since parameter if provided, otherwise last 10 minutes
                import datetime
                if since:
                    since_time = since
                else:
                    since_time = datetime.datetime.now() - datetime.timedelta(minutes=10)
                    
                # Convert to timestamp for Gmail API
                query_parts.append(f"after:{int(since_time.timestamp())}")
                
                self.logger.info(f"Gmail search query: {' '.join(query_parts)} (searching since {since_time})")
                
                query = " ".join(query_parts) if query_parts else "is:unread"
                
                # Search messages
                results = service.users().messages().list(
                    userId='me', 
                    q=query, 
                    maxResults=10
                ).execute()
                
                messages = results.get('messages', [])
                emails = []
                
                # Parse each message
                for msg in messages:
                    try:
                        message = service.users().messages().get(
                            userId='me', 
                            id=msg['id']
                        ).execute()
                        
                        email_data = gmail_service.parse_email_message(message)
                        if email_data:
                            emails.append(email_data)
                    except Exception as e:
                        self.logger.error(f"Error parsing email {msg['id']}: {e}")
                        continue
                
            except Exception as e:
                self.logger.error(f"Error using Gmail service: {e}")
                emails = []

            return emails
        except Exception as e:
            self.logger.error(f"Error checking Gmail emails: {e}")
            import traceback
            self.logger.error(f"Full traceback: {traceback.format_exc()}")
            return []

    async def execute_workflow_steps(self, workflow_id: str, steps: List, trigger_data: Dict, execution_id: str):
        """Execute workflow steps - compatibility method for WorkflowMonitor"""
        try:
            # Get workflow details
            response = self.supabase.table('workflows').select('*').eq('id', workflow_id).single().execute()
            if not response.data:
                raise ValueError(f"Workflow {workflow_id} not found")

            workflow_data = response.data
            user_id = workflow_data['user_id']
            
            # Create a workflow object-like dict that the execute_workflow method can use
            workflow = type('obj', (object,), {
                'id': workflow_data['id'],
                'name': workflow_data['name'],
                'user_id': workflow_data['user_id'],
                'status': workflow_data['status']
            })()
            
            # Convert raw step dictionaries to WorkflowStep-like objects
            converted_steps = []
            for step_data in steps:
                # Parse JSON fields if they are strings
                config = step_data.get('configuration', {})
                if isinstance(config, str):
                    import json
                    try:
                        config = json.loads(config)
                    except json.JSONDecodeError:
                        config = {}
                
                conditions = step_data.get('conditions', {})
                if isinstance(conditions, str):
                    import json
                    try:
                        conditions = json.loads(conditions)
                    except json.JSONDecodeError:
                        conditions = {}
                
                error_handling = step_data.get('error_handling', {})
                if isinstance(error_handling, str):
                    import json
                    try:
                        error_handling = json.loads(error_handling)
                    except json.JSONDecodeError:
                        error_handling = {}
                
                # Create step object with parsed fields
                step_obj = type('obj', (object,), {
                    'id': step_data['id'],
                    'workflow_id': step_data['workflow_id'],
                    'step_order': step_data['step_order'],
                    'step_type': step_data['step_type'],
                    'service_name': step_data['service_name'],
                    'action_name': step_data['action_name'],
                    'configuration': config,
                    'conditions': conditions,
                    'error_handling': error_handling,
                    'is_enabled': step_data.get('is_enabled', True)
                })()
                
                converted_steps.append(step_obj)
            
            # Use the main execute_workflow method with converted steps
            await self.execute_workflow(workflow, converted_steps, user_id, trigger_data)
            
            return {'success': True, 'execution_id': execution_id}
        except Exception as e:
            self.logger.error(f"Error executing workflow steps: {e}")
            import traceback
            self.logger.error(f"Full traceback: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}
            
    async def stop_monitoring(self):
        """This executor does not monitor. This is handled by WorkflowMonitor."""
        self.logger.info("WorkflowExecutor does not handle monitoring.")
        pass
        
    async def shutdown(self):
        """This executor does not have long-running tasks to shut down."""
        self.logger.info("WorkflowExecutor shutting down.")
        pass