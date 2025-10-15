// supabase/functions/generate-predictions/lib/weather/weather-fetcher.ts
import type { GameWeather } from '../types.ts';
import { WEATHER_CONSTANTS } from '../constants.ts';
import { NFL_STADIUMS } from '../team-mappings.ts';
import { calculateWeatherImpact } from './weather-calculator.ts';

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
