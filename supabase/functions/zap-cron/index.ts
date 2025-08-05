import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    console.log('=== CRON JOB TRIGGERED ===')
    console.log('Time:', new Date().toISOString())

    // Get Supabase project URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Call the zap-executor function
    const zapExecutorUrl = `${supabaseUrl}/functions/v1/zap-executor`
    
    console.log('Calling zap-executor at:', zapExecutorUrl)
    
    const response = await fetch(zapExecutorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'cron'
      })
    })

    const result = await response.json()
    
    console.log('Zap executor response:', result)

    if (!response.ok) {
      throw new Error(`Zap executor failed: ${result.error || 'Unknown error'}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job completed successfully',
        timestamp: new Date().toISOString(),
        zapResults: result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== CRON JOB ERROR ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Cron job failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
