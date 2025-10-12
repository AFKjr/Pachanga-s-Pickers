// api/generate-predictions.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import generators
import { generateHistoricalPredictions } from './lib/generators/historical-predictions';
import { generateLivePredictions } from './lib/generators/live-predictions';
import { fetchNFLOdds } from './lib/odds/fetch-odds';

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const startTime = Date.now();
  
  function logMemory(label: string) {
    const memUsage = process.memoryUsage();
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  ${elapsedSeconds}s | 💾 ${label}: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  }

  // Validate request method
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Validate authorization
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🎲 Starting prediction generation...');
    logMemory('Function started');

    // Extract request parameters
    const { targetWeek, useStoredOdds } = request.body || {};
    console.log(`📋 Parameters: targetWeek=${targetWeek}, useStoredOdds=${useStoredOdds}`);

    // Load environment variables
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return response.status(500).json({
        error: 'Supabase configuration missing',
        hint: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables'
      });
    }

    // ========================================================================
    // ROUTE 1: Historical Mode (stored odds + week-specific stats)
    // ========================================================================
    if (useStoredOdds && targetWeek) {
      console.log('📚 Using historical mode with stored odds...');
      
      const result = await generateHistoricalPredictions(
        targetWeek,
        SUPABASE_URL,
        SUPABASE_KEY,
        WEATHER_API_KEY
      );

      logMemory('Historical predictions complete');

      return response.status(200).json({
        success: true,
        ...result
      });
    }

    // ========================================================================
    // ROUTE 2: Live Mode (current odds + latest stats)
    // ========================================================================
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
      return response.status(500).json({
        error: 'Failed to fetch odds from The Odds API',
        details: errorMessage,
        hint: 'Check if ODDS_API_KEY environment variable is set correctly'
      });
    }

    // Handle case where no games are available
    if (!oddsData || oddsData.length === 0) {
      return response.status(200).json({
        success: true,
        predictions: [],
        message: 'No NFL games available at this time',
        metadata: {
          generated_at: new Date().toISOString(),
          games_processed: 0
        }
      });
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
      WEATHER_API_KEY
    );

    logMemory('Live predictions complete');

    return response.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Error generating predictions after ${elapsedSeconds}s:`, errorMessage);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return response.status(500).json({
      error: 'Failed to generate predictions',
      details: errorMessage,
      elapsed_seconds: elapsedSeconds,
      timestamp: new Date().toISOString()
    });
  }
}
