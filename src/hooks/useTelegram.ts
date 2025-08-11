import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TelegramChat {
  id: string;
  user_id: string;
  chat_id: string;
  chat_type: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  linked_at: string;
  is_active: boolean;
  metadata: Record<string, any>;
}

export interface TelegramLinkToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_at?: string;
  chat_id?: string;
  is_used: boolean;
}

export interface TelegramMessage {
  id: string;
  chat_id: string;
  message_id: number;
  user_id?: string;
  from_telegram_user_id: string;
  from_username?: string;
  from_first_name?: string;
  from_last_name?: string;
  text?: string;
  message_type: string;
  timestamp: string;
  created_at: string;
  metadata: Record<string, any>;
}

export const useTelegram = () => {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [linkTokens, setLinkTokens] = useState<TelegramLinkToken[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchChats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('telegram_chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('linked_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chats');
    }
  };

  const fetchLinkTokens = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('telegram_link_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkTokens(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch link tokens');
    }
  };

  const fetchMessages = async (chatId?: string, limit = 50) => {
    if (!user) return;

    try {
      let query = supabase
        .from('telegram_messages')
        .select('*')
        .or(`user_id.eq.${user.id},chat_id.in.(${chats.map(c => c.chat_id).join(',')})`)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (chatId) {
        query = query.eq('chat_id', chatId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    }
  };

  const generateLinkToken = async (): Promise<{ token: string; deepLink: string } | null> => {
    if (!user) return null;

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-link-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate link token');
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchLinkTokens(); // Refresh tokens
        return {
          token: result.token,
          deepLink: result.deep_link
        };
      } else {
        throw new Error('Server returned error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link token');
      return null;
    }
  };

  const sendMessage = async (
    message: string,
    options: {
      chatId?: string;
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableWebPagePreview?: boolean;
      disableNotification?: boolean;
    } = {}
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          chat_id: options.chatId,
          user_id: !options.chatId ? user.id : undefined,
          parse_mode: options.parseMode,
          disable_web_page_preview: options.disableWebPagePreview,
          disable_notification: options.disableNotification,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return false;
    }
  };

  const disconnectChat = async (chatId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('telegram_chats')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('chat_id', chatId);

      if (error) throw error;

      // Update local state
      setChats(prev => prev.map(chat => 
        chat.chat_id === chatId ? { ...chat, is_active: false } : chat
      ).filter(chat => chat.is_active));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect chat');
      return false;
    }
  };

  const isConnected = (): boolean => {
    return chats.length > 0;
  };

  const getActiveChatCount = (): number => {
    return chats.length;
  };

  useEffect(() => {
    const initializeTelegram = async () => {
      if (user) {
        setLoading(true);
        await Promise.all([fetchChats(), fetchLinkTokens()]);
        setLoading(false);
      }
    };

    initializeTelegram();
  }, [user]);

  useEffect(() => {
    if (chats.length > 0) {
      fetchMessages();
    }
  }, [chats]);

  return {
    chats,
    linkTokens,
    messages,
    loading,
    error,
    generateLinkToken,
    sendMessage,
    disconnectChat,
    isConnected,
    getActiveChatCount,
    fetchChats,
    fetchMessages,
    setError: (error: string | null) => setError(error),
  };
};
