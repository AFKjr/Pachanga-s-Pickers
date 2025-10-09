// api/generate-predictions-v2.ts
// All-in-one serverless function - no external imports

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// CONSTANTS
// ============================================================================

const SIMULATION_ITERATIONS = 100; // Reduced from 100 for serverless
const QUARTERS_PER_GAME = 4;
const POSSESSIONS_PER_QUARTER = 6;

const WEATHER_CONSTANTS = {
  FORECAST_HOURS_THRESHOLD: 120,
  DOME_DEFAULTS: {
    TEMPERATURE: 72,
    WIND_SPEED: 0,
    PRECIPITATION: 0,
    HUMIDITY: 50,
  },
  TEMPERATURE_THRESHOLDS: {
    EXTREME_COLD: 20,
    FREEZING: 32,
    COLD: 40,
    EXTREME_HEAT: 95,
  },
  WIND_THRESHOLDS: {
    EXTREME: 25,
    HIGH: 20,
    MODERATE: 15,
    LIGHT: 10,
  },
  IMPACT_SCORES: {
    TEMPERATURE: {
      EXTREME_COLD: 3,
      FREEZING: 2,
      COLD: 1,
      EXTREME_HEAT: 1,
    },
    WIND: {
      EXTREME: 4,
      HIGH: 3,
      MODERATE: 2,
      LIGHT: 1,
    },
    PRECIPITATION: {
      SNOW: 3,
      HEAVY_RAIN: 2,
      RAIN: 1,
    },
  },
  IMPACT_RATING_THRESHOLDS: {
    EXTREME: 7,
    HIGH: 5,
    MEDIUM: 3,
    LOW: 1,
  },
  WEATHER_MODIFIERS: {
    PASSING: {
      HIGH_WINDS: 0.65,
      MODERATE_WINDS: 0.80,
      LIGHT_WINDS: 0.90,
      EXTREME_COLD: 0.85,
      FREEZING: 0.92,
      SNOW: 0.75,
      HEAVY_RAIN: 0.85,
      LIGHT_RAIN: 0.95,
    },
    RUSHING: {
      HIGH_WINDS: 1.10,
      MODERATE_WINDS: 1.05,
      EXTREME_COLD: 0.95,
      SNOW: 0.90,
      HEAVY_RAIN: 0.95,
    },
  },
  DEFENSIVE_WEATHER_BENEFIT: 0.3,
} as const;

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

const NFL_STADIUMS: Record<string, { lat: number; lon: number; isDome: boolean; city: string }> = {
  'Arizona Cardinals': { lat: 33.5276, lon: -112.2626, isDome: true, city: 'Glendale, AZ' },
  'Atlanta Falcons': { lat: 33.7554, lon: -84.4008, isDome: true, city: 'Atlanta, GA' },
  'Baltimore Ravens': { lat: 39.2780, lon: -76.6227, isDome: false, city: 'Baltimore, MD' },
  'Buffalo Bills': { lat: 42.7738, lon: -78.7870, isDome: false, city: 'Orchard Park, NY' },
  'Carolina Panthers': { lat: 35.2258, lon: -80.8528, isDome: false, city: 'Charlotte, NC' },
  'Chicago Bears': { lat: 41.8623, lon: -87.6167, isDome: false, city: 'Chicago, IL' },
  'Cincinnati Bengals': { lat: 39.0954, lon: -84.5160, isDome: false, city: 'Cincinnati, OH' },
  'Cleveland Browns': { lat: 41.5061, lon: -81.6995, isDome: false, city: 'Cleveland, OH' },
  'Dallas Cowboys': { lat: 32.7473, lon: -97.0945, isDome: true, city: 'Arlington, TX' },
  'Denver Broncos': { lat: 39.7439, lon: -105.0201, isDome: false, city: 'Denver, CO' },
  'Detroit Lions': { lat: 42.3400, lon: -83.0456, isDome: true, city: 'Detroit, MI' },
  'Green Bay Packers': { lat: 44.5013, lon: -88.0622, isDome: false, city: 'Green Bay, WI' },
  'Houston Texans': { lat: 29.6847, lon: -95.4107, isDome: true, city: 'Houston, TX' },
  'Indianapolis Colts': { lat: 39.7601, lon: -86.1639, isDome: true, city: 'Indianapolis, IN' },
  'Jacksonville Jaguars': { lat: 30.3239, lon: -81.6373, isDome: false, city: 'Jacksonville, FL' },
  'Kansas City Chiefs': { lat: 39.0489, lon: -94.4839, isDome: false, city: 'Kansas City, MO' },
  'Las Vegas Raiders': { lat: 36.0908, lon: -115.1833, isDome: true, city: 'Las Vegas, NV' },
  'Los Angeles Chargers': { lat: 33.9535, lon: -118.3390, isDome: false, city: 'Inglewood, CA' },
  'Los Angeles Rams': { lat: 33.9535, lon: -118.3390, isDome: false, city: 'Inglewood, CA' },
  'Miami Dolphins': { lat: 25.9580, lon: -80.2389, isDome: false, city: 'Miami Gardens, FL' },
  'Minnesota Vikings': { lat: 44.9738, lon: -93.2577, isDome: true, city: 'Minneapolis, MN' },
  'New England Patriots': { lat: 42.0909, lon: -71.2643, isDome: false, city: 'Foxborough, MA' },
  'New Orleans Saints': { lat: 29.9511, lon: -90.0812, isDome: true, city: 'New Orleans, LA' },
  'New York Giants': { lat: 40.8128, lon: -74.0742, isDome: false, city: 'East Rutherford, NJ' },
  'New York Jets': { lat: 40.8128, lon: -74.0742, isDome: false, city: 'East Rutherford, NJ' },
  'Philadelphia Eagles': { lat: 39.9008, lon: -75.1675, isDome: false, city: 'Philadelphia, PA' },
  'Pittsburgh Steelers': { lat: 40.4468, lon: -80.0158, isDome: false, city: 'Pittsburgh, PA' },
  'San Francisco 49ers': { lat: 37.4030, lon: -121.9697, isDome: false, city: 'Santa Clara, CA' },
  'Seattle Seahawks': { lat: 47.5952, lon: -122.3316, isDome: false, city: 'Seattle, WA' },
  'Tampa Bay Buccaneers': { lat: 27.9759, lon: -82.5033, isDome: false, city: 'Tampa, FL' },
  'Tennessee Titans': { lat: 36.1665, lon: -86.7713, isDome: false, city: 'Nashville, TN' },
  'Washington Commanders': { lat: 38.9076, lon: -76.8645, isDome: false, city: 'Landover, MD' }
};

// ============================================================================
// TYPES
// ============================================================================

interface TeamStats {
  team: string;
  gamesPlayed: number;
  offensiveYardsPerGame: number;
  defensiveYardsAllowed: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  turnoverDifferential: number;
  thirdDownConversionRate: number;
  redZoneEfficiency: number;
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
  totalPlays: number;
  yardsPerPlay: number;
  firstDowns: number;
  penalties: number;
  penaltyYards: number;
  turnoversLost: number;
  fumblesLost: number;
  defPassCompletionsAllowed: number;
  defPassAttempts: number;
  defPassingYardsAllowed: number;
  defPassingTdsAllowed: number;
  defInterceptions: number;
  defRushingAttemptsAllowed: number;
  defRushingYardsAllowed: number;
  defRushingTdsAllowed: number;
  defTotalPlays: number;
  defYardsPerPlayAllowed: number;
  defFirstDownsAllowed: number;
  turnoversForced: number;
  fumblesForced: number;
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

interface WeatherConditions {
  temperature: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  humidity: number;
  description: string;
}

interface GameWeather extends WeatherConditions {
  gameId: string;
  stadium: string;
  isDome: boolean;
  impactRating: 'none' | 'low' | 'medium' | 'high' | 'extreme';
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
// UTILITY FUNCTIONS
// ============================================================================

function resolveTeamName(teamName: string): string | null {
  if (!teamName) return null;
  const cleaned = teamName.trim().toLowerCase();
  return TEAM_NAME_MAPPINGS[cleaned] || null;
}

function calculateNFLWeek(gameDate: Date): number {
  const seasonStart = new Date('2025-09-04');
  const daysDiff = Math.floor(
    (gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(1, Math.min(18, Math.floor(daysDiff / 7) + 1));
}

function getConfidenceLevel(probability: number): 'High' | 'Medium' | 'Low' {
  if (probability >= 65) return 'High';
  if (probability >= 55) return 'Medium';
  return 'Low';
}

function mapConfidenceToNumber(confidence: 'High' | 'Medium' | 'Low'): number {
  switch (confidence) {
    case 'High': return 80;
    case 'Medium': return 60;
    case 'Low': return 40;
    default: return 50;
  }
}

// ============================================================================
// WEATHER FUNCTIONS
// ============================================================================

function calculateWeatherImpact(
  temp: number,
  wind: number,
  precip: number,
  condition: string
): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
  let impactScore = 0;

  if (temp < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_COLD) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.EXTREME_COLD;
  } else if (temp < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.FREEZING) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.FREEZING;
  } else if (temp < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.COLD) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.COLD;
  } else if (temp > WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_HEAT) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.EXTREME_HEAT;
  }

  if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.EXTREME) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.EXTREME;
  } else if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.HIGH) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.HIGH;
  } else if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.MODERATE) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.MODERATE;
  } else if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.LIGHT) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.LIGHT;
  }

  if (condition === 'Snow') {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.PRECIPITATION.SNOW;
  } else if (condition === 'Rain' && precip > 50) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.PRECIPITATION.HEAVY_RAIN;
  } else if (condition === 'Rain') {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.PRECIPITATION.RAIN;
  }

  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.EXTREME) return 'extreme';
  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.HIGH) return 'high';
  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.MEDIUM) return 'medium';
  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.LOW) return 'low';
  return 'none';
}

async function fetchGameWeather(
  homeTeam: string,
  gameDateTime: string,
  apiKey: string
): Promise<GameWeather | null> {
  const stadium = NFL_STADIUMS[homeTeam];

  if (!stadium) {
    console.warn(`No stadium data for ${homeTeam}`);
    return null;
  }

  if (stadium.isDome) {
    return {
      gameId: `${homeTeam}_${gameDateTime}`,
      stadium: stadium.city,
      isDome: true,
      temperature: WEATHER_CONSTANTS.DOME_DEFAULTS.TEMPERATURE,
      windSpeed: WEATHER_CONSTANTS.DOME_DEFAULTS.WIND_SPEED,
      precipitation: WEATHER_CONSTANTS.DOME_DEFAULTS.PRECIPITATION,
      condition: 'Dome',
      humidity: WEATHER_CONSTANTS.DOME_DEFAULTS.HUMIDITY,
      description: 'Indoor stadium - no weather impact',
      impactRating: 'none'
    };
  }

  try {
    const gameDate = new Date(gameDateTime);
    const now = new Date();
    const hoursUntilGame = Math.floor((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    let weatherData;

    if (hoursUntilGame > 0 && hoursUntilGame <= WEATHER_CONSTANTS.FORECAST_HOURS_THRESHOLD) {
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${stadium.lat}&lon=${stadium.lon}&appid=${apiKey}&units=imperial`;
      const forecastResponse = await fetch(forecastUrl);

      if (!forecastResponse.ok) {
        throw new Error(`Weather API error: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();

      const closestForecast = forecastData.list.reduce((closest: any, current: any) => {
        const currentTime = new Date(current.dt * 1000).getTime();
        const closestTime = new Date(closest.dt * 1000).getTime();
        const gameTime = gameDate.getTime();

        return Math.abs(currentTime - gameTime) < Math.abs(closestTime - gameTime)
          ? current
          : closest;
      });

      weatherData = closestForecast;
    } else {
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${stadium.lat}&lon=${stadium.lon}&appid=${apiKey}&units=imperial`;
      const currentResponse = await fetch(currentUrl);

      if (!currentResponse.ok) {
        throw new Error(`Weather API error: ${currentResponse.status}`);
      }

      weatherData = await currentResponse.json();
    }

    const temperature = Math.round(weatherData.main.temp);
    const windSpeed = Math.round(weatherData.wind.speed);
    const precipitation = weatherData.rain?.['3h'] ? Math.round((weatherData.rain['3h'] / 25.4) * 100) :
                         weatherData.snow?.['3h'] ? Math.round((weatherData.snow['3h'] / 25.4) * 100) : 0;
    const condition = weatherData.weather[0].main;
    const humidity = weatherData.main.humidity;
    const description = weatherData.weather[0].description;

    const impactRating = calculateWeatherImpact(temperature, windSpeed, precipitation, condition);

    return {
      gameId: `${homeTeam}_${gameDateTime}`,
      stadium: stadium.city,
      isDome: false,
      temperature,
      windSpeed,
      precipitation,
      condition,
      humidity,
      description,
      impactRating
    };

  } catch (error) {
    console.error(`Error fetching weather for ${homeTeam}:`, error);
    return null;
  }
}

function applyWeatherAdjustments(
  weather: GameWeather | null,
  offensiveStrength: number,
  defensiveStrength: number,
  stats: { passingYards: number; rushingYards: number; yardsPerPlay: number }
): {
  adjustedOffensiveStrength: number;
  adjustedDefensiveStrength: number;
  passingModifier: number;
  rushingModifier: number;
  explanation: string;
} {
  if (!weather || weather.isDome || weather.impactRating === 'none') {
    return {
      adjustedOffensiveStrength: offensiveStrength,
      adjustedDefensiveStrength: defensiveStrength,
      passingModifier: 1.0,
      rushingModifier: 1.0,
      explanation: 'No weather impact'
    };
  }

  let passingModifier = 1.0;
  let rushingModifier = 1.0;
  const adjustments: string[] = [];

  if (weather.windSpeed >= WEATHER_CONSTANTS.WIND_THRESHOLDS.HIGH) {
    passingModifier = WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.HIGH_WINDS;
    rushingModifier = WEATHER_CONSTANTS.WEATHER_MODIFIERS.RUSHING.HIGH_WINDS;
    adjustments.push(`High winds (${weather.windSpeed}mph) severely limit passing`);
  } else if (weather.windSpeed >= WEATHER_CONSTANTS.WIND_THRESHOLDS.MODERATE) {
    passingModifier = WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.MODERATE_WINDS;
    rushingModifier = WEATHER_CONSTANTS.WEATHER_MODIFIERS.RUSHING.MODERATE_WINDS;
    adjustments.push(`Moderate winds (${weather.windSpeed}mph) reduce passing efficiency`);
  } else if (weather.windSpeed >= WEATHER_CONSTANTS.WIND_THRESHOLDS.LIGHT) {
    passingModifier = WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.LIGHT_WINDS;
    adjustments.push(`Light winds (${weather.windSpeed}mph) slightly affect passing`);
  }

  if (weather.temperature < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_COLD) {
    passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.EXTREME_COLD;
    rushingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.RUSHING.EXTREME_COLD;
    adjustments.push(`Extreme cold (${weather.temperature}°F) affects ball handling`);
  } else if (weather.temperature < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.FREEZING) {
    passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.FREEZING;
    adjustments.push(`Freezing temps (${weather.temperature}°F) reduce passing accuracy`);
  }

  if (weather.condition === 'Snow') {
    passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.SNOW;
    rushingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.RUSHING.SNOW;
    adjustments.push('Snow conditions significantly impact both offense types');
  }

  if (weather.condition === 'Rain') {
    if (weather.precipitation > 50) {
      passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.HEAVY_RAIN;
      rushingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.RUSHING.HEAVY_RAIN;
      adjustments.push('Heavy rain affects ball security');
    } else {
      passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.LIGHT_RAIN;
      adjustments.push('Light rain may cause minor issues');
    }
  }

  const totalYards = stats.passingYards + stats.rushingYards;
  const passRatio = stats.passingYards / totalYards;
  const rushRatio = stats.rushingYards / totalYards;

  const overallOffensiveModifier = (passingModifier * passRatio) + (rushingModifier * rushRatio);
  const adjustedOffensiveStrength = offensiveStrength * overallOffensiveModifier;

  const defensiveModifier = 1.0 + ((1.0 - overallOffensiveModifier) * WEATHER_CONSTANTS.DEFENSIVE_WEATHER_BENEFIT);
  const adjustedDefensiveStrength = defensiveStrength * defensiveModifier;

  const explanation = adjustments.length > 0
    ? adjustments.join('; ')
    : 'Favorable weather conditions';

  return {
    adjustedOffensiveStrength,
    adjustedDefensiveStrength,
    passingModifier,
    rushingModifier,
    explanation
  };
}

function formatWeatherForDisplay(weather: GameWeather | null): string {
  if (!weather) return 'Weather data unavailable';
  if (weather.isDome) return '🏟️ Dome (no weather impact)';

  const icons: Record<string, string> = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '🌧️',
    Snow: '❄️',
    Thunderstorm: '⛈️'
  };

  const icon = icons[weather.condition] || '🌤️';
  const impact = weather.impactRating !== 'none'
    ? ` (${weather.impactRating.toUpperCase()} impact)`
    : '';

  return `${icon} ${weather.temperature}°F, Wind ${weather.windSpeed}mph${impact}`;
}

// ============================================================================
// SIMULATION FUNCTIONS
// ============================================================================

function calculateOffensiveStrength(stats: TeamStats): number {
  const passingEfficiency = (
    stats.passingYards / 100 * 3 +
    stats.yardsPerPassAttempt * 5 +
    stats.passCompletionPct / 10 +
    stats.passingTds * 8 -
    stats.interceptionsThrown * 10
  ) * 0.4;
  
  const rushingEfficiency = (
    stats.rushingYards / 50 * 2 +
    stats.yardsPerRush * 8 +
    stats.rushingTds * 10
  ) * 0.3;
  
  const overallEfficiency = (
    stats.yardsPerPlay * 15 +
    stats.firstDowns * 3 +
    stats.thirdDownConversionRate * 1.5 +
    stats.redZoneEfficiency * 2
  ) * 0.2;
  
  const turnoverImpact = (
    -stats.turnoversLost * 15 -
    stats.fumblesLost * 12 +
    stats.turnoverDifferential * 8
  ) * 0.1;
  
  const penaltyImpact = -(stats.penaltyYards / 10);
  
  return Math.max(0, 
    passingEfficiency + 
    rushingEfficiency + 
    overallEfficiency + 
    turnoverImpact + 
    penaltyImpact +
    stats.pointsPerGame * 2
  );
}

function calculateDefensiveStrength(stats: TeamStats): number {
  const passDefense = (
    (280 - stats.defPassingYardsAllowed) / 20 +
    -stats.defPassingTdsAllowed * 8 +
    stats.defInterceptions * 12 +
    (stats.defPassAttempts > 0 ?
      (100 - (stats.defPassCompletionsAllowed / stats.defPassAttempts * 100)) / 5 
      : 0)
  ) * 0.4;
  
  const rushDefense = (
    (150 - stats.defRushingYardsAllowed) / 15 +
    -stats.defRushingTdsAllowed * 10 +
    (stats.defRushingAttemptsAllowed > 0 ?
      (5.0 - (stats.defRushingYardsAllowed / stats.defRushingAttemptsAllowed)) * 10
      : 0)
  ) * 0.3;
  
  const overallDefense = (
    (7.0 - stats.defYardsPerPlayAllowed) * 15 +
    -stats.defFirstDownsAllowed * 2 +
    (50 - stats.thirdDownConversionRate) * 1.5
  ) * 0.2;
  
  const turnoverCreation = (
    stats.turnoversForced * 15 +
    stats.fumblesForced * 12 +
    stats.defInterceptions * 12
  ) * 0.1;
  
  return Math.max(0,
    passDefense +
    rushDefense +
    overallDefense +
    turnoverCreation +
    (45 - stats.pointsAllowedPerGame) * 2
  );
}

function simulatePossessionWithWeather(
  offenseStats: TeamStats,
  defenseStats: TeamStats,
  weatherAdjustment: ReturnType<typeof applyWeatherAdjustments> | null
): number {
  const offensiveStrength = weatherAdjustment 
    ? weatherAdjustment.adjustedOffensiveStrength 
    : calculateOffensiveStrength(offenseStats);
    
  const defensiveStrength = weatherAdjustment
    ? weatherAdjustment.adjustedDefensiveStrength
    : calculateDefensiveStrength(defenseStats);
  
  const baseScoring = offensiveStrength / (offensiveStrength + defensiveStrength);
  
  const turnoverChance = (
    (offenseStats.turnoversLost / offenseStats.totalPlays) +
    (defenseStats.turnoversForced / defenseStats.defTotalPlays)
  ) / 2;
  
  const turnoverRoll = Math.random();
  if (turnoverRoll < turnoverChance) return 0;
  
  const efficiencyModifier = (
    offenseStats.yardsPerPlay / (offenseStats.yardsPerPlay + defenseStats.defYardsPerPlayAllowed)
  );
  
  const scoringProbability = baseScoring * 0.7 + efficiencyModifier * 0.3;
  const scoreRoll = Math.random();
  
  if (scoreRoll > scoringProbability) return 0;
  
  const redZoneRoll = Math.random() * 100;
  const tdProbability = (
    offenseStats.redZoneEfficiency * 0.6 +
    (offenseStats.passingTds + offenseStats.rushingTds) * 5
  );
  
  if (redZoneRoll < tdProbability) return 7;
  
  const fgProbability = tdProbability + 35;
  if (redZoneRoll < fgProbability) return 3;
  
  return 0;
}

function simulateSingleGameWithWeather(
  homeStats: TeamStats,
  awayStats: TeamStats,
  weather: GameWeather | null
): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  const homeWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    calculateOffensiveStrength(homeStats),
    calculateDefensiveStrength(awayStats),
    {
      passingYards: homeStats.passingYards,
      rushingYards: homeStats.rushingYards,
      yardsPerPlay: homeStats.yardsPerPlay
    }
  ) : null;

  const awayWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    calculateOffensiveStrength(awayStats),
    calculateDefensiveStrength(homeStats),
    {
      passingYards: awayStats.passingYards,
      rushingYards: awayStats.rushingYards,
      yardsPerPlay: awayStats.yardsPerPlay
    }
  ) : null;

  for (let quarter = 0; quarter < QUARTERS_PER_GAME; quarter++) {
    for (let possession = 0; possession < POSSESSIONS_PER_QUARTER / 2; possession++) {
      homeScore += simulatePossessionWithWeather(
        homeStats, 
        awayStats, 
        homeWeatherAdj
      );
    }
    for (let possession = 0; possession < POSSESSIONS_PER_QUARTER / 2; possession++) {
      awayScore += simulatePossessionWithWeather(
        awayStats, 
        homeStats, 
        awayWeatherAdj
      );
    }
  }

  return { homeScore, awayScore };
}

function runMonteCarloSimulationWithWeather(
  homeStats: TeamStats,
  awayStats: TeamStats,
  spread: number,
  total: number,
  weather: GameWeather | null
): SimulationResult {
  const homeScores: number[] = [];
  const awayScores: number[] = [];
  let homeWins = 0;
  let awayWins = 0;
  let spreadCovers = 0;
  let overs = 0;

  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const gameResult = simulateSingleGameWithWeather(homeStats, awayStats, weather);
    
    homeScores.push(gameResult.homeScore);
    awayScores.push(gameResult.awayScore);

    if (gameResult.homeScore > gameResult.awayScore) homeWins++;
    if (gameResult.awayScore > gameResult.homeScore) awayWins++;

    const adjustedHomeScore = gameResult.homeScore + spread;
    if (adjustedHomeScore > gameResult.awayScore) spreadCovers++;

    const totalPoints = gameResult.homeScore + gameResult.awayScore;
    if (totalPoints > total) overs++;
  }

  const avgHomeScore = homeScores.reduce((accumulator, score) => accumulator + score, 0) / homeScores.length;
  const avgAwayScore = awayScores.reduce((accumulator, score) => accumulator + score, 0) / awayScores.length;

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

function generateReasoning(
  homeTeam: string,
  awayTeam: string,
  simResult: SimulationResult,
  _moneylinePick: string,
  spreadPick: string,
  totalPick: string,
  weatherExplanation?: string
): string {
  const factors: string[] = [];

  factors.push(
    `Monte Carlo simulation projects ` +
    `${homeTeam} ${simResult.predictedHomeScore} - ${awayTeam} ${simResult.predictedAwayScore}`
  );
  
  const winningTeam = simResult.homeWinProbability > simResult.awayWinProbability ? homeTeam : awayTeam;
  const winProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
  factors.push(`${winningTeam} wins ${winProb.toFixed(1)}% of simulations`);

  const spreadCoverProb = simResult.spreadCoverProbability > 50 
    ? simResult.spreadCoverProbability 
    : 100 - simResult.spreadCoverProbability;
  factors.push(`${spreadPick} covers ${spreadCoverProb.toFixed(1)}% of simulations`);
  
  const totalPoints = simResult.predictedHomeScore + simResult.predictedAwayScore;
  const totalProb = simResult.overProbability > 50 ? simResult.overProbability : simResult.underProbability;
  factors.push(`Projected total of ${totalPoints} points, ${totalPick} hits ${totalProb.toFixed(1)}% of simulations`);

  if (weatherExplanation && !weatherExplanation.includes('No weather') && !weatherExplanation.includes('Dome')) {
    factors.push(`Weather impact: ${weatherExplanation}`);
  }

  return factors.join('; ');
}

// ============================================================================
// API FUNCTIONS
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

async function fetchTeamStatsFromDatabase(
  teamName: string, 
  supabaseUrl: string, 
  supabaseKey: string, 
  week?: number
): Promise<TeamStats | null> {
  try {
    const canonicalName = resolveTeamName(teamName);
    const queryName = canonicalName || teamName;
    
    console.log(`Fetching stats for: "${teamName}" → "${queryName}" (week: ${week || 'latest'})`);
    
    let query = `${supabaseUrl}/rest/v1/team_stats_cache?team_name=eq.${encodeURIComponent(queryName)}&season_year=eq.2025`;
    if (week) {
      query += `&week=eq.${week}`;
    }
    query += '&order=week.desc&limit=1&select=*';
    
    const response = await fetch(query, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch stats for ${queryName}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      console.warn(`No stats found for "${teamName}" (tried "${queryName}")`);
      return null;
    }

    const dbStats = data[0];
    console.log(`✅ Loaded stats for ${queryName} - Week ${dbStats.week}`);
    
    return {
      team: teamName,
      gamesPlayed: dbStats.games_played || 5,
      offensiveYardsPerGame: dbStats.offensive_yards_per_game || 328.3,
      defensiveYardsAllowed: dbStats.defensive_yards_allowed || 328.3,
      pointsPerGame: dbStats.points_per_game || 23.4,
      pointsAllowedPerGame: dbStats.points_allowed_per_game || 23.4,
      turnoverDifferential: dbStats.turnover_differential || 0,
      thirdDownConversionRate: dbStats.third_down_conversion_rate || 40.0,
      redZoneEfficiency: dbStats.red_zone_efficiency || 55.0,
      passCompletions: dbStats.pass_completions || 21.6,
      passAttempts: dbStats.pass_attempts || 32.7,
      passCompletionPct: dbStats.pass_completion_pct || 65.9,
      passingYards: dbStats.passing_yards || 213.8,
      passingTds: dbStats.passing_tds || 1.6,
      interceptionsThrown: dbStats.interceptions_thrown || 0.7,
      yardsPerPassAttempt: dbStats.yards_per_pass_attempt || 7.0,
      rushingAttempts: dbStats.rushing_attempts || 26.3,
      rushingYards: dbStats.rushing_yards || 114.5,
      rushingTds: dbStats.rushing_tds || 0.9,
      yardsPerRush: dbStats.yards_per_rush || 4.4,
      totalPlays: dbStats.total_plays || 61.2,
      yardsPerPlay: dbStats.yards_per_play || 5.4,
      firstDowns: dbStats.first_downs || 19.6,
      penalties: dbStats.penalties || 7.3,
      penaltyYards: dbStats.penalty_yards || 58.4,
      turnoversLost: dbStats.turnovers_lost || 1.2,
      fumblesLost: dbStats.fumbles_lost || 0.5,
      defPassCompletionsAllowed: dbStats.def_pass_completions_allowed || 21.6,
      defPassAttempts: dbStats.def_pass_attempts || 32.7,
      defPassingYardsAllowed: dbStats.def_passing_yards_allowed || 213.8,
      defPassingTdsAllowed: dbStats.def_passing_tds_allowed || 1.6,
      defInterceptions: dbStats.def_interceptions || 0.7,
      defRushingAttemptsAllowed: dbStats.def_rushing_attempts_allowed || 26.3,
      defRushingYardsAllowed: dbStats.def_rushing_yards_allowed || 114.5,
      defRushingTdsAllowed: dbStats.def_rushing_tds_allowed || 0.9,
      defTotalPlays: dbStats.def_total_plays || 61.2,
      defYardsPerPlayAllowed: dbStats.def_yards_per_play_allowed || 5.4,
      defFirstDownsAllowed: dbStats.def_first_downs_allowed || 19.6,
      turnoversForced: dbStats.turnovers_forced || 1.2,
      fumblesForced: dbStats.fumbles_forced || 0.5
    };
  } catch (error) {
    console.error(`Error fetching stats for ${teamName}:`, error);
    return null;
  }
}

function getDefaultTeamStats(teamName: string): TeamStats {
  return {
    team: teamName,
    gamesPlayed: 5,
    offensiveYardsPerGame: 328.3,
    defensiveYardsAllowed: 328.3,
    pointsPerGame: 23.4,
    pointsAllowedPerGame: 23.4,
    turnoverDifferential: 0,
    thirdDownConversionRate: 40.0,
    redZoneEfficiency: 55.0,
    passCompletions: 21.6,
    passAttempts: 32.7,
    passCompletionPct: 65.9,
    passingYards: 213.8,
    passingTds: 1.6,
    interceptionsThrown: 0.7,
    yardsPerPassAttempt: 7.0,
    rushingAttempts: 26.3,
    rushingYards: 114.5,
    rushingTds: 0.9,
    yardsPerRush: 4.4,
    totalPlays: 61.2,
    yardsPerPlay: 5.4,
    firstDowns: 19.6,
    penalties: 7.3,
    penaltyYards: 58.4,
    turnoversLost: 1.2,
    fumblesLost: 0.5,
    defPassCompletionsAllowed: 21.6,
    defPassAttempts: 32.7,
    defPassingYardsAllowed: 213.8,
    defPassingTdsAllowed: 1.6,
    defInterceptions: 0.7,
    defRushingAttemptsAllowed: 26.3,
    defRushingYardsAllowed: 114.5,
    defRushingTdsAllowed: 0.9,
    defTotalPlays: 61.2,
    defYardsPerPlayAllowed: 5.4,
    defFirstDownsAllowed: 19.6,
    turnoversForced: 1.2,
    fumblesForced: 0.5
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const startTime = Date.now();
  
  function logMemory(label: string) {
    const memUsage = process.memoryUsage();
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  ${elapsedSeconds}s | 💾 ${label}: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🎲 Starting prediction generation...');
    logMemory('Function started');
    
    console.log('📊 Fetching odds from The Odds API...');
    let oddsData: OddsData[];
    try {
      oddsData = await fetchNFLOdds();
      console.log(`✅ Found ${oddsData.length} games with odds`);
      logMemory(`Loaded ${oddsData.length} games`);
    } catch (oddsError) {
      const errorMessage = oddsError instanceof Error ? oddsError.message : String(oddsError);
      console.error('❌ Failed to fetch odds:', errorMessage);
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

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return response.status(500).json({
        error: 'Supabase configuration missing',
        hint: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables'
      });
    }

    const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!WEATHER_API_KEY) {
      console.warn('⚠️ OPENWEATHER_API_KEY not set - predictions will run without weather data');
    }

    const predictions = [];
    const errors = [];
    
    for (let gameIndex = 0; gameIndex < oddsData.length; gameIndex++) {
      const game = oddsData[gameIndex];
      
      try {
        console.log(`\n🏈 [${gameIndex + 1}/${oddsData.length}] Processing: ${game.away_team} @ ${game.home_team}`);
        logMemory(`Before game ${gameIndex + 1}`);
        
        const homeStats = await fetchTeamStatsFromDatabase(game.home_team, SUPABASE_URL, SUPABASE_KEY)
          || getDefaultTeamStats(game.home_team);
        const awayStats = await fetchTeamStatsFromDatabase(game.away_team, SUPABASE_URL, SUPABASE_KEY)
          || getDefaultTeamStats(game.away_team);
        
        console.log(`📈 ${game.home_team} stats: 3D%=${homeStats.thirdDownConversionRate}, RZ%=${homeStats.redZoneEfficiency}`);
        console.log(`📈 ${game.away_team} stats: 3D%=${awayStats.thirdDownConversionRate}, RZ%=${awayStats.redZoneEfficiency}`);

        let gameWeather: GameWeather | null = null;
        let weatherImpact = 'No weather data';
        
        if (WEATHER_API_KEY) {
          try {
            gameWeather = await fetchGameWeather(
              game.home_team,
              game.commence_time,
              WEATHER_API_KEY
            );
            
            if (gameWeather) {
              console.log(`🌤️ Weather: ${formatWeatherForDisplay(gameWeather)}`);
              weatherImpact = formatWeatherForDisplay(gameWeather);
            }
          } catch (weatherError) {
            console.error(`⚠️ Weather fetch failed for ${game.home_team}:`, weatherError);
          }
        }

        const bookmaker = game.bookmakers.find(bm => bm.key === 'draftkings') || game.bookmakers[0];
        const spreadsMarket = bookmaker.markets.find(market => market.key === 'spreads');
        const totalsMarket = bookmaker.markets.find(market => market.key === 'totals');

        const homeSpread = spreadsMarket?.outcomes.find(outcome => outcome.name === game.home_team)?.point || 0;
        const total = totalsMarket?.outcomes[0]?.point || 45;

        let weatherExplanation = '';
        if (gameWeather && !gameWeather.isDome) {
          const homeOffenseAdj = applyWeatherAdjustments(
            gameWeather,
            calculateOffensiveStrength(homeStats),
            calculateDefensiveStrength(awayStats),
            {
              passingYards: homeStats.passingYards,
              rushingYards: homeStats.rushingYards,
              yardsPerPlay: homeStats.yardsPerPlay
            }
          );
          weatherExplanation = homeOffenseAdj.explanation;
        }

        console.log(`⚙️ Running ${SIMULATION_ITERATIONS.toLocaleString()} Monte Carlo simulations${gameWeather && !gameWeather.isDome ? ' with weather adjustments' : ''}...`);
        const simResult = runMonteCarloSimulationWithWeather(
          homeStats,
          awayStats,
          homeSpread,
          total,
          gameWeather
        );
      
        const moneylineProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
        const moneylineConfidence = getConfidenceLevel(moneylineProb);

        const spreadPick = simResult.spreadCoverProbability > 50
          ? `${game.home_team} ${homeSpread > 0 ? '+' : ''}${homeSpread}`
          : `${game.away_team} ${-homeSpread > 0 ? '+' : ''}${-homeSpread}`;
        const spreadProb = Math.max(simResult.spreadCoverProbability, 100 - simResult.spreadCoverProbability);

        const totalPick = simResult.overProbability > 50 ? 'Over' : 'Under';
        const totalProb = Math.max(simResult.overProbability, simResult.underProbability);

        const gameDateTime = new Date(game.commence_time);
        const estOffset = 5 * 60 * 60 * 1000;
        const estDate = new Date(gameDateTime.getTime() - estOffset);
        const formattedDate = estDate.toISOString().split('T')[0];
        
        console.log(`✅ Prediction complete: ${simResult.homeWinProbability > simResult.awayWinProbability ? game.home_team : game.away_team} to win (${moneylineProb.toFixed(1)}%)`);
        logMemory(`After game ${gameIndex + 1}`);
        
        predictions.push({
          game_info: {
            home_team: game.home_team,
            away_team: game.away_team,
            league: 'NFL',
            game_date: formattedDate,
            spread: homeSpread,
            over_under: total,
            home_score: null,
            away_score: null
          },
          prediction: `${simResult.homeWinProbability > simResult.awayWinProbability ? game.home_team : game.away_team} to win`,
          spread_prediction: spreadPick,
          ou_prediction: `${totalPick} ${total}`,
          confidence: mapConfidenceToNumber(moneylineConfidence),
          reasoning: generateReasoning(
            game.home_team,
            game.away_team,
            simResult,
            simResult.homeWinProbability > simResult.awayWinProbability ? game.home_team : game.away_team,
            spreadPick,
            `${totalPick} ${total}`,
            weatherExplanation
          ),
          result: 'pending',
          week: calculateNFLWeek(new Date(game.commence_time)),
          monte_carlo_results: {
            moneyline_probability: moneylineProb,
            spread_probability: spreadProb,
            total_probability: totalProb,
            home_win_probability: simResult.homeWinProbability,
            away_win_probability: simResult.awayWinProbability,
            spread_cover_probability: simResult.spreadCoverProbability,
            over_probability: simResult.overProbability,
            under_probability: simResult.underProbability,
            predicted_home_score: simResult.predictedHomeScore,
            predicted_away_score: simResult.predictedAwayScore
          },
          weather: gameWeather ? {
            temperature: gameWeather.temperature,
            wind_speed: gameWeather.windSpeed,
            condition: gameWeather.condition,
            impact_rating: gameWeather.impactRating,
            description: gameWeather.description
          } : null,
          weather_impact: weatherImpact
        });
      } catch (gameError) {
        const errorMessage = gameError instanceof Error ? gameError.message : String(gameError);
        console.error(`❌ Error processing ${game.away_team} @ ${game.home_team}:`, errorMessage);
        errors.push({
          game: `${game.away_team} @ ${game.home_team}`,
          error: errorMessage
        });
      }
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Generated ${predictions.length} predictions in ${elapsedSeconds}s${errors.length > 0 ? ` (${errors.length} failures)` : ''}`);
    logMemory('Complete');

    return response.status(200).json({
      success: true,
      predictions,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        generated_at: new Date().toISOString(),
        games_attempted: oddsData.length,
        games_processed: predictions.length,
        games_failed: errors.length,
        simulation_iterations: SIMULATION_ITERATIONS,
        execution_time_seconds: elapsedSeconds
      }
    });

  } catch (error) {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Error generating predictions after ${elapsedSeconds}s:`, errorMessage);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return response.status(500).json({
      error: 'Failed to generate predictions',
      details: errorMessage,
      elapsed_seconds: elapsedSeconds,
      timestamp: new Date().toISOString()
    });
  }
}