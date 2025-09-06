/**
 * API client for the new LangChain backend
 */

const BACKEND_URL = import.meta.env.VITE_LANGCHAIN_BACKEND_URL || 'http://localhost:8000';

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status_code?: number;
}

interface ZapExecutionRequest {
  user_id: string;
  zap_id: string;
  trigger_data?: Record<string, any>;
}

interface ZapExecutionResponse {
  success: boolean;
  execution_id?: string;
  status: string;
  results?: Record<string, any>;
  error?: string;
}

interface ChatRequest {
  user_id: string;
  session_id: string;
  message: string;
}

interface ChatResponse {
  success: boolean;
  bot_response: string;
  session_id: string;
  workflow_created: boolean;
  zap_id?: string;
}

interface ToolInfo {
  name: string;
  description: string;
  service: string;
  input_schema: any;
}

interface HealthStatus {
  status: string;
  version: string;
  services: Record<string, any>;
}

class LangChainAPI {
  private baseURL: string;
  
  constructor(baseURL: string = BACKEND_URL) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.detail || `HTTP ${response.status}`,
          status_code: response.status,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health check
  async checkHealth(): Promise<APIResponse<HealthStatus>> {
    return this.makeRequest<HealthStatus>('/health');
  }

  // Workflow execution
  async executeZap(request: ZapExecutionRequest): Promise<APIResponse<ZapExecutionResponse>> {
    return this.makeRequest<ZapExecutionResponse>('/api/execute-zap', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getZapStatus(zapId: string, userId: string): Promise<APIResponse<any>> {
    return this.makeRequest(`/api/zaps/${zapId}/status?user_id=${userId}`);
  }

  // Chat interface
  async sendChatMessage(request: ChatRequest): Promise<APIResponse<ChatResponse>> {
    return this.makeRequest<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Tools and services
  async getAvailableTools(): Promise<APIResponse<{ tools: Record<string, ToolInfo>, services: string[] }>> {
    return this.makeRequest('/api/tools');
  }

  async getAvailableServices(): Promise<APIResponse<{ services: string[] }>> {
    return this.makeRequest('/api/services');
  }

  // User integrations
  async getUserIntegrations(userId: string): Promise<APIResponse<{ integrations: any[] }>> {
    return this.makeRequest(`/api/integrations/${userId}`);
  }

  // Test endpoints (only available in debug mode)
  async testTool(toolName: string, testData: Record<string, any>): Promise<APIResponse<any>> {
    return this.makeRequest(`/api/test/tool/${toolName}`, {
      method: 'POST',
      body: JSON.stringify(testData),
    });
  }

  // Workflow manager status
  async getWorkflowManagerStatus(): Promise<APIResponse<any>> {
    return this.makeRequest('/api/workflow-manager/status');
  }

  // Migration helpers
  async migrateFromSupabase(userId: string): Promise<APIResponse<any>> {
    // This could be used to migrate existing workflows to the new system
    return this.makeRequest('/api/migrate-from-supabase', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }
}

// Create singleton instance
export const langchainAPI = new LangChainAPI();

// Export types
export type {
  APIResponse,
  ZapExecutionRequest,
  ZapExecutionResponse,
  ChatRequest,
  ChatResponse,
  ToolInfo,
  HealthStatus,
};

// Export class for custom instances
export { LangChainAPI };

// Utility functions
export const isBackendHealthy = async (): Promise<boolean> => {
  try {
    const response = await langchainAPI.checkHealth();
    return response.success && response.data?.status === 'healthy';
  } catch {
    return false;
  }
};

export const executeWorkflow = async (
  userId: string, 
  zapId: string, 
  triggerData: Record<string, any> = {}
): Promise<ZapExecutionResponse | null> => {
  const response = await langchainAPI.executeZap({
    user_id: userId,
    zap_id: zapId,
    trigger_data: triggerData,
  });
  
  return response.success ? response.data : null;
};

export const sendWorkflowChatMessage = async (
  userId: string,
  sessionId: string,
  message: string
): Promise<ChatResponse | null> => {
  const response = await langchainAPI.sendChatMessage({
    user_id: userId,
    session_id: sessionId,
    message,
  });
  
  return response.success ? response.data : null;
};
