import { unstable_cache } from 'next/cache';
import type { ConnectivityArc, Position } from '@/lib/map/types';

type LatLng = { lat: number; lng: number };

type DistanceMatrixResponse = {
  rows?: Array<{
    elements?: Array<{
      duration?: { value?: number };
    }>;
  }>;
};

type DirectionsResponse = {
  routes?: Array<{
    overviewPolyline?: { points?: string };
    overview_polyline?: { points?: string };
    geometry?: { coordinates?: number[][] };
  }>;
};

export const FALLBACK_CONNECTIVITY: ConnectivityArc[] = [
  { source: [77.5946, 12.9716], target: [77.6101, 12.9352], travelMinutes: 18 },
  { source: [77.5946, 12.9716], target: [77.5667, 12.9141], travelMinutes: 25 },
  { source: [77.5946, 12.9716], target: [77.6245, 12.9784], travelMinutes: 14 },
];
const FALLBACK_ANCHOR: Position = [77.5946, 12.9716];

const roundTo3 = (value: number) => Number(value.toFixed(3));

function decodePolyline(encoded: string): Position[] {
  const coordinates: Position[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

async function fetchTravelMinutes(origin: LatLng, destination: LatLng, apiKey: string) {
  const url = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${roundTo3(origin.lat)},${roundTo3(origin.lng)}&destinations=${roundTo3(destination.lat)},${roundTo3(destination.lng)}&mode=driving&api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = (await response.json()) as DistanceMatrixResponse;
  const seconds = payload.rows?.[0]?.elements?.[0]?.duration?.value;
  if (typeof seconds !== 'number') return null;
  return Math.max(1, Math.round(seconds / 60));
}

async function fetchRoutePath(origin: LatLng, destination: LatLng, apiKey: string) {
  const url = `https://api.olamaps.io/routing/v1/directions?origin=${roundTo3(origin.lat)},${roundTo3(origin.lng)}&destination=${roundTo3(destination.lat)},${roundTo3(destination.lng)}&mode=driving&overview=full&api_key=${apiKey}`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) return null;

  const payload = (await response.json()) as DirectionsResponse;
  const route = payload.routes?.[0];
  const encodedPolyline = route?.overviewPolyline?.points || route?.overview_polyline?.points;
  if (encodedPolyline) {
    const decoded = decodePolyline(encodedPolyline);
    return decoded.length > 1 ? decoded : null;
  }

  const geometryCoordinates = route?.geometry?.coordinates;
  if (Array.isArray(geometryCoordinates) && geometryCoordinates.length > 1) {
    const normalized = geometryCoordinates
      .map((point) => (Array.isArray(point) && point.length >= 2 ? [point[0], point[1]] as Position : null))
      .filter((point): point is Position => Array.isArray(point));
    return normalized.length > 1 ? normalized : null;
  }

  return null;
}

function localizeFallbackConnectivity(origin: LatLng): ConnectivityArc[] {
  const deltaLng = origin.lng - FALLBACK_ANCHOR[0];
  const deltaLat = origin.lat - FALLBACK_ANCHOR[1];
  return FALLBACK_CONNECTIVITY.map((arc) => ({
    ...arc,
    source: [arc.source[0] + deltaLng, arc.source[1] + deltaLat],
    target: [arc.target[0] + deltaLng, arc.target[1] + deltaLat],
  }));
}

export const fetchConnectivity = unstable_cache(
  async (origin: LatLng, destinations: LatLng[]): Promise<ConnectivityArc[]> => {
    const localizedFallback = localizeFallbackConnectivity(origin);
    try {
      const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY || process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      if (!OLA_MAPS_API_KEY || destinations.length === 0) return localizedFallback;

      const tasks = destinations.map(async (destination) => {
        const [minutesResult, pathResult] = await Promise.allSettled([
          fetchTravelMinutes(origin, destination, OLA_MAPS_API_KEY),
          fetchRoutePath(origin, destination, OLA_MAPS_API_KEY),
        ]);

        const travelMinutes =
          minutesResult.status === 'fulfilled' && typeof minutesResult.value === 'number'
            ? minutesResult.value
            : null;

        if (!travelMinutes) return null;

        return {
          source: [origin.lng, origin.lat] as Position,
          target: [destination.lng, destination.lat] as Position,
          travelMinutes,
          path: pathResult.status === 'fulfilled' ? pathResult.value || undefined : undefined,
        } satisfies ConnectivityArc;
      });

      const settled = await Promise.allSettled(tasks);
      const arcs: ConnectivityArc[] = [];
      for (const result of settled) {
        if (result.status === 'fulfilled' && result.value) {
          arcs.push(result.value);
        }
      }

      return arcs.length > 0 ? arcs : localizedFallback;
    } catch (error) {
      console.error('Failed to fetch connectivity, using fallback', error);
      return localizedFallback;
    }
  },
  ['map-connectivity'],
  { revalidate: 300 }
);
