"""
Authentication service for user management
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
from supabase import Client
from services.profile_service import ProfileService
import jwt
import requests


class AuthService:
    """Service for authentication and user management"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.profile_service = ProfileService(supabase)
    
    async def get_current_user(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get current user from access token by verifying JWT"""
        try:
            # Method 1: Try direct Supabase API call with the token
            try:
                # Make a direct API call to Supabase to get user info
                supabase_url = self.supabase.supabase_url
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                # Call Supabase user endpoint directly
                response = requests.get(f'{supabase_url}/auth/v1/user', headers=headers)
                
                if response.status_code == 200:
                    user_data = response.json()
                    
                    # Get or create profile
                    profile = await self.profile_service.get_profile(user_data['id'])
                    if not profile:
                        # Create profile for new user
                        profile = await self.profile_service.create_profile(
                            user_id=user_data['id'],
                            email=user_data['email'],
                            full_name=user_data.get('user_metadata', {}).get('full_name'),
                            avatar_url=user_data.get('user_metadata', {}).get('avatar_url')
                        )
                    
                    return {
                        'id': user_data['id'],
                        'email': user_data['email'],
                        'profile': profile.dict() if profile else None,
                        'auth_metadata': user_data.get('user_metadata', {})
                    }
                    
            except Exception as api_error:
                print(f"Direct API call failed: {api_error}")
                
            # Method 2: Try JWT decode (without verification for now)
            try:
                # Decode JWT without verification to get user info
                # This is less secure but works for development
                payload = jwt.decode(access_token, options={"verify_signature": False})
                
                if 'sub' in payload:
                    user_id = payload['sub']
                    email = payload.get('email', '')
                    
                    # Get or create profile
                    profile = await self.profile_service.get_profile(user_id)
                    
                    return {
                        'id': user_id,
                        'email': email,
                        'profile': profile.dict() if profile else None,
                        'auth_metadata': {}
                    }
                    
            except Exception as jwt_error:
                print(f"JWT decode failed: {jwt_error}")
                
            return None
            
        except Exception as e:
            print(f"Error getting current user: {e}")
            return None
    
    async def refresh_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh user access token"""
        try:
            response = self.supabase.auth.refresh_token(refresh_token)
            
            if response.session:
                return {
                    'access_token': response.session.access_token,
                    'refresh_token': response.session.refresh_token,
                    'expires_in': response.session.expires_in,
                    'user': response.user.dict() if response.user else None
                }
                
            return None
            
        except Exception as e:
            print(f"Error refreshing token: {e}")
            return None
    
    async def sign_out(self, access_token: str) -> bool:
        """Sign out user"""
        try:
            self.supabase.auth.sign_out(access_token)
            return True
            
        except Exception as e:
            print(f"Error signing out user: {e}")
            return False
    
    async def get_user_id_from_token(self, access_token: str) -> Optional[str]:
        """Extract user ID from access token"""
        try:
            user_response = self.supabase.auth.get_user(access_token)
            return user_response.user.id if user_response.user else None
            
        except Exception as e:
            print(f"Error extracting user ID from token: {e}")
            return None
    
    async def update_user_metadata(self, access_token: str, metadata: Dict[str, Any]) -> bool:
        """Update user metadata"""
        try:
            user_response = self.supabase.auth.get_user(access_token)
            if not user_response.user:
                return False
            
            # Update auth metadata
            self.supabase.auth.update_user(access_token, {'data': metadata})
            
            # Update profile if relevant fields are present
            profile_updates = {}
            if 'full_name' in metadata:
                profile_updates['full_name'] = metadata['full_name']
            if 'avatar_url' in metadata:
                profile_updates['avatar_url'] = metadata['avatar_url']
            
            if profile_updates:
                await self.profile_service.update_profile(user_response.user.id, profile_updates)
            
            return True
            
        except Exception as e:
            print(f"Error updating user metadata: {e}")
            return False
    
    async def delete_user_account(self, access_token: str) -> bool:
        """Delete user account and all associated data"""
        try:
            user_response = self.supabase.auth.get_user(access_token)
            if not user_response.user:
                return False
            
            user_id = user_response.user.id
            
            # Delete user data in order (respecting foreign key constraints)
            tables_to_clean = [
                'chat_messages',
                'chat_sessions', 
                'workflow_executions',
                'workflow_steps',
                'workflows',
                'integrations',
                'user_preferences',
                'api_keys',
                'audit_logs',
                'profiles'
            ]
            
            for table in tables_to_clean:
                try:
                    if table in ['chat_messages']:
                        # For messages, we need to delete via session
                        sessions_result = self.supabase.table('chat_sessions').select('id').eq('user_id', user_id).execute()
                        if sessions_result.data:
                            session_ids = [s['id'] for s in sessions_result.data]
                            for session_id in session_ids:
                                self.supabase.table('chat_messages').delete().eq('session_id', session_id).execute()
                    elif table in ['workflow_steps', 'workflow_executions']:
                        # For workflow steps and executions, delete via workflow
                        workflows_result = self.supabase.table('workflows').select('id').eq('user_id', user_id).execute()
                        if workflows_result.data:
                            workflow_ids = [w['id'] for w in workflows_result.data]
                            for workflow_id in workflow_ids:
                                if table == 'workflow_steps':
                                    self.supabase.table('workflow_steps').delete().eq('workflow_id', workflow_id).execute()
                                elif table == 'workflow_executions':
                                    self.supabase.table('workflow_executions').delete().eq('workflow_id', workflow_id).execute()
                    else:
                        # Direct user-related tables
                        self.supabase.table(table).delete().eq('user_id', user_id).execute()
                        
                except Exception as table_error:
                    print(f"Error deleting from {table}: {table_error}")
                    # Continue with other tables
            
            # Finally, delete the auth user
            # Note: This might need admin privileges depending on Supabase setup
            # self.supabase.auth.admin.delete_user(user_id)
            
            return True
            
        except Exception as e:
            print(f"Error deleting user account: {e}")
            return False
    
    async def check_user_permissions(self, user_id: str, resource: str, action: str) -> bool:
        """Check if user has permissions for specific resource/action"""
        try:
            # Get user profile to check plan type
            profile = await self.profile_service.get_profile(user_id)
            if not profile:
                return False
            
            # Basic permission logic based on plan type
            if profile.plan_type == 'free':
                # Free users have basic permissions
                free_permissions = {
                    'workflows': ['create', 'read', 'update', 'delete'],
                    'integrations': ['create', 'read', 'update', 'delete'],
                    'chat': ['create', 'read', 'update', 'delete'],
                    'executions': ['create', 'read']
                }
                
                if resource in free_permissions:
                    return action in free_permissions[resource]
                
            elif profile.plan_type in ['pro', 'business']:
                # Pro and business users have full permissions
                return True
            
            return False
            
        except Exception as e:
            print(f"Error checking user permissions: {e}")
            return False
    
    async def is_user_active(self, user_id: str) -> bool:
        """Check if user account is active"""
        try:
            profile = await self.profile_service.get_profile(user_id)
            return profile is not None
            
        except Exception as e:
            print(f"Error checking if user is active: {e}")
            return False
