// src/lib/externalApis.ts

/**
 * External Sports Data API Integration
 * Handles odds and team statistics from paid APIs
 */

// API Configuration
const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY;
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

// Types for API responses
export interface OddsData {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string; // 'h2h' (moneyline), 'spreads', 'totals'
      outcomes: Array<{
        name: string;
        price: number;
        point?: number; // for spreads and totals
      }>;
    }>;
  }>;
}

export interface TeamStats {
  team: string;
  offensiveYardsPerGame: number;
  defensiveYardsAllowed: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  turnoverDifferential: number;
  thirdDownConversionRate: number;
  redZoneEfficiency: number;
}

export interface GamePredictionInput {
  homeTeam: string;
  awayTeam: string;
  homeStats: TeamStats;
  awayStats: TeamStats;
  spread: number;
  total: number;
  homeMoneyline: number;
  awayMoneyline: number;
}

/**
 * Fetch NFL odds from The Odds API
 * Cost: ~$0.50 per 500 requests (your usage: ~$1-2/month)
 */
export async function fetchNFLOdds(): Promise<OddsData[]> {
  const response = await fetch(
    `${ODDS_API_BASE_URL}/sports/americanfootball_nfl/odds/?` +
    `apiKey=${ODDS_API_KEY}&` +
    `regions=us&` +
    `markets=h2h,spreads,totals&` +
    `oddsFormat=american`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Fetch team statistics from ESPN API (free)
 * Alternative: Use NFL.com API or scrape Pro Football Reference
 */
export async function fetchTeamStats(teamName: string): Promise<TeamStats> {
  // ESPN API endpoint (free, no key required)
  const espnTeamId = mapTeamNameToESPNId(teamName);
  
  const response = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnTeamId}/statistics`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    // Fallback to default stats if API fails
    console.warn(`Failed to fetch stats for ${teamName}, using defaults`);
    return getDefaultTeamStats(teamName);
  }

  const data = await response.json();
  
  // Parse ESPN response into our format
  return parseESPNStats(data, teamName);
}

/**
 * Map team names to ESPN team IDs
 */
function mapTeamNameToESPNId(teamName: string): number {
  const teamMap: Record<string, number> = {
    'Arizona Cardinals': 22,
    'Atlanta Falcons': 1,
    'Baltimore Ravens': 33,
    'Buffalo Bills': 2,
    'Carolina Panthers': 29,
    'Chicago Bears': 3,
    'Cincinnati Bengals': 4,
    'Cleveland Browns': 5,
    'Dallas Cowboys': 6,
    'Denver Broncos': 7,
    'Detroit Lions': 8,
    'Green Bay Packers': 9,
    'Houston Texans': 34,
    'Indianapolis Colts': 11,
    'Jacksonville Jaguars': 30,
    'Kansas City Chiefs': 12,
    'Las Vegas Raiders': 13,
    'Los Angeles Chargers': 24,
    'Los Angeles Rams': 14,
    'Miami Dolphins': 15,
    'Minnesota Vikings': 16,
    'New England Patriots': 17,
    'New Orleans Saints': 18,
    'New York Giants': 19,
    'New York Jets': 20,
    'Philadelphia Eagles': 21,
    'Pittsburgh Steelers': 23,
    'San Francisco 49ers': 25,
    'Seattle Seahawks': 26,
    'Tampa Bay Buccaneers': 27,
    'Tennessee Titans': 10,
    'Washington Commanders': 28
  };

  return teamMap[teamName] || 1; // Default to Atlanta if not found
}

/**
 * Parse ESPN API response into our TeamStats format
 */
function parseESPNStats(espnData: any, teamName: string): TeamStats {
  // ESPN returns complex nested structure - extract relevant stats
  const stats = espnData.statistics || {};
  
  return {
    team: teamName,
    offensiveYardsPerGame: extractStat(stats, 'totalYards') || 350,
    defensiveYardsAllowed: extractStat(stats, 'totalYardsAllowed') || 350,
    pointsPerGame: extractStat(stats, 'avgPointsFor') || 22,
    pointsAllowedPerGame: extractStat(stats, 'avgPointsAgainst') || 22,
    turnoverDifferential: extractStat(stats, 'turnoverDifferential') || 0,
    thirdDownConversionRate: extractStat(stats, 'thirdDownConversionPct') || 40,
    redZoneEfficiency: extractStat(stats, 'redZoneConversionPct') || 55
  };
}

/**
 * Helper to extract stat from ESPN data
 */
function extractStat(stats: any, statName: string): number | null {
  // ESPN stats structure varies - implement based on actual API response
  // This is a placeholder that should be updated after inspecting real data
  return stats[statName] || null;
}

/**
 * Provide default stats when API fails
 */
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

/**
 * Combine odds and stats into prediction input
 */
export async function prepareGamePredictionData(
  homeTeam: string,
  awayTeam: string,
  oddsData: OddsData
): Promise<GamePredictionInput> {
  // Fetch stats for both teams
  const [homeStats, awayStats] = await Promise.all([
    fetchTeamStats(homeTeam),
    fetchTeamStats(awayTeam)
  ]);

  // Extract odds from best bookmaker (e.g., DraftKings)
  const bookmaker = oddsData.bookmakers.find(b => b.key === 'draftkings') || oddsData.bookmakers[0];
  
  const spreadsMarket = bookmaker.markets.find(m => m.key === 'spreads');
  const totalsMarket = bookmaker.markets.find(m => m.key === 'totals');
  const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');

  const homeSpread = spreadsMarket?.outcomes.find(o => o.name === homeTeam)?.point || 0;
  const total = totalsMarket?.outcomes[0]?.point || 45;
  const homeML = h2hMarket?.outcomes.find(o => o.name === homeTeam)?.price || -110;
  const awayML = h2hMarket?.outcomes.find(o => o.name === awayTeam)?.price || -110;

  return {
    homeTeam,
    awayTeam,
    homeStats,
    awayStats,
    spread: homeSpread,
    total,
    homeMoneyline: homeML,
    awayMoneyline: awayML
  };
}