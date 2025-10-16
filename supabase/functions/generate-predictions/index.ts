// supabase/functions/generate-predictions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


import { generateHistoricalPredictions } from './lib/generators/historical-predictions.ts';
import { generateLivePredictions } from './lib/generators/live-predictions.ts';
import { fetchNFLOdds } from './lib/odds/fetch-odds.ts';





const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  function logMemory(label: string) {
    
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  ${elapsedSeconds}s | ${label}`);
  }

  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('🎲 Starting prediction generation...');
    logMemory('Function started');

    
    const { targetWeek, useStoredOdds } = await req.json();
    console.log(`📋 Parameters: targetWeek=${targetWeek}, useStoredOdds=${useStoredOdds}`);

    
    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    const WEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    const RAPIDAPI_KEY = undefined; 

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Supabase configuration missing',
          hint: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    
    console.log('ℹ️ Sports Radar API disabled - using team_stats_cache database for stats');

    
    
    
    if (useStoredOdds && targetWeek) {
      console.log('📚 Using historical mode with stored odds...');
      
      const result = await generateHistoricalPredictions(
        targetWeek,
        SUPABASE_URL,
        SUPABASE_KEY,
        WEATHER_API_KEY,
        RAPIDAPI_KEY
      );

      logMemory('Historical predictions complete');

      return new Response(
        JSON.stringify({
          success: true,
          ...result
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    
    
    
    console.log('📊 Using live mode (current odds + latest stats)...');
    console.log('📊 Fetching odds from The Odds API...');

    let oddsData;
    try {
      oddsData = await fetchNFLOdds();
      console.log(`✅ Found ${oddsData.length} games with odds`);
      logMemory(`Loaded ${oddsData.length} games`);
    } catch (oddsError) {
      const errorMessage = oddsError instanceof Error ? oddsError.message : String(oddsError);
      console.error('❌ Failed to fetch odds:', errorMessage);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch odds from The Odds API',
          details: errorMessage,
          hint: 'Check if ODDS_API_KEY environment variable is set correctly'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    
    if (!oddsData || oddsData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          predictions: [],
          message: 'No NFL games available at this time',
          metadata: {
            generated_at: new Date().toISOString(),
            games_processed: 0
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    
    if (!WEATHER_API_KEY) {
      console.warn('⚠️ OPENWEATHER_API_KEY not set - predictions will run without weather data');
    }

    
    const result = await generateLivePredictions(
      oddsData,
      SUPABASE_URL,
      SUPABASE_KEY,
      WEATHER_API_KEY,
      RAPIDAPI_KEY
    );

    logMemory('Live predictions complete');

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Error generating predictions after ${elapsedSeconds}s:`, errorMessage);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({
        error: 'Failed to generate predictions',
        details: errorMessage,
        elapsed_seconds: elapsedSeconds,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
