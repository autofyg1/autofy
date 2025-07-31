import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { service, code, state } = await req.json()

    // Validate required parameters
    if (!service || !code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get client secrets from environment
    const clientSecrets = {
      gmail: Deno.env.get('GOOGLE_CLIENT_SECRET'),
      notion: Deno.env.get('NOTION_CLIENT_SECRET')
    }

    const clientSecret = clientSecrets[service as keyof typeof clientSecrets]
    if (!clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Client secret not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // OAuth configurations
    const oauthConfigs = {
      gmail: {
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientId: Deno.env.get('GOOGLE_CLIENT_ID'),
        redirectUri: `${req.headers.get('origin')}/oauth/callback/gmail`
      },
      notion: {
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        clientId: Deno.env.get('NOTION_CLIENT_ID'),
        redirectUri: `${req.headers.get('origin')}/oauth/callback/notion`
      }
    }

    const config = oauthConfigs[service as keyof typeof oauthConfigs]
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Unsupported service' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Exchange code for tokens
    const tokenBody = new URLSearchParams({
      client_id: config.clientId!,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri
    })

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenBody.toString()
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Token exchange failed:', error)
      return new Response(
        JSON.stringify({ error: 'Token exchange failed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokens = await tokenResponse.json()

    // Calculate expiration time
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      : null

    // Prepare credentials object
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      expires_at: expiresAt,
      obtained_at: new Date().toISOString()
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        credentials,
        service 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('OAuth exchange error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})