// Test script to check create-zap function
const SUPABASE_URL = 'https://pmvzgrlufqgbxgpkaqke.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdnpncmx1ZnFnYnhncGthcWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTM5MzEsImV4cCI6MjA0OTkyOTkzMX0.OWxO0WGK2NyNmNKZiQ4I6r3O7rEqH8ZQPFR0_8yTcfI';

// You need to get a valid JWT token from your auth system
// This is just a test structure - you'll need your actual JWT token

const testZap = {
  "name": "Test Zap",
  "description": "Test automation",
  "steps": [
    {
      "step_type": "trigger",
      "service_name": "gmail",
      "event_type": "new_email",
      "configuration": {
        "keywords": "test"
      }
    },
    {
      "step_type": "action",
      "service_name": "telegram",
      "event_type": "send_message",
      "configuration": {
        "message_template": "New email: {{subject}}"
      }
    }
  ]
};

async function testCreateZap() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-zap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer YOUR_JWT_TOKEN_HERE` // Replace with actual token
      },
      body: JSON.stringify({
        zap_data: testZap,
        session_id: 'test-session'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run test
// testCreateZap();

console.log('Test script created. Replace YOUR_JWT_TOKEN_HERE with a valid token and uncomment the test call to run.');
