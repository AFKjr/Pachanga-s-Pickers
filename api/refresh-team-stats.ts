// api/refresh-team-stats.ts
// Vercel serverless function to bulk refresh team stats from ESPN

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

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

const NFL_TEAMS = [
  'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
  'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
  'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
  'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
  'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
  'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
  'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
  'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders'
];

const TEAM_ID_MAP: Record<string, number> = {
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

async function fetchTeamStatsFromESPN(teamName: string): Promise<TeamStats | null> {
  try {
    const espnTeamId = TEAM_ID_MAP[teamName];
    if (!espnTeamId) {
      console.warn(`No ESPN ID found for team: ${teamName}`);
      return null;
    }

    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnTeamId}/statistics`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      console.warn(`ESPN API returned ${response.status} for ${teamName}`);
      return null;
    }

    const data = await response.json();
    
    // Parse ESPN stats structure
    const stats = data.statistics || {};
    
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
  } catch (error) {
    console.error(`Error fetching ESPN stats for ${teamName}:`, error);
    return null;
  }
}

function extractStat(stats: any, statName: string): number | null {
  return stats[statName] || null;
}

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
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify admin user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return response.status(401).json({ error: 'Invalid authentication' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return response.status(403).json({ error: 'Admin privileges required' });
    }

    console.log('Starting bulk refresh of team stats from ESPN...');

    let updated = 0;
    let failed = 0;
    const failedTeams: string[] = [];

    // Process teams sequentially to avoid rate limiting
    for (const teamName of NFL_TEAMS) {
      try {
        console.log(`Fetching stats for ${teamName}...`);
        const stats = await fetchTeamStatsFromESPN(teamName);

        if (stats) {
          // Save to database
          const { error: upsertError } = await supabase
            .from('team_stats_cache')
            .upsert({
              team_name: teamName,
              offensive_yards_per_game: stats.offensiveYardsPerGame,
              defensive_yards_allowed: stats.defensiveYardsAllowed,
              points_per_game: stats.pointsPerGame,
              points_allowed_per_game: stats.pointsAllowedPerGame,
              turnover_differential: stats.turnoverDifferential,
              third_down_conversion_rate: stats.thirdDownConversionRate,
              red_zone_efficiency: stats.redZoneEfficiency,
              source: 'espn',
              last_updated: new Date().toISOString()
            });

          if (upsertError) {
            console.error(`Failed to save stats for ${teamName}:`, upsertError);
            failed++;
            failedTeams.push(teamName);
          } else {
            console.log(`✓ Updated ${teamName}`);
            updated++;
          }
        } else {
          console.warn(`Failed to fetch stats for ${teamName}`);
          failed++;
          failedTeams.push(teamName);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing ${teamName}:`, error);
        failed++;
        failedTeams.push(teamName);
      }
    }

    console.log(`Refresh complete: ${updated} updated, ${failed} failed`);

    return response.status(200).json({
      success: true,
      updated,
      failed,
      failedTeams,
      message: `Refreshed ${updated} teams from ESPN API. ${failed} teams failed.`
    });

  } catch (error) {
    console.error('Error refreshing team stats:', error);
    return response.status(500).json({
      error: 'Failed to refresh team stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
