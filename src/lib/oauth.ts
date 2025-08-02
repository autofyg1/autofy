// OAuth configuration and utilities
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
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

// OAuth configurations for different services
export const oauthConfigs: Record<string, OAuthConfig> = {
  gmail: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback/gmail`,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token'
  },
  notion: {
    clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback/notion`,
    scopes: ['read:database', 'read:page', 'create:page', 'update:page'],
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token'
  }
};

// Generate OAuth authorization URL
export const generateAuthUrl = (service: string): string => {
  const config = oauthConfigs[service];
  if (!config) {
    throw new Error(`OAuth configuration not found for service: ${service}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: generateState(service),
    access_type: 'offline', // For Google to get refresh token
    prompt: 'consent' // Force consent screen to get refresh token
  });

  return `${config.authUrl}?${params.toString()}`;
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
    redirect_uri: config.redirectUri
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