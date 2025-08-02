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
    const { service, code, state, debug } = await req.json()

    if (debug) {
      console.log('=== EDGE FUNCTION DEBUG ===')
      console.log('Received service:', service)
      console.log('Received code:', code ? 'present' : 'missing')
      console.log('Received state:', state)
      console.log('Request origin:', req.headers.get('origin'))
      console.log('Request referer:', req.headers.get('referer'))
    }

    // Validate required parameters
    if (!service || !code) {
      console.error('Missing required parameters:', { service: !!service, code: !!code })
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

    // OAuth configurations
    const oauthConfigs = {
      gmail: {
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientId: Deno.env.get('GOOGLE_CLIENT_ID'),
        redirectUri: 'https://cheery-nasturtium-54af2b.netlify.app/oauth/callback/gmail'
      },
      notion: {
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        clientId: Deno.env.get('NOTION_CLIENT_ID'),
        redirectUri: 'https://cheery-nasturtium-54af2b.netlify.app/oauth/callback/notion'
      }
    }

    if (debug) {
      console.log('=== ENVIRONMENT VARIABLES CHECK ===')
      console.log('GOOGLE_CLIENT_ID:', Deno.env.get('GOOGLE_CLIENT_ID') ? 'present' : 'MISSING')
      console.log('GOOGLE_CLIENT_SECRET:', Deno.env.get('GOOGLE_CLIENT_SECRET') ? 'present' : 'MISSING')
      console.log('NOTION_CLIENT_ID:', Deno.env.get('NOTION_CLIENT_ID') ? 'present' : 'MISSING')
      console.log('NOTION_CLIENT_SECRET:', Deno.env.get('NOTION_CLIENT_SECRET') ? 'present' : 'MISSING')
    }
    const clientSecret = clientSecrets[service as keyof typeof clientSecrets]
    if (!clientSecret) {
      console.error('Client secret not found for service:', service)
      console.error('Available secrets:', Object.keys(clientSecrets).filter(key => clientSecrets[key as keyof typeof clientSecrets]))
      return new Response(
        JSON.stringify({ error: 'Client secret not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }


    const config = oauthConfigs[service as keyof typeof oauthConfigs]
    if (!config) {
      console.error('OAuth config not found for service:', service)
      return new Response(
        JSON.stringify({ error: 'Unsupported service' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (debug) {
      console.log('Using config:', {
        tokenUrl: config.tokenUrl,
        clientId: config.clientId ? 'present' : 'missing',
        redirectUri: config.redirectUri
      })
    }

    // Exchange code for tokens - Notion requires different format
    let tokenResponse;
    
    if (service === 'notion') {
      // Notion uses form data with Basic Auth
      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId!,
        client_secret: clientSecret
      });
      
      if (debug) {
        console.log('Notion token request:', {
          url: config.tokenUrl,
          body: 'form data with credentials',
          redirectUri: config.redirectUri
        })
      }
      
      tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: tokenBody.toString()
      })
    } else {
      // Google and other services use form data
      const tokenBody = new URLSearchParams({
        client_id: config.clientId!,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri
      })
      
      tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenBody.toString()
      })
    }

    if (debug) {
      console.log('Token exchange request sent')
    }


    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Token exchange failed with status:', tokenResponse.status)
      console.error('Token exchange error response:', error)
      console.error('Response headers:', Object.fromEntries(tokenResponse.headers.entries()))
      return new Response(
        JSON.stringify({ error: `Token exchange failed: ${error}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokens = await tokenResponse.json()

    if (debug) {
      console.log('Received tokens:', {
        access_token: tokens.access_token ? 'present' : 'missing',
        refresh_token: tokens.refresh_token ? 'present' : 'missing',
        expires_in: tokens.expires_in,
        token_type: tokens.token_type
      })
    }

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

    if (debug) {
      console.log('Prepared credentials for storage')
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
    console.error('=== EDGE FUNCTION ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})