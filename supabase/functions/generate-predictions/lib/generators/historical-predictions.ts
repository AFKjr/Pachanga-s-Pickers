// api/lib/generators/historical-predictions.ts
import { SIMULATION_ITERATIONS } from '../constants.ts';
import type { GameWeather } from '../types.ts';
import { fetchHistoricalGames } from '../database/fetch-historical.ts';
import { fetchTeamStatsWithFallback } from '../database/fetch-stats.ts';
import { fetchGameWeather } from '../weather/weather-fetcher.ts';
import { formatWeatherForDisplay } from '../weather/weather-calculator.ts';
import { runMonteCarloSimulation } from '../simulation/monte-carlo.ts';
import { getConfidenceLevel, mapConfidenceToNumber } from '../utils/nfl-utils.ts';
import { generateReasoning } from '../utils/reasoning-generator.ts';

export interface HistoricalPredictionsResult {
  predictions: any[];
  errors: any[];
  metadata: {
    generated_at: string;
    mode: string;
    target_week: number;
    games_attempted: number;
    games_processed: number;
    games_failed: number;
    simulation_iterations: number;
    execution_time_seconds: string;
  };
}

export async function generateHistoricalPredictions(
  targetWeek: number,
  supabaseUrl: string,
  supabaseKey: string,
  weatherApiKey: string | undefined
): Promise<HistoricalPredictionsResult> {
  const startTime = Date.now();

  console.log(`\n🕰️  HISTORICAL MODE: Generating predictions for Week ${targetWeek}`);
  console.log(`📊 Will use Week ${targetWeek} team stats + stored odds\n`);

  const historicalGames = await fetchHistoricalGames(targetWeek, supabaseUrl, supabaseKey);

  if (!historicalGames || historicalGames.length === 0) {
    return {
      predictions: [],
      errors: [{
        message: `No historical games found for Week ${targetWeek}. Generate live predictions first to capture odds.`
      }],
      metadata: {
        generated_at: new Date().toISOString(),
        mode: 'historical',
        target_week: targetWeek,
        games_attempted: 0,
        games_processed: 0,
        games_failed: 0,
        simulation_iterations: SIMULATION_ITERATIONS,
        execution_time_seconds: ((Date.now() - startTime) / 1000).toFixed(2)
      }
    };
  }

  const predictions = [];
  const errors = [];

  for (let gameIndex = 0; gameIndex < historicalGames.length; gameIndex++) {
    const game = historicalGames[gameIndex];

    try {
      console.log(`\n🏈 [${gameIndex + 1}/${historicalGames.length}] Processing: ${game.away_team} @ ${game.home_team}`);

      // Fetch team stats for the specific week
      const homeStats = await fetchTeamStatsWithFallback(
        game.home_team,
        supabaseUrl,
        supabaseKey,
        targetWeek
      );

      const awayStats = await fetchTeamStatsWithFallback(
        game.away_team,
        supabaseUrl,
        supabaseKey,
        targetWeek
      );

      console.log(`📈 Using Week ${targetWeek} stats for both teams`);
      console.log(`💰 Using stored odds: ML ${game.home_ml_odds || 'N/A'}/${game.away_ml_odds || 'N/A'}`);

      // Fetch weather if API key available
      let gameWeather: GameWeather | null = null;
      let weatherImpact = 'No weather data';

      if (weatherApiKey) {
        try {
          gameWeather = await fetchGameWeather(game.home_team, game.game_date, weatherApiKey);
          if (gameWeather) {
            weatherImpact = formatWeatherForDisplay(gameWeather);
            console.log(`🌤️ Weather: ${weatherImpact}`);
          }
        } catch (weatherError) {
          console.error(`⚠️ Weather fetch failed:`, weatherError);
        }
      }

      // Run simulation
      console.log(`⚙️ Running ${SIMULATION_ITERATIONS.toLocaleString()} Monte Carlo simulations...`);
      const simResult = runMonteCarloSimulation(
        homeStats,
        awayStats,
        game.spread,
        game.over_under,
        gameWeather
      );

      // Calculate picks and probabilities
      const moneylineProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
      const moneylineConfidence = getConfidenceLevel(moneylineProb);
      const moneylinePick = simResult.homeWinProbability > simResult.awayWinProbability 
        ? game.home_team 
        : game.away_team;

      const spreadPick = simResult.spreadCoverProbability > 50
        ? `${game.home_team} ${game.spread > 0 ? '+' : ''}${game.spread}`
        : `${game.away_team} ${-game.spread > 0 ? '+' : ''}${-game.spread}`;
      const spreadProb = Math.max(simResult.spreadCoverProbability, 100 - simResult.spreadCoverProbability);

      const totalPick = simResult.overProbability > 50 ? 'Over' : 'Under';
      const totalProb = Math.max(simResult.overProbability, simResult.underProbability);

      console.log(`✅ Prediction complete: ${moneylinePick} to win (${moneylineProb.toFixed(1)}%)`);

      predictions.push({
        game_info: {
          home_team: game.home_team,
          away_team: game.away_team,
          league: 'NFL',
          game_date: game.game_date,
          spread: game.spread,
          over_under: game.over_under,
          home_score: null,
          away_score: null,
          home_ml_odds: game.home_ml_odds,
          away_ml_odds: game.away_ml_odds,
          spread_odds: game.spread_odds,
          over_odds: game.over_odds,
          under_odds: game.under_odds
        },
        prediction: `${moneylinePick} to win`,
        spread_prediction: spreadPick,
        ou_prediction: `${totalPick} ${game.over_under}`,
        confidence: mapConfidenceToNumber(moneylineConfidence),
        reasoning: generateReasoning(
          game.home_team,
          game.away_team,
          simResult,
          moneylinePick,
          spreadPick,
          `${totalPick} ${game.over_under}`,
          gameWeather?.impactRating !== 'none' ? weatherImpact : undefined
        ),
        result: 'pending',
        week: targetWeek,
        monte_carlo_results: {
          moneyline_probability: moneylineProb,
          spread_probability: spreadProb,
          total_probability: totalProb,
          home_win_probability: simResult.homeWinProbability,
          away_win_probability: simResult.awayWinProbability,
          spread_cover_probability: simResult.spreadCoverProbability,
          over_probability: simResult.overProbability,
          under_probability: simResult.underProbability,
          predicted_home_score: simResult.predictedHomeScore,
          predicted_away_score: simResult.predictedAwayScore
        },
        weather: gameWeather ? {
          temperature: gameWeather.temperature,
          wind_speed: gameWeather.windSpeed,
          condition: gameWeather.condition,
          impact_rating: gameWeather.impactRating,
          description: gameWeather.description
        } : null,
        weather_impact: weatherImpact
      });

    } catch (gameError) {
      const errorMessage = gameError instanceof Error ? gameError.message : String(gameError);
      console.error(`❌ Error processing ${game.away_team} @ ${game.home_team}:`, errorMessage);
      errors.push({
        game: `${game.away_team} @ ${game.home_team}`,
        error: errorMessage
      });
    }
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Generated ${predictions.length} historical predictions in ${elapsedSeconds}s`);

  return {
    predictions,
    errors,
    metadata: {
      generated_at: new Date().toISOString(),
      mode: 'historical',
      target_week: targetWeek,
      games_attempted: historicalGames.length,
      games_processed: predictions.length,
      games_failed: errors.length,
      simulation_iterations: SIMULATION_ITERATIONS,
      execution_time_seconds: elapsedSeconds
    }
  };
}
