import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Zap, AlertCircle, CheckCircle, Copy, Download, Sparkles } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';

interface WorkflowBotChatProps {
  onZapCreated?: (zap: any) => void;
  className?: string;
}

const WorkflowBotChat: React.FC<WorkflowBotChatProps> = ({ onZapCreated, className }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const {
    currentSession,
    messages,
    loading,
    sending,
    error,
    createSession,
    sendMessage,
  } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Create initial session if none exists
    if (user && !currentSession) {
      createSession(
        'Workflow Creation Chat',
        'workflow_creation',
        {
          initialMessage: "Hi! I'm your Autofy Workflow Bot. I can help you create powerful automation workflows through simple conversation. Just tell me what you'd like to automate!"
        }
      );
    }
  }, [user, currentSession, createSession]);

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;

    const messageText = input;
    setInput('');

    try {
      const result = await sendMessage(messageText, currentSession?.id);
      
      if (result?.data?.workflow_created && result.data.workflow_id) {
        // Notify parent component about workflow creation
        onZapCreated?.({
          id: result.data.workflow_id,
          name: 'AI-Generated Workflow',
          created_via_chat: true
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Remove the old createZap function since workflow creation is now handled automatically

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

  const renderMessage = (message: any) => {
    const isBot = message.role === 'assistant';
    const hasWorkflowCreated = message.metadata?.workflow_created;
    const suggestions = message.metadata?.suggestions || [];
    
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
            <div className="whitespace-pre-wrap font-sans text-gray-200">
              {message.content}
            </div>
          </div>
          
          {/* Workflow Created Notification */}
          {hasWorkflowCreated && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-300 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Workflow Created Successfully!</span>
              </div>
              <p className="text-xs text-green-200">
                Your new automation workflow has been created and is available in your dashboard.
              </p>
            </div>
          )}
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-400 font-medium">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-full border border-blue-400/20 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-800 rounded-2xl border border-gray-700 ${className}`}>
        <div className="text-center">
          <Bot className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">AI Workflow Bot</h3>
          <p className="text-gray-400">Please sign in to start creating workflows</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-t-2xl">
        <Bot className="w-6 h-6" />
        <div>
          <h2 className="text-lg font-semibold">AI Workflow Bot</h2>
          <p className="text-blue-100 text-sm">Create workflows through conversation</p>
        </div>
        {currentSession && (
          <div className="ml-auto text-xs text-blue-200">
            Session: {currentSession.session_name || 'Active'}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-500/20 border-b border-red-400/30">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-900">
        {!currentSession && loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Initializing chat...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="flex gap-3 p-4 bg-gray-800/30">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap font-sans text-gray-200">
                      Hi! I'm your Autofy Workflow Bot. I can help you create powerful automation workflows through simple conversation.
                      
                      Just tell me what you'd like to automate! I'll guide you through creating the perfect workflow step by step.
                      
                      Examples:
                      • "Create a workflow to save important Gmail emails to Notion"
                      • "I want to get Telegram notifications for urgent emails"
                      • "Help me set up an AI email summarizer"
                      • "Send messages when I receive high-priority emails"
                      
                      What would you like to automate today?
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map(renderMessage)}
            
            {sending && (
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
          </>
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
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Describe the automation you want to create..."
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            disabled={sending || !currentSession}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !input.trim() || !currentSession}
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
