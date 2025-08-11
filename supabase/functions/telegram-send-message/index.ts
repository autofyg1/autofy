import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')

interface SendMessageRequest {
  chat_id?: string
  user_id?: string // Alternative: send to all chats for a user
  message: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disable_web_page_preview?: boolean
  disable_notification?: boolean
}

interface LogContext {
  user_id?: string
  chat_id?: string
  function_name?: string
}

function log(message: string, context: LogContext = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    function: 'telegram-send-message',
    ...context
  }))
}

function logError(message: string, error: any, context: LogContext = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    function: 'telegram-send-message',
    ...context
  }))
}

async function sendTelegramMessage(
  chatId: string, 
  text: string, 
  options: {
    parse_mode?: string
    disable_web_page_preview?: boolean
    disable_notification?: boolean
  } = {}
): Promise<{ success: boolean; error?: string; message_id?: number }> {
  try {
    log('Sending Telegram message', { chat_id: chatId })

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      logError('Telegram API error', result, { chat_id: chatId })
      return { 
        success: false, 
        error: result.description || 'Unknown Telegram API error' 
      }
    }

    log('Message sent successfully', { 
      chat_id: chatId, 
      message_id: result.result?.message_id 
    })

    return { 
      success: true, 
      message_id: result.result?.message_id 
    }
  } catch (error) {
    logError('Error sending Telegram message', error, { chat_id: chatId })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization header', {
        status: 401,
        headers: corsHeaders
      })
    }

    // Parse request body
    const request: SendMessageRequest = await req.json()
    
    if (!request.message) {
      return new Response('Missing message field', {
        status: 400,
        headers: corsHeaders
      })
    }

    log('Processing send message request', {
      user_id: request.user_id,
      chat_id: request.chat_id
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT for authentication
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      logError('Authentication failed', userError)
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    let chatIds: string[] = []

    if (request.chat_id) {
      // Verify user owns this chat
      const { data: chat, error: chatError } = await supabase
        .from('telegram_chats')
        .select('chat_id')
        .eq('user_id', user.id)
        .eq('chat_id', request.chat_id)
        .eq('is_active', true)
        .single()

      if (chatError || !chat) {
        logError('Chat not found or unauthorized', chatError, { 
          user_id: user.id, 
          chat_id: request.chat_id 
        })
        return new Response('Chat not found or unauthorized', {
          status: 404,
          headers: corsHeaders
        })
      }
      
      chatIds = [request.chat_id]
    } else if (request.user_id) {
      // Send to all active chats for this user (only if requesting for their own chats)
      if (request.user_id !== user.id) {
        return new Response('Cannot send messages to other users\' chats', {
          status: 403,
          headers: corsHeaders
        })
      }

      const { data: chats, error: chatsError } = await supabase
        .from('telegram_chats')
        .select('chat_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (chatsError || !chats || chats.length === 0) {
        logError('No active chats found', chatsError, { user_id: user.id })
        return new Response('No active Telegram chats found', {
          status: 404,
          headers: corsHeaders
        })
      }

      chatIds = chats.map(c => c.chat_id)
    } else {
      return new Response('Either chat_id or user_id must be provided', {
        status: 400,
        headers: corsHeaders
      })
    }

    log(`Sending message to ${chatIds.length} chat(s)`, { user_id: user.id })

    // Send messages to all specified chats
    const results = await Promise.all(
      chatIds.map(async (chatId) => {
        const result = await sendTelegramMessage(chatId, request.message, {
          parse_mode: request.parse_mode,
          disable_web_page_preview: request.disable_web_page_preview,
          disable_notification: request.disable_notification
        })
        
        return {
          chat_id: chatId,
          ...result
        }
      })
    )

    // Count successful and failed sends
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    log(`Message sending completed`, {
      user_id: user.id,
      successful_count: successful.length,
      failed_count: failed.length
    })

    if (failed.length > 0) {
      logError('Some messages failed to send', failed, { user_id: user.id })
    }

    return new Response(JSON.stringify({
      success: failed.length === 0,
      total_chats: chatIds.length,
      successful_sends: successful.length,
      failed_sends: failed.length,
      results
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })

  } catch (error) {
    logError('Error processing send message request', error)
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    })
  }
})
