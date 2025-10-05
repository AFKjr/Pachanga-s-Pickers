// api/generate-predictions.ts
// Vercel Serverless Function to generate NFL predictions

import type { VercelRequest, VercelResponse } from '@vercel/node';

// TODO: Re-enable these imports once module resolution is configured
// import { fetchNFLOdds, prepareGamePredictionData } from '../src/lib/externalApis';
// import { runMonteCarloSimulation, generateRecommendations } from '../src/lib/api/monteCarloSimulation';

/**
 * Main handler for prediction generation
 * Called via: POST /api/generate-predictions
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting prediction generation...');
    
    // Temporary: Return helpful message while we fix module imports
    return response.status(200).json({
      success: false,
      error: 'Feature temporarily unavailable',
      message: 'The automated prediction generation feature is currently being configured. Please use the "Manual Data Entry" section below to add picks for now.',
      details: 'The serverless function requires additional configuration to import modules from the src/ directory.',
      metadata: {
        timestamp: new Date().toISOString(),
        status: 'configuration_pending'
      }
    });
    
    /* TODO: Uncomment when module imports are fixed
    
    // Step 1: Fetch current NFL odds
    console.log('Fetching odds from The Odds API...');
    let oddsData;
    try {
      oddsData = await fetchNFLOdds();
      console.log(`Found ${oddsData.length} games with odds`);
    } catch (oddsError) {
      const errorMessage = oddsError instanceof Error ? oddsError.message : String(oddsError);
      console.error('Failed to fetch odds:', errorMessage);
      return response.status(500).json({
        error: 'Failed to fetch odds from The Odds API',
        details: errorMessage,
        hint: 'Check if ODDS_API_KEY environment variable is set in Vercel'
      });
    }

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

    // Step 2: Process each game
    const predictions = [];
    const errors = [];
    
    for (const game of oddsData) {
      try {
        console.log(`Processing: ${game.away_team} @ ${game.home_team}`);
        
        // Prepare data for simulation (with ESPN stats or defaults)
        const gameData = await prepareGamePredictionData(
          game.home_team,
          game.away_team,
          game
        );

        // Run Monte Carlo simulation
        const simResult = runMonteCarloSimulation(gameData);
      
        // Generate betting recommendations
        const recommendations = generateRecommendations(gameData, simResult);

        // Format for database
        predictions.push({
        game_info: {
          home_team: game.home_team,
          away_team: game.away_team,
          league: 'NFL',
          game_date: game.commence_time.split('T')[0],
          spread: gameData.spread,
          over_under: gameData.total,
          home_score: null,
          away_score: null
        },
        prediction: recommendations.moneyline.pick + ' to win',
        spread_prediction: recommendations.spread.pick,
        ou_prediction: `${recommendations.total.pick} ${recommendations.total.line}`,
        confidence: mapConfidenceToNumber(recommendations.moneyline.confidence),
        reasoning: generateReasoning(gameData, simResult, recommendations),
        result: 'pending',
        week: calculateNFLWeek(new Date(game.commence_time)),
        monte_carlo_results: {
          iterations: simResult.iterations,
          home_win_probability: simResult.homeWinProbability,
          away_win_probability: simResult.awayWinProbability,
          predicted_home_score: simResult.predictedHomeScore,
          predicted_away_score: simResult.predictedAwayScore,
          confidence_interval: {
            low: simResult.confidenceIntervalLow,
            high: simResult.confidenceIntervalHigh
          }
        }
      });
      } catch (gameError) {
        const errorMessage = gameError instanceof Error ? gameError.message : String(gameError);
        console.error(`Error processing ${game.away_team} @ ${game.home_team}:`, errorMessage);
        errors.push({
          game: `${game.away_team} @ ${game.home_team}`,
          error: errorMessage
        });
        // Continue processing other games
      }
    }

    console.log(`Generated ${predictions.length} predictions${errors.length > 0 ? ` (${errors.length} failures)` : ''}`);

    // Return predictions (frontend will save to Supabase)
    return response.status(200).json({
      success: true,
      predictions,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        generated_at: new Date().toISOString(),
        games_attempted: oddsData.length,
        games_processed: predictions.length,
        games_failed: errors.length,
        simulation_iterations: 10000
      }
    });
    
    */ // End of commented code

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating predictions:', errorMessage);
    return response.status(500).json({
      error: 'Failed to generate predictions',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

/* TODO: Uncomment utility functions when main code is enabled

// Map confidence level to numeric value
function mapConfidenceToNumber(confidence: 'High' | 'Medium' | 'Low'): number {
  switch (confidence) {
    case 'High': return 80;
    case 'Medium': return 60;
    case 'Low': return 40;
    default: return 50;
  }
}

// Generate human-readable reasoning
function generateReasoning(
  gameData: any,
  simResult: any,
  recommendations: any
): string {
  const factors: string[] = [];

  // Offensive matchup
  const offensiveDiff = gameData.homeStats.pointsPerGame - gameData.awayStats.pointsAllowedPerGame;
  if (offensiveDiff > 5) {
    factors.push(`${gameData.homeTeam} offense averaging ${gameData.homeStats.pointsPerGame} PPG vs ${gameData.awayTeam} defense allowing ${gameData.awayStats.pointsAllowedPerGame} PPG`);
  }

  // Monte Carlo insights
  factors.push(`Monte Carlo simulation (${simResult.iterations.toLocaleString()} iterations) projects ${gameData.homeTeam} ${simResult.predictedHomeScore}-${simResult.predictedAwayScore}`);
  
  // Win probability
  factors.push(`${recommendations.moneyline.pick} has ${recommendations.moneyline.winProbability.toFixed(1)}% win probability`);

  // Spread analysis
  factors.push(`Spread analysis shows ${recommendations.spread.coverProbability.toFixed(1)}% probability of covering ${gameData.spread > 0 ? '+' : ''}${gameData.spread}`);

  // Total analysis
  factors.push(`Projected total of ${simResult.predictedHomeScore + simResult.predictedAwayScore} points suggests ${recommendations.total.pick} ${recommendations.total.line}`);

  return factors.join('; ');
}

// Calculate NFL week from date
function calculateNFLWeek(gameDate: Date): number {
  const seasonStart = new Date('2025-09-04'); // Week 1 Thursday
  const daysDiff = Math.floor(
    (gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(1, Math.min(18, Math.floor(daysDiff / 7) + 1));
}

*/ // End of commented utility functions