// Example integration of Telegram with FlowBot workflows

import { supabase } from './supabase';

/**
 * Send a Telegram message as part of a workflow execution
 */
export async function sendTelegramNotification(
  userId: string,
  message: string,
  options: {
    chatId?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableWebPagePreview?: boolean;
    disableNotification?: boolean;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the user's session to make authenticated request
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: 'User not authenticated' };
    }

    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/telegram-send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        chat_id: options.chatId,
        message,
        parse_mode: options.parseMode,
        disable_web_page_preview: options.disableWebPagePreview,
        disable_notification: options.disableNotification,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return { success: result.success };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if user has Telegram connected
 */
export async function isUserTelegramConnected(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('telegram_chats')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('Error checking Telegram connection:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking Telegram connection:', error);
    return false;
  }
}

/**
 * Get user's connected Telegram chats
 */
export async function getUserTelegramChats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('telegram_chats')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('linked_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching Telegram chats:', error);
    return [];
  }
}

/**
 * Example workflow actions that use Telegram
 */
export const telegramWorkflowActions = {
  // Send success notification
  sendSuccessNotification: async (userId: string, workflowName: string, details?: string) => {
    const message = `✅ <b>Workflow Completed</b>\n\n` +
      `<b>Workflow:</b> ${workflowName}\n` +
      `<b>Status:</b> Success\n` +
      `<b>Time:</b> ${new Date().toLocaleString()}\n` +
      (details ? `\n<b>Details:</b>\n${details}` : '');

    return sendTelegramNotification(userId, message, { parseMode: 'HTML' });
  },

  // Send error notification
  sendErrorNotification: async (userId: string, workflowName: string, error: string) => {
    const message = `❌ <b>Workflow Failed</b>\n\n` +
      `<b>Workflow:</b> ${workflowName}\n` +
      `<b>Status:</b> Error\n` +
      `<b>Time:</b> ${new Date().toLocaleString()}\n` +
      `\n<b>Error:</b>\n${error}`;

    return sendTelegramNotification(userId, message, { parseMode: 'HTML' });
  },

  // Send data summary
  sendDataSummary: async (userId: string, title: string, data: Record<string, any>) => {
    const dataText = Object.entries(data)
      .map(([key, value]) => `<b>${key}:</b> ${value}`)
      .join('\n');

    const message = `📊 <b>${title}</b>\n\n${dataText}`;

    return sendTelegramNotification(userId, message, { parseMode: 'HTML' });
  },

  // Send custom message with formatting
  sendFormattedMessage: async (
    userId: string, 
    template: string, 
    variables: Record<string, string> = {}
  ) => {
    let message = template;
    
    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return sendTelegramNotification(userId, message, { parseMode: 'HTML' });
  },
};

/**
 * Example workflow triggers based on Telegram messages
 */
export const telegramWorkflowTriggers = {
  // Check for specific commands in recent messages
  checkForCommand: async (userId: string, command: string, timeframe: number = 300000) => {
    try {
      const since = new Date(Date.now() - timeframe).toISOString();
      
      const { data, error } = await supabase
        .from('telegram_messages')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', since)
        .ilike('text', `%${command}%`)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error checking for command:', error);
      return null;
    }
  },

  // Check for messages containing keywords
  checkForKeywords: async (userId: string, keywords: string[], timeframe: number = 300000) => {
    try {
      const since = new Date(Date.now() - timeframe).toISOString();
      
      const { data, error } = await supabase
        .from('telegram_messages')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      // Filter messages that contain any of the keywords
      const matchingMessages = data?.filter(message => 
        keywords.some(keyword => 
          message.text?.toLowerCase().includes(keyword.toLowerCase())
        )
      ) || [];

      return matchingMessages;
    } catch (error) {
      console.error('Error checking for keywords:', error);
      return [];
    }
  },
};

// Example usage in a workflow step configuration:
/*
{
  id: 'telegram-notification',
  type: 'action',
  service: 'telegram',
  action: 'send_message',
  config: {
    message: '{{workflow_result}}',
    parse_mode: 'HTML',
    disable_notification: false
  }
}
*/
