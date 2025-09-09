"""
Telegram LangChain tools for messaging
"""
import json
import asyncio
from typing import Dict, List, Optional, Any

from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from telegram import Bot
from telegram.error import TelegramError

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import get_supabase
from config.settings import settings


class TelegramSendInput(BaseModel):
    """Input for Telegram send tool"""
    user_id: str = Field(description="User ID for authentication")
    message: str = Field(description="Message to send")
    chat_id: Optional[str] = Field(default=None, description="Specific chat ID to send to (optional)")
    parse_mode: Optional[str] = Field(default="HTML", description="Message parse mode: HTML, Markdown, or MarkdownV2")
    disable_web_page_preview: bool = Field(default=True, description="Disable web page preview")
    disable_notification: bool = Field(default=False, description="Send message silently")


class TelegramGetChatsInput(BaseModel):
    """Input for Telegram get chats tool"""
    user_id: str = Field(description="User ID for authentication")


class TelegramService:
    """Telegram service helper class"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def get_telegram_bot(self, user_id: str) -> Bot:
        """Get Telegram bot instance for user"""
        # Get user's Telegram integration
        result = self.supabase.table("integrations").select("*").eq("user_id", user_id).eq("service_name", "telegram").single().execute()
        
        if not result.data:
            raise ValueError("Telegram integration not found for user")
        
        integration = result.data
        creds_data = integration["credentials"]
        
        # Get bot token
        bot_token = creds_data.get("bot_token") or settings.telegram_bot_token
        
        if not bot_token:
            raise ValueError("No Telegram bot token found")
        
        return Bot(token=bot_token)
    
    async def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's active Telegram chats"""
        result = self.supabase.table("telegram_chats").select("*").eq("user_id", user_id).eq("is_active", True).execute()
        
        return result.data or []
    
    def format_message_for_telegram(self, message: str, parse_mode: str) -> str:
        """Format message for Telegram based on parse mode"""
        if parse_mode == "HTML":
            # Basic HTML formatting
            return message.replace("**", "<b>").replace("**", "</b>").replace("*", "<i>").replace("*", "</i>")
        elif parse_mode in ["Markdown", "MarkdownV2"]:
            # Keep markdown as is
            return message
        else:
            # Plain text - escape special characters
            return message.replace("<", "&lt;").replace(">", "&gt;").replace("&", "&amp;")
    
    async def send_to_chat(self, bot: Bot, chat_id: str, message: str, 
                          parse_mode: str, disable_web_page_preview: bool, 
                          disable_notification: bool) -> Dict[str, Any]:
        """Send message to specific chat"""
        try:
            # Format message
            formatted_message = self.format_message_for_telegram(message, parse_mode)
            
            # Send message
            telegram_message = await bot.send_message(
                chat_id=chat_id,
                text=formatted_message,
                parse_mode=parse_mode if parse_mode != "plain" else None,
                disable_web_page_preview=disable_web_page_preview,
                disable_notification=disable_notification
            )
            
            return {
                "success": True,
                "message_id": telegram_message.message_id,
                "chat_id": str(telegram_message.chat_id),
                "chat_type": telegram_message.chat.type,
                "sent_at": telegram_message.date.isoformat() if telegram_message.date else None
            }
        
        except TelegramError as e:
            return {
                "success": False,
                "error": str(e),
                "chat_id": chat_id
            }


class TelegramSendTool(BaseTool):
    """Tool to send messages via Telegram"""
    name: str = "telegram_send"
    description: str = "Send a message to Telegram chats"
    args_schema = TelegramSendInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, message: str, chat_id: Optional[str] = None,
             parse_mode: Optional[str] = "HTML", disable_web_page_preview: bool = True,
             disable_notification: bool = False) -> str:
        """Synchronous version (not recommended for async apps)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, message: str, chat_id: Optional[str] = None,
                    parse_mode: Optional[str] = "HTML", disable_web_page_preview: bool = True,
                    disable_notification: bool = False) -> str:
        """Send message to Telegram"""
        try:
            # Create Telegram service
            telegram_service = TelegramService()
            
            # Get Telegram bot
            bot = await telegram_service.get_telegram_bot(user_id)
            
            # Get user's chats if no specific chat_id provided
            if not chat_id:
                chats = await telegram_service.get_user_chats(user_id)
                if not chats:
                    return json.dumps({
                        "success": False,
                        "error": "No active Telegram chats found for user",
                        "results": []
                    })
                chat_ids = [chat["chat_id"] for chat in chats]
            else:
                chat_ids = [chat_id]
            
            # Send message to all target chats
            results = []
            for target_chat_id in chat_ids:
                result = await telegram_service.send_to_chat(
                    bot=bot,
                    chat_id=target_chat_id,
                    message=message,
                    parse_mode=parse_mode,
                    disable_web_page_preview=disable_web_page_preview,
                    disable_notification=disable_notification
                )
                results.append(result)
            
            # Calculate success metrics
            successful = [r for r in results if r.get("success")]
            failed = [r for r in results if not r.get("success")]
            
            return json.dumps({
                "success": len(failed) == 0,
                "total_chats": len(chat_ids),
                "successful_sends": len(successful),
                "failed_sends": len(failed),
                "results": results,
                "message_preview": message[:100] + "..." if len(message) > 100 else message
            })
        
        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e),
                "results": []
            })


class TelegramGetChatsTool(BaseTool):
    """Tool to get user's Telegram chats"""
    name: str = "telegram_get_chats"
    description: str = "Get list of user's active Telegram chats"
    args_schema = TelegramGetChatsInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str) -> str:
        """Synchronous version (not recommended for async apps)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str) -> str:
        """Get user's Telegram chats"""
        try:
            # Create Telegram service
            telegram_service = TelegramService()
            
            chats = await telegram_service.get_user_chats(user_id)
            
            # Format chat information
            formatted_chats = []
            for chat in chats:
                formatted_chat = {
                    "chat_id": chat["chat_id"],
                    "chat_type": chat["chat_type"],
                    "title": chat.get("title"),
                    "username": chat.get("username"),
                    "first_name": chat.get("first_name"),
                    "last_name": chat.get("last_name"),
                    "description": chat.get("description"),
                    "is_active": chat.get("is_active", True),
                    "connected_at": chat.get("connected_at")
                }
                formatted_chats.append(formatted_chat)
            
            return json.dumps({
                "success": True,
                "chats": formatted_chats,
                "count": len(formatted_chats)
            })
        
        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e),
                "chats": [],
                "count": 0
            })


class TelegramTestConnectionTool(BaseTool):
    """Tool to test Telegram bot connection"""
    name: str = "telegram_test_connection"
    description: str = "Test Telegram bot connection and get bot information"
    
    class TelegramTestConnectionInput(BaseModel):
        user_id: str = Field(description="User ID for authentication")
    
    args_schema = TelegramTestConnectionInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str) -> str:
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str) -> str:
        """Test Telegram bot connection"""
        try:
            # Create Telegram service
            telegram_service = TelegramService()
            
            # Get Telegram bot
            bot = await telegram_service.get_telegram_bot(user_id)
            
            # Get bot information
            bot_info = await bot.get_me()
            
            return json.dumps({
                "success": True,
                "bot_info": {
                    "id": bot_info.id,
                    "username": bot_info.username,
                    "first_name": bot_info.first_name,
                    "can_join_groups": bot_info.can_join_groups,
                    "can_read_all_group_messages": bot_info.can_read_all_group_messages,
                    "supports_inline_queries": bot_info.supports_inline_queries
                }
            })
        
        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            })


# Tool instances
telegram_send_tool = TelegramSendTool()
telegram_get_chats_tool = TelegramGetChatsTool()
telegram_test_connection_tool = TelegramTestConnectionTool()

# Export all Telegram tools
telegram_tools = [telegram_send_tool, telegram_get_chats_tool, telegram_test_connection_tool]


# Additional workflow execution methods
class TelegramWorkflowTool:
    """Telegram tool for workflow execution (non-LangChain)"""
    
    def __init__(self, supabase=None):
        self.supabase = supabase  # Not used by Telegram tool, but for consistency
        self.logger = None
        self.service = TelegramService()
        try:
            import logging
            self.logger = logging.getLogger(__name__)
        except ImportError:
            pass
    
    async def send_message(self, bot_token: str, chat_id: str, message: str, parse_mode: str = "HTML") -> Dict[str, Any]:
        """Send Telegram message for workflows"""
        try:
            bot = Bot(token=bot_token)
            
            # Send message
            sent_message = await bot.send_message(
                chat_id=chat_id,
                text=message,
                parse_mode=parse_mode,
                disable_web_page_preview=True
            )
            
            result = {
                'success': True,
                'message_id': sent_message.message_id,
                'chat_id': sent_message.chat_id,
                'date': sent_message.date.isoformat(),
                'text': sent_message.text
            }
            
            if self.logger:
                self.logger.info(f"Telegram message sent to {chat_id}: {sent_message.message_id}")
            
            return result
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error sending Telegram message: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_bot_info(self, bot_token: str) -> Dict[str, Any]:
        """Get bot information for workflows"""
        try:
            bot = Bot(token=bot_token)
            bot_info = await bot.get_me()
            
            return {
                'success': True,
                'bot_id': bot_info.id,
                'username': bot_info.username,
                'first_name': bot_info.first_name,
                'can_join_groups': bot_info.can_join_groups
            }
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error getting bot info: {e}")
            return {'success': False, 'error': str(e)}


# Workflow tool instance
telegram_workflow_tool = TelegramWorkflowTool()
