#!/usr/bin/env python3
"""
Fix Notion Integration Configuration

This script fixes the issue where workflow configurations are using database_id
for what are actually page IDs. The error "Could not find database with ID"
occurs because the system tries to create pages in what it thinks is a database,
but the ID actually points to a Notion page.

This script:
1. Updates all existing workflow configurations to use page_id instead of database_id
2. Tests the Notion API to verify the IDs are actually pages
3. Provides a verification test
"""

import sys
import os
import json
from typing import Dict, Any, List

# Add backend to path
sys.path.append('backend')

from config.database import get_supabase
from notion_client import Client as NotionClient

def get_notion_access_token() -> str:
    """Get a Notion access token from the first available integration"""
    supabase = get_supabase()
    
    result = supabase.table('integrations').select('*').eq('service_name', 'notion').eq('status', 'active').execute()
    
    if not result.data:
        raise Exception("No active Notion integrations found")
    
    integration = result.data[0]
    credentials = integration['credentials']
    
    if isinstance(credentials, str):
        credentials = json.loads(credentials)
    
    access_token = credentials.get('access_token')
    if not access_token:
        raise Exception("No access token found in Notion integration")
    
    return access_token

def format_notion_id(notion_id: str) -> str:
    """Format a Notion ID with dashes"""
    clean_id = notion_id.replace('-', '')
    if len(clean_id) == 32:
        return f"{clean_id[:8]}-{clean_id[8:12]}-{clean_id[12:16]}-{clean_id[16:20]}-{clean_id[20:]}"
    return notion_id

def test_notion_id(access_token: str, notion_id: str) -> Dict[str, Any]:
    """Test if a Notion ID is a database or page"""
    client = NotionClient(auth=access_token)
    formatted_id = format_notion_id(notion_id)
    
    result = {
        'id': notion_id,
        'formatted_id': formatted_id,
        'is_database': False,
        'is_page': False,
        'title': 'Unknown',
        'error': None
    }
    
    # Try as database first
    try:
        db = client.databases.retrieve(database_id=formatted_id)
        result['is_database'] = True
        result['title'] = db.get('title', [{}])[0].get('text', {}).get('content', 'Untitled Database')
        return result
    except Exception as e:
        result['error'] = str(e)
    
    # Try as page
    try:
        page = client.pages.retrieve(page_id=formatted_id)
        result['is_page'] = True
        result['error'] = None
        
        # Try to get title from properties
        properties = page.get('properties', {})
        title = 'Untitled Page'
        
        # Look for title in different property names
        for prop_name, prop_data in properties.items():
            if prop_data.get('type') == 'title':
                title_list = prop_data.get('title', [])
                if title_list:
                    title = title_list[0].get('text', {}).get('content', 'Untitled Page')
                    break
        
        result['title'] = title
        return result
    except Exception as e2:
        result['error'] = f"Not a database: {str(e)[:100]}... | Not a page: {str(e2)[:100]}..."
    
    return result

def fix_notion_configurations():
    """Fix all Notion workflow configurations"""
    supabase = get_supabase()
    
    print("🔧 FIXING NOTION WORKFLOW CONFIGURATIONS")
    print("=" * 50)
    
    # Get access token for testing
    try:
        access_token = get_notion_access_token()
        print("✅ Found Notion access token")
    except Exception as e:
        print(f"❌ Could not get Notion access token: {e}")
        return False
    
    # Get all workflow steps with Notion create_page events
    result = supabase.table('workflow_steps').select('*').eq('service_name', 'notion').eq('event_type', 'create_page').execute()
    
    if not result.data:
        print("ℹ️  No Notion workflow steps found")
        return True
    
    print(f"📊 Found {len(result.data)} Notion workflow steps to check")
    
    for step in result.data:
        step_id = step['id']
        config = step['configuration']
        
        print(f"\n🔍 Checking Step ID: {step_id}")
        
        # Check if it has database_id
        database_id = config.get('database_id')
        page_id = config.get('page_id')
        
        if database_id and not page_id:
            print(f"   Found database_id: {database_id}")
            
            # Test what this ID actually is
            test_result = test_notion_id(access_token, database_id)
            
            if test_result['is_page']:
                print(f"   ✅ ID is actually a PAGE: '{test_result['title']}'")
                print(f"   🔄 Converting database_id to page_id...")
                
                # Update the configuration
                new_config = config.copy()
                new_config['page_id'] = database_id
                del new_config['database_id']
                
                # Update in database
                update_result = supabase.table('workflow_steps').update({
                    'configuration': new_config
                }).eq('id', step_id).execute()
                
                if update_result.data:
                    print(f"   ✅ Updated configuration successfully")
                else:
                    print(f"   ❌ Failed to update configuration")
                    
            elif test_result['is_database']:
                print(f"   ℹ️  ID is actually a DATABASE: '{test_result['title']}' (no change needed)")
            else:
                print(f"   ⚠️  Could not determine ID type: {test_result['error']}")
        
        elif page_id:
            print(f"   ✅ Already uses page_id: {page_id}")
        else:
            print(f"   ⚠️  No database_id or page_id found in configuration")
    
    print(f"\n✅ Configuration fix completed!")
    return True

def test_fixed_configurations():
    """Test that the fixed configurations work"""
    supabase = get_supabase()
    
    print("\n🧪 TESTING FIXED CONFIGURATIONS")
    print("=" * 50)
    
    try:
        access_token = get_notion_access_token()
    except Exception as e:
        print(f"❌ Could not get access token for testing: {e}")
        return False
    
    # Get all workflow steps with Notion create_page events
    result = supabase.table('workflow_steps').select('*').eq('service_name', 'notion').eq('event_type', 'create_page').execute()
    
    if not result.data:
        print("ℹ️  No Notion workflow steps found")
        return True
    
    all_good = True
    
    for step in result.data:
        step_id = step['id']
        config = step['configuration']
        
        print(f"\n🔍 Testing Step ID: {step_id}")
        
        page_id = config.get('page_id')
        database_id = config.get('database_id')
        
        if page_id:
            test_result = test_notion_id(access_token, page_id)
            if test_result['is_page']:
                print(f"   ✅ page_id '{page_id}' is accessible as a page: '{test_result['title']}'")
            else:
                print(f"   ❌ page_id '{page_id}' is not accessible: {test_result['error']}")
                all_good = False
        elif database_id:
            test_result = test_notion_id(access_token, database_id)
            if test_result['is_database']:
                print(f"   ✅ database_id '{database_id}' is accessible as a database: '{test_result['title']}'")
            else:
                print(f"   ❌ database_id '{database_id}' is not accessible: {test_result['error']}")
                all_good = False
        else:
            print(f"   ⚠️  No page_id or database_id found")
            all_good = False
    
    if all_good:
        print(f"\n🎉 All configurations are working correctly!")
    else:
        print(f"\n⚠️  Some configurations still have issues")
    
    return all_good

if __name__ == "__main__":
    print("🚀 NOTION CONFIGURATION FIXER")
    print("=" * 50)
    
    try:
        # Fix configurations
        success = fix_notion_configurations()
        
        if success:
            # Test the fixes
            test_fixed_configurations()
        
        print(f"\n✅ Script completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Script failed with error: {e}")
        import traceback
        traceback.print_exc()
