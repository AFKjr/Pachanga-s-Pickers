// api/lib/weather/weather-adjustments.ts
import type { GameWeather } from '../types.ts';
import { WEATHER_CONSTANTS } from '../constants.ts';

export interface WeatherAdjustmentResult {
  adjustedOffensiveStrength: number;
  adjustedDefensiveStrength: number;
  passingModifier: number;
  rushingModifier: number;
  explanation: string;
}

export function applyWeatherAdjustments(
  weather: GameWeather | null,
  offensiveStrength: number,
  defensiveStrength: number,
  stats: { passingYards: number; rushingYards: number; yardsPerPlay: number }
): WeatherAdjustmentResult {
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
