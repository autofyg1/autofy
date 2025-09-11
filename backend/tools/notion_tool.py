"""
Notion LangChain tools for database operations
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from notion_client import Client as NotionClient
from notion_client.errors import APIResponseError, HTTPResponseError
from supabase import Client

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import get_supabase
from config.settings import settings


class NotionCreatePageInput(BaseModel):
    """Input for Notion create page tool"""
    user_id: str = Field(description="User ID for authentication")
    database_id: str = Field(description="Notion database ID where the page will be created")
    title: str = Field(description="Page title")
    content: Optional[str] = Field(default=None, description="Page content/body")
    properties: Optional[Dict[str, Any]] = Field(default=None, description="Additional page properties")


class NotionQueryDatabaseInput(BaseModel):
    """Input for Notion query database tool"""
    user_id: str = Field(description="User ID for authentication")
    database_id: str = Field(description="Notion database ID to query")
    filter_query: Optional[Dict[str, Any]] = Field(default=None, description="Filter query for the database")
    sorts: Optional[List[Dict[str, Any]]] = Field(default=None, description="Sort options")
    page_size: Optional[int] = Field(default=10, description="Number of results to return")


class NotionService:
    """Notion service helper class"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def get_notion_client(self, user_id: str) -> NotionClient:
        """Get Notion client with user credentials"""
        # Get integration from database
        result = self.supabase.table("integrations").select("*").eq("user_id", user_id).eq("service_name", "notion").single().execute()
        
        if not result.data:
            raise ValueError("Notion integration not found for user")
        
        integration = result.data
        creds_data = integration["credentials"]
        
        # Get access token (could be internal integration or OAuth token)
        access_token = creds_data.get("access_token") or creds_data.get("integration_token")
        
        if not access_token:
            raise ValueError("No valid Notion access token found")
        
        return NotionClient(auth=access_token)
    
    def create_page_content_blocks(self, content: str) -> List[Dict[str, Any]]:
        """Convert plain text content to Notion blocks"""
        if not content:
            return []
        
        # Split content by paragraphs
        paragraphs = content.split('\n\n')
        blocks = []
        
        for paragraph in paragraphs:
            if paragraph.strip():
                # Handle different content types
                if paragraph.startswith('# '):
                    # Heading 1
                    blocks.append({
                        "object": "block",
                        "type": "heading_1",
                        "heading_1": {
                            "rich_text": [{"type": "text", "text": {"content": paragraph[2:]}}]
                        }
                    })
                elif paragraph.startswith('## '):
                    # Heading 2
                    blocks.append({
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {
                            "rich_text": [{"type": "text", "text": {"content": paragraph[3:]}}]
                        }
                    })
                elif paragraph.startswith('### '):
                    # Heading 3
                    blocks.append({
                        "object": "block",
                        "type": "heading_3",
                        "heading_3": {
                            "rich_text": [{"type": "text", "text": {"content": paragraph[4:]}}]
                        }
                    })
                elif paragraph.startswith('- ') or paragraph.startswith('* '):
                    # Bullet list
                    blocks.append({
                        "object": "block",
                        "type": "bulleted_list_item",
                        "bulleted_list_item": {
                            "rich_text": [{"type": "text", "text": {"content": paragraph[2:]}}]
                        }
                    })
                else:
                    # Regular paragraph
                    blocks.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": paragraph}}]
                        }
                    })
        
        return blocks
    
    def prepare_page_properties(self, title: str, custom_properties: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Prepare page properties for Notion API"""
        properties = {
            "title": {
                "title": [
                    {
                        "text": {
                            "content": title
                        }
                    }
                ]
            }
        }
        
        # Add custom properties if provided
        if custom_properties:
            for key, value in custom_properties.items():
                if key.lower() != "title":  # Don't override title
                    properties[key] = value
        
        return properties
    
    def format_notion_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Format Notion API response for consistent output"""
        return {
            "id": response.get("id"),
            "url": response.get("url"),
            "title": self.extract_title_from_properties(response.get("properties", {})),
            "created_time": response.get("created_time"),
            "last_edited_time": response.get("last_edited_time"),
            "properties": response.get("properties", {}),
            "archived": response.get("archived", False)
        }
    
    def extract_title_from_properties(self, properties: Dict[str, Any]) -> str:
        """Extract title from Notion page properties"""
        title_property = properties.get("title") or properties.get("Name") or properties.get("Title")
        
        if title_property and title_property.get("title"):
            title_parts = title_property["title"]
            if title_parts and len(title_parts) > 0:
                return title_parts[0].get("text", {}).get("content", "Untitled")
        
        return "Untitled"


class NotionCreatePageTool(BaseTool):
    """Tool to create a page in a Notion database"""
    name: str = "notion_create_page"
    description: str = "Create a new page in a Notion database with title and content"
    args_schema = NotionCreatePageInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, database_id: str, title: str, 
             content: Optional[str] = None, properties: Optional[Dict[str, Any]] = None) -> str:
        """Synchronous version (not recommended for async apps)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, database_id: str, title: str,
                    content: Optional[str] = None, properties: Optional[Dict[str, Any]] = None) -> str:
        """Create a page in Notion database or as a child of a page"""
        try:
            # Create Notion service
            notion_service = NotionService()
            
            # Get Notion client
            notion = await notion_service.get_notion_client(user_id)
            
            # Check if the target_id is a database or a page
            is_database = await self._is_target_database(notion, database_id)
            
            # Prepare page properties based on parent type
            if is_database:
                # For databases, use standard database page properties
                page_properties = notion_service.prepare_page_properties(title, properties)
                parent = {"database_id": database_id}
            else:
                # For pages, use simpler title format
                page_properties = {
                    "title": {
                        "title": [
                            {
                                "text": {
                                    "content": title
                                }
                            }
                        ]
                    }
                }
                # Add custom properties if provided
                if properties:
                    for key, value in properties.items():
                        if key.lower() != "title":  # Don't override title
                            page_properties[key] = value
                
                parent = {"page_id": database_id}
            
            # Create page payload
            page_data = {
                "parent": parent,
                "properties": page_properties
            }
            
            # Add content blocks if provided
            if content:
                content_blocks = notion_service.create_page_content_blocks(content)
                if content_blocks:
                    page_data["children"] = content_blocks
            
            # Create the page
            response = notion.pages.create(**page_data)
            
            # Format response
            formatted_response = notion_service.format_notion_response(response)
            
            return json.dumps({
                "success": True,
                "page": formatted_response,
                "parent_id": database_id,
                "is_database_parent": is_database
            })
        
        except (APIResponseError, HTTPResponseError) as e:
            error_msg = f"Notion API error: {str(e)}"
            return json.dumps({"success": False, "error": error_msg})
        
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    async def _is_target_database(self, notion: NotionClient, target_id: str) -> bool:
        """Check if the given ID is a database or a page"""
        try:
            # Try to retrieve as a database first
            notion.databases.retrieve(database_id=target_id)
            return True
        except (APIResponseError, HTTPResponseError) as e:
            # If it fails, it might be a page ID
            if "Could not find database" in str(e) or "database" in str(e).lower():
                try:
                    # Try to retrieve as a page
                    page = notion.pages.retrieve(page_id=target_id)
                    # If successful, it's a page
                    return False
                except (APIResponseError, HTTPResponseError):
                    # If both fail, re-raise the original error
                    raise e
            else:
                raise e
        except Exception as e:
            # For any other error, assume it's an invalid ID
            raise ValueError(f"Invalid Notion ID: {target_id}. Error: {str(e)}")


class NotionQueryDatabaseTool(BaseTool):
    """Tool to query a Notion database"""
    name: str = "notion_query_database"
    description: str = "Query a Notion database with optional filters and sorting"
    args_schema = NotionQueryDatabaseInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, database_id: str, filter_query: Optional[Dict[str, Any]] = None,
             sorts: Optional[List[Dict[str, Any]]] = None, page_size: Optional[int] = 10) -> str:
        """Synchronous version (not recommended for async apps)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, database_id: str, filter_query: Optional[Dict[str, Any]] = None,
                    sorts: Optional[List[Dict[str, Any]]] = None, page_size: Optional[int] = 10) -> str:
        """Query Notion database"""
        try:
            # Create Notion service
            notion_service = NotionService()
            
            # Get Notion client
            notion = await notion_service.get_notion_client(user_id)
            
            # Build query parameters
            query_params = {"page_size": min(page_size or 10, 100)}  # Limit to 100 results max
            
            if filter_query:
                query_params["filter"] = filter_query
            
            if sorts:
                query_params["sorts"] = sorts
            
            # Query the database
            response = notion.databases.query(database_id=database_id, **query_params)
            
            # Format results
            results = []
            for page in response.get("results", []):
                formatted_page = notion_service.format_notion_response(page)
                results.append(formatted_page)
            
            return json.dumps({
                "success": True,
                "results": results,
                "count": len(results),
                "has_more": response.get("has_more", False),
                "next_cursor": response.get("next_cursor"),
                "database_id": database_id
            })
        
        except (APIResponseError, HTTPResponseError) as e:
            error_msg = f"Notion API error: {str(e)}"
            return json.dumps({"success": False, "error": error_msg, "results": []})
        
        except Exception as e:
            return json.dumps({"success": False, "error": str(e), "results": []})


class NotionGetDatabaseTool(BaseTool):
    """Tool to get information about a Notion database"""
    name: str = "notion_get_database"
    description: str = "Get information about a Notion database including its properties and structure"
    
    class NotionGetDatabaseInput(BaseModel):
        user_id: str = Field(description="User ID for authentication")
        database_id: str = Field(description="Notion database ID to retrieve")
    
    args_schema = NotionGetDatabaseInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, database_id: str) -> str:
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, database_id: str) -> str:
        """Get Notion database information"""
        try:
            # Create Notion service
            notion_service = NotionService()
            
            # Get Notion client
            notion = await notion_service.get_notion_client(user_id)
            
            # Get database info
            response = notion.databases.retrieve(database_id=database_id)
            
            # Extract useful information
            database_info = {
                "id": response.get("id"),
                "title": response.get("title", [{}])[0].get("text", {}).get("content", "Unknown Database"),
                "description": response.get("description"),
                "properties": {
                    name: {
                        "type": prop.get("type"),
                        "id": prop.get("id")
                    }
                    for name, prop in response.get("properties", {}).items()
                },
                "url": response.get("url"),
                "created_time": response.get("created_time"),
                "last_edited_time": response.get("last_edited_time")
            }
            
            return json.dumps({
                "success": True,
                "database": database_info
            })
        
        except (APIResponseError, HTTPResponseError) as e:
            error_msg = f"Notion API error: {str(e)}"
            return json.dumps({"success": False, "error": error_msg})
        
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


# Tool instances
notion_create_page_tool = NotionCreatePageTool()
notion_query_database_tool = NotionQueryDatabaseTool()
notion_get_database_tool = NotionGetDatabaseTool()

# Export all Notion tools
notion_tools = [notion_create_page_tool, notion_query_database_tool, notion_get_database_tool]


# Additional workflow execution methods
class NotionWorkflowTool:
    """Notion tool for workflow execution (non-LangChain)"""
    
    def __init__(self, supabase: Client = None):
        self.supabase = supabase or get_supabase()
        self.logger = None
        try:
            import logging
            self.logger = logging.getLogger(__name__)
        except ImportError:
            pass
    
    async def create_workflow_page(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Notion page for workflows"""
        try:
            context = step_data.get('context', {})
            config = step_data.get('configuration', {})
            user_id = context.get('user_id')

            if not user_id:
                return {'success': False, 'error': 'User ID not found in context'}

            # Get user's Notion integration
            integration_result = self.supabase.table('integrations').select('credentials').eq('user_id', user_id).eq('service_name', 'notion').single().execute()
            if not integration_result.data:
                return {'success': False, 'error': f"Notion integration not found for user {user_id}"}
            
            credentials = integration_result.data['credentials']
            if isinstance(credentials, str):
                credentials = json.loads(credentials)
            
            access_token = credentials.get('access_token')
            if not access_token:
                return {'success': False, 'error': 'Notion access token not found'}

            client = NotionClient(auth=access_token)
            
            # Support both page_id and database_id, prioritize page_id
            target_id = config.get('page_id') or config.get('database_id')
            if not target_id:
                return {'success': False, 'error': 'Either page_id or database_id must be provided in configuration'}
                
            title = self._resolve_template(config.get('title_template', ''), context)
            content = self._resolve_template(config.get('content_template', ''), context)

            # Check if the target_id is a database or a page
            is_database = await self._is_database(client, target_id)
            
            # Create page properties based on the parent type
            if is_database:
                # For databases, use properties format
                properties = {
                    "Name": {
                        "title": [
                            {
                                "text": {
                                    "content": title
                                }
                            }
                        ]
                    }
                }
                parent = {"database_id": target_id}
            else:
                # For pages, use simpler title format and page_id parent
                properties = {
                    "title": {
                        "title": [
                            {
                                "text": {
                                    "content": title
                                }
                            }
                        ]
                    }
                }
                parent = {"page_id": target_id}
            
            # Add content if provided
            children = []
            if content:
                # Split content into paragraphs
                paragraphs = content.split('\n')
                for para in paragraphs:
                    if para.strip():
                        children.append({
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [
                                    {
                                        "type": "text",
                                        "text": {
                                            "content": para.strip()
                                        }
                                    }
                                ]
                            }
                        })
            
            # Create the page data
            page_data = {
                "parent": parent,
                "properties": properties
            }
            
            # Only add children if we have content
            if children:
                page_data["children"] = children
                
            new_page = client.pages.create(**page_data)
            
            page_url = new_page.get('url', '')
            page_id = new_page.get('id', '')
            
            if self.logger:
                self.logger.info(f"Created Notion page: {title} ({page_id})")
            
            return {
                'success': True,
                'page_id': page_id,
                'page_url': page_url,
                'title': title
            }
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error creating Notion page: {e}")
            return {'success': False, 'error': str(e)}

    async def _is_database(self, client: NotionClient, target_id: str) -> bool:
        """Check if the given ID is a database or a page"""
        try:
            # Try to retrieve as a database first
            client.databases.retrieve(database_id=target_id)
            return True
        except (APIResponseError, HTTPResponseError) as e:
            # If it fails, it might be a page ID
            if "Could not find database" in str(e) or "database" in str(e).lower():
                try:
                    # Try to retrieve as a page
                    page = client.pages.retrieve(page_id=target_id)
                    # If successful, it's a page
                    return False
                except (APIResponseError, HTTPResponseError):
                    # If both fail, re-raise the original error
                    raise e
            else:
                raise e
        except Exception as e:
            # For any other error, assume it's an invalid ID
            raise ValueError(f"Invalid Notion ID: {target_id}. Error: {str(e)}")

    def _resolve_template(self, template: str, context: Dict[str, Any]) -> str:
        """Resolve template placeholders with context data"""
        if not template:
            return ""
        
        resolved = template
        
        # Replace common placeholders from trigger_data
        trigger_data = context.get('trigger_data', {})
        for key, value in trigger_data.items():
            placeholder = f"{{{{trigger.{key}}}}}"
            if placeholder in resolved:
                resolved = resolved.replace(placeholder, str(value))

        # Replace placeholders from previous steps
        step_outputs = context.get('step_outputs', {})
        for step_order, output in step_outputs.items():
            if isinstance(output, dict):
                for key, value in output.items():
                    placeholder = f"{{{{steps.{step_order}.{key}}}}}"
                    if placeholder in resolved:
                        resolved = resolved.replace(placeholder, str(value))
        
        return resolved
    
    async def _update_page_direct(self, access_token: str, page_id: str, title: str = None, properties: Dict = None) -> Dict[str, Any]:
        """Update a Notion page for workflows (direct method)"""
        try:
            client = NotionClient(auth=access_token)
            
            update_data = {}
            
            if title:
                update_data["properties"] = {
                    "Name": {
                        "title": [
                            {
                                "text": {
                                    "content": title
                                }
                            }
                        ]
                    }
                }
            
            if properties:
                if "properties" not in update_data:
                    update_data["properties"] = {}
                update_data["properties"].update(properties)
            
            # Update the page
            updated_page = client.pages.update(page_id=page_id, **update_data)
            
            if self.logger:
                self.logger.info(f"Updated Notion page: {page_id}")
            
            return {
                'success': True,
                'page_id': updated_page.get('id'),
                'page_url': updated_page.get('url', ''),
                'last_edited_time': updated_page.get('last_edited_time')
            }
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error updating Notion page: {e}")
            return {'success': False, 'error': str(e)}


    async def create_page(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Notion page - alias for create_workflow_page"""
        return await self.create_workflow_page(step_data)
    
    async def query_database(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Query Notion database for workflows"""
        try:
            user_id = step_data['user_id']
            config = step_data.get('configuration', {})
            
            # Get user integration
            integration = await self._get_user_integration(user_id, 'notion')
            if not integration:
                raise ValueError("Notion integration not found for user")
            
            # Use NotionService for proper credential handling
            notion_service = NotionService()
            notion = await notion_service.get_notion_client(user_id)
            
            database_id = config.get('database_id')
            filter_query = config.get('filter', {})
            sorts = config.get('sorts', [])
            page_size = config.get('page_size', 10)
            
            # Build query parameters
            query_params = {"page_size": min(page_size, 100)}
            
            if filter_query:
                query_params["filter"] = filter_query
            
            if sorts:
                query_params["sorts"] = sorts
            
            # Query the database
            response = notion.databases.query(database_id=database_id, **query_params)
            
            # Format results
            results = []
            for page in response.get("results", []):
                formatted_page = notion_service.format_notion_response(page)
                results.append(formatted_page)
            
            return {
                'success': True,
                'results': results,
                'count': len(results),
                'has_more': response.get("has_more", False),
                'database_id': database_id
            }
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error in query_database: {e}")
            return {
                'success': False,
                'error': str(e),
                'results': []
            }
    
    async def update_page_workflow(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update Notion page for workflow execution"""
        try:
            user_id = step_data['user_id']
            config = step_data.get('configuration', {})
            context = step_data.get('context', {})
            
            # Get user integration
            integration = await self._get_user_integration(user_id, 'notion')
            if not integration:
                raise ValueError("Notion integration not found for user")
            
            credentials = integration['credentials']
            if isinstance(credentials, str):
                credentials = json.loads(credentials)
            
            access_token = credentials.get('access_token')
            if not access_token:
                raise ValueError("Notion access token not found")
            
            page_id = config.get('page_id')
            title = self._resolve_template(config.get('title', ''), context)
            properties = config.get('properties', {})
            
            # Use the existing direct update method
            return await self._update_page_direct(access_token, page_id, title, properties)
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error in update_page workflow: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def update_page(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update page alias for workflow executor compatibility"""
        return await self.update_page_workflow(step_data)
    
    async def _get_user_integration(self, user_id: str, service_name: str) -> Optional[Dict]:
        """Get user integration for service"""
        try:
            result = self.supabase.table('integrations').select('*').eq('user_id', user_id).eq('service_name', service_name).eq('status', 'active').single().execute()
            return result.data
        except Exception:
            if self.logger:
                self.logger.debug(f"No active integration found for {user_id} and {service_name}")
            return None


# Workflow tool instance
notion_workflow_tool = NotionWorkflowTool()
