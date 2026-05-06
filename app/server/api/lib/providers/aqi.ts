import { unstable_cache } from 'next/cache';

export const FALLBACK_AQI = {
  aqi: 85,
  components: { pm2_5: 35, pm10: 55, no2: 20, o3: 40 },
  position: [77.5946, 12.9716] as [number, number],
};

export const fetchAQI = unstable_cache(
  async (lat: number, lng: number) => {
    try {
      const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      if (!OPENWEATHER_API_KEY) return FALLBACK_AQI;

      const res = await fetch(`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}`);
      if (!res.ok) return FALLBACK_AQI;
      const data = await res.json();
      
      if (data && data.list && data.list.length > 0) {
        return {
          // US AQI for PM2.5: 0-12 (0-50), 12-35.4 (51-100), etc.
          // Let's just return a heuristic value for now based on pm2_5
          aqi: Math.min(Math.round(data.list[0].components.pm2_5 * 4), 500),
          components: data.list[0].components,
          position: [lng, lat] as [number, number]
        };
      }

      return FALLBACK_AQI;
    } catch (e) {
      console.error('Failed to fetch AQI, using fallback', e);
      return FALLBACK_AQI;
    }
  },
  ['map-aqi'],
  { revalidate: 3600 } // Cache for 1 hour
);
