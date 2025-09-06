"""
Chat service for managing chat sessions and messages
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import json
from supabase import Client
from config.database import ChatSession, ChatMessage


class ChatService:
    """Service for managing chat sessions and messages"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def create_session(self, user_id: str, session_name: str = None, 
                           intent: str = None, context: Dict[str, Any] = None) -> ChatSession:
        """Create a new chat session"""
        now = datetime.now(timezone.utc)
        session_id = str(uuid.uuid4())
        
        session_data = {
            'id': session_id,
            'user_id': user_id,
            'session_name': session_name or f"Chat {now.strftime('%Y-%m-%d %H:%M')}",
            'intent': intent,
            'context': json.dumps(context or {}),
            'status': 'active',
            'workflow_id': None,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        try:
            result = self.supabase.table('chat_sessions').insert(session_data).execute()
            created_session = result.data[0]
            
            # Convert JSON strings back to dicts
            created_session['context'] = json.loads(created_session['context'])
            
            return ChatSession(**created_session)
            
        except Exception as e:
            print(f"Error creating chat session: {e}")
            raise
    
    async def get_session(self, session_id: str, user_id: str) -> Optional[ChatSession]:
        """Get chat session by ID"""
        try:
            result = self.supabase.table('chat_sessions').select('*').eq('id', session_id).eq('user_id', user_id).single().execute()
            
            if result.data:
                session_data = result.data
                # Parse JSON fields
                if isinstance(session_data.get('context'), str):
                    session_data['context'] = json.loads(session_data['context'])
                
                return ChatSession(**session_data)
            return None
            
        except Exception as e:
            print(f"Error fetching chat session {session_id}: {e}")
            return None
    
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[ChatSession]:
        """Get user chat sessions"""
        try:
            result = self.supabase.table('chat_sessions').select('*').eq('user_id', user_id).order('updated_at', desc=True).limit(limit).execute()
            
            sessions = []
            for session_data in result.data:
                # Parse JSON fields
                if isinstance(session_data.get('context'), str):
                    session_data['context'] = json.loads(session_data['context'])
                
                sessions.append(ChatSession(**session_data))
            
            return sessions
            
        except Exception as e:
            print(f"Error fetching user sessions for {user_id}: {e}")
            return []
    
    async def update_session(self, session_id: str, user_id: str, updates: Dict[str, Any]) -> ChatSession:
        """Update chat session"""
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert complex fields to JSON strings for storage
        if 'context' in updates:
            updates['context'] = json.dumps(updates['context'])
        
        try:
            result = self.supabase.table('chat_sessions').update(updates).eq('id', session_id).eq('user_id', user_id).execute()
            updated_session = result.data[0]
            
            # Convert JSON strings back to proper types
            if isinstance(updated_session.get('context'), str):
                updated_session['context'] = json.loads(updated_session['context'])
            
            return ChatSession(**updated_session)
            
        except Exception as e:
            print(f"Error updating chat session: {e}")
            raise
    
    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete chat session and its messages"""
        try:
            # Delete messages first
            self.supabase.table('chat_messages').delete().eq('session_id', session_id).execute()
            
            # Delete session
            result = self.supabase.table('chat_sessions').delete().eq('id', session_id).eq('user_id', user_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error deleting chat session: {e}")
            return False
    
    async def add_message(self, session_id: str, role: str, content: str, 
                        metadata: Dict[str, Any] = None) -> ChatMessage:
        """Add message to chat session"""
        now = datetime.now(timezone.utc)
        message_id = str(uuid.uuid4())
        
        message_data = {
            'id': message_id,
            'session_id': session_id,
            'role': role,
            'content': content,
            'metadata': json.dumps(metadata or {}),
            'created_at': now.isoformat()
        }
        
        try:
            result = self.supabase.table('chat_messages').insert(message_data).execute()
            created_message = result.data[0]
            
            # Convert JSON strings back to dicts
            created_message['metadata'] = json.loads(created_message['metadata'])
            
            # Update session timestamp
            self.supabase.table('chat_sessions').update({
                'updated_at': now.isoformat()
            }).eq('id', session_id).execute()
            
            return ChatMessage(**created_message)
            
        except Exception as e:
            print(f"Error adding message to session: {e}")
            raise
    
    async def get_messages(self, session_id: str, limit: int = 100) -> List[ChatMessage]:
        """Get messages from chat session"""
        try:
            result = self.supabase.table('chat_messages').select('*').eq('session_id', session_id).order('created_at').limit(limit).execute()
            
            messages = []
            for message_data in result.data:
                # Parse JSON fields
                if isinstance(message_data.get('metadata'), str):
                    message_data['metadata'] = json.loads(message_data['metadata'])
                
                messages.append(ChatMessage(**message_data))
            
            return messages
            
        except Exception as e:
            print(f"Error fetching messages for session {session_id}: {e}")
            return []
    
    async def update_message(self, message_id: str, updates: Dict[str, Any]) -> ChatMessage:
        """Update chat message"""
        # Convert complex fields to JSON strings for storage
        if 'metadata' in updates:
            updates['metadata'] = json.dumps(updates['metadata'])
        
        try:
            result = self.supabase.table('chat_messages').update(updates).eq('id', message_id).execute()
            updated_message = result.data[0]
            
            # Convert JSON strings back to proper types
            if isinstance(updated_message.get('metadata'), str):
                updated_message['metadata'] = json.loads(updated_message['metadata'])
            
            return ChatMessage(**updated_message)
            
        except Exception as e:
            print(f"Error updating message: {e}")
            raise
    
    async def delete_message(self, message_id: str) -> bool:
        """Delete chat message"""
        try:
            result = self.supabase.table('chat_messages').delete().eq('id', message_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error deleting message: {e}")
            return False
    
    async def link_session_to_workflow(self, session_id: str, user_id: str, workflow_id: str) -> ChatSession:
        """Link chat session to a workflow"""
        return await self.update_session(session_id, user_id, {'workflow_id': workflow_id})
    
    async def get_session_context(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Get chat session context for AI processing"""
        try:
            session = await self.get_session(session_id, user_id)
            if not session:
                return {}
            
            messages = await self.get_messages(session_id)
            
            # Build conversation context
            conversation_history = []
            for msg in messages[-20:]:  # Last 20 messages for context
                conversation_history.append({
                    'role': msg.role,
                    'content': msg.content,
                    'timestamp': msg.created_at.isoformat() if isinstance(msg.created_at, datetime) else msg.created_at
                })
            
            return {
                'session_id': session.id,
                'intent': session.intent,
                'context': session.context,
                'conversation_history': conversation_history,
                'workflow_id': session.workflow_id
            }
            
        except Exception as e:
            print(f"Error getting session context: {e}")
            return {}
    
    async def search_sessions(self, user_id: str, query: str, limit: int = 10) -> List[ChatSession]:
        """Search chat sessions by content"""
        try:
            # This is a basic implementation - in production you might want to use full-text search
            result = self.supabase.table('chat_sessions').select('*').eq('user_id', user_id).ilike('session_name', f'%{query}%').limit(limit).execute()
            
            sessions = []
            for session_data in result.data:
                # Parse JSON fields
                if isinstance(session_data.get('context'), str):
                    session_data['context'] = json.loads(session_data['context'])
                
                sessions.append(ChatSession(**session_data))
            
            return sessions
            
        except Exception as e:
            print(f"Error searching sessions: {e}")
            return []
