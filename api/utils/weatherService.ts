// api/utils/weatherService.ts
// Serverless-compatible weather service for NFL predictions
// Node.js environment only - no browser APIs

// ============================================================================
// CONSTANTS (inlined for serverless environment)
// ============================================================================

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

// ============================================================================
// TYPES
// ============================================================================

export interface WeatherConditions {
  temperature: number; // Fahrenheit
  windSpeed: number; // mph
  precipitation: number; // % chance
  condition: string; // "Clear", "Rain", "Snow", "Cloudy"
  humidity: number; // %
  description: string; // Human readable
}

export interface GameWeather extends WeatherConditions {
  gameId: string;
  stadium: string;
  isDome: boolean;
  impactRating: 'none' | 'low' | 'medium' | 'high' | 'extreme';
}

// ============================================================================
// NFL STADIUMS DATA
// ============================================================================

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
// WEATHER FETCHING
// ============================================================================

export async function fetchGameWeather(
  homeTeam: string,
  gameDateTime: string,
  apiKey: string
): Promise<GameWeather | null> {
  const stadium = NFL_STADIUMS[homeTeam];

  if (!stadium) {
    console.warn(`No stadium data for ${homeTeam}`);
    return null;
  }

  // Dome games have no weather impact
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
    // Calculate hours from now to game time
    const gameDate = new Date(gameDateTime);
    const now = new Date();
    const hoursUntilGame = Math.floor((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    let weatherData;

    // Use forecast API if game is within 5 days (120 hours)
    if (hoursUntilGame > 0 && hoursUntilGame <= WEATHER_CONSTANTS.FORECAST_HOURS_THRESHOLD) {
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${stadium.lat}&lon=${stadium.lon}&appid=${apiKey}&units=imperial`;
      const forecastResponse = await fetch(forecastUrl);

      if (!forecastResponse.ok) {
        throw new Error(`Weather API error: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();

      // Find closest forecast to game time
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
      // Use current weather API for games happening now or historical data
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

// ============================================================================
// WEATHER IMPACT CALCULATION
// ============================================================================

function calculateWeatherImpact(
  temp: number,
  wind: number,
  precip: number,
  condition: string
): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
  let impactScore = 0;

  // Temperature impact
  if (temp < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_COLD) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.EXTREME_COLD;
  } else if (temp < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.FREEZING) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.FREEZING;
  } else if (temp < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.COLD) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.COLD;
  } else if (temp > WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_HEAT) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.EXTREME_HEAT;
  }

  // Wind impact (most critical for passing)
  if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.EXTREME) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.EXTREME;
  } else if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.HIGH) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.HIGH;
  } else if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.MODERATE) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.MODERATE;
  } else if (wind >= WEATHER_CONSTANTS.WIND_THRESHOLDS.LIGHT) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.LIGHT;
  }

  // Precipitation impact
  if (condition === 'Snow') {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.PRECIPITATION.SNOW;
  } else if (condition === 'Rain' && precip > 50) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.PRECIPITATION.HEAVY_RAIN;
  } else if (condition === 'Rain') {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.PRECIPITATION.RAIN;
  }

  // Map score to rating
  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.EXTREME) return 'extreme';
  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.HIGH) return 'high';
  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.MEDIUM) return 'medium';
  if (impactScore >= WEATHER_CONSTANTS.IMPACT_RATING_THRESHOLDS.LOW) return 'low';
  return 'none';
}

// ============================================================================
// WEATHER ADJUSTMENTS
// ============================================================================

export function applyWeatherAdjustments(
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

  // Wind affects passing significantly
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

  // Cold weather
  if (weather.temperature < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_COLD) {
    passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.EXTREME_COLD;
    rushingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.RUSHING.EXTREME_COLD;
    adjustments.push(`Extreme cold (${weather.temperature}°F) affects ball handling`);
  } else if (weather.temperature < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.FREEZING) {
    passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.FREEZING;
    adjustments.push(`Freezing temps (${weather.temperature}°F) reduce passing accuracy`);
  }

  // Snow
  if (weather.condition === 'Snow') {
    passingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.PASSING.SNOW;
    rushingModifier *= WEATHER_CONSTANTS.WEATHER_MODIFIERS.RUSHING.SNOW;
    adjustments.push('Snow conditions significantly impact both offense types');
  }

  // Rain
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

  // Calculate adjusted offensive strength
  const totalYards = stats.passingYards + stats.rushingYards;
  const passRatio = stats.passingYards / totalYards;
  const rushRatio = stats.rushingYards / totalYards;

  const overallOffensiveModifier = (passingModifier * passRatio) + (rushingModifier * rushRatio);
  const adjustedOffensiveStrength = offensiveStrength * overallOffensiveModifier;

  // Defense slightly benefits from bad weather
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

// ============================================================================
// DISPLAY FORMATTING
// ============================================================================

export function formatWeatherForDisplay(weather: GameWeather | null): string {
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