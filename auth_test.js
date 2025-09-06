// Simple authentication test - paste this into browser console

console.log('🧪 Starting authentication test...');

async function testAuth() {
    try {
        // Test 1: Check Supabase session
        console.log('1️⃣ Testing Supabase session...');
        const session = await supabase.auth.getSession();
        console.log('Session:', {
            hasSession: !!session.data.session,
            hasAccessToken: !!session.data.session?.access_token,
            tokenLength: session.data.session?.access_token?.length,
            expiresAt: session.data.session?.expires_at,
            currentTime: Math.floor(Date.now() / 1000)
        });

        if (!session.data.session?.access_token) {
            console.error('❌ No access token - user not authenticated');
            return;
        }

        // Test 2: Check if token is expired
        const expiresAt = session.data.session.expires_at;
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = expiresAt && currentTime > expiresAt;
        
        console.log('2️⃣ Token expiry check:', {
            expiresAt,
            currentTime,
            isExpired,
            timeUntilExpiry: expiresAt ? expiresAt - currentTime : 'N/A'
        });

        if (isExpired) {
            console.error('❌ Token is expired');
            return;
        }

        // Test 3: Manual API call with authentication
        console.log('3️⃣ Testing direct API call...');
        const response = await fetch('http://localhost:8000/api/workflows', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.data.session.access_token}`
            }
        });

        console.log('Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            return;
        }

        const data = await response.json();
        console.log('✅ API Success:', data);

        // Test 4: Test non-auth endpoint
        console.log('4️⃣ Testing non-auth endpoint...');
        const servicesResponse = await fetch('http://localhost:8000/api/services');
        console.log('Services response:', servicesResponse.status);
        const servicesData = await servicesResponse.json();
        console.log('Services data:', servicesData);

        console.log('🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testAuth();
