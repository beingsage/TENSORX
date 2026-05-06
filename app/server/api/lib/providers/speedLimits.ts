import type { Position } from '@/api/lib/map/types';

/**
 * Feature 8: Speed Limit Layer
 * Shows road efficiency via speed limits
 * Color mapping: ≤30kmh=red, 60kmh=yellow, ≥80kmh=green
 */

export interface SpeedLimitSegment {
  path: Position[];
  speedKmh: number;
}

export const FALLBACK_SPEED_LIMITS: SpeedLimitSegment[] = [
  // MG Road (urban, lower speed limits)
  {
    path: [
      [77.5946, 12.9716],
      [77.6101, 12.9752],
      [77.6200, 12.9800],
    ],
    speedKmh: 40,
  },
  // Koramangala to CBD (mixed urban)
  {
    path: [
      [77.6245, 12.9352],
      [77.6150, 12.9500],
      [77.6100, 12.9650],
    ],
    speedKmh: 50,
  },
  // Indiranagar bypass (highway-like, higher speed)
  {
    path: [
      [77.6408, 12.9784],
      [77.6300, 12.9750],
      [77.6200, 12.9700],
    ],
    speedKmh: 80,
  },
  // Whitefield tech corridor (varied)
  {
    path: [
      [77.7499, 12.9698],
      [77.7300, 12.9500],
      [77.7100, 12.9300],
    ],
    speedKmh: 70,
  },
  // Electronic City approach (moderate)
  {
    path: [
      [77.6599, 12.8458],
      [77.6450, 12.8500],
      [77.6300, 12.8550],
    ],
    speedKmh: 60,
  },
  // HSR Layout to Market (urban slow)
  {
    path: [
      [77.6003, 12.9641],
      [77.6100, 12.9550],
      [77.6200, 12.9450],
    ],
    speedKmh: 30,
  },
  // Outer Ring Road (highway speed)
  {
    path: [
      [77.5500, 12.8500],
      [77.5700, 12.8300],
      [77.5900, 12.8100],
    ],
    speedKmh: 100,
  },
];

/**
 * Compute speed limit color
 * ≤30kmh → red (very restrictive)
 * 30-60kmh → yellow/orange (moderate)
 * ≥80kmh → green (highway speed)
 */
export function speedColor(speedKmh: number): [number, number, number, number] {
  if (speedKmh <= 30) {
    // Red: very restrictive urban speed
    return [255, 0, 0, 200];
  } else if (speedKmh <= 60) {
    // Yellow: moderate urban speed
    return [255, 165, 0, 200];
  } else if (speedKmh <= 90) {
    // Light green: good speed
    return [173, 255, 47, 200];
  } else {
    // Bright green: highway speed
    return [0, 255, 0, 200];
  }
}

/**
 * Fetch speed limits from Ola Maps API
 * In production: POST https://api.olamaps.io/routing/v1/speedLimits
 * For Phase 1: Return mock speed limits
 */
export async function fetchSpeedLimits(_latitude: number, _longitude: number): Promise<SpeedLimitSegment[]> {
  try {
    // Placeholder: In production, would query real Ola Maps Speed Limits API
    // For now, return fallback
    return FALLBACK_SPEED_LIMITS;
  } catch {
    return FALLBACK_SPEED_LIMITS;
  }
}
