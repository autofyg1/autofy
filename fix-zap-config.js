import { createClient } from '@supabase/supabase-js';

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pmvzgrlufqgbxgpkaqke.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixZapConfigurations() {
  try {
    console.log('🔍 Looking for zap steps with the problematic database_id...');
    
    // First, let's see what we have
    const { data: steps, error: selectError } = await supabase
      .from('zap_steps')
      .select('*')
      .eq('service_name', 'notion')
      .eq('event_type', 'create_page');

    if (selectError) {
      console.error('Error fetching zap steps:', selectError);
      return;
    }

    console.log(`Found ${steps.length} notion create_page steps:`);
    steps.forEach(step => {
      console.log(`- Step ${step.id}: ${JSON.stringify(step.configuration)}`);
    });

    // Find steps with the problematic database_id (handle both formats)
    const problematicIds = [
      '245c6d54-3dcf-805b-9b0e-f5c372f58e3c',  // With dashes
      '245c6d543dcf805b9b0ef5c372f58e3c'       // Without dashes
    ];
    
    const problematicSteps = steps.filter(step => 
      problematicIds.includes(step.configuration.database_id)
    );

    if (problematicSteps.length === 0) {
      console.log('✅ No problematic steps found with that database_id');
      return;
    }

    console.log(`🔧 Found ${problematicSteps.length} steps to fix...`);

    // Update each problematic step
    for (const step of problematicSteps) {
      const newConfiguration = {
        ...step.configuration,
        page_id: step.configuration.database_id,  // Copy database_id to page_id
      };
      delete newConfiguration.database_id;  // Remove database_id

      console.log(`Updating step ${step.id}...`);
      console.log(`  Old config: ${JSON.stringify(step.configuration)}`);
      console.log(`  New config: ${JSON.stringify(newConfiguration)}`);

      const { error: updateError } = await supabase
        .from('zap_steps')
        .update({ configuration: newConfiguration })
        .eq('id', step.id);

      if (updateError) {
        console.error(`❌ Error updating step ${step.id}:`, updateError);
      } else {
        console.log(`✅ Successfully updated step ${step.id}`);
      }
    }

    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const { data: updatedSteps, error: verifyError } = await supabase
      .from('zap_steps')
      .select('*')
      .eq('service_name', 'notion')
      .eq('event_type', 'create_page');

    if (verifyError) {
      console.error('Error verifying changes:', verifyError);
      return;
    }

    console.log('Updated configurations:');
    updatedSteps.forEach(step => {
      console.log(`- Step ${step.id}: ${JSON.stringify(step.configuration)}`);
    });

    console.log('\n✅ Configuration fix completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixZapConfigurations();
