// src/utils/csvParser.ts - UPDATED VERSION
import Papa from 'papaparse';

const AVERAGE_PLAYS_PER_DRIVE = 5.5; // NFL average

interface ParsedTeamStats {
  team_name: string;
  week: number;
  season_year: number;
  games_played: number;
  
  // Offensive stats
  offensive_yards_per_game: number;
  points_per_game: number;
  yards_per_play: number;
  passing_yards: number;
  passing_yards_per_game: number;
  rushing_yards: number;
  rushing_yards_per_game: number;
  turnovers_lost: number;
  turnovers_per_game: number;
  total_plays: number;
  plays_per_game: number;
  drives_per_game: number;
  scoring_percentage: number; // Used as proxy for red zone
  
  // Defensive stats
  defensive_yards_allowed: number;
  defensive_yards_per_game: number;
  points_allowed_per_game: number;
  yards_per_play_allowed: number;
  def_interceptions: number;
  takeaways: number;
  turnover_differential: number;
  defensive_scoring_pct_allowed: number;
  
  // Metadata
  source: string;
  last_updated: string;
}

/**
 * Parse weekly team stats from Sports Reference CSV format
 * Extracts all stats needed for Monte Carlo simulation
 */
export function parseWeeklyTeamStats(
  offensiveCSV: string,
  defensiveCSV: string,
  week: number = 1,
  seasonYear: number = 2025
): ParsedTeamStats[] {
  
  // Parse CSVs
  const offensiveParsed = Papa.parse(offensiveCSV, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  
  const defensiveParsed = Papa.parse(defensiveCSV, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  
  const results: ParsedTeamStats[] = [];
  
  // Process each offensive row
  for (const offRow of offensiveParsed.data as any[]) {
    if (!offRow.Team || !offRow.Games) continue;
    
    const teamName = normalizeTeamName(offRow.Team);
    const games = offRow.Games;
    
    // Find matching defensive row
    const defRow = (defensiveParsed.data as any[]).find(d => 
      normalizeTeamName(d.Team) === teamName
    );
    
    if (!defRow) {
      console.warn(`No defensive data found for ${teamName}`);
      continue;
    }
    
    // Calculate drives per game (critical for simulation)
    const totalPlays = offRow.Plays || 0;
    const playsPerGame = totalPlays / games;
    const drivesPerGame = playsPerGame / AVERAGE_PLAYS_PER_DRIVE;
    
    // Extract all stats
    const stats: ParsedTeamStats = {
      team_name: teamName,
      week: week,
      season_year: seasonYear,
      games_played: games,
      
      // Offensive
      offensive_yards_per_game: (offRow.Yards || 0) / games,
      points_per_game: (offRow['Points for'] || 0) / games,
      yards_per_play: offRow['Yards per play'] || 0,
      passing_yards: offRow['Passing yards'] || 0,
      passing_yards_per_game: (offRow['Passing yards'] || 0) / games,
      rushing_yards: offRow['Rushing yards'] || 0,
      rushing_yards_per_game: (offRow['Rushing yards'] || 0) / games,
      turnovers_lost: offRow.Turnovers || 0,
      turnovers_per_game: (offRow.Turnovers || 0) / games,
      total_plays: totalPlays,
      plays_per_game: playsPerGame,
      drives_per_game: drivesPerGame,
      scoring_percentage: offRow['Percentage of drives ending in a score'] || 0,
      
      // Defensive
      defensive_yards_allowed: defRow['Yards allowed'] || 0,
      defensive_yards_per_game: (defRow['Yards allowed'] || 0) / games,
      points_allowed_per_game: (defRow['Points allowed by team'] || 0) / games,
      yards_per_play_allowed: defRow['Yards per offensive play'] || 0,
      def_interceptions: defRow.Interceptions || 0,
      takeaways: defRow.Takeaways || 0,
      turnover_differential: (defRow.Takeaways || 0) - (offRow.Turnovers || 0),
      defensive_scoring_pct_allowed: defRow['Percentage of drives ending in a offensive score'] || 0,
      
      // Metadata
      source: 'csv',
      last_updated: new Date().toISOString()
    };
    
    results.push(stats);
  }
  
  return results;
}

/**
 * Normalize team names to match database format
 */
function normalizeTeamName(rawName: string): string {
  // Remove extra spaces and standardize
  const cleaned = rawName.trim();
  
  // Map common variations to canonical names
  const teamMap: Record<string, string> = {
    'Arizona Cardinals': 'Arizona Cardinals',
    'Atlanta Falcons': 'Atlanta Falcons',
    'Baltimore Ravens': 'Baltimore Ravens',
    'Buffalo Bills': 'Buffalo Bills',
    'Carolina Panthers': 'Carolina Panthers',
    'Chicago Bears': 'Chicago Bears',
    'Cincinnati Bengals': 'Cincinnati Bengals',
    'Cleveland Browns': 'Cleveland Browns',
    'Dallas Cowboys': 'Dallas Cowboys',
    'Denver Broncos': 'Denver Broncos',
    'Detroit Lions': 'Detroit Lions',
    'Green Bay Packers': 'Green Bay Packers',
    'Houston Texans': 'Houston Texans',
    'Indianapolis Colts': 'Indianapolis Colts',
    'Jacksonville Jaguars': 'Jacksonville Jaguars',
    'Kansas City Chiefs': 'Kansas City Chiefs',
    'Las Vegas Raiders': 'Las Vegas Raiders',
    'Los Angeles Chargers': 'Los Angeles Chargers',
    'Los Angeles Rams': 'Los Angeles Rams',
    'Miami Dolphins': 'Miami Dolphins',
    'Minnesota Vikings': 'Minnesota Vikings',
    'New England Patriots': 'New England Patriots',
    'New Orleans Saints': 'New Orleans Saints',
    'New York Giants': 'New York Giants',
    'New York Jets': 'New York Jets',
    'Philadelphia Eagles': 'Philadelphia Eagles',
    'Pittsburgh Steelers': 'Pittsburgh Steelers',
    'San Francisco 49ers': 'San Francisco 49ers',
    'Seattle Seahawks': 'Seattle Seahawks',
    'Tampa Bay Buccaneers': 'Tampa Bay Buccaneers',
    'Tennessee Titans': 'Tennessee Titans',
    'Washington Commanders': 'Washington Commanders'
  };
  
  return teamMap[cleaned] || cleaned;
}
