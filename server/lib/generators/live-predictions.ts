// api/lib/generators/live-predictions.ts
import { SIMULATION_ITERATIONS } from '../constants';
import type { OddsData, GameWeather } from '../types';
import { fetchTeamStatsWithFallback } from '../database/fetch-stats';
import { fetchGameWeather } from '../weather/weather-fetcher';
import { formatWeatherForDisplay } from '../weather/weather-calculator';
import { runMonteCarloSimulation } from '../simulation/monte-carlo';
import { calculateNFLWeek, getConfidenceLevel, mapConfidenceToNumber } from '../utils/nfl-utils';
import { generateReasoning } from '../utils/reasoning-generator';
import { extractOddsFromGame } from '../odds/fetch-odds';

export interface LivePredictionsResult {
  predictions: any[];
  errors: any[];
  metadata: {
    generated_at: string;
    games_attempted: number;
    games_processed: number;
    games_failed: number;
    simulation_iterations: number;
    execution_time_seconds: string;
  };
}

export async function generateLivePredictions(
  oddsData: OddsData[],
  supabaseUrl: string,
  supabaseKey: string,
  weatherApiKey: string | undefined,
  onProgress?: (current: number, total: number) => void
): Promise<LivePredictionsResult> {
  const startTime = Date.now();

  console.log(`📊 Generating live predictions for ${oddsData.length} games...`);

  const predictions = [];
  const errors = [];

  for (let gameIndex = 0; gameIndex < oddsData.length; gameIndex++) {
    const game = oddsData[gameIndex];

    try {
      console.log(`\n🏈 [${gameIndex + 1}/${oddsData.length}] Processing: ${game.away_team} @ ${game.home_team}`);

      // Call progress callback if provided
      if (onProgress) {
        onProgress(gameIndex + 1, oddsData.length);
      }

      // Fetch team stats (latest available)
      const homeStats = await fetchTeamStatsWithFallback(game.home_team, supabaseUrl, supabaseKey);
      const awayStats = await fetchTeamStatsWithFallback(game.away_team, supabaseUrl, supabaseKey);

      console.log(`📈 ${game.home_team} stats: 3D%=${homeStats.thirdDownConversionRate}, RZ%=${homeStats.redZoneEfficiency}`);
      console.log(`📈 ${game.away_team} stats: 3D%=${awayStats.thirdDownConversionRate}, RZ%=${awayStats.redZoneEfficiency}`);

      // Fetch weather if API key available
      let gameWeather: GameWeather | null = null;
      let weatherImpact = 'No weather data';

      if (weatherApiKey) {
        try {
          gameWeather = await fetchGameWeather(game.home_team, game.commence_time, weatherApiKey);
          if (gameWeather) {
            weatherImpact = formatWeatherForDisplay(gameWeather);
            console.log(`🌤️ Weather: ${weatherImpact}`);
          }
        } catch (weatherError) {
          console.error(`⚠️ Weather fetch failed:`, weatherError);
        }
      }

      // Extract odds from game
      const odds = extractOddsFromGame(game);
      console.log(`💰 Odds - ML: ${game.home_team} ${odds.homeMLOdds} / ${game.away_team} ${odds.awayMLOdds}, Spread: ${odds.spreadOdds}, O/U: ${odds.overOdds}/${odds.underOdds}`);

      // Run simulation
      console.log(`⚙️ Running ${SIMULATION_ITERATIONS.toLocaleString()} Monte Carlo simulations...`);
      const simResult = runMonteCarloSimulation(
        homeStats,
        awayStats,
        odds.homeSpread,
        odds.total,
        gameWeather
      );

      // Calculate picks and probabilities
      const moneylineProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
      const moneylineConfidence = getConfidenceLevel(moneylineProb);
      const moneylinePick = simResult.homeWinProbability > simResult.awayWinProbability 
        ? game.home_team 
        : game.away_team;

      const spreadPick = simResult.spreadCoverProbability > 50
        ? `${game.home_team} ${odds.homeSpread > 0 ? '+' : ''}${odds.homeSpread}`
        : `${game.away_team} ${-odds.homeSpread > 0 ? '+' : ''}${-odds.homeSpread}`;
      const spreadProb = Math.max(simResult.spreadCoverProbability, 100 - simResult.spreadCoverProbability);

      const totalPick = simResult.overProbability > 50 ? 'Over' : 'Under';
      const totalProb = Math.max(simResult.overProbability, simResult.underProbability);

      // Format game date
      const gameDateTime = new Date(game.commence_time);
      const estOffset = 5 * 60 * 60 * 1000;
      const estDate = new Date(gameDateTime.getTime() - estOffset);
      const formattedDate = estDate.toISOString().split('T')[0];

      console.log(`✅ Prediction complete: ${moneylinePick} to win (${moneylineProb.toFixed(1)}%)`);

      predictions.push({
        game_info: {
          home_team: game.home_team,
          away_team: game.away_team,
          league: 'NFL',
          game_date: formattedDate,
          spread: odds.homeSpread,
          over_under: odds.total,
          home_score: null,
          away_score: null,
          home_ml_odds: odds.homeMLOdds,
          away_ml_odds: odds.awayMLOdds,
          spread_odds: odds.spreadOdds,
          over_odds: odds.overOdds,
          under_odds: odds.underOdds
        },
        prediction: `${moneylinePick} to win`,
        spread_prediction: spreadPick,
        ou_prediction: `${totalPick} ${odds.total}`,
        confidence: mapConfidenceToNumber(moneylineConfidence),
        reasoning: generateReasoning(
          game.home_team,
          game.away_team,
          simResult,
          moneylinePick,
          spreadPick,
          `${totalPick} ${odds.total}`,
          gameWeather?.impactRating !== 'none' ? weatherImpact : undefined
        ),
        result: 'pending',
        week: calculateNFLWeek(new Date(game.commence_time)),
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
  console.log(`\n🎉 Generated ${predictions.length} live predictions in ${elapsedSeconds}s`);

  return {
    predictions,
    errors,
    metadata: {
      generated_at: new Date().toISOString(),
      games_attempted: oddsData.length,
      games_processed: predictions.length,
      games_failed: errors.length,
      simulation_iterations: SIMULATION_ITERATIONS,
      execution_time_seconds: elapsedSeconds
    }
  };
}
