import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Zap, AlertCircle, CheckCircle, Copy, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  validation?: {
    isValid: boolean;
    errors: string[];
    zapData?: any;
  };
}

interface WorkflowBotChatProps {
  userId: string;
  onZapCreated?: (zap: any) => void;
}

const WorkflowBotChat: React.FC<WorkflowBotChatProps> = ({ userId, onZapCreated }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your Autofy Workflow Bot. I can help you create powerful automation workflows (zaps) through simple conversation.\n\nJust tell me what you'd like to automate! I'll guide you through creating the perfect workflow step by step.\n\nExamples:\n• \"Create a zap to save important Gmail emails to Notion\"\n• \"I want to get Telegram notifications for urgent emails\"\n• \"Help me set up an AI email summarizer\"\n• \"Send Slack messages when I receive high-priority emails\"\n\nWhat would you like to automate today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Please sign in to use the workflow bot');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_message: userMessage.content,
          session_id: sessionId || undefined,
          create_new_session: !sessionId,
          session_topic: 'Workflow Creation'
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Edge functions not deployed yet. Please run: supabase functions deploy chat-bot');
        } else if (response.status === 500) {
          throw new Error('Edge function error. Check if GEMINI_API_KEY is set in Supabase environment.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Update session ID if new session was created
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        validation: data.validation
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const createZap = async (zapData: any, messageId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Please sign in to create a zap');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-zap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          zap_data: zapData,
          session_id: sessionId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update the message to show success
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, validation: { ...msg.validation!, zapCreated: true, zapInfo: result.zap } }
            : msg
        ));
        
        onZapCreated?.(result.zap);
      } else {
        // Show detailed validation errors
        let errorMessage = result.error || 'Failed to create zap';
        if (result.details && Array.isArray(result.details)) {
          errorMessage += '\n\nValidation errors:\n' + result.details.map((err: string) => '• ' + err).join('\n');
        } else if (result.details) {
          errorMessage += '\n\nDetails: ' + result.details;
        }
        
        const errorChatMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ **Failed to Create Zap**\n\n${errorMessage}\n\nI'll help you fix these issues. Please let me know if you'd like me to regenerate the zap with corrections.`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorChatMessage]);
      }

    } catch (err) {
      console.error('Error creating zap:', err);
      setError(err instanceof Error ? err.message : 'Failed to create zap');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const extractJSONFromMessage = (content: string): any | null => {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       [null, content.match(/\{[\s\S]*\}/)?.[0]];
      
      if (jsonMatch?.[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch (error) {
      console.error('Error parsing JSON from message:', error);
    }
    return null;
  };

  const renderMessage = (message: ChatMessage) => {
    const isBot = message.role === 'assistant';
    const zapData = message.validation?.zapData || extractJSONFromMessage(message.content);
    
    return (
      <div key={message.id} className={`flex gap-3 p-4 ${isBot ? 'bg-gray-800/30' : 'bg-gray-700/30'}`}>
        <div className="flex-shrink-0">
          {isBot ? (
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-200">
              {message.content}
            </pre>
          </div>
          
          {/* Validation Results */}
          {message.validation && (
            <div className="mt-4 p-3 bg-gray-700 border border-gray-600 rounded-lg">
              {message.validation.isValid ? (
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Valid Zap JSON detected!</span>
                </div>
              ) : (
                <div className="text-red-400 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">JSON Validation Errors:</span>
                  </div>
                  <ul className="text-xs ml-6 list-disc text-red-300">
                    {message.validation.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Zap Actions */}
          {zapData && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-300">Zap JSON Ready</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(zapData, null, 2))}
                    className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded flex items-center gap-1 border border-blue-400/20"
                  >
                    <Copy className="w-3 h-3" />
                    Copy JSON
                  </button>
                  <button
                    onClick={() => downloadJSON(zapData, `${zapData.name || 'zap'}.json`)}
                    className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded flex items-center gap-1 border border-blue-400/20"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              
              {message.validation?.isValid && !message.validation?.zapCreated && (
                <button
                  onClick={() => createZap(zapData, message.id)}
                  className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Zap className="w-4 h-4" />
                  Create Zap in Dashboard
                </button>
              )}
              
              {message.validation?.zapCreated && (
                <div className="mt-2 p-2 bg-green-500/20 text-green-300 rounded text-sm border border-green-400/30">
                  ✅ Zap created successfully! Check your dashboard to activate it.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-t-2xl">
        <Bot className="w-6 h-6" />
        <div>
          <h2 className="text-lg font-semibold">AI Workflow Bot</h2>
          <p className="text-blue-100 text-sm">Create zaps through conversation</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-500/20 border-b border-red-400/30">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-900">
        {messages.map(renderMessage)}
        {isLoading && (
          <div className="flex gap-3 p-4 bg-gray-800/30">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Describe the automation you want to create..."
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:bg-gray-600 text-white rounded-lg flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBotChat;
