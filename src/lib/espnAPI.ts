import { supabase } from './supabase';
import type { ESPNGame, GameSchedule } from '../types';

class ESPNAPI {
  private baseUrl = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

  async fetchCurrentWeekSchedule(): Promise<GameSchedule> {
    try {
      // First get the current season info
      const seasonResponse = await fetch(`${this.baseUrl}/seasons/2025?lang=en&region=us`);
      if (!seasonResponse.ok) {
        throw new Error(`Failed to fetch season info: ${seasonResponse.status}`);
      }
      const seasonData = await seasonResponse.json();

      // Get current week
      const currentWeek = seasonData.week?.number || 1;

      // Fetch events for current week
      const eventsResponse = await fetch(
        `${this.baseUrl}/seasons/2025/types/2/weeks/${currentWeek}/events?lang=en&region=us`
      );

      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
      }

      const eventsData = await eventsResponse.json();

      // Process each event to get detailed game info
      const games: ESPNGame[] = [];

      for (const eventRef of eventsData.items.slice(0, 10)) { // Limit to first 10 for performance
        try {
          const eventResponse = await fetch(eventRef.$ref);
          if (!eventResponse.ok) continue;

          const eventData = await eventResponse.json();

          // Extract game information
          const competition = eventData.competitions[0];
          const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
          const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');

          if (!homeTeam || !awayTeam) continue;

          const game: ESPNGame = {
            id: eventData.id,
            name: eventData.name,
            date: eventData.date,
            homeTeam: homeTeam.team.displayName,
            awayTeam: awayTeam.team.displayName,
            venue: competition.venue?.fullName || 'TBD',
            location: competition.venue?.address?.city
              ? `${competition.venue.address.city}, ${competition.venue.address.state}`
              : 'TBD',
            weather: competition.weather ? {
              temperature: competition.weather.temperature,
              condition: competition.weather.conditionId,
              windSpeed: competition.weather.windSpeed
            } : undefined
          };

          games.push(game);
        } catch (error) {
          console.warn(`Failed to fetch details for event ${eventRef.$ref}:`, error);
        }
      }

      const schedule: GameSchedule = {
        week: currentWeek,
        season: 2025,
        games,
        lastUpdated: new Date().toISOString()
      };

      return schedule;
    } catch (error) {
      console.error('Error fetching ESPN schedule:', error);
      throw new Error(`Failed to fetch NFL schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveScheduleToDatabase(schedule: GameSchedule): Promise<void> {
    try {
      // Save to Supabase
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
      // Try to load from database first
      let schedule = await this.loadScheduleFromDatabase();

      // If no cached schedule or it's older than 1 hour, fetch fresh data
      if (!schedule || this.isScheduleStale(schedule.lastUpdated)) {
        schedule = await this.fetchCurrentWeekSchedule();
        await this.saveScheduleToDatabase(schedule);
      }

      return schedule.games;
    } catch (error) {
      console.error('Error getting current week games:', error);
      // Return empty array as fallback
      return [];
    }
  }

  private isScheduleStale(lastUpdated: string): boolean {
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const lastUpdateTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    return (now - lastUpdateTime) > oneHour;
  }
}

export const espnAPI = new ESPNAPI();