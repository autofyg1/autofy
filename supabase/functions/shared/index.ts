import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

interface APIKeyStatus {
  key: string;
  isActive: boolean;
  lastUsed: number;
  errorCount: number;
  lastError?: string;
  rateLimitResetTime?: number;
}

interface ConversationContext {
  sessionId: string;
  messages: Array<{ role: string; content: string; }>;
  lastKeyUsed?: string;
}

class GeminiLoadBalancer {
  private apiKeys: APIKeyStatus[] = [];
  private currentKeyIndex = 0;
  private conversationContexts = new Map<string, ConversationContext>();
  private readonly maxRetries = 3;
  private readonly errorThreshold = 5;
  private readonly rateLimitCooldown = 60000; // 1 minute

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // Get all available Gemini keys from environment
    const keyEnvVars = [
      'GEMINI_API_KEY',
      'GEMINI_API_KEY_1', 
      'GEMINI_API_KEY_2',
      'GEMINI_API_KEY_3',
      'GEMINI_API_KEY_4',
      'GEMINI_API_KEY_5',
      'GEMINI_API_KEY_6',
      'GEMINI_API_KEY_7',
      'GEMINI_API_KEY_8',
      'GEMINI_API_KEY_9',
      'GEMINI_API_KEY_10'
    ];

    this.apiKeys = keyEnvVars
      .map(envVar => Deno.env.get(envVar))
      .filter(key => key && key.trim())
      .map(key => ({
        key: key!,
        isActive: true,
        lastUsed: 0,
        errorCount: 0
      }));

    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys found in environment variables');
    }

    console.log(`Initialized Gemini load balancer with ${this.apiKeys.length} API keys`);
  }

  private getNextAvailableKey(): string | null {
    const now = Date.now();
    
    // First, try to find a key that's not rate limited
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
      const keyStatus = this.apiKeys[keyIndex];
      
      if (keyStatus.isActive && 
          keyStatus.errorCount < this.errorThreshold &&
          (!keyStatus.rateLimitResetTime || keyStatus.rateLimitResetTime < now)) {
        
        this.currentKeyIndex = (keyIndex + 1) % this.apiKeys.length;
        keyStatus.lastUsed = now;
        return keyStatus.key;
      }
    }

    // If all keys are problematic, try the least problematic one
    const bestKey = this.apiKeys
      .filter(k => k.isActive)
      .reduce((best, current) => {
        if (!best) return current;
        
        // Prefer keys with fewer errors
        if (current.errorCount < best.errorCount) return current;
        if (current.errorCount > best.errorCount) return best;
        
        // Among keys with same error count, prefer least recently used
        return current.lastUsed < best.lastUsed ? current : best;
      }, null as APIKeyStatus | null);

    if (bestKey) {
      bestKey.lastUsed = now;
      return bestKey.key;
    }

    return null;
  }

  private markKeyError(apiKey: string, error: any) {
    const keyStatus = this.apiKeys.find(k => k.key === apiKey);
    if (!keyStatus) return;

    keyStatus.errorCount++;
    keyStatus.lastError = error.message || 'Unknown error';

    // Check if this is a rate limit error
    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      keyStatus.rateLimitResetTime = Date.now() + this.rateLimitCooldown;
      console.log(`API key marked as rate limited, cooldown until: ${new Date(keyStatus.rateLimitResetTime)}`);
    }

    // Disable key if too many errors
    if (keyStatus.errorCount >= this.errorThreshold) {
      keyStatus.isActive = false;
      console.log(`API key disabled due to ${keyStatus.errorCount} errors`);
    }

    console.log(`API key error logged. Total errors: ${keyStatus.errorCount}, Active: ${keyStatus.isActive}`);
  }

  private markKeySuccess(apiKey: string) {
    const keyStatus = this.apiKeys.find(k => k.key === apiKey);
    if (!keyStatus) return;

    // Reduce error count on successful use
    if (keyStatus.errorCount > 0) {
      keyStatus.errorCount = Math.max(0, keyStatus.errorCount - 1);
    }
    
    // Re-enable key if it was disabled and errors are now low
    if (!keyStatus.isActive && keyStatus.errorCount < 2) {
      keyStatus.isActive = true;
      console.log('API key re-enabled after successful use');
    }
  }

  private getOrCreateContext(sessionId: string): ConversationContext {
    if (!this.conversationContexts.has(sessionId)) {
      this.conversationContexts.set(sessionId, {
        sessionId,
        messages: []
      });
    }
    return this.conversationContexts.get(sessionId)!;
  }

  async generateResponse(
    sessionId: string,
    userMessage: string,
    systemPrompt?: string,
    options: {
      model?: string;
      temperature?: number;
      topP?: number;
      maxOutputTokens?: number;
    } = {}
  ): Promise<string> {
    const context = this.getOrCreateContext(sessionId);
    let lastError: any;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const apiKey = this.getNextAvailableKey();
      
      if (!apiKey) {
        throw new Error('No available Gemini API keys. All keys may be rate limited or disabled.');
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: options.model || "gemini-2.0-flash-exp",
          generationConfig: {
            temperature: options.temperature || 0.7,
            topP: options.topP || 0.8,
            maxOutputTokens: options.maxOutputTokens || 2048,
          }
        });

        // Build conversation history with system prompt
        const conversationHistory = [];
        
        if (systemPrompt) {
          conversationHistory.push({
            role: 'user',
            parts: [{ text: systemPrompt }]
          });
        }

        // Add existing conversation messages
        context.messages.forEach(msg => {
          conversationHistory.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        });

        const chat = model.startChat({
          history: conversationHistory
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();

        // Update context with new messages
        context.messages.push({ role: 'user', content: userMessage });
        context.messages.push({ role: 'assistant', content: response });
        
        // Keep only last 20 messages to prevent context from growing too large
        if (context.messages.length > 20) {
          context.messages = context.messages.slice(-20);
        }

        context.lastKeyUsed = apiKey;

        this.markKeySuccess(apiKey);
        return response;

      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed with API key:`, error.message);
        this.markKeyError(apiKey, error);
        lastError = error;
        
        // If this is a rate limit error, try next key immediately
        if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
          continue;
        }
        
        // For other errors, wait a bit before retry
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`All Gemini API attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async generateEmbedding(
    text: string,
    options: { model?: string } = {}
  ): Promise<number[]> {
    let lastError: any;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const apiKey = this.getNextAvailableKey();
      
      if (!apiKey) {
        throw new Error('No available Gemini API keys for embedding generation');
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const embedModel = genAI.getGenerativeModel({ 
          model: options.model || "text-embedding-004"
        });
        
        const result = await embedModel.embedContent(text);
        this.markKeySuccess(apiKey);
        return result.embedding.values;

      } catch (error) {
        console.error(`Embedding attempt ${attempt + 1} failed:`, error.message);
        this.markKeyError(apiKey, error);
        lastError = error;
        
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Embedding generation failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  getStatus() {
    return {
      totalKeys: this.apiKeys.length,
      activeKeys: this.apiKeys.filter(k => k.isActive).length,
      activeContexts: this.conversationContexts.size,
      keyStatuses: this.apiKeys.map((key, index) => ({
        index,
        active: key.isActive,
        errorCount: key.errorCount,
        lastUsed: key.lastUsed ? new Date(key.lastUsed).toISOString() : null,
        rateLimited: key.rateLimitResetTime ? key.rateLimitResetTime > Date.now() : false
      }))
    };
  }

  clearContext(sessionId: string) {
    this.conversationContexts.delete(sessionId);
  }

  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, context] of this.conversationContexts.entries()) {
      if (context.messages.length > 0) {
        if (this.conversationContexts.size > 1000) {
          this.conversationContexts.delete(sessionId);
        }
      }
    }
  }
}

// Global instance
const geminiLoadBalancer = new GeminiLoadBalancer();

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, sessionId, message, systemPrompt, options, text } = await req.json();

    switch (action) {
      case 'generateResponse':
        if (!sessionId || !message) {
          throw new Error('sessionId and message are required for generateResponse');
        }
        const response = await geminiLoadBalancer.generateResponse(
          sessionId,
          message,
          systemPrompt,
          options
        );
        return new Response(JSON.stringify({ success: true, response }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'generateEmbedding':
        if (!text) {
          throw new Error('text is required for generateEmbedding');
        }
        const embedding = await geminiLoadBalancer.generateEmbedding(text, options);
        return new Response(JSON.stringify({ success: true, embedding }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'getStatus':
        const status = geminiLoadBalancer.getStatus();
        return new Response(JSON.stringify({ success: true, status }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'clearContext':
        if (!sessionId) {
          throw new Error('sessionId is required for clearContext');
        }
        geminiLoadBalancer.clearContext(sessionId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'cleanup':
        geminiLoadBalancer.cleanup();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Gemini Load Balancer Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
