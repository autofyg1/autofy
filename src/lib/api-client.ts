/**
 * API Client for Autofy LangChain Backend
 * Handles all communication with the new Python backend
 */

import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Auth-related interfaces
interface AuthResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
  user?: {
    id: string;
    email: string;
    email_confirmed_at?: string;
  };
  profile?: any;
  message?: string;
}

interface SignUpRequest {
  email: string;
  password: string;
  full_name?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    console.log('🔑 API Client: Getting auth headers...');
    
    // Always try sessionStorage first (most reliable)
    const directToken = sessionStorage.getItem('auth-token');
    if (directToken) {
      console.log('✅ API Client: Using direct token from sessionStorage');
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directToken}`,
      };
    }
    
    try {
      // Get session with a very short timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 2000) // Very short 2-second timeout
      );
      
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);
      
      const session = sessionResult.data.session;
      
      console.log('🔍 API Client: Session data:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionExpiry: session?.expires_at,
        currentTime: Math.floor(Date.now() / 1000),
        isExpired: session?.expires_at ? Math.floor(Date.now() / 1000) >= session.expires_at : null
      });
      
      if (!session?.access_token) {
        console.error('❌ API Client: No authentication token available');
        throw new Error('No authentication token available');
      }

      console.log('✅ API Client: Auth headers prepared successfully');
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };
      
    } catch (error) {
      console.error('❌ API Client: Auth error:', error);
      if (error instanceof Error && error.message === 'Session timeout') {
        // Fallback to localStorage approach
        console.log('🔄 API Client: Session timeout, trying localStorage...');
        const localStorage = window.localStorage;
        
        // Try to get the exact key we know exists
        console.log('🔍 API Client: Attempting to get sb-localhost-auth-token...');
        const authItem = localStorage.getItem('sb-localhost-auth-token');
        
        let authData = null;
        let foundKey = null;
        
        if (authItem) {
          console.log(`🔍 API Client: Found auth data in sb-localhost-auth-token`);
          console.log(`🔍 API Client: Raw data length: ${authItem.length}`);
          console.log(`🔍 API Client: Raw data preview: ${authItem.substring(0, 200)}`);
          
          try {
            authData = JSON.parse(authItem);
            foundKey = 'sb-localhost-auth-token';
            console.log(`🔍 API Client: Successfully parsed sb-localhost-auth-token`);
            console.log(`🔍 API Client: Auth data keys:`, Object.keys(authData));
          } catch (parseErr) {
            console.error(`❌ API Client: Failed to parse sb-localhost-auth-token:`, parseErr);
          }
        } else {
          console.error('❌ API Client: sb-localhost-auth-token returned null/undefined');
        }
        
        if (authData) {
          // Try different possible access token paths
          const accessToken = authData.access_token || 
                             authData.session?.access_token ||
                             authData.data?.session?.access_token;
                             
          if (accessToken) {
            console.log(`✅ API Client: Using cached token from ${foundKey}`);
            return {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            };
          } else {
            console.error('❌ API Client: No access_token found in auth data:', Object.keys(authData));
          }
        }
      }
      
      throw new Error('Authentication failed - session not available');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const maxRetries = 3;
    console.log(`📡 API Request: ${options.method || 'GET'} ${this.baseUrl}${endpoint} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      // Handle auth errors specifically
      if (response.status === 401 || response.status === 403) {
        console.warn(`⚠️ API Auth Error: ${response.status}`);
        
        // Don't immediately force logout - try to recover first
        if (retryCount < 1) {
          console.log('🔄 API Client: Attempting auth recovery...');
          
          // First try to refresh the session
          try {
            const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshResult.session) {
              console.log('✅ API Client: Session refreshed, retrying request...');
              // Update our sessionStorage with new tokens
              sessionStorage.setItem('auth-token', refreshResult.session.access_token);
              sessionStorage.setItem('refresh-token', refreshResult.session.refresh_token);
              return this.request(endpoint, options, retryCount + 1);
            }
          } catch (refreshErr) {
            console.error('❌ API Client: Session refresh failed:', refreshErr);
          }
          
          // If refresh failed, try using refresh token from sessionStorage
          const refreshToken = sessionStorage.getItem('refresh-token');
          if (refreshToken) {
            try {
              console.log('🔄 API Client: Trying manual refresh with stored token...');
              const { data: manualRefresh, error: manualError } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
              });
              if (!manualError && manualRefresh.session) {
                console.log('✅ API Client: Manual refresh successful, retrying...');
                sessionStorage.setItem('auth-token', manualRefresh.session.access_token);
                sessionStorage.setItem('refresh-token', manualRefresh.session.refresh_token);
                return this.request(endpoint, options, retryCount + 1);
              }
            } catch (manualErr) {
              console.error('❌ API Client: Manual refresh failed:', manualErr);
            }
          }
        }
        
        const errorData = await response.json().catch(() => ({ detail: 'Authentication error' }));
        console.error('❌ API Client: All auth recovery attempts failed');
        throw new Error(errorData.detail || 'Authentication error - session may have expired');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API Error Response:`, errorData);
        
        // Retry on server errors
        if (response.status >= 500 && retryCount < maxRetries) {
          console.log(`🔄 API Client: Server error, retrying in ${(retryCount + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          return this.request(endpoint, options, retryCount + 1);
        }
        
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Success Response:`, data);
      return data;
      
    } catch (error) {
      // Handle network errors with retry
      if (error instanceof TypeError && error.message.includes('fetch') && retryCount < maxRetries) {
        console.log(`🔄 API Client: Network error, retrying in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return this.request(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string; services: any }> {
    return this.request('/health');
  }

  // Profile endpoints
  async getProfile(): Promise<any> {
    return this.request('/api/profile');
  }

  async updateProfile(updates: Record<string, any>): Promise<any> {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Workflow endpoints
  async getWorkflows(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/api/workflows${query}`);
  }

  async getWorkflow(workflowId: string): Promise<any> {
    return this.request(`/api/workflows/${workflowId}`);
  }

  async createWorkflow(workflow: {
    name: string;
    description?: string;
    trigger_type?: string;
    trigger_config?: Record<string, any>;
    tags?: string[];
  }): Promise<any> {
    return this.request('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(workflowId: string): Promise<{ success: boolean }> {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  async executeWorkflow(workflowId: string, triggerData: Record<string, any> = {}): Promise<any> {
    return this.request('/api/workflows/execute', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: workflowId,
        trigger_data: triggerData,
      }),
    });
  }

  // Integration endpoints
  async getIntegrations(): Promise<any[]> {
    return this.request('/api/integrations');
  }

  async createIntegration(integration: {
    service_name: string;
    display_name: string;
    credentials: Record<string, any>;
    configuration?: Record<string, any>;
  }): Promise<any> {
    return this.request('/api/integrations', {
      method: 'POST',
      body: JSON.stringify(integration),
    });
  }

  async testIntegration(integrationId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request(`/api/integrations/${integrationId}/test`, {
      method: 'POST',
    });
  }

  async deleteIntegration(integrationId: string): Promise<{ success: boolean }> {
    return this.request(`/api/integrations/${integrationId}`, {
      method: 'DELETE',
    });
  }

  // Chat endpoints
  async getChatSessions(): Promise<any[]> {
    return this.request('/api/chat/sessions');
  }

  async createChatSession(session: {
    session_name?: string;
    intent?: string;
    context?: Record<string, any>;
  }): Promise<any> {
    return this.request('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  async getChatMessages(sessionId: string): Promise<any[]> {
    return this.request(`/api/chat/sessions/${sessionId}/messages`);
  }

  async sendChatMessage(message: string, sessionId?: string): Promise<{
    message: string;
    session_id: string;
    suggestions: string[];
    workflow_created: boolean;
    workflow_id?: string;
  }> {
    return this.request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
    });
  }

  async deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Tools and services
  async getAvailableTools(): Promise<{ tools: any[] }> {
    return this.request('/api/tools');
  }

  async getAvailableServices(): Promise<{ services: any[] }> {
    return this.request('/api/services');
  }

  // OAuth endpoints
  async exchangeOAuthCode(service: string, code: string, redirectUri: string, state?: string): Promise<{ credentials: any }> {
    return this.request('/api/oauth/exchange', {
      method: 'POST',
      body: JSON.stringify({
        service,
        code,
        redirect_uri: redirectUri,
        state
      }),
    });
  }

  // Test endpoints (development only)
  async testTool(toolName: string, testData: Record<string, any>): Promise<any> {
    return this.request(`/api/test/tool/${toolName}`, {
      method: 'POST',
      body: JSON.stringify(testData),
    });
  }

  // Authentication methods (without auth headers)
  private async requestNoAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    return this.requestNoAuth<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    return this.requestNoAuth<AuthResponse>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signOut(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/auth/signout', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();

// Make apiClient available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).apiClient = apiClient;
}

export default apiClient;
