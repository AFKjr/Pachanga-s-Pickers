import { picksApi } from './api';

interface GameResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled';
  gameDate: string;
}

class AutomaticResultsUpdater {
  private sportsDataApiKey?: string;

  constructor() {
    this.sportsDataApiKey = import.meta.env.VITE_SPORTS_DATA_API_KEY;
  }

  /**
   * Main function to update all pending pick results
   */
  async updateAllPendingResults(): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      // Get all pending picks
      const { data: pendingPicks, error } = await picksApi.getAll();

      if (error) {
        errors.push(`Failed to fetch pending picks: ${error.message}`);
        return { updated, errors };
      }

      const pending = (pendingPicks || []).filter(pick => pick.result === 'pending');

      if (pending.length === 0) {
        return { updated: 0, errors: [] };
      }

      console.log(`Found ${pending.length} pending picks to check`);

      // Group picks by game for efficiency
      const gameGroups = this.groupPicksByGame(pending);

      // Process each unique game
      for (const [gameKey, picks] of gameGroups.entries()) {
        try {
          const result = await this.fetchGameResult(gameKey);

          if (result && result.status === 'final') {
            const pickResult = this.determinePickResult(picks[0], result);

            // Update all picks for this game
            for (const pick of picks) {
              try {
                await picksApi.update(pick.id, { result: pickResult });
                updated++;
                console.log(`Updated pick ${pick.id} to ${pickResult}`);
              } catch (updateError: any) {
                errors.push(`Failed to update pick ${pick.id}: ${updateError.message}`);
              }
            }
          }
        } catch (gameError: any) {
          errors.push(`Failed to process game ${gameKey}: ${gameError.message}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (err: any) {
      errors.push(`General error: ${err.message}`);
    }

    return { updated, errors };
  }

  /**
   * Fetch game result from external APIs
   */
  private async fetchGameResult(gameKey: string): Promise<GameResult | null> {
    const [homeTeam, awayTeam, gameDate] = gameKey.split('|');

    // Try ESPN API first
    try {
      const espnResult = await this.fetchFromESPN(homeTeam, awayTeam, gameDate);
      if (espnResult) return espnResult;
    } catch (error) {
      console.warn('ESPN API failed:', error);
    }

    // Try SportsData.io API
    try {
      const sportsDataResult = await this.fetchFromSportsData(homeTeam, awayTeam, gameDate);
      if (sportsDataResult) return sportsDataResult;
    } catch (error) {
      console.warn('SportsData API failed:', error);
    }

    // Try web scraping as last resort
    try {
      const scrapedResult = await this.scrapeGameResult(homeTeam, awayTeam, gameDate);
      if (scrapedResult) return scrapedResult;
    } catch (error) {
      console.warn('Web scraping failed:', error);
    }

    return null;
  }

  /**
   * Fetch game result from ESPN API
   */
  private async fetchFromESPN(_homeTeam: string, _awayTeam: string, _gameDate: string): Promise<GameResult | null> {
    // This would require ESPN API access
    // For now, return null as ESPN API doesn't provide live scores in free tier
    return null;
  }

  /**
   * Fetch game result from SportsData.io API
   */
  private async fetchFromSportsData(homeTeam: string, awayTeam: string, gameDate: string): Promise<GameResult | null> {
    if (!this.sportsDataApiKey) return null;

    try {
      // Convert team names to abbreviations (this would need a mapping)
      const homeAbbrev = this.teamNameToAbbreviation(homeTeam);
      const awayAbbrev = this.teamNameToAbbreviation(awayTeam);

      const response = await fetch(
        `https://api.sportsdata.io/v2/json/GamesBySeason/2025?key=${this.sportsDataApiKey}`
      );

      if (!response.ok) return null;

      const games = await response.json();
      const game = games.find((g: any) =>
        g.HomeTeam === homeAbbrev &&
        g.AwayTeam === awayAbbrev &&
        g.Date.includes(gameDate.split('T')[0])
      );

      if (!game) return null;

      return {
        homeTeam,
        awayTeam,
        homeScore: game.HomeTeamScore || 0,
        awayScore: game.AwayTeamScore || 0,
        status: game.Status === 'Final' ? 'final' : game.Status === 'InProgress' ? 'in_progress' : 'scheduled',
        gameDate
      };
    } catch (error) {
      console.error('SportsData API error:', error);
      return null;
    }
  }

  /**
   * Scrape game result from web (fallback method)
   */
  private async scrapeGameResult(homeTeam: string, awayTeam: string, gameDate: string): Promise<GameResult | null> {
    try {
      // This is a simplified example - in practice you'd use a proper scraping service
      // or API that provides this data

      // For demonstration, we'll simulate finding a result
      // In a real implementation, you'd scrape ESPN, NFL.com, or other sports sites

      console.log(`Attempting to scrape result for ${awayTeam} vs ${homeTeam} on ${gameDate}`);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // This would be replaced with actual scraping logic
      // For now, return null to indicate no result found
      return null;

    } catch (error) {
      console.error('Scraping error:', error);
      return null;
    }
  }

  /**
   * Determine if a pick was a win, loss, or push based on game result
   */
  private determinePickResult(pick: any, gameResult: GameResult): 'win' | 'loss' | 'push' {
    const prediction = pick.prediction.toLowerCase();
    const gameInfo = pick.game_info;

    // Determine which team was predicted to win
    let predictedWinner = '';
    if (prediction.includes(gameInfo.home_team.toLowerCase().split(' ')[0]) ||
        prediction.includes(gameInfo.home_team.toLowerCase()) ||
        prediction.includes('home')) {
      predictedWinner = gameInfo.home_team;
    } else if (prediction.includes(gameInfo.away_team.toLowerCase().split(' ')[0]) ||
               prediction.includes(gameInfo.away_team.toLowerCase()) ||
               prediction.includes('away')) {
      predictedWinner = gameInfo.away_team;
    }

    // Determine actual winner
    let actualWinner = '';
    if (gameResult.homeScore > gameResult.awayScore) {
      actualWinner = gameInfo.home_team;
    } else if (gameResult.awayScore > gameResult.homeScore) {
      actualWinner = gameInfo.away_team;
    }

    // Check for push (tie)
    if (gameResult.homeScore === gameResult.awayScore) {
      return 'push';
    }

    // Compare prediction with actual result
    if (predictedWinner === actualWinner) {
      return 'win';
    } else {
      return 'loss';
    }
  }

  /**
   * Group picks by game for efficient processing
   */
  private groupPicksByGame(picks: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const pick of picks) {
      const gameInfo = pick.game_info;
      const gameKey = `${gameInfo.home_team}|${gameInfo.away_team}|${gameInfo.game_date}`;

      if (!groups.has(gameKey)) {
        groups.set(gameKey, []);
      }
      groups.get(gameKey)!.push(pick);
    }

    return groups;
  }

  /**
   * Convert full team name to abbreviation
   */
  private teamNameToAbbreviation(teamName: string): string {
    const teamMap: { [key: string]: string } = {
      'Kansas City Chiefs': 'KC',
      'Buffalo Bills': 'BUF',
      'Detroit Lions': 'DET',
      'Philadelphia Eagles': 'PHI',
      'San Francisco 49ers': 'SF',
      'Dallas Cowboys': 'DAL',
      'Miami Dolphins': 'MIA',
      'Cleveland Browns': 'CLE',
      'Jacksonville Jaguars': 'JAX',
      'New England Patriots': 'NE',
      'Pittsburgh Steelers': 'PIT',
      'Cincinnati Bengals': 'CIN',
      'Seattle Seahawks': 'SEA',
      'Arizona Cardinals': 'ARI',
      'Tampa Bay Buccaneers': 'TB',
      'Green Bay Packers': 'GB',
      'New Orleans Saints': 'NO',
      'Atlanta Falcons': 'ATL',
      'Chicago Bears': 'CHI',
      'New York Giants': 'NYG',
      'Washington Commanders': 'WAS',
      'New York Jets': 'NYJ',
      'Las Vegas Raiders': 'LV',
      'Los Angeles Chargers': 'LAC',
      'Denver Broncos': 'DEN',
      'Indianapolis Colts': 'IND',
      'Tennessee Titans': 'TEN',
      'Carolina Panthers': 'CAR',
      'Baltimore Ravens': 'BAL',
      'Los Angeles Rams': 'LAR',
      'Minnesota Vikings': 'MIN'
    };

    return teamMap[teamName] || teamName.split(' ').pop() || teamName;
  }

  /**
   * Schedule automatic updates (can be called periodically)
   */
  async scheduleAutomaticUpdates(): Promise<void> {
    // This could be integrated with a cron job or scheduled function
    // For now, it's a manual trigger

    console.log('Starting automatic results update...');
    const result = await this.updateAllPendingResults();

    console.log(`Updated ${result.updated} picks`);
    if (result.errors.length > 0) {
      console.error('Errors during update:', result.errors);
    }
  }
}

export const automaticResultsUpdater = new AutomaticResultsUpdater();