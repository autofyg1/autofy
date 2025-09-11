import sys
sys.path.append('backend')
from config.database import get_supabase
import json

print('🔧 FIXING NOTION WORKFLOW CONFIGURATIONS')
print('='*50)

supabase = get_supabase()

# The problematic database ID that is actually a page ID
problematic_id = '269a682d176e8040a1c8edb7d472ee00'

# Get all workflow steps that use this ID as database_id
steps = supabase.table('workflow_steps').select('*').eq('service_name', 'notion').execute()

fixed_count = 0
for step in steps.data:
    configuration = step['configuration']
    
    # Parse configuration if it's a string
    if isinstance(configuration, str):
        try:
            config_dict = json.loads(configuration)
        except json.JSONDecodeError:
            print(f"❌ Skipping step {step['id']} - invalid JSON configuration")
            continue
    else:
        config_dict = configuration
    
    # Check if this step uses the problematic database_id
    if config_dict.get('database_id') == problematic_id:
        print(f"\n🔍 Found problematic step: {step['id']}")
        print(f"   Workflow: {step['workflow_id']}")
        print(f"   Current config: database_id = {problematic_id}")
        
        # Update configuration: change database_id to page_id
        config_dict['page_id'] = config_dict.pop('database_id')
        
        # Update in database
        try:
            update_result = supabase.table('workflow_steps').update({
                'configuration': config_dict
            }).eq('id', step['id']).execute()
            
            if update_result.data:
                print(f"   ✅ Updated: database_id → page_id")
                fixed_count += 1
            else:
                print(f"   ❌ Failed to update step {step['id']}")
                
        except Exception as e:
            print(f"   ❌ Error updating step {step['id']}: {e}")

print(f"\n🎉 SUMMARY:")
print(f"   Fixed {fixed_count} workflow step(s)")
print(f"   Changed 'database_id' to 'page_id' for ID: {problematic_id}")

if fixed_count > 0:
    print(f"\n✅ Your Notion integration should now work!")
    print(f"   The system will create child pages under your Notion page instead of")
    print(f"   trying to create database pages (which was causing the error).")
else:
    print(f"\n⚠️  No steps were updated. Please check manually.")
