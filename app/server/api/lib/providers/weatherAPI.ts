import { fetchEnvironmentalSnapshot } from './openData';
import { clamp } from '@/lib/utils/geo';

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  feelsLike: number;
  airQualityIndex?: number;
}

export interface ClimateHistoricalData {
  avgTemperature: number;
  avgHumidity: number;
  avgPrecipitation: number;
  extremeTemperatures: {
    max: number;
    min: number;
  };
  seasonalPatterns: string;
}

export interface WeatherResult {
  current: WeatherData;
  historical: ClimateHistoricalData;
  alerts: Array<{
    type: string;
    severity: 'low' | 'moderate' | 'high';
    message: string;
  }>;
  source: 'open-meteo' | 'openweather' | 'mixed';
  providers: string[];
}

async function fetchOpenWeatherData(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', latitude.toString());
  url.searchParams.set('lon', longitude.toString());
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', 'metric');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Record<string, any>;

  return {
    temperature: Number(data.main?.temp || 0),
    humidity: Number(data.main?.humidity || 0),
    precipitation: Number(data.rain?.['1h'] || data.rain?.['3h'] || 0),
    windSpeed: Number(data.wind?.speed || 0),
    condition: String(data.weather?.[0]?.main || 'Clear'),
    feelsLike: Number(data.main?.feels_like || data.main?.temp || 0),
  };
}

async function fetchOpenMeteoHistoricalData(
  latitude: number,
  longitude: number
): Promise<ClimateHistoricalData | null> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 59);

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', latitude.toFixed(6));
  url.searchParams.set('longitude', longitude.toFixed(6));
  url.searchParams.set('start_date', startDate.toISOString().slice(0, 10));
  url.searchParams.set('end_date', endDate.toISOString().slice(0, 10));
  url.searchParams.set(
    'daily',
    'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum'
  );
  url.searchParams.set('hourly', 'relative_humidity_2m');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    daily?: Record<string, number[]>;
    hourly?: Record<string, number[]>;
  };

  const meanTemperatures = data.daily?.temperature_2m_mean || [];
  const maxTemperatures = data.daily?.temperature_2m_max || [];
  const minTemperatures = data.daily?.temperature_2m_min || [];
  const precipitation = data.daily?.precipitation_sum || [];
  const humiditySeries = data.hourly?.relative_humidity_2m || [];

  if (
    meanTemperatures.length === 0 &&
    maxTemperatures.length === 0 &&
    minTemperatures.length === 0
  ) {
    return null;
  }

  const average = (values: number[]) =>
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

  const averageTemperature = average(meanTemperatures);
  const averageHumidity = average(humiditySeries);
  const averagePrecipitation = average(precipitation);

  return {
    avgTemperature: Number(averageTemperature.toFixed(1)),
    avgHumidity: Number(averageHumidity.toFixed(1)),
    avgPrecipitation: Number(averagePrecipitation.toFixed(1)),
    extremeTemperatures: {
      max: Number((Math.max(...maxTemperatures, averageTemperature)).toFixed(1)),
      min: Number((Math.min(...minTemperatures, averageTemperature)).toFixed(1)),
    },
    seasonalPatterns:
      averagePrecipitation > 10
        ? 'Monsoon-leaning'
        : averageTemperature > 29
          ? 'Hot and dry'
          : 'Mild seasonal profile',
  };
}

function buildWeatherAlerts(
  current: WeatherData,
  historical: ClimateHistoricalData
): WeatherResult['alerts'] {
  const alerts: WeatherResult['alerts'] = [];

  if (current.airQualityIndex && current.airQualityIndex >= 180) {
    alerts.push({
      type: 'air_quality',
      severity: current.airQualityIndex >= 260 ? 'high' : 'moderate',
      message: `AQI is elevated at ${Math.round(current.airQualityIndex)} around the asset.`,
    });
  }

  if (current.precipitation >= 10) {
    alerts.push({
      type: 'rainfall',
      severity: current.precipitation >= 25 ? 'high' : 'moderate',
      message: `Current precipitation is ${current.precipitation.toFixed(1)} mm and can affect site access.`,
    });
  }

  if (current.feelsLike >= historical.avgTemperature + 6) {
    alerts.push({
      type: 'heat_stress',
      severity: current.feelsLike >= 40 ? 'high' : 'moderate',
      message: `Feels-like temperature is running well above the recent baseline at ${current.feelsLike.toFixed(1)}°C.`,
    });
  }

  if (current.windSpeed >= 14) {
    alerts.push({
      type: 'wind',
      severity: current.windSpeed >= 22 ? 'high' : 'low',
      message: `Surface wind speed is ${current.windSpeed.toFixed(1)} and may affect open-site conditions.`,
    });
  }

  return alerts;
}

export async function fetchAllWeatherData(
  latitude: number,
  longitude: number
): Promise<WeatherResult> {
  const [environmentalSnapshot, openWeatherCurrent, historical] = await Promise.all([
    fetchEnvironmentalSnapshot({ lat: latitude, lng: longitude }),
    fetchOpenWeatherData(latitude, longitude),
    fetchOpenMeteoHistoricalData(latitude, longitude),
  ]);

  const current: WeatherData = openWeatherCurrent || {
    temperature: Number(environmentalSnapshot.weather.temperatureC || 0),
    humidity: 0,
    precipitation: Number(environmentalSnapshot.weather.precipitationMm || 0),
    windSpeed: Number(environmentalSnapshot.weather.windSpeedKph || 0),
    condition:
      (environmentalSnapshot.weather.precipitationMm || 0) > 2
        ? 'Rain'
        : (environmentalSnapshot.weather.temperatureC || 0) >= 33
          ? 'Hot'
          : 'Clear',
    feelsLike: Number(
      environmentalSnapshot.weather.apparentTemperatureC ||
        environmentalSnapshot.weather.temperatureC ||
        0
    ),
    airQualityIndex: environmentalSnapshot.airQuality.usAqi,
  };

  if (!openWeatherCurrent) {
    current.airQualityIndex = environmentalSnapshot.airQuality.usAqi;
  }

  const normalizedHistorical =
    historical || {
      avgTemperature: Number(current.temperature.toFixed(1)),
      avgHumidity: 52,
      avgPrecipitation: Number(current.precipitation.toFixed(1)),
      extremeTemperatures: {
        max: Number((current.temperature + 4).toFixed(1)),
        min: Number((current.temperature - 5).toFixed(1)),
      },
      seasonalPatterns: current.precipitation > 8 ? 'Monsoon-leaning' : 'Stable seasonal profile',
    };

  const providers = ['Open-Meteo'];
  if (openWeatherCurrent) {
    providers.unshift('OpenWeather');
  }

  return {
    current,
    historical: normalizedHistorical,
    alerts: buildWeatherAlerts(current, normalizedHistorical),
    source: openWeatherCurrent ? 'mixed' : 'open-meteo',
    providers,
  };
}
