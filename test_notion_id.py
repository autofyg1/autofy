#!/usr/bin/env python3
"""
Test the problematic Notion ID
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from config.database import get_supabase
from notion_client import Client as NotionClient
import json

def main():
    # Test the specific database ID that's causing the error
    database_id = '269a682d176e8040a1c8edb7d472ee00'
    formatted_id = f'{database_id[:8]}-{database_id[8:12]}-{database_id[12:16]}-{database_id[16:20]}-{database_id[20:]}'

    print(f'Original ID: {database_id}')
    print(f'Formatted ID: {formatted_id}')
    print()

    # Get a user's Notion token to test
    supabase = get_supabase()
    integrations = supabase.table('integrations').select('*').eq('service_name', 'notion').execute()

    if integrations.data:
        integration = integrations.data[0]
        print(f'Found integration for user: {integration["user_id"]}')
        
        creds = json.loads(integration['credentials']) if isinstance(integration['credentials'], str) else integration['credentials']
        access_token = creds.get('access_token')
        
        if access_token:
            print('Testing access to the Notion ID...')
            notion = NotionClient(auth=access_token)
            
            # First try as database
            try:
                db = notion.databases.retrieve(database_id=formatted_id)
                print('✅ ID is a DATABASE:')
                title = db.get('title', [{}])[0].get('text', {}).get('content', 'Untitled')
                print(f'   Title: {title}')
            except Exception as e:
                print(f'❌ Not a database: {e}')
                
                # Try as page
                try:
                    page = notion.pages.retrieve(page_id=formatted_id)
                    print('✅ ID is a PAGE:')
                    
                    # Try to get title from properties
                    title_prop = page.get('properties', {}).get('title')
                    if title_prop:
                        title = title_prop.get('title', [{}])[0].get('text', {}).get('content', 'Untitled')
                        print(f'   Title: {title}')
                    else:
                        # Try alternative title properties
                        props = page.get('properties', {})
                        for prop_name, prop_data in props.items():
                            if prop_data.get('type') == 'title':
                                title = prop_data.get('title', [{}])[0].get('text', {}).get('content', 'Untitled')
                                print(f'   Title: {title}')
                                break
                        else:
                            print('   Title: (No title property)')
                    
                    print()
                    print('🔍 DIAGNOSIS:')
                    print('   This ID points to a Notion PAGE, not a database!')
                    print('   The error occurs because the system is trying to create')
                    print('   a page IN a database, but this ID is actually a page.')
                    print()
                    print('🔧 SOLUTION:')
                    print('   The workflow configuration should use "page_id" instead of "database_id"')
                    print('   OR you need to use the actual database ID where you want pages created.')
                    
                except Exception as e2:
                    print(f'❌ Not a page either: {e2}')
        else:
            print('❌ No access token found')
    else:
        print('❌ No Notion integrations found')

if __name__ == "__main__":
    main()
