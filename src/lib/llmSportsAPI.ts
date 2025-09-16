import { supabase } from './supabase';
import type { ESPNGame, GameSchedule } from '../types';

/**
 * LLM-based Sports API
 *
 * This service provides NFL schedule data using multiple fallback strategies:
 * 1. Try to fetch real data from ESPN API (if available)
 * 2. Use OpenAI GPT-4 to generate realistic schedules
 *
 * Benefits:
 * - No API costs for basic functionality
 * - No rate limiting issues
 * - Works even if external APIs are down
 * - Generates realistic NFL schedules
 *
 * Limitations:
 * - LLM-generated data may not be 100% accurate
 * - Requires OpenAI API key
 * - Not suitable for production betting applications
 * - Data may become outdated
 */

class LLMSportsAPI {
  private openaiApiKey?: string;

  constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  }

  async fetchCurrentWeekSchedule(): Promise<GameSchedule> {
    try {
      // Try to get real data first, fallback to LLM-generated data
      const realData = await this.tryFetchRealData();
      if (realData && realData.games.length > 0) {
        return realData;
      }

      // Fallback to LLM-generated schedule
      return await this.generateScheduleWithLLM();
    } catch (error) {
      console.error('Error fetching schedule:', error);
      // Final fallback to mock data
      return this.generateMockSchedule();
    }
  }

  private async tryFetchRealData(): Promise<GameSchedule | null> {
    try {
      // Try ESPN API as primary source
      const response = await fetch('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/weeks/1/events?lang=en&region=us');

      if (!response.ok) {
        throw new Error(`ESPN API failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const games: ESPNGame[] = data.items.slice(0, 10).map((event: any, index: number) => ({
          id: event.id || `game-${index}`,
          name: event.name || 'NFL Game',
          date: event.date || new Date().toISOString(),
          homeTeam: this.extractTeamName(event.name, 'home') || 'Home Team',
          awayTeam: this.extractTeamName(event.name, 'away') || 'Away Team',
          venue: 'TBD',
          location: 'TBD'
        }));

        return {
          week: 1,
          season: 2025,
          games,
          lastUpdated: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn('Real data fetch failed, using LLM fallback:', error);
    }

    return null;
  }

  private async generateScheduleWithLLM(): Promise<GameSchedule> {
    if (!this.openaiApiKey) {
      console.warn('No OpenAI API key, using mock data');
      return this.generateMockSchedule();
    }

    try {
      const prompt = `Generate a realistic NFL schedule for Week ${this.getCurrentWeek()} of the 2025 season.
      Return ONLY a JSON array of games with this exact format:
      [
        {
          "id": "game-1",
          "name": "Team A at Team B",
          "date": "2025-09-15T20:20:00Z",
          "homeTeam": "Team B",
          "awayTeam": "Team A",
          "venue": "Stadium Name",
          "location": "City, State"
        }
      ]

      Include 10-14 realistic NFL games for this week. Use current NFL team names and realistic dates/times.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API failed: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content from OpenAI');
      }

      // Parse the JSON response
      const gamesData = JSON.parse(this.extractJSONFromResponse(content));

      const games: ESPNGame[] = gamesData.map((game: any, index: number) => ({
        id: game.id || `llm-game-${index}`,
        name: game.name || `${game.awayTeam} at ${game.homeTeam}`,
        date: game.date || new Date().toISOString(),
        homeTeam: game.homeTeam || 'Home Team',
        awayTeam: game.awayTeam || 'Away Team',
        venue: game.venue || 'TBD',
        location: game.location || 'TBD'
      }));

      return {
        week: this.getCurrentWeek(),
        season: 2025,
        games,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('LLM generation failed:', error);
      return this.generateMockSchedule();
    }
  }

  private generateMockSchedule(): GameSchedule {
    const mockGames: ESPNGame[] = [
      {
        id: 'mock-1',
        name: 'Kansas City Chiefs at Baltimore Ravens',
        date: '2025-09-15T20:20:00Z',
        homeTeam: 'Baltimore Ravens',
        awayTeam: 'Kansas City Chiefs',
        venue: 'M&T Bank Stadium',
        location: 'Baltimore, MD'
      },
      {
        id: 'mock-2',
        name: 'Buffalo Bills at Miami Dolphins',
        date: '2025-09-16T19:00:00Z',
        homeTeam: 'Miami Dolphins',
        awayTeam: 'Buffalo Bills',
        venue: 'Hard Rock Stadium',
        location: 'Miami Gardens, FL'
      },
      {
        id: 'mock-3',
        name: 'Detroit Lions at Tampa Bay Buccaneers',
        date: '2025-09-17T20:15:00Z',
        homeTeam: 'Tampa Bay Buccaneers',
        awayTeam: 'Detroit Lions',
        venue: 'Raymond James Stadium',
        location: 'Tampa, FL'
      },
      {
        id: 'mock-4',
        name: 'Philadelphia Eagles at Green Bay Packers',
        date: '2025-09-18T19:30:00Z',
        homeTeam: 'Green Bay Packers',
        awayTeam: 'Philadelphia Eagles',
        venue: 'Lambeau Field',
        location: 'Green Bay, WI'
      },
      {
        id: 'mock-5',
        name: 'San Francisco 49ers at Arizona Cardinals',
        date: '2025-09-19T20:05:00Z',
        homeTeam: 'Arizona Cardinals',
        awayTeam: 'San Francisco 49ers',
        venue: 'State Farm Stadium',
        location: 'Glendale, AZ'
      }
    ];

    return {
      week: this.getCurrentWeek(),
      season: 2025,
      games: mockGames,
      lastUpdated: new Date().toISOString()
    };
  }

  private getCurrentWeek(): number {
    const currentDate = new Date();
    const seasonStart = new Date('2025-09-04');
    const daysSinceStart = Math.floor((currentDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(18, Math.floor(daysSinceStart / 7) + 1));
  }

  private extractTeamName(gameName: string, position: 'home' | 'away'): string | null {
    if (!gameName) return null;

    // Simple extraction logic for "Team A at Team B" format
    const atIndex = gameName.toLowerCase().indexOf(' at ');
    if (atIndex === -1) return null;

    if (position === 'away') {
      return gameName.substring(0, atIndex).trim();
    } else {
      return gameName.substring(atIndex + 4).trim();
    }
  }

  private extractJSONFromResponse(content: string): string {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // If no JSON found, try to wrap the content
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      return content.trim();
    }

    throw new Error('No JSON found in LLM response');
  }

  async saveScheduleToDatabase(schedule: GameSchedule): Promise<void> {
    try {
      const { error } = await supabase
        .from('game_schedules')
        .upsert({
          week: schedule.week,
          season: schedule.season,
          games: schedule.games,
          last_updated: schedule.lastUpdated
        }, {
          onConflict: 'week,season'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving schedule to database:', error);
      throw new Error(`Failed to save schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadScheduleFromDatabase(week?: number, season: number = 2025): Promise<GameSchedule | null> {
    try {
      const query = supabase
        .from('game_schedules')
        .select('*')
        .eq('season', season);

      if (week) {
        query.eq('week', week);
      }

      query.order('last_updated', { ascending: false }).limit(1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const scheduleData = data[0];
      return {
        week: scheduleData.week,
        season: scheduleData.season,
        games: scheduleData.games,
        lastUpdated: scheduleData.last_updated
      };
    } catch (error) {
      console.error('Error loading schedule from database:', error);
      return null;
    }
  }

  async getCurrentWeekGames(): Promise<ESPNGame[]> {
    try {
      let schedule = await this.loadScheduleFromDatabase();

      if (!schedule || this.isScheduleStale(schedule.lastUpdated)) {
        schedule = await this.fetchCurrentWeekSchedule();
        await this.saveScheduleToDatabase(schedule);
      }

      return schedule.games;
    } catch (error) {
      console.error('Error getting current week games:', error);
      return [];
    }
  }

  private isScheduleStale(lastUpdated: string): boolean {
    const oneHour = 60 * 60 * 1000;
    const lastUpdateTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    return (now - lastUpdateTime) > oneHour;
  }
}

export const llmSportsAPI = new LLMSportsAPI();