import type { TrafficSegment, Position } from '@/api/lib/map/types';

/**
 * Feature 7: Traffic Layer
 * Shows road congestion derived from travel time ratios
 * Congestion = actualTime / freeFlowTime
 * <1.2 = green (free flow), 1.2-1.6 = yellow (moderate), >1.6 = red (heavy)
 */

export const FALLBACK_TRAFFIC: TrafficSegment[] = [
  // MG Road (typically congested during peak hours)
  {
    path: [
      [77.5946, 12.9716],
      [77.6101, 12.9752],
      [77.6200, 12.9800],
    ],
    congestion: 1.8, // Heavy congestion
  },
  // Koramangala to CBD (moderate congestion)
  {
    path: [
      [77.6245, 12.9352],
      [77.6150, 12.9500],
      [77.6100, 12.9650],
    ],
    congestion: 1.4, // Moderate congestion
  },
  // Indiranagar bypass (relatively free flow)
  {
    path: [
      [77.6408, 12.9784],
      [77.6300, 12.9750],
      [77.6200, 12.9700],
    ],
    congestion: 1.0, // Free flow
  },
  // Whitefield tech corridor (moderate to heavy)
  {
    path: [
      [77.7499, 12.9698],
      [77.7300, 12.9500],
      [77.7100, 12.9300],
    ],
    congestion: 1.6, // Heavy congestion
  },
  // Electronic City (variable congestion)
  {
    path: [
      [77.6599, 12.8458],
      [77.6450, 12.8500],
      [77.6300, 12.8550],
    ],
    congestion: 1.3, // Moderate congestion
  },
  // HSR Layout to Market
  {
    path: [
      [77.6003, 12.9641],
      [77.6100, 12.9550],
      [77.6200, 12.9450],
    ],
    congestion: 0.9, // Free flow
  },
];

export type LatLng = { lat: number; lng: number };

/**
 * Estimate congestion from travel time
 * In a real scenario, we would:
 * 1. Fetch actual travel time from Directions API
 * 2. Compare against historical free-flow time or speed limit based estimate
 * 3. Derive congestion ratio
 *
 * For now, return mock traffic based on typical Bengaluru patterns
 */
export async function fetchTraffic(origin: LatLng, center: LatLng): Promise<TrafficSegment[]> {
  try {
    // Placeholder: In production, would query real-time traffic API
    // and derive congestion from duration / distance / speedlimit
    // For now, return fallback
    return FALLBACK_TRAFFIC;
  } catch {
    return FALLBACK_TRAFFIC;
  }
}

/**
 * Compute traffic color from congestion ratio
 * congestion < 1.2 → green (free flow)
 * 1.2 ≤ congestion < 1.6 → yellow (moderate)
 * congestion ≥ 1.6 → red (heavy)
 */
export function trafficColor(congestion: number): [number, number, number, number] {
  if (congestion < 1.2) {
    // Green: free flow
    return [0, 200, 0, 200];
  } else if (congestion < 1.6) {
    // Yellow: moderate congestion
    return [255, 165, 0, 200];
  } else {
    // Red: heavy congestion
    return [255, 0, 0, 200];
  }
}
