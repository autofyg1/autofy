#!/usr/bin/env python3

import json
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from config.database import get_supabase

supabase = get_supabase()
wf_id = '0df9322d-f6d1-4ac5-ad67-e8ff9765dea2'

# Get the notion step config
steps = supabase.table('workflow_steps').select('*').eq('workflow_id', wf_id).eq('step_type', 'action').execute()
if steps.data:
    step = steps.data[0]
    print('Notion Step Configuration:')
    print(f'Service: {step["service_name"]}')
    print(f'Action: {step["action_name"]}')
    config = step['configuration']
    if isinstance(config, str):
        config = json.loads(config)
    print(f'Config: {config}')
    print()
    
    # Check if database_id is set
    if not config.get('database_id'):
        print('❌ database_id is missing from configuration!')
    else:
        print(f'✅ Database ID: {config.get("database_id")}')
        
    if not config.get('title_template'):
        print('❌ title_template is missing from configuration!')
    else:
        print(f'✅ Title template: {config.get("title_template")}')
else:
    print('No action steps found!')
