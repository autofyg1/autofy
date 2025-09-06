"""
Integration service for managing third-party service integrations
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import json
from supabase import Client
from config.database import Integration


class IntegrationService:
    """Service for managing integrations with third-party services"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def get_integrations(self, user_id: str, service_name: Optional[str] = None) -> List[Integration]:
        """Get user integrations, optionally filtered by service"""
        try:
            query = self.supabase.table('integrations').select('*').eq('user_id', user_id)
            
            if service_name:
                query = query.eq('service_name', service_name)
            
            result = query.execute()
            
            integrations = []
            for integration_data in result.data:
                # Parse JSON fields if they are strings
                if isinstance(integration_data.get('credentials'), str):
                    integration_data['credentials'] = json.loads(integration_data['credentials'])
                if isinstance(integration_data.get('configuration'), str):
                    integration_data['configuration'] = json.loads(integration_data['configuration'])
                if isinstance(integration_data.get('metadata'), str):
                    integration_data['metadata'] = json.loads(integration_data['metadata'])
                
                integrations.append(Integration(**integration_data))
            
            return integrations
            
        except Exception as e:
            print(f"Error fetching integrations for user {user_id}: {e}")
            return []
    
    async def get_integration(self, integration_id: str, user_id: str) -> Optional[Integration]:
        """Get specific integration by ID"""
        try:
            result = self.supabase.table('integrations').select('*').eq('id', integration_id).eq('user_id', user_id).single().execute()
            
            if result.data:
                integration_data = result.data
                # Parse JSON fields if they are strings
                if isinstance(integration_data.get('credentials'), str):
                    integration_data['credentials'] = json.loads(integration_data['credentials'])
                if isinstance(integration_data.get('configuration'), str):
                    integration_data['configuration'] = json.loads(integration_data['configuration'])
                if isinstance(integration_data.get('metadata'), str):
                    integration_data['metadata'] = json.loads(integration_data['metadata'])
                
                return Integration(**integration_data)
            return None
            
        except Exception as e:
            print(f"Error fetching integration {integration_id}: {e}")
            return None
    
    async def create_integration(self, user_id: str, service_name: str, display_name: str, 
                               credentials: Dict[str, Any], configuration: Dict[str, Any] = None) -> Integration:
        """Create a new integration"""
        now = datetime.now(timezone.utc)
        integration_id = str(uuid.uuid4())
        
        integration_data = {
            'id': integration_id,
            'user_id': user_id,
            'service_name': service_name,
            'display_name': display_name,
            'credentials': json.dumps(credentials),
            'configuration': json.dumps(configuration or {}),
            'status': 'active',
            'last_tested_at': None,
            'error_message': None,
            'metadata': json.dumps({}),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        try:
            result = self.supabase.table('integrations').insert(integration_data).execute()
            created_integration = result.data[0]
            
            # Convert JSON strings back to dicts for the model
            created_integration['credentials'] = json.loads(created_integration['credentials'])
            created_integration['configuration'] = json.loads(created_integration['configuration'])
            created_integration['metadata'] = json.loads(created_integration['metadata'])
            
            return Integration(**created_integration)
            
        except Exception as e:
            print(f"Error creating integration: {e}")
            raise
    
    async def update_integration(self, integration_id: str, user_id: str, updates: Dict[str, Any]) -> Integration:
        """Update integration"""
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert dict fields to JSON strings for storage
        if 'credentials' in updates:
            updates['credentials'] = json.dumps(updates['credentials'])
        if 'configuration' in updates:
            updates['configuration'] = json.dumps(updates['configuration'])
        if 'metadata' in updates:
            updates['metadata'] = json.dumps(updates['metadata'])
        
        try:
            result = self.supabase.table('integrations').update(updates).eq('id', integration_id).eq('user_id', user_id).execute()
            updated_integration = result.data[0]
            
            # Convert JSON strings back to dicts for the model
            if isinstance(updated_integration['credentials'], str):
                updated_integration['credentials'] = json.loads(updated_integration['credentials'])
            if isinstance(updated_integration['configuration'], str):
                updated_integration['configuration'] = json.loads(updated_integration['configuration'])
            if isinstance(updated_integration['metadata'], str):
                updated_integration['metadata'] = json.loads(updated_integration['metadata'])
            
            return Integration(**updated_integration)
            
        except Exception as e:
            print(f"Error updating integration: {e}")
            raise
    
    async def delete_integration(self, integration_id: str, user_id: str) -> bool:
        """Delete integration"""
        try:
            result = self.supabase.table('integrations').delete().eq('id', integration_id).eq('user_id', user_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error deleting integration: {e}")
            return False
    
    async def test_integration(self, integration_id: str, user_id: str) -> Dict[str, Any]:
        """Test integration connection"""
        integration = await self.get_integration(integration_id, user_id)
        if not integration:
            return {'success': False, 'error': 'Integration not found'}
        
        try:
            # Import the test logic based on service
            from tools.registry import get_tool_for_service
            
            tool = get_tool_for_service(integration.service_name)
            if not tool:
                return {'success': False, 'error': f'No tool available for service {integration.service_name}'}
            
            # Perform a simple test operation
            test_result = await self._perform_test_operation(tool, integration)
            
            # Update integration with test results
            await self.update_integration(integration_id, user_id, {
                'last_tested_at': datetime.now(timezone.utc).isoformat(),
                'status': 'active' if test_result['success'] else 'error',
                'error_message': test_result.get('error') if not test_result['success'] else None
            })
            
            return test_result
            
        except Exception as e:
            # Update integration with error
            await self.update_integration(integration_id, user_id, {
                'last_tested_at': datetime.now(timezone.utc).isoformat(),
                'status': 'error',
                'error_message': str(e)
            })
            
            return {'success': False, 'error': str(e)}
    
    async def _perform_test_operation(self, tool, integration: Integration) -> Dict[str, Any]:
        """Perform a test operation based on service type"""
        try:
            if integration.service_name == 'gmail':
                # Test Gmail connection by trying to fetch profile info
                from tools.gmail_tools import GmailTools
                gmail_tool = GmailTools(integration.credentials)
                result = await gmail_tool.test_connection()
                return {'success': True, 'message': 'Gmail connection successful'}
                
            elif integration.service_name == 'notion':
                # Test Notion connection
                from tools.notion_tools import NotionTools
                notion_tool = NotionTools(integration.credentials)
                result = await notion_tool.test_connection()
                return {'success': True, 'message': 'Notion connection successful'}
                
            elif integration.service_name == 'telegram':
                # Test Telegram bot connection
                from tools.telegram_tools import TelegramTools
                telegram_tool = TelegramTools(integration.credentials)
                result = await telegram_tool.test_connection()
                return {'success': True, 'message': 'Telegram bot connection successful'}
                
            else:
                return {'success': False, 'error': f'Test not implemented for service {integration.service_name}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_integration_credentials(self, user_id: str, service_name: str) -> Optional[Dict[str, Any]]:
        """Get credentials for a specific service (helper for tools)"""
        integrations = await self.get_integrations(user_id, service_name)
        
        if not integrations:
            return None
        
        # Return the first active integration for the service
        for integration in integrations:
            if integration.status == 'active':
                return integration.credentials
        
        return None
    
    async def get_service_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get statistics about user's integrations"""
        integrations = await self.get_integrations(user_id)
        
        stats = {
            'total': len(integrations),
            'active': 0,
            'error': 0,
            'by_service': {}
        }
        
        for integration in integrations:
            if integration.status == 'active':
                stats['active'] += 1
            elif integration.status == 'error':
                stats['error'] += 1
            
            if integration.service_name not in stats['by_service']:
                stats['by_service'][integration.service_name] = 0
            stats['by_service'][integration.service_name] += 1
        
        return stats
