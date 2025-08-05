import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pmvzgrlufqgbxgpkaqke.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

async function testZapExecution() {
  try {
    console.log('🧪 Testing zap execution with new configuration...');
    
    // Call the edge function to test execution
    const response = await fetch(`${supabaseUrl}/functions/v1/zap-executor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'cron'  // Execute all active zaps
      })
    });

    const result = await response.json();
    
    console.log('📊 Execution Results:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Zap execution completed successfully!');
      if (result.summary) {
        console.log(`📈 Summary: ${result.summary.successful} successful, ${result.summary.failed} failed out of ${result.summary.total} total`);
      }
    } else {
      console.log('❌ Zap execution failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing zap execution:', error.message);
  }
}

async function testSingleZap() {
  try {
    console.log('🔍 Finding active zaps to test...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: zaps, error } = await supabase
      .from('zaps')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('Error fetching zaps:', error);
      return;
    }

    if (zaps.length === 0) {
      console.log('❌ No active zaps found to test');
      return;
    }

    const testZap = zaps[0];
    console.log(`🎯 Testing single zap: ${testZap.name} (${testZap.id})`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/zap-executor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'single',
        zapId: testZap.id
      })
    });

    const result = await response.json();
    
    console.log('📊 Single Zap Results:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error testing single zap:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Notion integration tests...\n');
  
  await testZapExecution();
  console.log('\n' + '='.repeat(50) + '\n');
  await testSingleZap();
  
  console.log('\n✅ Test suite completed!');
}

runTests();
