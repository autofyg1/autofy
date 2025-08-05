import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GmailService } from './services/gmail.ts'
import { NotionService } from './services/notion.ts'
import { EmailParser } from './services/email-parser.ts'
import { ZapExecutor } from './services/zap-executor.ts'
import { Logger } from './utils/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZapExecutionRequest {
  zapId?: string
  userId?: string
  mode?: 'single' | 'cron' // single zap execution or cron-triggered batch
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const logger = new Logger()
  
  try {
    logger.info('=== ZAP EXECUTOR STARTED ===')
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    
    logger.info('Environment variables check passed')
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body (optional for cron jobs)
    let requestData: ZapExecutionRequest = {}
    
    if (req.method === 'POST') {
      try {
        requestData = await req.json()
      } catch (e) {
        // Ignore parsing errors for cron jobs that don't send JSON
        logger.info('No JSON body provided, treating as cron execution')
      }
    }

    const { zapId, userId, mode = 'cron' } = requestData

    logger.info(`Execution mode: ${mode}`, { zapId, userId })

    // Initialize services
    const gmailService = new GmailService()
    const notionService = new NotionService()
    const emailParser = new EmailParser()
    const zapExecutor = new ZapExecutor(supabase, gmailService, notionService, emailParser, logger)

    let results: any[] = []

    if (mode === 'single' && zapId) {
      // Execute a single zap
      logger.info(`Executing single zap: ${zapId}`)
      const result = await zapExecutor.executeSingleZap(zapId)
      results = [result]
    } else {
      // Execute all active zaps (cron mode)
      logger.info('Executing all active zaps (cron mode)')
      results = await zapExecutor.executeActiveZaps(userId)
    }

    // Summary statistics
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const total = results.length

    logger.info('=== EXECUTION COMPLETE ===', {
      total,
      successful,
      failed,
      results: results.map(r => ({
        zapId: r.zapId,
        success: r.success,
        error: r.error,
        emailsProcessed: r.emailsProcessed || 0
      }))
    })

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total,
          successful,
          failed
        },
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    logger.error('=== CRITICAL ERROR ===', {
      message: error.message,
      stack: error.stack
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Critical error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleTestDatabase(databaseId: string, userId: string) {
  try {
    const notionService = new NotionService();
    
    // Test database access using the public method
    const result = await notionService.testDatabaseAccess(userId, databaseId);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
