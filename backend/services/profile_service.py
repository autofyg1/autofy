"""
Profile service for user profile management
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from supabase import Client
from config.database import Profile


class ProfileService:
    """Service for managing user profiles"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def get_profile(self, user_id: str) -> Optional[Profile]:
        """Get user profile by ID"""
        try:
            result = self.supabase.table('profiles').select('*').eq('id', user_id).single().execute()
            
            if result.data:
                return Profile(**result.data)
            return None
            
        except Exception as e:
            print(f"Error fetching profile for user {user_id}: {e}")
            return None
    
    async def create_profile(self, user_id: str, email: str, **kwargs) -> Profile:
        """Create a new user profile"""
        now = datetime.now(timezone.utc)
        
        # Ensure the auth user exists before creating profile
        try:
            auth_user = self.supabase.auth.admin.get_user_by_id(user_id)
            if not auth_user.user:
                raise ValueError(f"Auth user {user_id} does not exist")
        except Exception as auth_error:
            print(f"Warning: Could not verify auth user exists: {auth_error}")
            # Continue anyway as this might be a permissions issue
        
        profile_data = {
            'id': user_id,
            'email': email,
            'full_name': kwargs.get('full_name'),
            'avatar_url': kwargs.get('avatar_url'),
            'timezone': kwargs.get('timezone', 'UTC'),
            'plan_type': kwargs.get('plan_type', 'free'),
            'credits_used': 0,
            'credits_limit': kwargs.get('credits_limit', 1000),
            'onboarding_completed': False,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        try:
            result = self.supabase.table('profiles').insert(profile_data).execute()
            return Profile(**result.data[0])
            
        except Exception as e:
            # More detailed error logging
            error_msg = str(e)
            if "foreign key constraint" in error_msg.lower():
                print(f"Foreign key constraint error - user {user_id} may not exist in auth.users table")
                print(f"Full error: {e}")
                raise ValueError(f"User {user_id} does not exist in authentication system")
            else:
                print(f"Error creating profile: {e}")
                raise
    
    async def update_profile(self, user_id: str, updates: Dict[str, Any]) -> Profile:
        """Update user profile"""
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        try:
            result = self.supabase.table('profiles').update(updates).eq('id', user_id).execute()
            return Profile(**result.data[0])
            
        except Exception as e:
            print(f"Error updating profile: {e}")
            raise
    
    async def complete_onboarding(self, user_id: str) -> Profile:
        """Mark user onboarding as completed"""
        return await self.update_profile(user_id, {'onboarding_completed': True})
    
    async def use_credits(self, user_id: str, credits: int) -> Profile:
        """Use credits from user account"""
        profile = await self.get_profile(user_id)
        if not profile:
            raise ValueError("Profile not found")
        
        if profile.credits_used + credits > profile.credits_limit:
            raise ValueError("Insufficient credits")
        
        return await self.update_profile(user_id, {
            'credits_used': profile.credits_used + credits
        })
    
    async def reset_monthly_credits(self, user_id: str) -> Profile:
        """Reset monthly credit usage"""
        return await self.update_profile(user_id, {'credits_used': 0})
    
    async def get_credit_usage(self, user_id: str) -> Dict[str, int]:
        """Get credit usage information"""
        profile = await self.get_profile(user_id)
        if not profile:
            return {'used': 0, 'limit': 1000, 'remaining': 1000}
        
        return {
            'used': profile.credits_used,
            'limit': profile.credits_limit,
            'remaining': profile.credits_limit - profile.credits_used
        }
