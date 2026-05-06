import { unstable_cache } from 'next/cache';
import type { Position, RoadSegment } from '@/lib/map/types';

export const FALLBACK_ROADS = [
  { path: [[77.580, 12.920], [77.600, 12.935], [77.620, 12.950]], width: 3 },
  { path: [[77.590, 12.910], [77.610, 12.930], [77.630, 12.945]], width: 2 },
] satisfies RoadSegment[];
const FALLBACK_ANCHOR: Position = [77.5946, 12.9716];

type LatLngPoint = { lat: number; lng: number };

type NearestRoadsResponse = {
  snappedPoints?: Array<{
    location?: {
      latitude?: number;
      lat?: number;
      longitude?: number;
      lng?: number;
    };
    place?: {
      location?: {
        latitude?: number;
        lat?: number;
        longitude?: number;
        lng?: number;
      };
    };
  }>;
};
type SnappedPoint = NonNullable<NearestRoadsResponse['snappedPoints']>[number];

const roundTo3 = (value: number) => Number(value.toFixed(3));

function parseRoadPoint(point: SnappedPoint): Position | null {
  const location = point.location || point.place?.location;
  if (!location) return null;

  const lat = location.latitude ?? location.lat;
  const lng = location.longitude ?? location.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return [lng, lat];
}

function pointsToRoadSegments(points: Position[]): RoadSegment[] {
  if (points.length < 2) return [];

  const segments: RoadSegment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    segments.push({
      path: [points[index], points[index + 1]],
      width: 3,
    });
  }

  return segments;
}

function localizeFallbackRoads(points: LatLngPoint[]): RoadSegment[] {
  if (points.length === 0) return FALLBACK_ROADS;
  const center = points[Math.floor(points.length / 2)];
  const deltaLng = center.lng - FALLBACK_ANCHOR[0];
  const deltaLat = center.lat - FALLBACK_ANCHOR[1];

  return FALLBACK_ROADS.map((segment) => ({
    ...segment,
    path: segment.path.map((point) => [point[0] + deltaLng, point[1] + deltaLat] as Position),
  }));
}

export const fetchRoads = unstable_cache(
  async (points: LatLngPoint[]): Promise<RoadSegment[]> => {
    const localizedFallback = localizeFallbackRoads(points);
    try {
      const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY || process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      if (!OLA_MAPS_API_KEY || points.length === 0) return localizedFallback;

      const pointsStr = points.map((p) => `${roundTo3(p.lat)},${roundTo3(p.lng)}`).join('|');
      const res = await fetch(`https://api.olamaps.io/routing/v1/nearestRoads?mode=DRIVING&points=${pointsStr}&radius=500&api_key=${OLA_MAPS_API_KEY}`);
      if (!res.ok) return localizedFallback;
      const data = (await res.json()) as NearestRoadsResponse;

      const snapped = (data.snappedPoints || [])
        .map(parseRoadPoint)
        .filter((position): position is Position => Array.isArray(position));
      const segments = pointsToRoadSegments(snapped);
      return segments.length > 0 ? segments : localizedFallback;
    } catch (e) {
      console.error('Failed to fetch roads, using fallback', e);
      return localizedFallback;
    }
  },
  ['map-roads'],
  { revalidate: 86400 } // Cache for 1 day
);
