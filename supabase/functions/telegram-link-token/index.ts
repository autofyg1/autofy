import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TELEGRAM_BOT_USERNAME = Deno.env.get('TELEGRAM_BOT_USERNAME') // e.g., 'flowbot_automation_bot'

function generateRandomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
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

    // Initialize Supabase client with user JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    console.log('Generating link token for user:', user.id)

    // Generate a unique token
    const token = generateRandomToken()

    // Store the token in the database
    const { data: linkToken, error: insertError } = await supabase
      .from('telegram_link_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour expiry
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store link token:', insertError)
      return new Response('Failed to generate link token', {
        status: 500,
        headers: corsHeaders
      })
    }

    // Generate the Telegram deep link
    const deepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`

    console.log('Link token generated successfully:', token)

    return new Response(JSON.stringify({
      success: true,
      token,
      deep_link: deepLink,
      expires_at: linkToken.expires_at
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })

  } catch (error) {
    console.error('Error generating link token:', error)
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    })
  }
})
