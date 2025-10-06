// api/generate-predictions.ts
// Vercel Serverless Function to generate NFL predictions with Monte Carlo simulation

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// TYPES
// ============================================================================

interface TeamStats {
  team: string;
  gamesPlayed: number;
  
  // Basic stats
  offensiveYardsPerGame: number;
  defensiveYardsAllowed: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  turnoverDifferential: number;
  thirdDownConversionRate: number;
  redZoneEfficiency: number;
  
  // Offensive passing
  passCompletions: number;
  passAttempts: number;
  passCompletionPct: number;
  passingYards: number;
  passingTds: number;
  interceptionsThrown: number;
  yardsPerPassAttempt: number;
  
  // Offensive rushing
  rushingAttempts: number;
  rushingYards: number;
  rushingTds: number;
  yardsPerRush: number;
  
  // Offensive totals
  totalPlays: number;
  yardsPerPlay: number;
  firstDowns: number;
  
  // Penalties
  penalties: number;
  penaltyYards: number;
  
  // Turnovers
  turnoversLost: number;
  fumblesLost: number;
  
  // Defensive passing
  defPassCompletionsAllowed: number;
  defPassAttempts: number;
  defPassingYardsAllowed: number;
  defPassingTdsAllowed: number;
  defInterceptions: number;
  
  // Defensive rushing
  defRushingAttemptsAllowed: number;
  defRushingYardsAllowed: number;
  defRushingTdsAllowed: number;
  
  // Defensive totals
  defTotalPlays: number;
  defYardsPerPlayAllowed: number;
  defFirstDownsAllowed: number;
  
  // Turnovers forced
  turnoversForced: number;
  fumblesForced: number;
}

interface OddsData {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

interface SimulationResult {
  homeWinProbability: number;
  awayWinProbability: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  spreadCoverProbability: number;
  overProbability: number;
  underProbability: number;
  iterations: number;
}

// ============================================================================
// MONTE CARLO SIMULATION
// ============================================================================

const SIMULATION_ITERATIONS = 10000;
const QUARTERS_PER_GAME = 4;
const POSSESSIONS_PER_QUARTER = 6;

function runMonteCarloSimulation(
  homeStats: TeamStats,
  awayStats: TeamStats,
  spread: number,
  total: number
): SimulationResult {
  const homeScores: number[] = [];
  const awayScores: number[] = [];
  let homeWins = 0;
  let awayWins = 0;
  let spreadCovers = 0;
  let overs = 0;

  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const gameResult = simulateSingleGame(homeStats, awayStats);
    
    homeScores.push(gameResult.homeScore);
    awayScores.push(gameResult.awayScore);

    if (gameResult.homeScore > gameResult.awayScore) homeWins++;
    if (gameResult.awayScore > gameResult.homeScore) awayWins++;

    const adjustedHomeScore = gameResult.homeScore + spread;
    if (adjustedHomeScore > gameResult.awayScore) spreadCovers++;

    const totalPoints = gameResult.homeScore + gameResult.awayScore;
    if (totalPoints > total) overs++;
  }

  const avgHomeScore = homeScores.reduce((a, b) => a + b, 0) / homeScores.length;
  const avgAwayScore = awayScores.reduce((a, b) => a + b, 0) / awayScores.length;

  return {
    homeWinProbability: (homeWins / SIMULATION_ITERATIONS) * 100,
    awayWinProbability: (awayWins / SIMULATION_ITERATIONS) * 100,
    predictedHomeScore: Math.round(avgHomeScore),
    predictedAwayScore: Math.round(avgAwayScore),
    spreadCoverProbability: (spreadCovers / SIMULATION_ITERATIONS) * 100,
    overProbability: (overs / SIMULATION_ITERATIONS) * 100,
    underProbability: ((SIMULATION_ITERATIONS - overs) / SIMULATION_ITERATIONS) * 100,
    iterations: SIMULATION_ITERATIONS
  };
}

function simulateSingleGame(
  homeStats: TeamStats,
  awayStats: TeamStats
): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  for (let quarter = 0; quarter < QUARTERS_PER_GAME; quarter++) {
    for (let possession = 0; possession < POSSESSIONS_PER_QUARTER / 2; possession++) {
      homeScore += simulatePossession(homeStats, awayStats);
    }
    for (let possession = 0; possession < POSSESSIONS_PER_QUARTER / 2; possession++) {
      awayScore += simulatePossession(awayStats, homeStats);
    }
  }

  return { homeScore, awayScore };
}

function simulatePossession(
  offenseStats: TeamStats,
  defenseStats: TeamStats
): number {
  const offensiveStrength = calculateOffensiveStrength(offenseStats);
  const defensiveStrength = calculateDefensiveStrength(defenseStats);
  
  // Base scoring probability adjusted by matchup
  const baseScoring = offensiveStrength / (offensiveStrength + defensiveStrength);
  
  // Turnover chance based on actual turnover rates
  const turnoverChance = (
    (offenseStats.turnoversLost / offenseStats.totalPlays) +
    (defenseStats.turnoversForced / defenseStats.defTotalPlays)
  ) / 2;
  
  const turnoverRoll = Math.random();
  if (turnoverRoll < turnoverChance) return 0; // Turnover, no points
  
  // Adjust scoring probability by yards per play efficiency
  const efficiencyModifier = (
    offenseStats.yardsPerPlay / (offenseStats.yardsPerPlay + defenseStats.defYardsPerPlayAllowed)
  );
  
  const scoringProbability = baseScoring * 0.7 + efficiencyModifier * 0.3;
  const scoreRoll = Math.random();
  
  if (scoreRoll > scoringProbability) return 0; // Failed to score
  
  // Reached scoring territory - determine TD vs FG
  const redZoneRoll = Math.random() * 100;
  
  // TD probability based on red zone efficiency and passing/rushing balance
  const tdProbability = (
    offenseStats.redZoneEfficiency * 0.6 +  // Red zone efficiency
    (offenseStats.passingTds + offenseStats.rushingTds) * 5  // TD production rate
  );
  
  if (redZoneRoll < tdProbability) {
    return 7; // Touchdown + XP
  }
  
  // Field goal attempt probability
  const fgProbability = tdProbability + 35; // ~35% FG range after TD probability
  if (redZoneRoll < fgProbability) {
    return 3; // Field goal
  }
  
  return 0; // Failed to score despite reaching scoring position
}

function calculateOffensiveStrength(stats: TeamStats): number {
  // Comprehensive offensive strength calculation using extended stats
  
  // Passing efficiency (40% weight)
  const passingEfficiency = (
    stats.passingYards / 100 * 3 +                    // Passing yards impact
    stats.yardsPerPassAttempt * 5 +                   // Efficiency per attempt
    stats.passCompletionPct / 10 +                    // Completion accuracy
    stats.passingTds * 8 -                            // TD production
    stats.interceptionsThrown * 10                    // Turnover penalty
  ) * 0.4;
  
  // Rushing efficiency (30% weight)
  const rushingEfficiency = (
    stats.rushingYards / 50 * 2 +                     // Rushing yards impact
    stats.yardsPerRush * 8 +                          // Yards per carry efficiency
    stats.rushingTds * 10                             // TD production
  ) * 0.3;
  
  // Overall efficiency (20% weight)
  const overallEfficiency = (
    stats.yardsPerPlay * 15 +                         // Overall play efficiency
    stats.firstDowns * 3 +                            // Drive sustainability
    stats.thirdDownConversionRate * 1.5 +             // Third down success
    stats.redZoneEfficiency * 2                       // Red zone scoring
  ) * 0.2;
  
  // Turnover management (10% weight)
  const turnoverImpact = (
    -stats.turnoversLost * 15 -                       // Turnovers cost points
    stats.fumblesLost * 12 +                          // Fumbles hurt field position
    stats.turnoverDifferential * 8                    // Overall TO differential
  ) * 0.1;
  
  // Penalties impact (negative)
  const penaltyImpact = -(stats.penaltyYards / 10);
  
  return Math.max(0, 
    passingEfficiency + 
    rushingEfficiency + 
    overallEfficiency + 
    turnoverImpact + 
    penaltyImpact +
    stats.pointsPerGame * 2                           // Base scoring capability
  );
}

function calculateDefensiveStrength(stats: TeamStats): number {
  // Comprehensive defensive strength calculation using extended stats
  
  // Pass defense (40% weight)
  const passDefense = (
    (280 - stats.defPassingYardsAllowed) / 20 +       // Passing yards allowed (lower is better)
    -stats.defPassingTdsAllowed * 8 +                 // TDs allowed penalty
    stats.defInterceptions * 12 +                     // Interceptions created
    (stats.defPassAttempts > 0 ?                      // Completion % allowed
      (100 - (stats.defPassCompletionsAllowed / stats.defPassAttempts * 100)) / 5 
      : 0)
  ) * 0.4;
  
  // Rush defense (30% weight)
  const rushDefense = (
    (150 - stats.defRushingYardsAllowed) / 15 +       // Rushing yards allowed (lower is better)
    -stats.defRushingTdsAllowed * 10 +                // Rushing TDs allowed penalty
    (stats.defRushingAttemptsAllowed > 0 ?            // Yards per rush allowed
      (5.0 - (stats.defRushingYardsAllowed / stats.defRushingAttemptsAllowed)) * 10
      : 0)
  ) * 0.3;
  
  // Overall defensive efficiency (20% weight)
  const overallDefense = (
    (7.0 - stats.defYardsPerPlayAllowed) * 15 +       // Yards per play (lower is better)
    -stats.defFirstDownsAllowed * 2 +                 // First downs allowed
    (50 - stats.thirdDownConversionRate) * 1.5        // Opponent 3rd down %
  ) * 0.2;
  
  // Turnovers forced (10% weight)
  const turnoverCreation = (
    stats.turnoversForced * 15 +                      // Turnovers created
    stats.fumblesForced * 12 +                        // Fumbles forced
    stats.defInterceptions * 12                       // Interceptions
  ) * 0.1;
  
  return Math.max(0,
    passDefense +
    rushDefense +
    overallDefense +
    turnoverCreation +
    (45 - stats.pointsAllowedPerGame) * 2             // Base points prevention
  );
}

// ============================================================================
// EXTERNAL API FUNCTIONS
// ============================================================================

async function fetchNFLOdds(): Promise<OddsData[]> {
  const ODDS_API_KEY = process.env.ODDS_API_KEY;
  const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

  const response = await fetch(
    `${ODDS_API_BASE_URL}/sports/americanfootball_nfl/odds/?` +
    `apiKey=${ODDS_API_KEY}&` +
    `regions=us&` +
    `markets=h2h,spreads,totals&` +
    `oddsFormat=american`,
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }
  );

  if (!response.ok) {
    throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function fetchTeamStatsFromDatabase(teamName: string, supabaseUrl: string, supabaseKey: string): Promise<TeamStats | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/team_stats_cache?team_name=eq.${encodeURIComponent(teamName)}&select=*`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch stats for ${teamName}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      console.warn(`No stats found for ${teamName} in database`);
      return null;
    }

    const dbStats = data[0];
    
    // Map database fields to TeamStats interface
    return {
      team: teamName,
      gamesPlayed: dbStats.games_played || 5,
      
      // Basic stats
      offensiveYardsPerGame: dbStats.offensive_yards_per_game || 328.3,
      defensiveYardsAllowed: dbStats.defensive_yards_allowed || 328.3,
      pointsPerGame: dbStats.points_per_game || 23.4,
      pointsAllowedPerGame: dbStats.points_allowed_per_game || 23.4,
      turnoverDifferential: dbStats.turnover_differential || 0,
      thirdDownConversionRate: dbStats.third_down_conversion_rate || 40.0,
      redZoneEfficiency: dbStats.red_zone_efficiency || 55.0,
      
      // Offensive passing
      passCompletions: dbStats.pass_completions || 21.6,
      passAttempts: dbStats.pass_attempts || 32.7,
      passCompletionPct: dbStats.pass_completion_pct || 65.9,
      passingYards: dbStats.passing_yards || 213.8,
      passingTds: dbStats.passing_tds || 1.6,
      interceptionsThrown: dbStats.interceptions_thrown || 0.7,
      yardsPerPassAttempt: dbStats.yards_per_pass_attempt || 7.0,
      
      // Offensive rushing
      rushingAttempts: dbStats.rushing_attempts || 26.3,
      rushingYards: dbStats.rushing_yards || 114.5,
      rushingTds: dbStats.rushing_tds || 0.9,
      yardsPerRush: dbStats.yards_per_rush || 4.4,
      
      // Offensive totals
      totalPlays: dbStats.total_plays || 61.2,
      yardsPerPlay: dbStats.yards_per_play || 5.4,
      firstDowns: dbStats.first_downs || 19.6,
      
      // Penalties
      penalties: dbStats.penalties || 7.3,
      penaltyYards: dbStats.penalty_yards || 58.4,
      
      // Turnovers
      turnoversLost: dbStats.turnovers_lost || 1.2,
      fumblesLost: dbStats.fumbles_lost || 0.5,
      
      // Defensive passing
      defPassCompletionsAllowed: dbStats.def_pass_completions_allowed || 21.6,
      defPassAttempts: dbStats.def_pass_attempts || 32.7,
      defPassingYardsAllowed: dbStats.def_passing_yards_allowed || 213.8,
      defPassingTdsAllowed: dbStats.def_passing_tds_allowed || 1.6,
      defInterceptions: dbStats.def_interceptions || 0.7,
      
      // Defensive rushing
      defRushingAttemptsAllowed: dbStats.def_rushing_attempts_allowed || 26.3,
      defRushingYardsAllowed: dbStats.def_rushing_yards_allowed || 114.5,
      defRushingTdsAllowed: dbStats.def_rushing_tds_allowed || 0.9,
      
      // Defensive totals
      defTotalPlays: dbStats.def_total_plays || 61.2,
      defYardsPerPlayAllowed: dbStats.def_yards_per_play_allowed || 5.4,
      defFirstDownsAllowed: dbStats.def_first_downs_allowed || 19.6,
      
      // Turnovers forced
      turnoversForced: dbStats.turnovers_forced || 1.2,
      fumblesForced: dbStats.fumbles_forced || 0.5
    };
  } catch (error) {
    console.error(`Error fetching stats for ${teamName}:`, error);
    return null;
  }
}

function getDefaultTeamStats(teamName: string): TeamStats {
  // League average stats for defaults (fallback only)
  return {
    team: teamName,
    gamesPlayed: 5,
    
    // Basic stats
    offensiveYardsPerGame: 328.3,
    defensiveYardsAllowed: 328.3,
    pointsPerGame: 23.4,
    pointsAllowedPerGame: 23.4,
    turnoverDifferential: 0,
    thirdDownConversionRate: 40.0,
    redZoneEfficiency: 55.0,
    
    // Offensive passing
    passCompletions: 21.6,
    passAttempts: 32.7,
    passCompletionPct: 65.9,
    passingYards: 213.8,
    passingTds: 1.6,
    interceptionsThrown: 0.7,
    yardsPerPassAttempt: 7.0,
    
    // Offensive rushing
    rushingAttempts: 26.3,
    rushingYards: 114.5,
    rushingTds: 0.9,
    yardsPerRush: 4.4,
    
    // Offensive totals
    totalPlays: 61.2,
    yardsPerPlay: 5.4,
    firstDowns: 19.6,
    
    // Penalties
    penalties: 7.3,
    penaltyYards: 58.4,
    
    // Turnovers
    turnoversLost: 1.2,
    fumblesLost: 0.5,
    
    // Defensive passing
    defPassCompletionsAllowed: 21.6,
    defPassAttempts: 32.7,
    defPassingYardsAllowed: 213.8,
    defPassingTdsAllowed: 1.6,
    defInterceptions: 0.7,
    
    // Defensive rushing
    defRushingAttemptsAllowed: 26.3,
    defRushingYardsAllowed: 114.5,
    defRushingTdsAllowed: 0.9,
    
    // Defensive totals
    defTotalPlays: 61.2,
    defYardsPerPlayAllowed: 5.4,
    defFirstDownsAllowed: 19.6,
    
    // Turnovers forced
    turnoversForced: 1.2,
    fumblesForced: 0.5
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function mapConfidenceToNumber(confidence: 'High' | 'Medium' | 'Low'): number {
  switch (confidence) {
    case 'High': return 80;
    case 'Medium': return 60;
    case 'Low': return 40;
    default: return 50;
  }
}

function getConfidenceLevel(probability: number): 'High' | 'Medium' | 'Low' {
  if (probability >= 65) return 'High';
  if (probability >= 55) return 'Medium';
  return 'Low';
}

function calculateNFLWeek(gameDate: Date): number {
  const seasonStart = new Date('2025-09-04');
  const daysDiff = Math.floor(
    (gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(1, Math.min(18, Math.floor(daysDiff / 7) + 1));
}

function generateReasoning(
  homeTeam: string,
  awayTeam: string,
  simResult: SimulationResult,
  moneylinePick: string,
  spreadPick: string,
  totalPick: string
): string {
  const factors: string[] = [];

  factors.push(
    `Monte Carlo simulation (${simResult.iterations.toLocaleString()} iterations) projects ` +
    `${homeTeam} ${simResult.predictedHomeScore} - ${awayTeam} ${simResult.predictedAwayScore}`
  );
  
  const winningTeam = simResult.homeWinProbability > simResult.awayWinProbability ? homeTeam : awayTeam;
  const winProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
  factors.push(`${winningTeam} has ${winProb.toFixed(1)}% win probability`);

  factors.push(`Spread analysis shows ${simResult.spreadCoverProbability.toFixed(1)}% cover probability`);
  
  const totalPoints = simResult.predictedHomeScore + simResult.predictedAwayScore;
  factors.push(`Projected total of ${totalPoints} points suggests ${totalPick}`);

  return factors.join('; ');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting prediction generation...');
    
    // Fetch current NFL odds
    console.log('Fetching odds from The Odds API...');
    let oddsData: OddsData[];
    try {
      oddsData = await fetchNFLOdds();
      console.log(`Found ${oddsData.length} games with odds`);
    } catch (oddsError) {
      const errorMessage = oddsError instanceof Error ? oddsError.message : String(oddsError);
      console.error('Failed to fetch odds:', errorMessage);
      return response.status(500).json({
        error: 'Failed to fetch odds from The Odds API',
        details: errorMessage,
        hint: 'Check if ODDS_API_KEY environment variable is set correctly'
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

    // Get Supabase credentials from env
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return response.status(500).json({
        error: 'Supabase configuration missing',
        hint: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables'
      });
    }

    // Process each game
    const predictions = [];
    const errors = [];
    
    for (const game of oddsData) {
      try {
        console.log(`Processing: ${game.away_team} @ ${game.home_team}`);
        
        // Fetch team stats from database (using your imported CSV data)
        const homeStats = await fetchTeamStatsFromDatabase(game.home_team, SUPABASE_URL, SUPABASE_KEY) 
          || getDefaultTeamStats(game.home_team);
        const awayStats = await fetchTeamStatsFromDatabase(game.away_team, SUPABASE_URL, SUPABASE_KEY)
          || getDefaultTeamStats(game.away_team);
        
        console.log(`${game.home_team} stats: 3D%=${homeStats.thirdDownConversionRate}, RZ%=${homeStats.redZoneEfficiency}`);
        console.log(`${game.away_team} stats: 3D%=${awayStats.thirdDownConversionRate}, RZ%=${awayStats.redZoneEfficiency}`);

        // Extract odds from best bookmaker
        const bookmaker = game.bookmakers.find(b => b.key === 'draftkings') || game.bookmakers[0];
        
        const spreadsMarket = bookmaker.markets.find(m => m.key === 'spreads');
        const totalsMarket = bookmaker.markets.find(m => m.key === 'totals');
        const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');

        const homeSpread = spreadsMarket?.outcomes.find(o => o.name === game.home_team)?.point || 0;
        const total = totalsMarket?.outcomes[0]?.point || 45;

        // Run Monte Carlo simulation
        const simResult = runMonteCarloSimulation(homeStats, awayStats, homeSpread, total);
      
        // Generate recommendations
        const moneylinePick = simResult.homeWinProbability > simResult.awayWinProbability
          ? game.home_team : game.away_team;
        const moneylineProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
        const moneylineConfidence = getConfidenceLevel(moneylineProb);

        const spreadPick = simResult.spreadCoverProbability > 50
          ? `${game.home_team} ${homeSpread > 0 ? '+' : ''}${homeSpread}`
          : `${game.away_team} ${-homeSpread > 0 ? '+' : ''}${-homeSpread}`;
        const spreadConfidence = getConfidenceLevel(
          Math.max(simResult.spreadCoverProbability, 100 - simResult.spreadCoverProbability)
        );

        const totalPick = simResult.overProbability > 50 ? 'Over' : 'Under';
        const totalProb = Math.max(simResult.overProbability, simResult.underProbability);
        const totalConfidence = getConfidenceLevel(totalProb);

        // Format for database
        predictions.push({
          game_info: {
            home_team: game.home_team,
            away_team: game.away_team,
            league: 'NFL',
            game_date: game.commence_time.split('T')[0],
            spread: homeSpread,
            over_under: total,
            home_score: null,
            away_score: null
          },
          prediction: `${moneylinePick} to win`,
          spread_prediction: spreadPick,
          ou_prediction: `${totalPick} ${total}`,
          confidence: mapConfidenceToNumber(moneylineConfidence),
          reasoning: generateReasoning(
            game.home_team,
            game.away_team,
            simResult,
            moneylinePick,
            spreadPick,
            `${totalPick} ${total}`
          ),
          result: 'pending',
          week: calculateNFLWeek(new Date(game.commence_time)),
          monte_carlo_results: {
            iterations: simResult.iterations,
            home_win_probability: simResult.homeWinProbability,
            away_win_probability: simResult.awayWinProbability,
            predicted_home_score: simResult.predictedHomeScore,
            predicted_away_score: simResult.predictedAwayScore
          }
        });
      } catch (gameError) {
        const errorMessage = gameError instanceof Error ? gameError.message : String(gameError);
        console.error(`Error processing ${game.away_team} @ ${game.home_team}:`, errorMessage);
        errors.push({
          game: `${game.away_team} @ ${game.home_team}`,
          error: errorMessage
        });
      }
    }

    console.log(`Generated ${predictions.length} predictions${errors.length > 0 ? ` (${errors.length} failures)` : ''}`);

    return response.status(200).json({
      success: true,
      predictions,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        generated_at: new Date().toISOString(),
        games_attempted: oddsData.length,
        games_processed: predictions.length,
        games_failed: errors.length,
        simulation_iterations: SIMULATION_ITERATIONS
      }
    });

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