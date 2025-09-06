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
        """Create a page in Notion database"""
        try:
            # Create Notion service
            notion_service = NotionService()
            
            # Get Notion client
            notion = await notion_service.get_notion_client(user_id)
            
            # Prepare page properties
            page_properties = notion_service.prepare_page_properties(title, properties)
            
            # Create page payload
            page_data = {
                "parent": {"database_id": database_id},
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
                "database_id": database_id
            })
        
        except (APIResponseError, HTTPResponseError) as e:
            error_msg = f"Notion API error: {str(e)}"
            return json.dumps({"success": False, "error": error_msg})
        
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


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
