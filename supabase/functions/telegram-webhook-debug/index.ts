import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      }
    })
  }

  try {
    // Log all environment variables (for debugging)
    const envVars = {
      TELEGRAM_BOT_TOKEN: Deno.env.get('TELEGRAM_BOT_TOKEN') ? 'SET' : 'NOT SET',
      TELEGRAM_SECRET_TOKEN: Deno.env.get('TELEGRAM_SECRET_TOKEN') ? 'SET' : 'NOT SET',
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'NOT SET',
    }
    
    // Log all headers
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })
    
    // Get the secret token from headers
    const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    const expectedToken = Deno.env.get('TELEGRAM_SECRET_TOKEN')
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: headers,
      envVars: envVars,
      secretTokenReceived: secretToken ? 'YES' : 'NO',
      secretTokenMatches: secretToken === expectedToken,
      expectedTokenLength: expectedToken?.length || 0,
      receivedTokenLength: secretToken?.length || 0
    }
    
    console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2))
    
    // Try to parse body if it exists
    let body = null
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (e) {
      console.log('Error parsing body:', e.message)
    }
    
    if (body) {
      console.log('BODY:', JSON.stringify(body, null, 2))
    }
    
    // Simple authentication check
    if (!expectedToken) {
      console.log('No expected token configured - allowing request')
      return new Response(JSON.stringify({
        status: 'ok',
        message: 'No secret token configured - debug mode',
        debug: debugInfo
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }
    
    if (!secretToken) {
      console.log('No secret token received in headers')
      return new Response(JSON.stringify({
        status: 'error',
        message: 'No secret token received',
        debug: debugInfo
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }
    
    if (secretToken !== expectedToken) {
      console.log('Secret token mismatch')
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Secret token mismatch',
        debug: debugInfo
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }
    
    console.log('Secret token verified successfully')
    return new Response(JSON.stringify({
      status: 'ok',
      message: 'Webhook received and verified successfully',
      debug: debugInfo,
      body: body
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
    
  } catch (error) {
    console.error('Error in debug webhook:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})
