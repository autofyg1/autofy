#!/usr/bin/env python3
"""
Simple Notion Configuration Fix

Fix workflow configurations to use page_id instead of database_id
"""

import sys
import os
import json

# Add backend to path
sys.path.append('backend')

from config.database import get_supabase

def fix_workflow_configurations():
    """Fix workflow configurations that use database_id to use page_id instead"""
    supabase = get_supabase()
    
    print("🔧 FIXING NOTION WORKFLOW CONFIGURATIONS")
    print("=" * 50)
    
    # Get all workflow steps with Notion service
    result = supabase.table('workflow_steps').select('*').eq('service_name', 'notion').execute()
    
    if not result.data:
        print("ℹ️  No Notion workflow steps found")
        return True
    
    print(f"📊 Found {len(result.data)} Notion workflow steps to check")
    
    fixed_count = 0
    
    for step in result.data:
        step_id = step['id']
        config = step['configuration']
        
        # Handle string configurations (JSON strings)
        if isinstance(config, str):
            try:
                config = json.loads(config)
            except json.JSONDecodeError:
                print(f"⚠️  Step {step_id}: Invalid JSON configuration")
                continue
        
        print(f"\n🔍 Checking Step ID: {step_id}")
        
        # Check if it has database_id but no page_id
        database_id = config.get('database_id')
        page_id = config.get('page_id')
        
        if database_id and not page_id:
            print(f"   Found database_id: {database_id}")
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
                fixed_count += 1
            else:
                print(f"   ❌ Failed to update configuration")
                
        elif page_id:
            print(f"   ✅ Already uses page_id: {page_id}")
        else:
            print(f"   ℹ️  No database_id found (may be a different type of step)")
    
    print(f"\n✅ Fixed {fixed_count} workflow configurations!")
    return True

def show_current_configurations():
    """Show current workflow configurations"""
    supabase = get_supabase()
    
    print("\n📋 CURRENT NOTION WORKFLOW CONFIGURATIONS")
    print("=" * 50)
    
    result = supabase.table('workflow_steps').select('*').eq('service_name', 'notion').execute()
    
    if not result.data:
        print("ℹ️  No Notion workflow steps found")
        return
    
    for step in result.data:
        step_id = step['id']
        config = step['configuration']
        
        # Handle string configurations (JSON strings)
        if isinstance(config, str):
            try:
                config = json.loads(config)
            except json.JSONDecodeError:
                config = {"error": "Invalid JSON"}
        
        print(f"\nStep ID: {step_id}")
        
        database_id = config.get('database_id')
        page_id = config.get('page_id')
        
        if page_id:
            print(f"  ✅ Uses page_id: {page_id}")
        elif database_id:
            print(f"  ⚠️  Uses database_id: {database_id}")
        else:
            print(f"  ❓ No database_id or page_id found")
        
        title_template = config.get('title_template', 'N/A')
        print(f"  📝 Title template: {title_template}")

if __name__ == "__main__":
    print("🚀 NOTION CONFIGURATION FIXER")
    print("=" * 50)
    
    try:
        # Show current state
        show_current_configurations()
        
        # Fix configurations
        print("\n" + "=" * 50)
        fix_workflow_configurations()
        
        # Show final state
        show_current_configurations()
        
        print(f"\n🎉 All done! Your Notion integrations should now work correctly.")
        print(f"\nThe error 'Could not find database with ID' should be resolved!")
        
    except Exception as e:
        print(f"\n❌ Script failed with error: {e}")
        import traceback
        traceback.print_exc()
