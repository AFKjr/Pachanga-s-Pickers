// api/lib/weather/weather-calculator.ts
import { WEATHER_CONSTANTS } from '../constants';
import type { GameWeather } from '../types';

export function calculateWeatherImpact(
  temperature: number,
  windSpeed: number,
  precipitation: number,
  condition: string
): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
  let impactScore = 0;

  if (temperature < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_COLD) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.EXTREME_COLD;
  } else if (temperature < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.FREEZING) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.FREEZING;
  } else if (temperature < WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.COLD) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.COLD;
  } else if (temperature > WEATHER_CONSTANTS.TEMPERATURE_THRESHOLDS.EXTREME_HEAT) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.TEMPERATURE.EXTREME_HEAT;
  }

  if (windSpeed >= WEATHER_CONSTANTS.WIND_THRESHOLDS.EXTREME) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.EXTREME;
  } else if (windSpeed >= WEATHER_CONSTANTS.WIND_THRESHOLDS.HIGH) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.HIGH;
  } else if (windSpeed >= WEATHER_CONSTANTS.WIND_THRESHOLDS.MODERATE) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.MODERATE;
  } else if (windSpeed >= WEATHER_CONSTANTS.WIND_THRESHOLDS.LIGHT) {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.WIND.LIGHT;
  }

  if (condition === 'Snow') {
    impactScore += WEATHER_CONSTANTS.IMPACT_SCORES.PRECIPITATION.SNOW;
  } else if (condition === 'Rain' && precipitation > 50) {
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
