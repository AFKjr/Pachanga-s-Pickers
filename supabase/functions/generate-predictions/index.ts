// supabase/functions/generate-predictions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import live predictions generator only
import { generateLivePredictions } from './lib/generators/live-predictions.ts';
import { fetchNFLOdds } from './lib/odds/fetch-odds.ts';
import { getNFLWeekFromDate } from './lib/utils/nfl-utils.ts';

// ============================================================================
// MAIN HANDLER - LIVE PREDICTIONS ONLY
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  function logMemory(label: string) {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  ${elapsedSeconds}s | ${label}`);
  }

  // Validate request method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Validate authorization
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
    console.log('🎲 Starting live prediction generation...');
    logMemory('Function started');

    // Extract request parameters
    const { targetWeek } = await req.json();
    console.log(`📋 Parameters: targetWeek=${targetWeek || 'all upcoming games'}`);

    // Load environment variables
    const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    const WEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

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

    // Fetch current odds from The Odds API
    console.log('📊 Fetching odds from The Odds API...');

    let oddsData;
    try {
      oddsData = await fetchNFLOdds();
      console.log(`✅ Found ${oddsData.length} total games from Odds API`);
      logMemory(`Loaded ${oddsData.length} games`);

      // Detailed logging for diagnostics
      console.log('🔍 DEBUG: Games from Odds API:');

      let gamesWithBookmakers = 0;
      let gamesWithoutBookmakers = 0;
      let gamesWithDraftKings = 0;

      oddsData.forEach((game, index) => {
        const gameDate = new Date(game.commence_time);
        const gameWeek = getNFLWeekFromDate(gameDate);
        const hasBookmakers = game.bookmakers && game.bookmakers.length > 0;
        const hasDraftKings = game.bookmakers?.find(bookmaker => bookmaker.key === 'draftkings');

        if (hasBookmakers) {
          gamesWithBookmakers++;
          if (hasDraftKings) gamesWithDraftKings++;
        } else {
          gamesWithoutBookmakers++;
        }

        console.log(`  Game ${index + 1}: ${game.away_team} @ ${game.home_team} (Week ${gameWeek})`);
        console.log(`    Date: ${gameDate.toISOString()}`);
        console.log(`    Bookmakers: ${game.bookmakers?.length || 0} | DraftKings: ${hasDraftKings ? 'YES' : 'NO'}`);

        if (!hasBookmakers) {
          console.warn(`    ⚠️  NO BOOKMAKER DATA - will use fallback odds`);
        } else if (!hasDraftKings) {
          console.warn(`    ⚠️  No DraftKings - using ${game.bookmakers[0]?.key || 'unknown'}`);
        }
      });

      console.log(`\n📊 Odds API Summary:`);
      console.log(`   Total games: ${oddsData.length}`);
      console.log(`   With bookmakers: ${gamesWithBookmakers}`);
      console.log(`   With DraftKings: ${gamesWithDraftKings}`);
      console.log(`   Without bookmakers: ${gamesWithoutBookmakers} (will use fallbacks)`);
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

    // Handle case where no games are available
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

    // Warn if weather API is not configured
    if (!WEATHER_API_KEY) {
      console.warn('⚠️ OPENWEATHER_API_KEY not set - predictions will run without weather data');
    }

    // Generate live predictions
    const result = await generateLivePredictions(
      oddsData,
      SUPABASE_URL,
      SUPABASE_KEY,
      WEATHER_API_KEY,
      targetWeek
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
});
