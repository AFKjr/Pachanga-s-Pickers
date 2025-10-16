// supabase/functions/generate-predictions/lib/generators/live-predictions.ts
import { SIMULATION_ITERATIONS } from '../constants.ts';
import type { OddsData, GameWeather, FavoriteInfo } from '../types.ts';
import { fetchTeamStatsWithFallback } from '../database/fetch-stats.ts';
import { fetchGameWeather } from '../weather/weather-fetcher.ts';
import { formatWeatherForDisplay } from '../weather/weather-calculator.ts';
import { runMonteCarloSimulation, determineFavorite } from '../simulation/monte-carlo.ts';
import { getConfidenceLevel, mapConfidenceToNumber, getNFLWeekFromDate } from '../utils/nfl-utils.ts';
import { generateReasoning } from '../utils/reasoning-generator.ts';
import { extractOddsFromGame, type ExtractedOdds } from '../odds/fetch-odds.ts';
import { validateMoneylineWithFallback } from '../utils/odds-converter.ts';

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


function validateGameOdds(
  odds: ExtractedOdds,
  game: OddsData
): { 
  validatedOdds: Required<ExtractedOdds>; 
  warnings: string[] 
} {
  const warnings: string[] = [];
  
  
  const moneylineValidation = validateMoneylineWithFallback(
    odds.homeMLOdds,
    odds.awayMLOdds,
    odds.homeSpread,
    odds.awaySpread
  );
  
  if (moneylineValidation.usedFallback) {
    warnings.push(
      `Missing moneyline odds for ${game.away_team} @ ${game.home_team}. ` +
      `Estimated from spread: Home ${moneylineValidation.homeMoneyline}, ` +
      `Away ${moneylineValidation.awayMoneyline}`
    );
  }
  
  
  const homeSpread = odds.homeSpread ?? 0;
  const awaySpread = odds.awaySpread ?? -homeSpread;
  
  if (odds.homeSpread === undefined) {
    warnings.push(
      `Missing spread for ${game.away_team} @ ${game.home_team}. ` +
      `Using pick'em (0)`
    );
  }
  
  
  const NFL_AVERAGE_TOTAL = 45;
  const total = odds.total ?? NFL_AVERAGE_TOTAL;
  
  if (odds.total === undefined) {
    warnings.push(
      `Missing total for ${game.away_team} @ ${game.home_team}. ` +
      `Using NFL average (${NFL_AVERAGE_TOTAL})`
    );
  }
  
  
  const STANDARD_SPREAD_ODDS = -110;
  const homeSpreadOdds = odds.homeSpreadOdds ?? STANDARD_SPREAD_ODDS;
  const awaySpreadOdds = odds.awaySpreadOdds ?? STANDARD_SPREAD_ODDS;
  
  if (odds.homeSpreadOdds === undefined || odds.awaySpreadOdds === undefined) {
    warnings.push(
      `Missing spread odds for ${game.away_team} @ ${game.home_team}. ` +
      `Using standard -110`
    );
  }
  
  
  const overOdds = odds.overOdds ?? STANDARD_SPREAD_ODDS;
  const underOdds = odds.underOdds ?? STANDARD_SPREAD_ODDS;
  
  return {
    validatedOdds: {
      homeMLOdds: moneylineValidation.homeMoneyline,
      awayMLOdds: moneylineValidation.awayMoneyline,
      homeSpread,
      awaySpread,
      total,
      homeSpreadOdds,
      awaySpreadOdds,
      overOdds,
      underOdds
    },
    warnings
  };
}


function determineSpreadPick(
  simResult: any,
  favoriteInfo: FavoriteInfo,
  game: OddsData,
  homeSpread: number
): { pick: string; probability: number } {
  const CONFIDENCE_THRESHOLD = 50;
  
  
  const pickingFavorite = simResult.favoriteCoverProbability > CONFIDENCE_THRESHOLD;
  
  
  let spreadPick: string;
  let spreadProbability: number;
  
  if (pickingFavorite) {
    
    spreadProbability = simResult.favoriteCoverProbability;
    
    if (favoriteInfo.favoriteIsHome) {
      
      const spreadValue = homeSpread;
      const spreadSign = spreadValue > 0 ? '+' : '';
      spreadPick = `${game.home_team} ${spreadSign}${spreadValue}`;
    } else {
      const spreadValue = -homeSpread;
      const spreadSign = spreadValue > 0 ? '+' : '';
      spreadPick = `${game.away_team} ${spreadSign}${spreadValue}`;
    }
  } else {
    spreadProbability = simResult.underdogCoverProbability;
    
    if (favoriteInfo.favoriteIsHome) {
      const spreadValue = -homeSpread;
      const spreadSign = spreadValue > 0 ? '+' : '';
      spreadPick = `${game.away_team} ${spreadSign}${spreadValue}`;
    } else {
      const spreadValue = homeSpread;
      const spreadSign = spreadValue > 0 ? '+' : '';
      spreadPick = `${game.home_team} ${spreadSign}${spreadValue}`;
    }
  }
  
  return {
    pick: spreadPick,
    probability: spreadProbability
  };
}

export async function generateLivePredictions(
  oddsData: OddsData[],
  supabaseUrl: string,
  supabaseKey: string,
  weatherApiKey: string | undefined,
  rapidApiKey: string | undefined,
  onProgress?: (current: number, total: number) => void
): Promise<LivePredictionsResult> {
  const startTime = Date.now();

  console.log(`📊 Generating live predictions for ${oddsData.length} games...`);

  console.log(`📋 All games from odds API:`);
  oddsData.forEach((game, index) => {
    const gameDate = new Date(game.commence_time);
    const gameWeek = getNFLWeekFromDate(gameDate);
    console.log(`  ${index + 1}. ${game.away_team} @ ${game.home_team} - ${gameDate.toISOString()} (Week ${gameWeek})`);
  });

  const gamesToProcess = oddsData;

  console.log(`✅ Processing ${gamesToProcess.length} games with available odds:`);
  gamesToProcess.forEach((game, index) => {
    const gameDate = new Date(game.commence_time);
    const gameWeek = getNFLWeekFromDate(gameDate);
    console.log(`  ${index + 1}. Week ${gameWeek}: ${game.away_team} @ ${game.home_team} (${gameDate.toLocaleDateString()})`);
  });

  if (gamesToProcess.length === 0) {
    console.warn(`⚠️ No games available from The Odds API`);
    return {
      predictions: [],
      errors: [],
      metadata: {
        generated_at: new Date().toISOString(),
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

  for (let gameIndex = 0; gameIndex < gamesToProcess.length; gameIndex++) {
    const game = gamesToProcess[gameIndex];

    try {
      console.log(`\n🏈 [${gameIndex + 1}/${gamesToProcess.length}] Processing: ${game.away_team} @ ${game.home_team}`);

      if (onProgress) {
        onProgress(gameIndex + 1, gamesToProcess.length);
      }

      const homeStats = await fetchTeamStatsWithFallback(game.home_team, supabaseUrl, supabaseKey, rapidApiKey);
      const awayStats = await fetchTeamStatsWithFallback(game.away_team, supabaseUrl, supabaseKey, rapidApiKey);

      if (homeStats.team !== game.home_team) {
        console.warn(`⚠️ Using default stats for ${game.home_team}`);
      }
      if (awayStats.team !== game.away_team) {
        console.warn(`⚠️ Using default stats for ${game.away_team}`);
      }

      console.log(`📈 ${game.home_team} stats: 3D%=${homeStats.thirdDownConversionRate}, RZ%=${homeStats.redZoneEfficiency}`);
      console.log(`📈 ${game.away_team} stats: 3D%=${awayStats.thirdDownConversionRate}, RZ%=${awayStats.redZoneEfficiency}`);

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

      
      const rawOdds = extractOddsFromGame(game);
      
      
      const { validatedOdds, warnings } = validateGameOdds(rawOdds, game);
      
      
      warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      
      console.log(`💰 Odds - ML: ${game.home_team} ${validatedOdds.homeMLOdds} / ${game.away_team} ${validatedOdds.awayMLOdds}, Spread: ${validatedOdds.homeSpreadOdds}, O/U: ${validatedOdds.overOdds}/${validatedOdds.underOdds}`);

      
      const favoriteInfo = determineFavorite(
        validatedOdds.homeMLOdds,
        validatedOdds.awayMLOdds
      );
      console.log(`🏆 Favorite: ${favoriteInfo.favoriteIsHome ? game.home_team : game.away_team} (${favoriteInfo.favoriteIsHome ? 'home' : 'away'})`)

      
      console.log(`⚙️ Running ${SIMULATION_ITERATIONS.toLocaleString()} Monte Carlo simulations...`);
      const simResult = runMonteCarloSimulation(
        homeStats,
        awayStats,
        validatedOdds.homeSpread,
        validatedOdds.total,
        gameWeather,
        favoriteInfo.favoriteIsHome
      );

      
      console.log(`🔍 DEBUG - Simulation probabilities:`, {
        homeWin: simResult.homeWinProbability,
        awayWin: simResult.awayWinProbability,
        favCover: simResult.favoriteCoverProbability,
        sum: simResult.homeWinProbability + simResult.awayWinProbability
      });

      
      

      
      const moneylineProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
      const moneylineConfidence = getConfidenceLevel(moneylineProb);
      const moneylinePick = simResult.homeWinProbability > simResult.awayWinProbability
        ? game.home_team
        : game.away_team;

      
      const spreadPickResult = determineSpreadPick(
        simResult,
        favoriteInfo,
        game,
        validatedOdds.homeSpread
      );
      const spreadPick = spreadPickResult.pick;
      const spreadProb = spreadPickResult.probability;

      const totalPick = simResult.overProbability > 50 ? 'Over' : 'Under';
      const totalProb = Math.max(simResult.overProbability, simResult.underProbability);

      
      const formattedDate = game.commence_time.split('T')[0];

      console.log(`✅ Prediction complete: ${moneylinePick} to win (${moneylineProb.toFixed(1)}%)`);

      predictions.push({
        game_info: {
          home_team: game.home_team,
          away_team: game.away_team,
          league: 'NFL',
          game_date: formattedDate,
          spread: validatedOdds.homeSpread,
          over_under: validatedOdds.total,
          home_score: null,
          away_score: null,
          home_ml_odds: validatedOdds.homeMLOdds,
          away_ml_odds: validatedOdds.awayMLOdds,
          spread_odds: validatedOdds.homeSpreadOdds,
          over_odds: validatedOdds.overOdds,
          under_odds: validatedOdds.underOdds,
          
          favorite_team: favoriteInfo.favoriteIsHome ? game.home_team : game.away_team,
          underdog_team: favoriteInfo.favoriteIsHome ? game.away_team : game.home_team,
          favorite_is_home: favoriteInfo.favoriteIsHome
        },
        prediction: `${moneylinePick} to win`,
        spread_prediction: spreadPick,
        ou_prediction: `${totalPick} ${validatedOdds.total}`,
        confidence: mapConfidenceToNumber(moneylineConfidence),
        reasoning: generateReasoning(
          game.home_team,
          game.away_team,
          simResult,
          moneylinePick,
          spreadPick,
          `${totalPick} ${validatedOdds.total}`,
          gameWeather?.impactRating !== 'none' ? weatherImpact : undefined
        ),
        result: 'pending',
        
        week: getNFLWeekFromDate(new Date(game.commence_time)) ?? 1,
        monte_carlo_results: {
          moneyline_probability: moneylineProb,
          spread_probability: spreadProb,
          total_probability: totalProb,
          home_win_probability: simResult.homeWinProbability,
          away_win_probability: simResult.awayWinProbability,
          spread_cover_probability: simResult.spreadCoverProbability,  
          favorite_cover_probability: simResult.favoriteCoverProbability,  
          underdog_cover_probability: simResult.underdogCoverProbability,  
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
      const errorStack = gameError instanceof Error ? gameError.stack : 'No stack trace';
      console.error(`❌ Error processing ${game.away_team} @ ${game.home_team}:`);
      console.error(`   Error: ${errorMessage}`);
      console.error(`   Stack: ${errorStack}`);
      console.error(`   Game data:`, JSON.stringify({
        home: game.home_team,
        away: game.away_team,
        commence_time: game.commence_time,
        bookmakers: game.bookmakers?.length || 0
      }));
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
      games_attempted: gamesToProcess.length,
      games_processed: predictions.length,
      games_failed: errors.length,
      simulation_iterations: SIMULATION_ITERATIONS,
      execution_time_seconds: elapsedSeconds
    }
  };
}
