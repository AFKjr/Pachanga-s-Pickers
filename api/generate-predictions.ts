// api/generate-predictions.ts
// Vercel Serverless Function to generate NFL predictions with Monte Carlo simulation

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// TYPES
// ============================================================================

interface TeamStats {
  team: string;
  offensiveYardsPerGame: number;
  defensiveYardsAllowed: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  turnoverDifferential: number;
  thirdDownConversionRate: number;
  redZoneEfficiency: number;
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
  
  const scoringProbability = offensiveStrength / (offensiveStrength + defensiveStrength);
  const roll = Math.random();
  
  if (roll > scoringProbability) return 0;
  
  const redZoneRoll = Math.random() * 100;
  if (redZoneRoll < offenseStats.redZoneEfficiency) return 7;
  if (redZoneRoll < offenseStats.redZoneEfficiency + 30) return 3;
  
  return 0;
}

function calculateOffensiveStrength(stats: TeamStats): number {
  return (
    stats.pointsPerGame * 2 +
    stats.offensiveYardsPerGame / 10 +
    stats.thirdDownConversionRate +
    stats.redZoneEfficiency +
    stats.turnoverDifferential * 5
  );
}

function calculateDefensiveStrength(stats: TeamStats): number {
  return (
    (45 - stats.pointsAllowedPerGame) * 2 +
    (450 - stats.defensiveYardsAllowed) / 10 +
    (50 - stats.thirdDownConversionRate) +
    (70 - stats.redZoneEfficiency) -
    stats.turnoverDifferential * 5
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

function getDefaultTeamStats(teamName: string): TeamStats {
  return {
    team: teamName,
    offensiveYardsPerGame: 350,
    defensiveYardsAllowed: 350,
    pointsPerGame: 22,
    pointsAllowedPerGame: 22,
    turnoverDifferential: 0,
    thirdDownConversionRate: 40,
    redZoneEfficiency: 55
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

    // Process each game
    const predictions = [];
    const errors = [];
    
    for (const game of oddsData) {
      try {
        console.log(`Processing: ${game.away_team} @ ${game.home_team}`);
        
        // Get default team stats (ESPN API often unreliable)
        const homeStats = getDefaultTeamStats(game.home_team);
        const awayStats = getDefaultTeamStats(game.away_team);

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