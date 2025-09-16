import { supabase } from './supabase';
import type { ESPNGame, GameSchedule } from '../types';

/**
 * Enhanced LLM Sports API with Relevance AI Agent Integration
 *
 * This service combines:
 * 1. Direct LLM calls (OpenAI GPT-4)
 * 2. Relevance AI Agent for complex reasoning tasks
 * 3. Multi-source data integration
 * 4. Advanced sports analysis capabilities
 */

class EnhancedLLMSportsAPI {
  private openaiApiKey?: string;
  private relevanceApiKey?: string;
  private relevanceAgentId?: string;

  constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.relevanceApiKey = import.meta.env.VITE_RELEVANCE_API_KEY;
    this.relevanceAgentId = import.meta.env.VITE_RELEVANCE_AGENT_ID;
  }

  async fetchCurrentWeekSchedule(): Promise<GameSchedule> {
    try {
      // Try Relevance AI Agent first for intelligent data gathering
      if (this.relevanceApiKey && this.relevanceAgentId) {
        const agentResult = await this.queryRelevanceAgent(
          'Fetch and analyze the current NFL schedule for this week. Include team matchups, dates, venues, and any relevant game notes.'
        );

        if (agentResult && agentResult.games && agentResult.games.length > 0) {
          return {
            week: agentResult.week || this.getCurrentWeek(),
            season: 2025,
            games: agentResult.games,
            lastUpdated: new Date().toISOString()
          };
        }
      }

      // Fallback to direct LLM approach
      return await this.generateScheduleWithLLM();
    } catch (error) {
      console.error('Error fetching schedule:', error);
      return this.generateMockSchedule();
    }
  }

  /**
   * Query Relevance AI Agent for intelligent sports data analysis
   */
  async queryRelevanceAgent(query: string, context?: any): Promise<any> {
    if (!this.relevanceApiKey || !this.relevanceAgentId) {
      console.warn('Relevance AI not configured, skipping agent query');
      return null;
    }

    try {
      const response = await fetch(`https://api.relevance.ai/v1/agents/${this.relevanceAgentId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.relevanceApiKey}`
        },
        body: JSON.stringify({
          query,
          context: {
            currentDate: new Date().toISOString(),
            season: 2025,
            week: this.getCurrentWeek(),
            ...context
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Relevance AI API error: ${response.status}`);
      }

      const result = await response.json();
      return this.parseAgentResponse(result);
    } catch (error) {
      console.error('Relevance AI agent query failed:', error);
      return null;
    }
  }

  /**
   * Public method to query Relevance AI Agent
   */
  async queryAgentPublic(query: string, context?: any): Promise<any> {
    return this.queryRelevanceAgent(query, context);
  }

  /**
   * Parse and structure Relevance AI agent response
   */
  private parseAgentResponse(response: any): any {
    try {
      // Extract structured data from agent response
      const content = response.answer || response.response || response.content || '';

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/) || content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, try to structure the text response
      return this.structureTextResponse(content);
    } catch (error) {
      console.error('Failed to parse agent response:', error);
      return null;
    }
  }

  /**
   * Structure text response into game data
   */
  private structureTextResponse(text: string): any {
    // Simple text parsing for game information
    const games: ESPNGame[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for patterns like "Team A vs Team B" or "Team A at Team B"
      const gameMatch = line.match(/([A-Za-z\s]+(?:\s+[A-Za-z\s]+)*?)\s+(?:vs|at|@)\s+([A-Za-z\s]+(?:\s+[A-Za-z\s]+)*)/i);
      if (gameMatch) {
        const team1 = gameMatch[1].trim();
        const team2 = gameMatch[2].trim();

        games.push({
          id: `agent-${games.length + 1}`,
          name: `${team1} at ${team2}`,
          date: new Date().toISOString(),
          homeTeam: team2,
          awayTeam: team1,
          venue: 'TBD',
          location: 'TBD'
        });
      }
    }

    return {
      week: this.getCurrentWeek(),
      games,
      source: 'relevance-agent-text'
    };
  }

  /**
   * Enhanced game analysis using Relevance AI Agent
   */
  async analyzeGameWithAgent(homeTeam: string, awayTeam: string, gameDate: string): Promise<any> {
    const query = `
      Analyze the upcoming NFL game between ${awayTeam} and ${homeTeam} on ${gameDate}.
      Provide:
      1. Team strengths and weaknesses
      2. Key player matchups
      3. Weather impact (if applicable)
      4. Betting considerations
      5. Predicted outcome with confidence level
    `;

    return await this.queryRelevanceAgent(query, {
      homeTeam,
      awayTeam,
      gameDate,
      analysisType: 'pregame'
    });
  }

  /**
   * Get real-time game updates using agent
   */
  async getLiveGameUpdates(gameId: string): Promise<any> {
    const query = `Get live updates and analysis for NFL game ${gameId}. Include score, key plays, and predictions for the rest of the game.`;

    return await this.queryRelevanceAgent(query, {
      gameId,
      updateType: 'live'
    });
  }

  /**
   * Research team news and injuries using agent
   */
  async researchTeamNews(teamName: string): Promise<any> {
    const query = `Research and summarize recent news, injuries, and roster changes for the ${teamName}. Focus on information relevant to their upcoming games.`;

    return await this.queryRelevanceAgent(query, {
      teamName,
      researchType: 'team-news'
    });
  }

  /**
   * Generate advanced betting analysis using agent
   */
  async generateBettingAnalysis(gameData: any): Promise<any> {
    const query = `
      Perform advanced betting analysis for this NFL game:
      - Home Team: ${gameData.homeTeam}
      - Away Team: ${gameData.awayTeam}
      - Date: ${gameData.date}
      - Spread: ${gameData.spread || 'TBD'}
      - Over/Under: ${gameData.overUnder || 'TBD'}

      Provide:
      1. Spread analysis and recommendation
      2. Over/under analysis
      3. Moneyline recommendation
      4. Key factors influencing the game
      5. Confidence level and risk assessment
    `;

    return await this.queryRelevanceAgent(query, {
      gameData,
      analysisType: 'betting'
    });
  }

  // ... existing methods (generateScheduleWithLLM, generateMockSchedule, etc.)

  async generateScheduleWithLLM(): Promise<GameSchedule> {
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

  // Database operations
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

  /**
   * Get weekly predictions from Relevance AI Agent
   */
  async getWeeklyPredictions(): Promise<any> {
    const query = `
      Generate comprehensive NFL predictions for Week ${this.getCurrentWeek()} of the 2025 season.
      For each game this week, provide:
      1. Predicted winner and score
      2. Key factors influencing the outcome
      3. Confidence level (High/Medium/Low)
      4. Betting recommendations (if applicable)
      5. Important notes (injuries, weather, etc.)

      Format as a structured analysis with clear predictions for each matchup.
      Focus on the most important games and provide detailed reasoning.
    `;

    return await this.queryRelevanceAgent(query, {
      week: this.getCurrentWeek(),
      season: 2025,
      requestType: 'weekly-predictions'
    });
  }

  /**
   * Get top predictions for display
   */
  async getTopPredictions(limit: number = 5): Promise<any> {
    const query = `
      Provide your top ${limit} NFL predictions for Week ${this.getCurrentWeek()}.
      For each prediction, format the matchup as "Away Team vs Home Team" (e.g., "Kansas City Chiefs vs Buffalo Bills").
      Include:
      - Matchup (in "Team A vs Team B" format)
      - Predicted winner
      - Confidence level (High/Medium/Low)
      - Key reasoning (2-3 bullet points)
      - Betting insight

      Focus on the games with highest confidence or most interesting storylines.
      Return in a structured format that can be easily parsed.
    `;

    return await this.queryRelevanceAgent(query, {
      limit,
      week: this.getCurrentWeek(),
      requestType: 'top-predictions'
    });
  }

  /**
   * Save AI predictions to the database
   */
  async savePredictionsToDatabase(predictions: any): Promise<void> {
    try {
      // Save each prediction as a separate pick
      if (predictions && predictions.predictions) {
        const picks = predictions.predictions.map((pred: any) => {
          // Parse matchup to extract home and away teams
          const matchup = pred.matchup || '';
          console.log('Processing matchup:', matchup); // Debug log

          // Try different separators
          let teams: string[] = [];
          if (matchup.includes(' vs ')) {
            teams = matchup.split(' vs ');
          } else if (matchup.includes(' at ')) {
            teams = matchup.split(' at ');
          } else if (matchup.includes(' @ ')) {
            teams = matchup.split(' @ ');
          } else if (matchup.includes(' vs. ')) {
            teams = matchup.split(' vs. ');
          } else if (matchup.includes(' versus ')) {
            teams = matchup.split(' versus ');
          } else {
            // If no separator found, try to extract team names
            const words = matchup.split(' ');
            if (words.length >= 2) {
              teams = [words.slice(0, -1).join(' '), words[words.length - 1]];
            }
          }

          const away_team = teams[0]?.trim() || 'TBD';
          const home_team = teams[1]?.trim() || 'TBD';

          console.log('Parsed teams:', { away_team, home_team }); // Debug log

          return {
            game_info: {
              home_team: home_team,
              away_team: away_team,
              league: 'NFL' as const,
              game_date: new Date().toISOString().split('T')[0], // Today's date as YYYY-MM-DD
              spread: 0, // Default spread
              over_under: 45 // Default over/under
            },
            prediction: pred.winner || 'TBD',
            confidence: this.mapConfidenceToNumber(pred.confidence),
            reasoning: pred.reasoning ? pred.reasoning.join('. ') : 'AI-generated prediction',
            result: 'pending',
            is_pinned: true // Mark AI predictions as pinned for visibility
          };
        });

        for (const pick of picks) {
          const { error } = await supabase
            .from('picks')
            .insert(pick);

          if (error) {
            console.error('Error saving prediction:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error saving predictions to database:', error);
      throw new Error(`Failed to save predictions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapConfidenceToNumber(confidence: string): number {
    switch (confidence?.toLowerCase()) {
      case 'high': return 80;
      case 'medium': return 60;
      case 'low': return 40;
      default: return 50;
    }
  }
}

export const enhancedLLMSportsAPI = new EnhancedLLMSportsAPI();