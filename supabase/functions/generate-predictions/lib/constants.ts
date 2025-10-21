// supabase/functions/generate-predictions/lib/constants.ts
export const SIMULATION_ITERATIONS = 500;

export const WEATHER_CONSTANTS = {
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