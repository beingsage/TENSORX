import { unstable_cache } from 'next/cache';
import type { InfrastructurePoi, MetroStation, PoiDensityPoint } from '@/lib/map/types';
import type { Position } from '@/lib/map/types';

export const FALLBACK_METRO_STATIONS = [
  { name: 'MG Road', position: [77.6101, 12.9752] as [number, number] },
  { name: 'Indiranagar', position: [77.6408, 12.9784] as [number, number] },
  { name: 'Koramangala', position: [77.6245, 12.9352] as [number, number] },
  { name: 'Whitefield', position: [77.7499, 12.9698] as [number, number] },
  { name: 'Electronic City', position: [77.6599, 12.8458] as [number, number] },
] satisfies MetroStation[];

export const FALLBACK_INFRASTRUCTURE = [
  { name: 'MG Road Metro', type: 'metro_station', position: [77.6101, 12.9752] as [number, number] },
  { name: 'Manipal Hospital', type: 'hospital', position: [77.6480, 12.9563] as [number, number] },
  { name: 'Baldwin Girls School', type: 'school', position: [77.6003, 12.9641] as [number, number] },
  { name: 'Phoenix MarketCity', type: 'shopping_mall', position: [77.6963, 12.9974] as [number, number] },
] satisfies InfrastructurePoi[];

export const FALLBACK_POIS = [
  { position: [77.6101, 12.9352] as [number, number], weight: 3, type: 'hospital' },
  { position: [77.6245, 12.9716] as [number, number], weight: 2, type: 'school' },
] satisfies PoiDensityPoint[];
const FALLBACK_ANCHOR: Position = [77.5946, 12.9716];

type NearbySearchResponse = {
  predictions?: Array<{
    description?: string;
    name?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

function parsePosition(location?: { lat?: number; lng?: number }): Position | null {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }

  return [location.lng, location.lat];
}

const POI_WEIGHTS: Record<PoiDensityPoint['type'], number> = {
  hospital: 3,
  school: 2,
  shopping_mall: 2,
  park: 1,
};

function offsetPosition(position: Position, lat: number, lng: number): Position {
  return [position[0] + (lng - FALLBACK_ANCHOR[0]), position[1] + (lat - FALLBACK_ANCHOR[1])];
}

function localizeMetroFallback(lat: number, lng: number): MetroStation[] {
  return FALLBACK_METRO_STATIONS.map((station) => ({
    ...station,
    position: offsetPosition(station.position, lat, lng),
  }));
}

function localizeInfrastructureFallback(lat: number, lng: number): InfrastructurePoi[] {
  return FALLBACK_INFRASTRUCTURE.map((poi) => ({
    ...poi,
    position: offsetPosition(poi.position, lat, lng),
  }));
}

function localizePoiFallback(lat: number, lng: number): PoiDensityPoint[] {
  return FALLBACK_POIS.map((poi) => ({
    ...poi,
    position: offsetPosition(poi.position, lat, lng),
  }));
}

export const fetchMetroStations = unstable_cache(
  async (lat: number, lng: number): Promise<MetroStation[]> => {
    const localizedFallback = localizeMetroFallback(lat, lng);
    try {
      const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY || process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      if (!OLA_MAPS_API_KEY) return localizedFallback;

      const res = await fetch(`https://api.olamaps.io/places/v1/nearbysearch?location=${lat},${lng}&types=metro_station&radius=10000&rankBy=popular&api_key=${OLA_MAPS_API_KEY}`);
      if (!res.ok) return localizedFallback;
      const data = (await res.json()) as NearbySearchResponse;
      
      if (data && data.predictions) {
         const stations = data.predictions
           .map((prediction) => {
             const position = parsePosition(prediction.geometry?.location);
             if (!position) return null;
             return {
               name: prediction.description || prediction.name || 'Metro Station',
               position,
             };
           })
           .filter((entry): entry is MetroStation => entry !== null);
         if (stations.length > 0) return stations;
      }

      return localizedFallback;
    } catch (e) {
      console.error('Failed to fetch metro stations, using fallback', e);
      return localizedFallback;
    }
  },
  ['map-metro'],
  { revalidate: 86400 } // Cache for 1 day
);

export const fetchInfrastructure = unstable_cache(
  async (lat: number, lng: number): Promise<InfrastructurePoi[]> => {
    const localizedFallback = localizeInfrastructureFallback(lat, lng);
    try {
      const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY || process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      if (!OLA_MAPS_API_KEY) return localizedFallback;

      const types = ['metro_station', 'hospital', 'school', 'shopping_mall'];
      const promises = types.map(type => 
        fetch(`https://api.olamaps.io/places/v1/nearbysearch?location=${lat},${lng}&types=${type}&radius=5000&rankBy=popular&api_key=${OLA_MAPS_API_KEY}`)
          .then(res => res.json() as Promise<NearbySearchResponse>)
          .then(data =>
            (data.predictions || [])
              .map((prediction) => {
                const position = parsePosition(prediction.geometry?.location);
                if (!position) return null;
                return {
                  name: prediction.description || prediction.name || type,
                  type,
                  position,
                } as InfrastructurePoi;
              })
              .filter((entry): entry is InfrastructurePoi => entry !== null)
          )
      );
      
      const results = await Promise.allSettled(promises);
      const infrastructure: InfrastructurePoi[] = [];
      results.forEach(res => {
        if (res.status === 'fulfilled') {
          infrastructure.push(...res.value);
        }
      });
      
      if (infrastructure.length > 0) return infrastructure;

      return localizedFallback;
    } catch (e) {
      console.error('Failed to fetch infrastructure, using fallback', e);
      return localizedFallback;
    }
  },
  ['map-infra'],
  { revalidate: 86400 } // Cache for 1 day
);

export const fetchPoiDensity = unstable_cache(
  async (lat: number, lng: number): Promise<PoiDensityPoint[]> => {
    const localizedFallback = localizePoiFallback(lat, lng);
    try {
      const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY || process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      if (!OLA_MAPS_API_KEY) return localizedFallback;

      const types: PoiDensityPoint['type'][] = ['school', 'hospital', 'shopping_mall', 'park'];
      const jobs = types.map((type) =>
        fetch(`https://api.olamaps.io/places/v1/nearbysearch?location=${lat},${lng}&types=${type}&radius=10000&rankBy=popular&limit=50&api_key=${OLA_MAPS_API_KEY}`)
          .then((res) => (res.ok ? res.json() as Promise<NearbySearchResponse> : { predictions: [] }))
          .then((payload) =>
            (payload.predictions || [])
              .map((prediction) => {
                const position = parsePosition(prediction.geometry?.location);
                if (!position) return null;
                return {
                  position,
                  weight: POI_WEIGHTS[type],
                  type,
                } satisfies PoiDensityPoint;
              })
              .filter((entry): entry is PoiDensityPoint => entry !== null)
          )
      );

      const settled = await Promise.allSettled(jobs);
      const points: PoiDensityPoint[] = [];
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          points.push(...result.value);
        }
      }

      return points.length > 0 ? points : localizedFallback;
    } catch (error) {
      console.error('Failed to fetch POI density, using fallback', error);
      return localizedFallback;
    }
  },
  ['map-poi-density'],
  { revalidate: 3600 }
);
