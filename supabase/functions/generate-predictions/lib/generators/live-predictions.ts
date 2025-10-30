import { SIMULATION_ITERATIONS } from '../constants.ts';
import type { OddsData, GameWeather, FavoriteInfo } from '../types.ts';
import { fetchTeamStatsWithFallback } from '../database/fetch-stats.ts';
import { fetchGameWeather } from '../weather/weather-fetcher.ts';
import { formatWeatherForDisplay } from '../weather/weather-calculator.ts';
import { runMonteCarloSimulation, determineFavorite } from '../simulation/monte-carlo.ts';
import { getConfidenceLevel, mapConfidenceToNumber, getNFLWeekFromDate } from '../utils/nfl-utils.ts';
import { generateReasoningForPick } from '../utils/reasoning-generator.ts';
import { extractOddsFromGame, type ExtractedOdds } from '../odds/fetch-odds.ts';
import { validateMoneylineWithFallback } from '../utils/odds-converter.ts';

// Import enhanced injury functions
import {
  applyEnhancedInjuryAdjustments,
  getInjurySummary
} from '../enhanced-injury-integration.ts';

// Injury impact calculation utilities
interface InjuryImpact {
  total_impact_points: number;
  individual_impacts: any[];
  cluster_multipliers: Record<string, number>;
}

async function fetchInjuryImpact(
  teamName: string,
  gameDate: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<InjuryImpact | null> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/team_injury_impact`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch injury data for ${teamName}: ${response.status}`);
      return null;
    }

    const injuryData = await response.json();

    // Find the most recent injury impact for this team and game date
    const teamInjury = injuryData
      .filter((impact: any) => impact.team_name === teamName && impact.game_date === gameDate)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!teamInjury) {
      console.log(`ℹ️ No injury data found for ${teamName} on ${gameDate}`);
      return null;
    }

    console.log(`🏥 ${teamName} injury impact: ${teamInjury.total_impact_points} points`);
    return {
      total_impact_points: teamInjury.total_impact_points || 0,
      individual_impacts: teamInjury.individual_impacts || [],
      cluster_multipliers: teamInjury.cluster_multipliers || {}
    };
  } catch (error) {
    console.warn(`⚠️ Error fetching injury data for ${teamName}:`, error);
    return null;
  }
}

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

function americanOddsToImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100) * 100;
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100) * 100;
  }
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
      // Away team is favorite
      const spreadValue = -homeSpread;
      const spreadSign = spreadValue > 0 ? '+' : '';
      spreadPick = `${game.away_team} ${spreadSign}${spreadValue}`;
    }
  } else {
    // Picking underdog to cover
    spreadProbability = simResult.underdogCoverProbability;
    
    if (favoriteInfo.favoriteIsHome) {
      // Home team is favorite, so away team is underdog
      const spreadValue = -homeSpread;
      const spreadSign = spreadValue > 0 ? '+' : '';
      spreadPick = `${game.away_team} ${spreadSign}${spreadValue}`;
    } else {
      // Away team is favorite, so home team is underdog
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
  // rapidApiKey: string | undefined, // RapidAPI support removed
  targetWeek?: number,
  onProgress?: (current: number, total: number) => void
): Promise<LivePredictionsResult> {
  const startTime = Date.now();

  console.log(`📊 Generating live predictions for ${oddsData.length} games...`);

  // Log all available games from odds API
  console.log(`📋 All games from odds API:`);
  oddsData.forEach((game, index) => {
    const gameDate = new Date(game.commence_time);
    const gameWeek = getNFLWeekFromDate(gameDate);
    console.log(`  ${index + 1}. ${game.away_team} @ ${game.home_team} - ${gameDate.toISOString()} (Week ${gameWeek})`);
  });

  // ========== WEEK FILTERING: PROCESS GAMES FROM SPECIFIC WEEK IF REQUESTED ==========
  let gamesToProcess = oddsData;

  if (targetWeek !== undefined) {
    console.log(`🎯 Filtering for Week ${targetWeek} games only...`);
    gamesToProcess = oddsData.filter(game => {
      const gameDate = new Date(game.commence_time);
      const gameWeek = getNFLWeekFromDate(gameDate);
      return gameWeek === targetWeek;
    });

    console.log(`✅ Filtered to ${gamesToProcess.length} games for Week ${targetWeek}:`);
    gamesToProcess.forEach((game, index) => {
      const gameDate = new Date(game.commence_time);
      console.log(`  ${index + 1}. ${game.away_team} @ ${game.home_team} (${gameDate.toLocaleDateString()})`);
    });
  } else {
    console.log(`✅ Processing all ${gamesToProcess.length} available games:`);
    gamesToProcess.forEach((game, index) => {
      const gameDate = new Date(game.commence_time);
      const gameWeek = getNFLWeekFromDate(gameDate);
      console.log(`  ${index + 1}. Week ${gameWeek}: ${game.away_team} @ ${game.home_team} (${gameDate.toLocaleDateString()})`);
    });
  }

  // Handle case where no games are available
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
  // ========== END SIMPLIFIED FILTERING ==========

  // ========== PARALLEL GAME PROCESSING FOR PERFORMANCE ==========
  console.log(`🚀 Processing ${gamesToProcess.length} games in parallel...`);

  // Create a function to process a single game
  const processGame = async (game: OddsData, gameIndex: number) => {
    try {
      console.log(`\n🏈 [${gameIndex + 1}/${gamesToProcess.length}] Processing: ${game.away_team} @ ${game.home_team}`);

      // Fetch team stats (latest available)
      const homeStats = await fetchTeamStatsWithFallback(game.home_team, supabaseUrl, supabaseKey);
      const awayStats = await fetchTeamStatsWithFallback(game.away_team, supabaseUrl, supabaseKey);

      // Warn if using default stats (FIX FOR BUG #7)
      if (homeStats.team !== game.home_team) {
        console.warn(`⚠️ Using default stats for ${game.home_team}`);
      }
      if (awayStats.team !== game.away_team) {
        console.warn(`⚠️ Using default stats for ${game.away_team}`);
      }

      console.log(`📈 ${game.home_team} stats: 3D%=${homeStats.thirdDownConversionRate}, RZ%=${homeStats.redZoneEfficiency}`);
      console.log(`📈 ${game.away_team} stats: 3D%=${awayStats.thirdDownConversionRate}, RZ%=${awayStats.redZoneEfficiency}`);

      // Fetch injury impact data for both teams
      const gameDate = game.commence_time.split('T')[0];
      const homeInjuryImpact = await fetchInjuryImpact(game.home_team, gameDate, supabaseUrl, supabaseKey);
      const awayInjuryImpact = await fetchInjuryImpact(game.away_team, gameDate, supabaseUrl, supabaseKey);

      // Apply enhanced injury adjustments with position-specific impacts
      const adjustedHomeStats = applyEnhancedInjuryAdjustments(homeStats, homeInjuryImpact);
      const adjustedAwayStats = applyEnhancedInjuryAdjustments(awayStats, awayInjuryImpact);

      // Log injury summaries for visibility
      if (homeInjuryImpact || awayInjuryImpact) {
        console.log('🏥 Injury Summary:');
        console.log(`  ${getInjurySummary(game.home_team, homeInjuryImpact)}`);
        console.log(`  ${getInjurySummary(game.away_team, awayInjuryImpact)}`);
      }      // Fetch weather if API key available
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

      // Extract raw odds from API response
      console.log(`📊 Game has ${game.bookmakers?.length || 0} bookmakers`);
      const rawOdds = extractOddsFromGame(game);
      
      // Validate odds and apply fallbacks (FIX FOR BUG #1 & #2)
      const { validatedOdds, warnings } = validateGameOdds(rawOdds, game);
      
      // Log any warnings about missing odds
      warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      
      console.log(`💰 Odds - ML: ${game.home_team} ${validatedOdds.homeMLOdds} / ${game.away_team} ${validatedOdds.awayMLOdds}, Spread: ${validatedOdds.homeSpreadOdds}, O/U: ${validatedOdds.overOdds}/${validatedOdds.underOdds}`);

      // Determine which team is the favorite using VALIDATED moneyline odds (FIX FOR BUG #1)
      const favoriteInfo = determineFavorite(
        validatedOdds.homeMLOdds,
        validatedOdds.awayMLOdds
      );
      console.log(`🏆 Favorite: ${favoriteInfo.favoriteIsHome ? game.home_team : game.away_team} (${favoriteInfo.favoriteIsHome ? 'home' : 'away'})`)

      // Run Monte Carlo simulation with validated odds and injury-adjusted stats
      console.log(`⚙️ Running ${SIMULATION_ITERATIONS.toLocaleString()} Monte Carlo simulations...`);
      const simResult = runMonteCarloSimulation(
        adjustedHomeStats,
        adjustedAwayStats,
        validatedOdds.homeSpread,
        validatedOdds.total,
        gameWeather,
        favoriteInfo.favoriteIsHome,
        homeInjuryImpact,  // ADD THIS
        awayInjuryImpact   // ADD THIS
      );

      // Verify Monte Carlo Output format - add logging to confirm probability scale
      console.log(`🔍 DEBUG - Simulation probabilities:`, {
        homeWin: simResult.homeWinProbability,
        awayWin: simResult.awayWinProbability,
        favCover: simResult.favoriteCoverProbability,
        sum: simResult.homeWinProbability + simResult.awayWinProbability
      });

      // Calculate picks and probabilities
      const moneylineProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
      const moneylineConfidence = getConfidenceLevel(moneylineProb);
      const moneylinePick = simResult.homeWinProbability > simResult.awayWinProbability
        ? game.home_team
        : game.away_team;

      // Determine spread pick using corrected logic (FIX FOR BUG #3)
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

      // Calculate edge values by comparing model probability to implied odds probability
      // Calculate moneyline edge
      const pickedTeamOdds = moneylinePick === game.home_team 
        ? validatedOdds.homeMLOdds 
        : validatedOdds.awayMLOdds;
      const impliedMoneylineProbability = americanOddsToImpliedProbability(pickedTeamOdds);
      const moneylineEdge = moneylineProb - impliedMoneylineProbability;

      // Calculate spread edge
      const spreadOdds = spreadPick.includes(game.home_team)
        ? validatedOdds.homeSpreadOdds
        : validatedOdds.awaySpreadOdds;
      const impliedSpreadProbability = americanOddsToImpliedProbability(spreadOdds);
      const spreadEdge = spreadProb - impliedSpreadProbability;

      // Calculate over/under edge
      const ouOdds = totalPick === 'Over' ? validatedOdds.overOdds : validatedOdds.underOdds;
      const impliedOUProbability = americanOddsToImpliedProbability(ouOdds);
      const ouEdge = totalProb - impliedOUProbability;

      // Store UTC date directly (FIX FOR BUG #6)
      const formattedDate = game.commence_time.split('T')[0];

      console.log(`✅ Prediction complete: ${moneylinePick} to win (${moneylineProb.toFixed(1)}%)`);

      return {
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
          // Favorite/Underdog information
          favorite_team: favoriteInfo.favoriteIsHome ? game.home_team : game.away_team,
          underdog_team: favoriteInfo.favoriteIsHome ? game.away_team : game.home_team,
          favorite_is_home: favoriteInfo.favoriteIsHome
        },
        prediction: `${moneylinePick} to win`,
        spread_prediction: spreadPick,
        ou_prediction: `${totalPick} ${validatedOdds.total}`,
        confidence: mapConfidenceToNumber(moneylineConfidence),
        moneyline_edge: moneylineEdge,
        spread_edge: spreadEdge,
        ou_edge: ouEdge,
        reasoning: generateReasoningForPick(
          {
            id: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            week: getNFLWeekFromDate(new Date(game.commence_time)) ?? 1,
            schedule_id: null,
            game_info: {
              home_team: game.home_team,
              away_team: game.away_team,
              league: 'NFL',
              game_date: game.commence_time,
              spread: validatedOdds.spread,
              over_under: validatedOdds.total,
              home_ml_odds: validatedOdds.homeMLOdds,
              away_ml_odds: validatedOdds.awayMLOdds,
              spread_odds: validatedOdds.spreadOdds,
              over_odds: validatedOdds.overOdds,
              under_odds: validatedOdds.underOdds
            },
            prediction: `${moneylinePick} to win`,
            spread_prediction: spreadPick,
            ou_prediction: `${totalPick} ${validatedOdds.total}`,
            confidence: mapConfidenceToNumber(moneylineConfidence),
            reasoning: generateReasoningForPick(
              {
                prediction: `${moneylinePick} to win`,
                spread_prediction: spreadPick,
                ou_prediction: `${totalPick} ${validatedOdds.total}`,
                confidence: mapConfidenceToNumber(moneylineConfidence),
                monte_carlo_results: {
                  moneyline_probability: simResult.homeWinProbability > simResult.awayWinProbability ? simResult.homeWinProbability : simResult.awayWinProbability,
                  spread_probability: spreadProb,
                  total_probability: totalProb,
                  predicted_home_score: simResult.predictedHomeScore,
                  predicted_away_score: simResult.predictedAwayScore,
                  over_probability: simResult.overProbability,
                  under_probability: simResult.underProbability
                },
                game_info: {
                  home_team: game.home_team,
                  away_team: game.away_team,
                  spread: validatedOdds.homeSpread,
                  over_under: validatedOdds.total
                },
                weather: gameWeather ? {
                  temperature: gameWeather.temperature,
                  wind_speed: gameWeather.windSpeed,
                  impact_rating: gameWeather.impactRating
                } : undefined,
                moneyline_edge: moneylineEdge,
                spread_edge: spreadEdge,
                ou_edge: ouEdge
              },
              'moneyline'
            ),
            result: 'pending',
            moneyline_edge: moneylineEdge,
            spread_edge: spreadEdge,
            ou_edge: ouEdge,
            monte_carlo_results: {
              moneyline_probability: simResult.homeWinProbability > simResult.awayWinProbability ? simResult.homeWinProbability : simResult.awayWinProbability,
              home_win_probability: simResult.homeWinProbability,
              away_win_probability: simResult.awayWinProbability,
              spread_probability: spreadProb,
              favorite_cover_probability: favoriteInfo.favoriteIsHome ? simResult.homeWinProbability : simResult.awayWinProbability,
              underdog_cover_probability: favoriteInfo.favoriteIsHome ? simResult.awayWinProbability : simResult.homeWinProbability,
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
            } : undefined,
            injury_impact: {
              home_team_impact: homeInjuryImpact?.total_impact_points || 0,
              away_team_impact: awayInjuryImpact?.total_impact_points || 0,
              net_injury_impact: (awayInjuryImpact?.total_impact_points || 0) - (homeInjuryImpact?.total_impact_points || 0)
            }
          } as any, // Partial pick object for reasoning generation
          'moneyline' // Generate reasoning for the moneyline bet
        ),
        result: 'pending',
        // BUG FIX #5: Use consistent week calculation method
        week: getNFLWeekFromDate(new Date(game.commence_time)) ?? 1,
        monte_carlo_results: {
          moneyline_probability: moneylineProb,
          spread_probability: spreadProb,
          total_probability: totalProb,
          home_win_probability: simResult.homeWinProbability,
          away_win_probability: simResult.awayWinProbability,
          spread_cover_probability: simResult.spreadCoverProbability,  // DEPRECATED - kept for backward compatibility
          favorite_cover_probability: simResult.favoriteCoverProbability,  // NEW
          underdog_cover_probability: simResult.underdogCoverProbability,  // NEW
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
      };
    } catch (gameError) {
      const errorMessage = gameError instanceof Error ? gameError.message : String(gameError);
      console.error(`❌ Error processing ${game.away_team} @ ${game.home_team}: ${errorMessage}`);
      throw gameError; // Re-throw to be caught by Promise.all
    }
  };

  // Process all games in parallel
  const gamePromises = gamesToProcess.map((game, index) => processGame(game, index));
  const results = await Promise.allSettled(gamePromises);

  // Separate successful predictions and errors
  const predictions: any[] = [];
  const errors: any[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      predictions.push(result.value);
    } else {
      const game = gamesToProcess[index];
      const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`❌ Error processing ${game.away_team} @ ${game.home_team}: ${errorMessage}`);
      errors.push({
        game: `${game.away_team} @ ${game.home_team}`,
        error: errorMessage
      });
    }
  });

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
