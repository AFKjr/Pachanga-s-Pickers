// src/utils/csvParser.ts
// Refactored CSV parsing utilities for NFL statistics

// TeamStats interface for CSV parsing
interface TeamStats {
  team: string;
  gamesPlayed: number;
  offensiveYardsPerGame: number;
  pointsPerGame: number;
  totalPlays: number;
  yardsPerPlay: number;
  firstDowns: number;
  passCompletions: number;
  passAttempts: number;
  passCompletionPct: number;
  passingYards: number;
  passingTds: number;
  interceptionsThrown: number;
  yardsPerPassAttempt: number;
  rushingAttempts: number;
  rushingYards: number;
  rushingTds: number;
  yardsPerRush: number;
  penalties: number;
  penaltyYards: number;
  turnoversLost: number;
  fumblesLost: number;
  defensiveYardsAllowed: number;
  pointsAllowedPerGame: number;
  defTotalPlays: number;
  defYardsPerPlayAllowed: number;
  defFirstDownsAllowed: number;
  defPassCompletionsAllowed: number;
  defPassAttempts: number;
  defPassingYardsAllowed: number;
  defPassingTdsAllowed: number;
  defInterceptions: number;
  defRushingAttemptsAllowed: number;
  defRushingYardsAllowed: number;
  defRushingTdsAllowed: number;
  turnoversForced: number;
  fumblesForced: number;
  turnoverDifferential: number;
  thirdDownPct: number;
  redZonePct: number;
  drivesPerGame: number;
  playsPerDrive: number;
  pointsPerDrive: number;
  scoringPercentage: number;
  yardsPerDrive: number;
  timePerDriveSeconds: number;
  thirdDownAttempts?: number;
  thirdDownConversions?: number;
  fourthDownAttempts?: number;
  fourthDownConversions?: number;
  redZoneAttempts?: number;
  redZoneTouchdowns?: number;
}

// Team name mappings for normalization
const TEAM_NAME_MAPPINGS: Record<string, string> = {
  'arizona cardinals': 'Arizona Cardinals',
  'atlanta falcons': 'Atlanta Falcons',
  'baltimore ravens': 'Baltimore Ravens',
  'buffalo bills': 'Buffalo Bills',
  'carolina panthers': 'Carolina Panthers',
  'chicago bears': 'Chicago Bears',
  'cincinnati bengals': 'Cincinnati Bengals',
  'cleveland browns': 'Cleveland Browns',
  'dallas cowboys': 'Dallas Cowboys',
  'denver broncos': 'Denver Broncos',
  'detroit lions': 'Detroit Lions',
  'green bay packers': 'Green Bay Packers',
  'houston texans': 'Houston Texans',
  'indianapolis colts': 'Indianapolis Colts',
  'jacksonville jaguars': 'Jacksonville Jaguars',
  'kansas city chiefs': 'Kansas City Chiefs',
  'las vegas raiders': 'Las Vegas Raiders',
  'los angeles chargers': 'Los Angeles Chargers',
  'los angeles rams': 'Los Angeles Rams',
  'miami dolphins': 'Miami Dolphins',
  'minnesota vikings': 'Minnesota Vikings',
  'new england patriots': 'New England Patriots',
  'new orleans saints': 'New Orleans Saints',
  'new york giants': 'New York Giants',
  'new york jets': 'New York Jets',
  'philadelphia eagles': 'Philadelphia Eagles',
  'pittsburgh steelers': 'Pittsburgh Steelers',
  'san francisco 49ers': 'San Francisco 49ers',
  'seattle seahawks': 'Seattle Seahawks',
  'tampa bay buccaneers': 'Tampa Bay Buccaneers',
  'tennessee titans': 'Tennessee Titans',
  'washington commanders': 'Washington Commanders'
};

/**
 * NFL Stats CSV Parser
 * Parses offensive and defensive CSV files into structured team statistics
 */
export class NFLStatsParser {
  /**
   * Normalize team name using mapping
   */
  static resolveTeamName(teamName: string): string | null {
    if (!teamName) return null;
    const cleaned = teamName.trim().toLowerCase();
    return TEAM_NAME_MAPPINGS[cleaned] || null;
  }

  /**
   * Find the header line in CSV (handles different formats)
   */
  private static findHeaderLine(lines: string[]): number {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('tm') && (line.includes('g,') || line.includes('pf,') || line.includes('pa,'))) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Clean CSV line by removing surrounding quotes
   */
  private static cleanCSVLine(line: string): string {
    let cleaned = line.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  }

  /**
   * Check if line should be skipped
   */
  private static shouldSkipLine(line: string, values: string[]): boolean {
    if (!line) return true;
    
    const lowerLine = line.toLowerCase();
    if (
      line.startsWith('"---') ||
      lowerLine.includes('avg team') ||
      lowerLine.includes('league total') ||
      lowerLine.includes('avg tm/g') ||
      lowerLine.includes('tot yds') ||
      lowerLine.includes('passing') ||
      lowerLine.includes('rushing')
    ) {
      return true;
    }

    const rankValue = values[0];
    const teamName = values[1];

    // Skip if rank is not a number
    if (!rankValue || isNaN(parseInt(rankValue))) {
      return true;
    }

    // Skip invalid team names
    if (!teamName || teamName === '' || /^\d+$/.test(teamName) || 
        teamName.length <= 2 || teamName.toLowerCase() === 'tm') {
      return true;
    }

    return false;
  }

  /**
   * Extract week and season from CSV
   */
  static extractWeekFromCSV(lines: string[], filename: string): { week: number; season: number } {
    // Try to find in first few lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].toLowerCase();
      const weekMatch = line.match(/week[:\s]+(\d+)/i);
      const seasonMatch = line.match(/season[:\s]+(\d{4})/i);
      
      if (weekMatch || seasonMatch) {
        return {
          week: weekMatch ? parseInt(weekMatch[1]) : 1,
          season: seasonMatch ? parseInt(seasonMatch[1]) : new Date().getFullYear()
        };
      }
    }

    // Fallback: Try filename
    const filenameLower = filename.toLowerCase();
    const weekMatch = filenameLower.match(/week[_\s]+(\d+)/);
    const seasonMatch = filenameLower.match(/(\d{4})/);

    return {
      week: weekMatch ? parseInt(weekMatch[1]) : 1,
      season: seasonMatch ? parseInt(seasonMatch[1]) : new Date().getFullYear()
    };
  }

  /**
   * Parse offensive stats CSV
   */
  static async parseOffensiveCSV(fileContent: string): Promise<Map<string, Partial<TeamStats>>> {
    const lines = fileContent.split('\n').filter(line => line.trim());
    const headerLineIndex = this.findHeaderLine(lines);
    const statsMap = new Map<string, Partial<TeamStats>>();

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      let line = lines[i].trim();
      if (this.cleanCSVLine(line) !== line) {
        line = this.cleanCSVLine(line);
      }

      const values = line.split(',').map(v => v.replace(/"/g, '').trim());

      if (this.shouldSkipLine(line, values)) {
        continue;
      }

      const teamName = values[1];
      const games = parseFloat(values[2]) || 1;

      const stats: Partial<TeamStats> = {
        team: teamName,
        gamesPlayed: games,
        
        // Offensive stats
        offensiveYardsPerGame: (parseFloat(values[4]) || 0) / games,
        pointsPerGame: (parseFloat(values[3]) || 0) / games,
        totalPlays: parseFloat(values[5]) || 0,
        yardsPerPlay: parseFloat(values[6]) || 0,
        firstDowns: parseFloat(values[9]) || 0,
        
        // Passing
        passCompletions: parseFloat(values[10]) || 0,
        passAttempts: parseFloat(values[11]) || 0,
        passCompletionPct: parseFloat(values[10]) / (parseFloat(values[11]) || 1) * 100,
        passingYards: parseFloat(values[12]) || 0,
        passingTds: parseFloat(values[13]) || 0,
        interceptionsThrown: parseFloat(values[14]) || 0,
        yardsPerPassAttempt: parseFloat(values[15]) || 0,
        
        // Rushing
        rushingAttempts: parseFloat(values[17]) || 0,
        rushingYards: parseFloat(values[18]) || 0,
        rushingTds: parseFloat(values[19]) || 0,
        yardsPerRush: parseFloat(values[20]) || 0,
        
        // Other
        penalties: parseFloat(values[22]) || 0,
        penaltyYards: parseFloat(values[23]) || 0,
        turnoversLost: parseFloat(values[7]) || 0,
        fumblesLost: parseFloat(values[8]) || 0,
        
        // Efficiency
        redZonePct: parseFloat(values[25]) || 50.0,
        thirdDownAttempts: parseFloat(values[27]) || 0,
        thirdDownConversions: parseFloat(values[28]) || 0,
        thirdDownPct: parseFloat(values[29]?.replace('%', '')) || 40.0,
        
        // Drive stats
        drivesPerGame: parseFloat(values[32]) / games || 12,
        playsPerDrive: parseFloat(values[33]) || 5.5,
        pointsPerDrive: parseFloat(values[34]) || 1.8,
        scoringPercentage: parseFloat(values[35]?.replace('%', '')) || 35,
        yardsPerDrive: parseFloat(values[36]) || 30,
        timePerDriveSeconds: parseFloat(values[37]) || 150
      };

      statsMap.set(teamName, stats);
    }

    return statsMap;
  }

  /**
   * Parse defensive stats CSV and merge with offensive stats
   */
  static async parseDefensiveCSV(
    fileContent: string, 
    existingStats: Map<string, Partial<TeamStats>>
  ): Promise<Map<string, Partial<TeamStats>>> {
    const lines = fileContent.split('\n').filter(line => line.trim());
    const headerLineIndex = this.findHeaderLine(lines);

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      let line = lines[i].trim();
      if (this.cleanCSVLine(line) !== line) {
        line = this.cleanCSVLine(line);
      }

      const values = line.split(',').map(v => v.replace(/"/g, '').trim());

      if (this.shouldSkipLine(line, values)) {
        continue;
      }

      const teamName = values[1];
      const games = parseFloat(values[2]) || 1;
      const existingTeamStats = existingStats.get(teamName) || { team: teamName, gamesPlayed: games };

      // Merge defensive stats
      const updatedStats: Partial<TeamStats> = {
        ...existingTeamStats,
        
        // Defensive stats
        defensiveYardsAllowed: (parseFloat(values[4]) || 0) / games,
        pointsAllowedPerGame: (parseFloat(values[3]) || 0) / games,
        defTotalPlays: parseFloat(values[5]) || 0,
        defYardsPerPlayAllowed: parseFloat(values[6]) || 0,
        defFirstDownsAllowed: parseFloat(values[9]) || 0,
        
        // Passing defense
        defPassCompletionsAllowed: parseFloat(values[10]) || 0,
        defPassAttempts: parseFloat(values[11]) || 0,
        defPassingYardsAllowed: parseFloat(values[12]) || 0,
        defPassingTdsAllowed: parseFloat(values[13]) || 0,
        defInterceptions: parseFloat(values[14]) || 0,
        
        // Rushing defense
        defRushingAttemptsAllowed: parseFloat(values[17]) || 0,
        defRushingYardsAllowed: parseFloat(values[18]) || 0,
        defRushingTdsAllowed: parseFloat(values[19]) || 0,
        
        // Turnovers
        turnoversForced: parseFloat(values[7]) || 0,
        fumblesForced: parseFloat(values[8]) || 0,
        turnoverDifferential: (existingTeamStats.turnoversLost || 0) - (parseFloat(values[7]) || 0)
      };

      existingStats.set(teamName, updatedStats);
    }

    return existingStats;
  }

  /**
   * Parse complete stats from both offensive and defensive CSVs
   */
  static async parseCompleteStats(
    offensiveContent: string,
    defensiveContent: string
  ): Promise<Map<string, Partial<TeamStats>>> {
    const offensiveStats = await this.parseOffensiveCSV(offensiveContent);
    const completeStats = await this.parseDefensiveCSV(defensiveContent, offensiveStats);
    return completeStats;
  }

  /**
   * Convert stats map to array
   */
  static statsMapToArray(statsMap: Map<string, Partial<TeamStats>>): Partial<TeamStats>[] {
    return Array.from(statsMap.values());
  }

  /**
   * Get stats for specific team
   */
  static getTeamStats(
    statsMap: Map<string, Partial<TeamStats>>,
    teamName: string
  ): Partial<TeamStats> | null {
    // Try exact match first
    if (statsMap.has(teamName)) {
      return statsMap.get(teamName) || null;
    }

    // Try normalized name
    const normalized = this.resolveTeamName(teamName);
    if (normalized && statsMap.has(normalized)) {
      return statsMap.get(normalized) || null;
    }

    return null;
  }
}
