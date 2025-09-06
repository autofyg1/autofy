/**
 * Debug script to test authentication and API connectivity
 * This script will help identify why the dashboard is stuck loading
 */

// Test script to debug authentication issues
async function testApiConnectivity() {
    const BACKEND_URL = 'http://localhost:8000';
    
    console.log('🔍 Testing API connectivity...\n');
    
    // Test 1: Basic backend connectivity (no auth required)
    try {
        console.log('1️⃣ Testing basic backend connectivity...');
        const servicesResponse = await fetch(`${BACKEND_URL}/api/services`);
        
        if (servicesResponse.ok) {
            const services = await servicesResponse.json();
            console.log('✅ Backend is responding');
            console.log('📋 Available services:', services.services.length);
        } else {
            console.log('❌ Backend services endpoint failed:', servicesResponse.status);
        }
    } catch (error) {
        console.log('❌ Cannot connect to backend:', error.message);
        return;
    }
    
    // Test 2: Protected endpoint (requires auth)
    try {
        console.log('\n2️⃣ Testing protected endpoint without auth...');
        const workflowResponse = await fetch(`${BACKEND_URL}/api/workflows`);
        
        if (workflowResponse.status === 401) {
            console.log('✅ Auth protection is working (401 Unauthorized)');
        } else {
            console.log('⚠️  Unexpected response:', workflowResponse.status);
        }
    } catch (error) {
        console.log('❌ Error testing protected endpoint:', error.message);
    }
    
    console.log('\n📊 Summary:');
    console.log('- Backend is running on port 8000');
    console.log('- Services endpoint is accessible');
    console.log('- Protected endpoints require authentication');
    console.log('\n💡 Next steps:');
    console.log('1. Check if you are logged in to the frontend');
    console.log('2. Check browser dev tools for any JavaScript errors');
    console.log('3. Check network tab for failed API requests');
    console.log('4. Verify Supabase authentication is working');
}

// Test function for Node.js environment
if (typeof window === 'undefined') {
    // Running in Node.js
    console.log('🚀 Running API connectivity test...\n');
    
    import('node-fetch').then(({ default: fetch }) => {
        global.fetch = fetch;
        testApiConnectivity();
    }).catch(() => {
        console.log('❌ node-fetch not available. Please run: npm install node-fetch');
        console.log('Or test this manually in the browser console.');
    });
} else {
    // Running in browser
    testApiConnectivity();
}

// Browser console instructions
console.log(`
🌐 To run this test in the browser:
1. Open your browser's developer console (F12)
2. Navigate to your AutoFy dashboard 
3. Paste the testApiConnectivity() function above
4. Run: testApiConnectivity()

🔧 Additional debugging commands for browser console:

// Check if user is authenticated
supabase.auth.getSession().then(console.log);

// Check current user
supabase.auth.getUser().then(console.log);

// Test API client directly
apiClient.getAvailableServices().then(console.log).catch(console.error);

// Test workflows endpoint specifically  
apiClient.getWorkflows().then(console.log).catch(console.error);
`);
