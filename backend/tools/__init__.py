"""
Tools registry for LangChain tools in the Autofy backend
"""
from typing import List, Dict, Any
from langchain.tools import BaseTool

from .gmail_tool import gmail_tools
from .notion_tool import notion_tools
from .telegram_tool import telegram_tools
from .ai_tool import ai_tools


class ToolRegistry:
    """Central registry for all available tools"""
    
    def __init__(self):
        self._tools = {}
        self._register_all_tools()
    
    def _register_all_tools(self):
        """Register all available tools"""
        # Gmail tools
        for tool in gmail_tools:
            self._tools[tool.name] = tool
        
        # Notion tools
        for tool in notion_tools:
            self._tools[tool.name] = tool
        
        # Telegram tools
        for tool in telegram_tools:
            self._tools[tool.name] = tool
        
        # AI tools
        for tool in ai_tools:
            self._tools[tool.name] = tool
    
    def get_all_tools(self) -> List[BaseTool]:
        """Get all available tools as a list"""
        return list(self._tools.values())
    
    def get_tool_by_name(self, name: str) -> BaseTool:
        """Get a specific tool by name"""
        if name not in self._tools:
            raise ValueError(f"Tool '{name}' not found")
        return self._tools[name]
    
    def get_tools_by_service(self, service: str) -> List[BaseTool]:
        """Get tools for a specific service"""
        service_tools = []
        for tool in self._tools.values():
            if tool.name.startswith(service.lower()):
                service_tools.append(tool)
        return service_tools
    
    def get_tool_info(self) -> Dict[str, Any]:
        """Get information about all available tools"""
        tool_info = {}
        
        for name, tool in self._tools.items():
            tool_info[name] = {
                "name": tool.name,
                "description": tool.description,
                "service": name.split('_')[0],  # Extract service from tool name
                "input_schema": tool.args_schema.schema() if tool.args_schema else None
            }
        
        return tool_info
    
    def list_available_services(self) -> List[str]:
        """List all available services"""
        services = set()
        for tool_name in self._tools.keys():
            service = tool_name.split('_')[0]
            services.add(service)
        return sorted(list(services))


# Global tool registry instance
tool_registry = ToolRegistry()

# Convenience functions
def get_all_tools() -> List[BaseTool]:
    """Get all available tools"""
    return tool_registry.get_all_tools()

def get_tool_by_name(name: str) -> BaseTool:
    """Get a tool by name"""
    return tool_registry.get_tool_by_name(name)

def get_tools_by_service(service: str) -> List[BaseTool]:
    """Get tools for a service"""
    return tool_registry.get_tools_by_service(service)

def get_tool_info() -> Dict[str, Any]:
    """Get tool information"""
    return tool_registry.get_tool_info()

def list_available_services() -> List[str]:
    """List available services"""
    return tool_registry.list_available_services()

# Export everything
__all__ = [
    'tool_registry',
    'get_all_tools',
    'get_tool_by_name', 
    'get_tools_by_service',
    'get_tool_info',
    'list_available_services',
    'gmail_tools',
    'notion_tools', 
    'telegram_tools',
    'ai_tools'
]
