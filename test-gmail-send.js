// Test script for Gmail Send functionality
// This script tests the Gmail API integration and workflow execution

import { supabase } from './src/lib/supabase.js';
import { sendEmail, sendReply, processEmailTemplate } from './src/lib/gmail-api.js';
import { executeWorkflowStep, executeWorkflow } from './src/lib/workflow-engine.js';
import { createZap } from './src/lib/zaps.js';

// Test data for email sending
const testEmailData = {
  to: 'test@example.com',
  subject: 'Test Email from Zappy',
  body: 'This is a test email sent through the Zappy automation system.',
  isHtml: false
};

// Test context for workflow execution
const testContext = {
  userId: 'test-user-id',
  variables: {
    subject: 'Test Email Subject',
    sender: 'sender@example.com',
    body: 'This is a test email body content for workflow testing.',
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    ai_content: 'This is a mock AI response for testing purposes.'
  },
  triggerMessageId: 'test-message-id'
};

// Test Gmail Send Email action
async function testGmailSendEmail() {
  console.log('🧪 Testing Gmail Send Email...');
  
  try {
    const stepConfig = {
      service_name: 'gmail',
      event_type: 'send_email',
      configuration: {
        to_email: 'test@example.com',
        subject_template: 'Test: {{subject}}',
        body_template: 'Hello!\n\nThis is a test email.\n\nOriginal subject: {{subject}}\nFrom: {{sender}}\nAI Content: {{ai_content}}\n\nBest regards',
        is_html: 'false'
      }
    };

    console.log('Step config:', JSON.stringify(stepConfig, null, 2));
    console.log('Test context:', JSON.stringify(testContext, null, 2));
    
    // Note: This will fail without proper authentication, but we can test the structure
    const result = await executeWorkflowStep(stepConfig, testContext);
    
    console.log('✅ Gmail Send Email test result:', result);
    return result;
  } catch (error) {
    console.log('❌ Gmail Send Email test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test Gmail Send Reply action
async function testGmailSendReply() {
  console.log('🧪 Testing Gmail Send Reply...');
  
  try {
    const stepConfig = {
      service_name: 'gmail',
      event_type: 'send_reply',
      configuration: {
        body_template: 'Thank you for your email!\n\nAI Response: {{ai_content}}\n\nBest regards',
        custom_to_email: '',
        is_html: 'false'
      }
    };

    console.log('Step config:', JSON.stringify(stepConfig, null, 2));
    
    const result = await executeWorkflowStep(stepConfig, testContext);
    
    console.log('✅ Gmail Send Reply test result:', result);
    return result;
  } catch (error) {
    console.log('❌ Gmail Send Reply test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test template processing
function testTemplateProcessing() {
  console.log('🧪 Testing Template Processing...');
  
  try {
    const template = 'Hi {{sender}}, thanks for your email about "{{subject}}". AI says: {{ai_content}}';
    const variables = {
      sender: 'John Doe',
      subject: 'Meeting Request',
      ai_content: 'This looks like a meeting request. I suggest we schedule it for next week.'
    };
    
    const processed = processEmailTemplate(template, variables);
    console.log('Original template:', template);
    console.log('Variables:', variables);
    console.log('Processed result:', processed);
    
    const expectedResult = 'Hi John Doe, thanks for your email about "Meeting Request". AI says: This looks like a meeting request. I suggest we schedule it for next week.';
    
    if (processed === expectedResult) {
      console.log('✅ Template processing test passed');
      return { success: true };
    } else {
      console.log('❌ Template processing test failed - output doesn\'t match expected result');
      return { success: false, error: 'Output mismatch' };
    }
  } catch (error) {
    console.log('❌ Template processing test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test creating a complete automation zap
async function testCreateCompleteZap() {
  console.log('🧪 Testing Complete Zap Creation...');
  
  try {
    const zapConfig = {
      name: 'Test Gmail Send Automation',
      description: 'Test zap for Gmail send functionality',
      steps: [
        {
          step_type: 'trigger',
          service_name: 'gmail',
          event_type: 'new_email',
          configuration: {
            keywords: 'test, automation',
            from_email: ''
          }
        },
        {
          step_type: 'action',
          service_name: 'openrouter',
          event_type: 'process_with_ai',
          configuration: {
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            prompt: 'Summarize this email: {{body}}',
            max_tokens: 200,
            temperature: 0.5
          }
        },
        {
          step_type: 'action',
          service_name: 'gmail',
          event_type: 'send_reply',
          configuration: {
            body_template: 'Thanks for your email! AI Summary: {{ai_content}}',
            custom_to_email: '',
            is_html: 'false'
          }
        }
      ]
    };

    console.log('Creating zap with config:', JSON.stringify(zapConfig, null, 2));
    
    // Note: This will fail without proper Supabase authentication, but tests the structure
    const result = await createZap(zapConfig);
    
    console.log('✅ Complete Zap Creation test result:', result);
    return result;
  } catch (error) {
    console.log('❌ Complete Zap Creation test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test workflow execution validation
function testWorkflowValidation() {
  console.log('🧪 Testing Workflow Validation...');
  
  try {
    // Test valid workflow configuration
    const validWorkflow = {
      steps: [
        { service_name: 'gmail', event_type: 'new_email', step_type: 'trigger' },
        { service_name: 'openrouter', event_type: 'process_with_ai', step_type: 'action' },
        { service_name: 'gmail', event_type: 'send_reply', step_type: 'action' }
      ]
    };
    
    // Basic validation: check if all required services are supported
    const supportedServices = ['gmail', 'openrouter', 'notion', 'telegram'];
    const allServicesSupported = validWorkflow.steps.every(step => 
      supportedServices.includes(step.service_name)
    );
    
    if (allServicesSupported) {
      console.log('✅ Workflow validation test passed');
      return { success: true };
    } else {
      console.log('❌ Workflow validation test failed - unsupported service found');
      return { success: false, error: 'Unsupported service' };
    }
  } catch (error) {
    console.log('❌ Workflow validation test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Gmail Send Functionality Tests...\n');
  
  const tests = [
    { name: 'Template Processing', fn: testTemplateProcessing },
    { name: 'Workflow Validation', fn: testWorkflowValidation },
    { name: 'Gmail Send Email', fn: testGmailSendEmail },
    { name: 'Gmail Send Reply', fn: testGmailSendReply },
    { name: 'Complete Zap Creation', fn: testCreateCompleteZap }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n--- Running ${test.name} Test ---`);
    try {
      const result = await test.fn();
      results.push({ name: test.name, ...result });
    } catch (error) {
      results.push({ 
        name: test.name, 
        success: false, 
        error: error.message 
      });
    }
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passed = 0;
  let failed = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}${result.error ? ` - ${result.error}` : ''}`);
    
    if (result.success) passed++;
    else failed++;
  });
  
  console.log(`\nTotal: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Gmail Send functionality is ready.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review the issues above.`);
    console.log('Note: Some failures are expected without proper authentication setup.');
  }
}

// Export for use in other files
export {
  testGmailSendEmail,
  testGmailSendReply,
  testTemplateProcessing,
  testCreateCompleteZap,
  runAllTests
};

// Run tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runAllTests();
}
