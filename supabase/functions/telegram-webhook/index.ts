import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_SECRET_TOKEN = Deno.env.get('TELEGRAM_SECRET_TOKEN');
function log(message, context = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...context
  }));
}
function logError(message, error, context = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  }));
}
async function verifyTelegramWebhook(request) {
  // Check if we have the required bot token
  if (!TELEGRAM_BOT_TOKEN) {
    logError('Missing TELEGRAM_BOT_TOKEN environment variable');
    return false;
  }
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  // Log debug information
  log('Webhook verification debug', {
    hasSecretToken: !!secretToken,
    hasExpectedToken: !!TELEGRAM_SECRET_TOKEN,
    secretTokenLength: secretToken?.length || 0,
    expectedTokenLength: TELEGRAM_SECRET_TOKEN?.length || 0,
    userAgent: request.headers.get('User-Agent'),
    contentType: request.headers.get('Content-Type')
  });
  // If no secret token is configured, allow the request (for testing)
  if (!TELEGRAM_SECRET_TOKEN) {
    log('Warning: TELEGRAM_SECRET_TOKEN not configured, allowing request');
    return true;
  }
  // If secret token is configured, verify it
  if (!secretToken) {
    logError('Missing secret token in webhook request');
    return false;
  }
  if (secretToken !== TELEGRAM_SECRET_TOKEN) {
    logError('Invalid secret token in webhook request', null, {
      receivedLength: secretToken.length,
      expectedLength: TELEGRAM_SECRET_TOKEN.length
    });
    return false;
  }
  log('Secret token verification successful');
  return true;
}
async function sendTelegramMessage(chatId, text, options = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    logError('Cannot send message: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      })
    });
    if (!response.ok) {
      const error = await response.json();
      logError('Failed to send Telegram message', error, {
        chat_id: chatId
      });
      return false;
    }
    log('Telegram message sent successfully', {
      chat_id: chatId
    });
    return true;
  } catch (error) {
    logError('Error sending Telegram message', error, {
      chat_id: chatId
    });
    return false;
  }
}
async function handleStartCommand(supabase, chatId, text, chat, from) {
  const match = text.match(/^\/start\s+(.+)/);
  if (!match) {
    // Regular /start command without token
    await sendTelegramMessage(chatId, `👋 Welcome to FlowBot!\n\n` + `To link this chat to your account, please:\n` + `1. Go to your FlowBot integrations page\n` + `2. Click "Connect" next to Telegram\n` + `3. Click the generated link to return here\n\n` + `This will enable automated workflows to send messages to this chat.`);
    return;
  }
  const token = match[1];
  log('Processing start command with token', {
    chat_id: chatId,
    token
  });
  try {
    // Find the link token
    const { data: linkToken, error: tokenError } = await supabase.from('telegram_link_tokens').select('*').eq('token', token).eq('is_used', false).gt('expires_at', new Date().toISOString()).single();
    if (tokenError || !linkToken) {
      logError('Invalid or expired token', tokenError, {
        token,
        chat_id: chatId
      });
      await sendTelegramMessage(chatId, `❌ Invalid or expired link token.\n\n` + `Please generate a new link from your FlowBot integrations page.`);
      return;
    }
    // Mark token as used and store chat info
    const { error: updateError } = await supabase.from('telegram_link_tokens').update({
      is_used: true,
      used_at: new Date().toISOString(),
      chat_id: chatId.toString()
    }).eq('id', linkToken.id);
    if (updateError) {
      logError('Failed to update token', updateError, {
        token,
        chat_id: chatId
      });
      await sendTelegramMessage(chatId, `❌ Failed to process link token. Please try again.`);
      return;
    }
    // Store chat information
    const { error: chatError } = await supabase.from('telegram_chats').upsert({
      user_id: linkToken.user_id,
      chat_id: chatId.toString(),
      chat_type: chat.type,
      username: chat.username || from.username,
      first_name: chat.first_name || from.first_name,
      last_name: chat.last_name || from.last_name,
      title: chat.title,
      is_active: true,
      metadata: {
        telegram_user_id: from.id,
        linked_via_token: token,
        linked_at: new Date().toISOString()
      }
    }, {
      onConflict: 'user_id,chat_id'
    });
    if (chatError) {
      logError('Failed to store chat information', chatError, {
        chat_id: chatId
      });
      await sendTelegramMessage(chatId, `❌ Failed to link chat. Please try again.`);
      return;
    }
    log('Successfully linked Telegram chat', {
      chat_id: chatId,
      user_id: linkToken.user_id,
      token
    });
    await sendTelegramMessage(chatId, `✅ <b>Successfully linked!</b>\n\n` + `This chat is now connected to your FlowBot account.\n` + `Your automated workflows can now send messages to this chat.\n\n` + `🤖 Ready to receive automation notifications!`);
  } catch (error) {
    logError('Error processing start command', error, {
      chat_id: chatId,
      token
    });
    await sendTelegramMessage(chatId, `❌ An error occurred while linking your chat. Please try again.`);
  }
}
async function storeMessage(supabase, update) {
  if (!update.message) return;
  const { message } = update;
  const { chat, from } = message;
  try {
    // Find user_id for this chat
    const { data: telegramChat } = await supabase.from('telegram_chats').select('user_id').eq('chat_id', chat.id.toString()).single();
    // Determine message type
    let messageType = 'text';
    if (message.photo) messageType = 'photo';
    else if (message.document) messageType = 'document';
    // Store the message
    const { error } = await supabase.from('telegram_messages').insert({
      chat_id: chat.id.toString(),
      message_id: message.message_id,
      user_id: telegramChat?.user_id || null,
      from_telegram_user_id: from.id.toString(),
      from_username: from.username,
      from_first_name: from.first_name,
      from_last_name: from.last_name,
      text: message.text || null,
      message_type: messageType,
      timestamp: new Date(message.date * 1000).toISOString(),
      metadata: {
        update_id: update.update_id,
        is_bot: from.is_bot,
        chat_type: chat.type,
        ...message.photo && {
          photo: message.photo
        },
        ...message.document && {
          document: message.document
        }
      }
    });
    if (error) {
      logError('Failed to store message', error, {
        chat_id: chat.id,
        message_id: message.message_id
      });
    } else {
      log('Message stored successfully', {
        chat_id: chat.id,
        message_id: message.message_id,
        message_type: messageType
      });
    }
  } catch (error) {
    logError('Error storing message', error, {
      chat_id: chat.id,
      message_id: message.message_id
    });
  }
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    log('Incoming webhook request', {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('User-Agent'),
      contentType: req.headers.get('Content-Type')
    });
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      logError('Missing required environment variables', null, {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseServiceKey: !!supabaseServiceKey,
        hasTelegramBotToken: !!TELEGRAM_BOT_TOKEN
      });
      return new Response('Internal Server Error - Missing Configuration', {
        status: 500,
        headers: corsHeaders
      });
    }
    // Verify webhook authenticity
    const isValidWebhook = await verifyTelegramWebhook(req);
    if (!isValidWebhook) {
      logError('Webhook verification failed');
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      });
    }
    // Parse the update
    let update;
    try {
      update = await req.json();
    } catch (parseError) {
      logError('Failed to parse JSON body', parseError);
      return new Response('Bad Request - Invalid JSON', {
        status: 400,
        headers: corsHeaders
      });
    }
    log('Received Telegram update', {
      update_id: update.update_id,
      chat_id: update.message?.chat.id,
      message_id: update.message?.message_id,
      text: update.message?.text?.substring(0, 100),
      hasMessage: !!update.message
    });
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    if (update.message) {
      const { message } = update;
      const { chat, text, from } = message;
      // Store the message
      await storeMessage(supabase, update);
      // Handle commands
      if (text?.startsWith('/start')) {
        await handleStartCommand(supabase, chat.id, text, chat, from);
      }
    // Add other command handlers here as needed
    }
    return new Response('ok', {
      headers: corsHeaders
    });
  } catch (error) {
    logError('Error processing webhook', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: corsHeaders
    });
  }
});
