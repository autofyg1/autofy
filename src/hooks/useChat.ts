import { useState, useEffect, useCallback } from 'react';
import { ChatSession, ChatMessage } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

export const useChat = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session, loading: authLoading } = useAuth();

  const fetchSessions = useCallback(async () => {
    // Only check for user and session
    if (!user || !session) {
      console.log('⏳ fetchSessions: User or session not ready:', {
        hasUser: !!user,
        hasSession: !!session
      });
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getChatSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chat sessions');
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  const createSession = useCallback(async (
    sessionName?: string,
    intent?: string,
    context?: Record<string, any>
  ) => {
    try {
      const session = await apiClient.createChatSession({
        session_name: sessionName,
        intent,
        context,
      });

      setSessions(prev => [session, ...prev]);
      setCurrentSession(session);
      setMessages([]); // Clear messages for new session
      return { data: session, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chat session';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  }, []);

  const selectSession = useCallback(async (session: ChatSession) => {
    try {
      setCurrentSession(session);
      setLoading(true);
      
      const sessionMessages = await apiClient.getChatMessages(session.id);
      setMessages(sessionMessages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    sessionId?: string
  ) => {
    if (!message.trim()) return;

    try {
      setSending(true);
      setError(null);

      const response = await apiClient.sendChatMessage(message, sessionId);

      // Add user message to local state
      const userMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        session_id: response.session_id,
        role: 'user',
        content: message,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      // Add AI response to local state
      const aiMessage: ChatMessage = {
        id: `temp-ai-${Date.now()}`,
        session_id: response.session_id,
        role: 'assistant',
        content: response.message,
        metadata: {
          suggestions: response.suggestions,
          workflow_created: response.workflow_created,
          workflow_id: response.workflow_id,
        },
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);

      // Update current session if it was created
      if (!currentSession || currentSession.id !== response.session_id) {
        const newSession = sessions.find(s => s.id === response.session_id);
        if (!newSession) {
          // This is a new session, fetch sessions to get it
          await fetchSessions();
        }
        setCurrentSession(newSession || null);
      }

      return {
        data: {
          response: response.message,
          session_id: response.session_id,
          suggestions: response.suggestions,
          workflow_created: response.workflow_created,
          workflow_id: response.workflow_id,
        },
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setSending(false);
    }
  }, [currentSession, sessions, fetchSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.deleteChatSession(sessionId);
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If we deleted the current session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      setError(errorMessage);
      return { error: errorMessage };
    }
  }, [currentSession]);

  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, fetchSessions]);

  return {
    // Data
    sessions,
    currentSession,
    messages,
    loading,
    sending,
    error,
    
    // Actions
    fetchSessions,
    createSession,
    selectSession,
    sendMessage,
    deleteSession,
    clearCurrentSession,
  };
};

export default useChat;
