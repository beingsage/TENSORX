import { unstable_cache } from 'next/cache';
import type { IsochroneRing, Position } from '@/lib/map/types';

type LatLng = { lat: number; lng: number };

const roundTo3 = (value: number) => Number(value.toFixed(3));

function circlePoints(center: LatLng, radiusKm: number, count = 24): Position[] {
  const points: Position[] = [];
  const latScale = 111.32;
  const lngScale = 111.32 * Math.cos((center.lat * Math.PI) / 180);

  for (let index = 0; index < count; index += 1) {
    const angle = (2 * Math.PI * index) / count;
    const dLat = (radiusKm * Math.sin(angle)) / latScale;
    const dLng = (radiusKm * Math.cos(angle)) / lngScale;
    points.push([center.lng + dLng, center.lat + dLat]);
  }

  points.push(points[0]);
  return points;
}

export const FALLBACK_ISOCHRONE: IsochroneRing[] = [
  { ring: 'close', color: [0, 100, 255, 180], points: circlePoints({ lat: 12.9716, lng: 77.5946 }, 1) },
  { ring: 'medium', color: [255, 165, 0, 180], points: circlePoints({ lat: 12.9716, lng: 77.5946 }, 3) },
  { ring: 'far', color: [255, 50, 0, 180], points: circlePoints({ lat: 12.9716, lng: 77.5946 }, 8) },
];

type DistanceMatrixResponse = {
  rows?: Array<{
    elements?: Array<{
      duration?: { value?: number };
    }>;
  }>;
};

async function fetchTravelMinutes(origin: LatLng, destination: LatLng, apiKey: string) {
  const url = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${roundTo3(origin.lat)},${roundTo3(origin.lng)}&destinations=${roundTo3(destination.lat)},${roundTo3(destination.lng)}&mode=driving&api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = (await response.json()) as DistanceMatrixResponse;
  const seconds = payload.rows?.[0]?.elements?.[0]?.duration?.value;
  return typeof seconds === 'number' ? Math.max(1, Math.round(seconds / 60)) : null;
}

export const fetchIsochrone = unstable_cache(
  async (origin: LatLng): Promise<IsochroneRing[]> => {
    const localizedFallback: IsochroneRing[] = [
      { ring: 'close', color: [0, 100, 255, 180], points: circlePoints(origin, 1) },
      { ring: 'medium', color: [255, 165, 0, 180], points: circlePoints(origin, 3) },
      { ring: 'far', color: [255, 50, 0, 180], points: circlePoints(origin, 8) },
    ];
    try {
      const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY || process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      if (!OLA_MAPS_API_KEY) return localizedFallback;

      const candidateRadii = [1, 2, 3, 5, 8, 10];
      const sampled = candidateRadii.map((radiusKm) => {
        const points = circlePoints(origin, radiusKm, 16);
        return { radiusKm, point: points[0] };
      });

      const jobs = sampled.map(async ({ radiusKm, point }) => {
        const minutes = await fetchTravelMinutes(
          origin,
          { lat: point[1], lng: point[0] },
          OLA_MAPS_API_KEY
        );
        return { radiusKm, minutes };
      });
      const settled = await Promise.allSettled(jobs);

      const valid = settled
        .filter((result): result is PromiseFulfilledResult<{ radiusKm: number; minutes: number | null }> => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((entry): entry is { radiusKm: number; minutes: number } => typeof entry.minutes === 'number');

      if (valid.length === 0) return localizedFallback;

      const nearestRadiusFor = (targetMinutes: number, fallbackRadius: number) => {
        const sorted = [...valid].sort(
          (a, b) => Math.abs(a.minutes - targetMinutes) - Math.abs(b.minutes - targetMinutes)
        );
        return sorted[0]?.radiusKm || fallbackRadius;
      };

      const closeRadius = nearestRadiusFor(10, 1);
      const mediumRadius = nearestRadiusFor(30, 3);
      const farRadius = nearestRadiusFor(60, 8);

      return [
        { ring: 'close', color: [0, 100, 255, 180], points: circlePoints(origin, closeRadius) },
        { ring: 'medium', color: [255, 165, 0, 180], points: circlePoints(origin, mediumRadius) },
        { ring: 'far', color: [255, 50, 0, 180], points: circlePoints(origin, farRadius) },
      ];
    } catch (error) {
      console.error('Failed to fetch isochrone, using fallback', error);
      return localizedFallback;
    }
  },
  ['map-isochrone'],
  { revalidate: 300 }
);
