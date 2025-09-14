import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { Tool } from '@langchain/core/tools';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

// Custom tools for sports data analysis
class GoogleCSESearchTool extends Tool {
  name = 'google_cse_search';
  description = 'Search the web using Google Custom Search Engine for sports data';

  constructor() {
    super();
  }

  async _call(query: string): Promise<string> {
    try {
      const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

      if (!cseId || !apiKey) {
        return 'Google CSE not configured. Please set VITE_GOOGLE_CSE_ID and VITE_GOOGLE_API_KEY in your .env file.';
      }

      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=5`
      );

      if (!response.ok) {
        throw new Error(`Google CSE API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return 'No search results found.';
      }

      const results = data.items.map((item: any, index: number) =>
        `${index + 1}. ${item.title}\n   ${item.snippet}\n   ${item.link}\n`
      ).join('\n');

      return `Search results for "${query}":\n\n${results}`;
    } catch (error) {
      console.error('Google CSE Search error:', error);
      return `Error searching Google: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

class OpenWeatherTool extends Tool {
  name = 'openweather_api';
  description = 'Get weather data for a specific location using OpenWeather API';

  constructor() {
    super();
  }

  async _call(location: string): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

      if (!apiKey) {
        return 'OpenWeather API not configured. Please set VITE_OPENWEATHER_API_KEY in your .env file.';
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=imperial`
      );

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }

      const data = await response.json();

      const weather = {
        location: data.name,
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed),
        conditions: data.weather[0].main,
        description: data.weather[0].description
      };

      return `Weather for ${weather.location}:
- Temperature: ${weather.temperature}°F
- Conditions: ${weather.conditions} (${weather.description})
- Humidity: ${weather.humidity}%
- Wind Speed: ${weather.windSpeed} mph`;
    } catch (error) {
      console.error('OpenWeather API error:', error);
      return `Error getting weather data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

class SportsDataAggregatorTool extends Tool {
  name = 'sports_data_aggregator';
  description = 'Aggregate and analyze sports data from multiple sources';

  constructor() {
    super();
  }

  async _call(data: string): Promise<string> {
    // This tool would process and aggregate data from previous tool calls
    // For now, we'll return a summary of the data provided
    return `Aggregated sports data analysis:\n${data}\n\nAnalysis complete.`;
  }
}

// Initialize the AI model and tools
const initializeSportsAnalysisAgent = async () => {
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
  }

  const llm = new ChatOpenAI({
    openAIApiKey: openaiApiKey,
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.1, // Low temperature for more consistent analysis
  });

  const tools = [
    new GoogleCSESearchTool(),
    new OpenWeatherTool(),
    new SportsDataAggregatorTool(),
  ];

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an expert sports analyst AI for NFL predictions. Your goal is to analyze sports data and provide accurate predictions that beat Vegas odds (targeting 54-55% accuracy).

You have access to:
1. Google Custom Search Engine for finding injury reports, DVOA, FPI, and other sports analytics
2. OpenWeather API for game-day weather conditions
3. Data aggregation tools for combining multiple data sources

When analyzing a game, follow this process:
1. Research both teams' injury reports and player availability
2. Check advanced metrics like DVOA (Defense-adjusted Value Over Average) and FPI (Football Power Index)
3. Analyze weather conditions if playing outdoors
4. Consider home/away performance, recent form, and matchup specifics
5. Generate a prediction with confidence score and reasoning

Always provide:
- Specific search queries for relevant data
- Confidence percentage (0-100)
- Clear reasoning based on data
- Recommended bet with odds suggestion`,
    ],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools,
    verbose: true,
  });
};

// Main function to analyze a game
export const analyzeGame = async (gameData: {
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  location?: string;
  spread?: number;
  overUnder?: number;
}) => {
  try {
    const agent = await initializeSportsAnalysisAgent();

    const input = `Analyze the NFL game between ${gameData.awayTeam} at ${gameData.homeTeam} on ${gameData.gameDate}.
${gameData.location ? `Game location: ${gameData.location}` : ''}
${gameData.spread ? `Current spread: ${gameData.homeTeam} ${gameData.spread > 0 ? '+' : ''}${gameData.spread}` : ''}
${gameData.overUnder ? `Over/Under: ${gameData.overUnder}` : ''}

Please research injury reports, DVOA, FPI, weather conditions, and provide a prediction with confidence score.`;

    const result = await agent.call({ input });

    return {
      success: true,
      analysis: result.output,
      intermediateSteps: result.intermediateSteps,
    };
  } catch (error) {
    console.error('Sports analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

// Function to generate multiple predictions for a week's games
export const analyzeWeekGames = async (games: Array<{
  id: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  location?: string;
  spread?: number;
  overUnder?: number;
}>) => {
  const results = [];

  for (const game of games) {
    console.log(`Analyzing game: ${game.awayTeam} vs ${game.homeTeam}`);
    const analysis = await analyzeGame(game);
    results.push({
      gameId: game.id,
      ...analysis,
    });

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
};

export default {
  analyzeGame,
  analyzeWeekGames,
};