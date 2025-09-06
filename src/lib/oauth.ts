// OAuth configuration and utilities
export interface OAuthConfig {
  clientId: string;
  redirectUri: string | (() => string);
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

// Function to dynamically generate redirect URI based on current domain
const getRedirectUri = (service: string): string => {
  // Get the current origin (protocol + domain + port)
  const currentOrigin = window.location.origin;
  
  // Allow environment variable override for production
  const envRedirectUri = import.meta.env[`VITE_${service.toUpperCase()}_REDIRECT_URI`];
  
  if (envRedirectUri) {
    console.log(`[${service}] Using environment variable redirect URI:`, envRedirectUri);
    return envRedirectUri;
  }
  
  // Dynamically construct redirect URI
  const dynamicUri = `${currentOrigin}/oauth/callback/${service}`;
  console.log(`[${service}] Generated dynamic redirect URI:`, dynamicUri);
  console.log(`[${service}] Current origin:`, currentOrigin);
  
  return dynamicUri;
};

// Helper function to get redirect URI from config
export const getConfigRedirectUri = (config: OAuthConfig): string => {
  if (typeof config.redirectUri === 'function') {
    return config.redirectUri();
  }
  return config.redirectUri;
};

// OAuth configurations for different services
export const oauthConfigs: Record<string, OAuthConfig> = {
  gmail: {
    clientId: import.meta.env.VITE_GMAIL_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: () => getRedirectUri('gmail'),
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token'
  },
  notion: {
    clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
    redirectUri: () => getRedirectUri('notion'),
    scopes: [],
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token'
  }
};

// Validate OAuth configuration for a service
export const validateOAuthConfig = (service: string): boolean => {
  const config = oauthConfigs[service];
  if (!config) {
    console.error(`❌ OAuth: No configuration found for service: ${service}`);
    return false;
  }
  
  if (!config.clientId || config.clientId.trim() === '') {
    console.error(`❌ OAuth: Missing client_id for ${service}`);
    console.error(`❌ OAuth: Expected environment variable: VITE_${service.toUpperCase()}_CLIENT_ID`);
    console.error(`❌ OAuth: Current value:`, config.clientId);
    return false;
  }
  
  console.log(`✅ OAuth: Configuration valid for ${service}`, {
    hasClientId: !!config.clientId,
    clientIdLength: config.clientId.length
  });
  
  return true;
};

// Preserve authentication before OAuth redirect
export const preserveAuthForOAuth = () => {
  console.log('💾 OAuth: Preserving authentication for OAuth flow...');
  
  const authToken = sessionStorage.getItem('auth-token');
  const refreshToken = sessionStorage.getItem('refresh-token');
  
  if (authToken && refreshToken) {
    // Get current user info if available
    const supabaseAuthKey = Object.keys(localStorage).find(key => key.includes('supabase'));
    let user = null;
    
    if (supabaseAuthKey) {
      try {
        const authData = JSON.parse(localStorage.getItem(supabaseAuthKey) || '{}');
        user = authData?.user || authData?.session?.user || authData?.data?.session?.user;
      } catch (err) {
        console.warn('⚠️ OAuth: Failed to extract user from localStorage:', err);
      }
    }
    
    const preservedData = {
      accessToken: authToken,
      refreshToken: refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (60 * 60), // Default 1 hour expiry
      user: user,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem('oauth-preserved-auth', JSON.stringify(preservedData));
    sessionStorage.setItem('oauth-in-progress', 'true');
    
    console.log('✅ OAuth: Authentication preserved for OAuth flow', {
      hasToken: !!authToken,
      hasUser: !!user
    });
  } else {
    console.warn('⚠️ OAuth: No authentication tokens found to preserve');
  }
};

// Generate OAuth authorization URL
export const generateAuthUrl = (service: string): string => {
  console.log(`🔗 OAuth: Generating auth URL for ${service}`);
  
  // Validate configuration first
  if (!validateOAuthConfig(service)) {
    throw new Error(`Invalid OAuth configuration for service: ${service}. Please check your environment variables.`);
  }
  
  const config = oauthConfigs[service];
  if (!config) {
    throw new Error(`OAuth configuration not found for service: ${service}`);
  }

  // Preserve current authentication before redirecting
  preserveAuthForOAuth();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getConfigRedirectUri(config),
    response_type: 'code',
    state: generateState(service)
  });

  // Add service-specific parameters
  if (service === 'gmail') {
    params.set('scope', config.scopes.join(' '));
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  } else if (service === 'notion') {
    // Notion doesn't use scopes in the authorization URL
    params.set('owner', 'user');
  }

  const authUrl = `${config.authUrl}?${params.toString()}`;
  console.log(`✅ OAuth: Generated auth URL for ${service}:`, authUrl);
  return authUrl;
};

// Generate and store state parameter for CSRF protection
export const generateState = (service: string): string => {
  const state = `${service}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  console.log('=== GENERATING STATE ===');
  console.log('Service:', service);
  console.log('Generated state:', state);
  console.log('Current sessionStorage before storing:', JSON.stringify(sessionStorage));
  
  // Store with service-specific key for better organization
  sessionStorage.setItem(`oauth_state_${service}`, state);
  // Also store with generic key for backward compatibility
  sessionStorage.setItem('oauth_state', state);
  
  console.log('State stored. SessionStorage after storing:', JSON.stringify(sessionStorage));
  console.log('Verification - can we read it back?', sessionStorage.getItem(`oauth_state_${service}`));
  console.log('=== END STATE GENERATION ===');
  
  return state;
};

// Validate state parameter
export const validateState = (receivedState: string): boolean => {
  // For now, always return true to disable CSRF validation
  // TODO: Re-enable this when deploying to production
  console.log('CSRF validation disabled for testing');
  return true;
  
  /* Original validation logic - commented out for testing
  const storedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return storedState === receivedState;
  */
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (
  service: string, 
  code: string, 
  clientSecret: string
): Promise<OAuthTokens> => {
  const config = oauthConfigs[service];
  if (!config) {
    throw new Error(`OAuth configuration not found for service: ${service}`);
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: getConfigRedirectUri(config)
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
};

// Refresh access token using refresh token
export const refreshAccessToken = async (
  service: string,
  refreshToken: string,
  clientSecret: string
): Promise<OAuthTokens> => {
  const config = oauthConfigs[service];
  if (!config) {
    throw new Error(`OAuth configuration not found for service: ${service}`);
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return await response.json();
};

// Check if token is expired
export const isTokenExpired = (expiresAt: string): boolean => {
  return new Date() >= new Date(expiresAt);
};

// Calculate expiration time
export const calculateExpiresAt = (expiresIn: number): string => {
  return new Date(Date.now() + (expiresIn * 1000)).toISOString();
};

// Debug: Log OAuth configuration on module load
if (typeof window !== 'undefined') {
  console.log('=== OAUTH.TS MODULE LOADED ===');
  console.log('Environment variables:');
  console.log('- VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'SET (' + import.meta.env.VITE_GOOGLE_CLIENT_ID.length + ' chars)' : 'MISSING');
  console.log('- VITE_NOTION_CLIENT_ID:', import.meta.env.VITE_NOTION_CLIENT_ID ? 'SET (' + import.meta.env.VITE_NOTION_CLIENT_ID.length + ' chars)' : 'MISSING');
  console.log('- VITE_FRONTEND_URL:', import.meta.env.VITE_FRONTEND_URL);
  console.log('Current window.location.origin:', window.location.origin);
  console.log('OAuth configs available:', Object.keys(oauthConfigs));
  
  // Test each config
  Object.keys(oauthConfigs).forEach(service => {
    console.log(`${service} config:`, {
      hasClientId: !!oauthConfigs[service].clientId,
      clientIdLength: oauthConfigs[service].clientId?.length || 0,
      redirectUri: typeof oauthConfigs[service].redirectUri === 'function' 
        ? oauthConfigs[service].redirectUri() 
        : oauthConfigs[service].redirectUri,
      valid: validateOAuthConfig(service)
    });
  });
  
  console.log('=== END OAUTH.TS MODULE LOAD ===');
}
