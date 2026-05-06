import type { Position } from '@/api/lib/map/types';

/**
 * Feature 10: Flood Risk Layer
 * Identifies flood-prone areas from elevation data
 * Low elevation < 900m = high risk, 900-920m = medium, >920m = low
 * Uses ContourLayer with 3 contour bands
 */

export interface ElevationPoint {
  position: Position;
  elevation: number; // meters
}

/**
 * Fallback elevation data for Bengaluru region
 * Based on known low-elevation zones that are flood-prone
 */
export const FALLBACK_ELEVATION: ElevationPoint[] = [
  // Bellandur Lake area (known flood zone)
  { position: [77.6260, 12.9568], elevation: 880 },
  { position: [77.6300, 12.9600], elevation: 885 },
  // Varthur Lake area (prone to flooding)
  { position: [77.7060, 12.8880], elevation: 890 },
  { position: [77.7100, 12.8920], elevation: 895 },
  // HSR Layout (low elevation)
  { position: [77.6003, 12.9641], elevation: 900 },
  // Indiranagar (moderate elevation)
  { position: [77.6408, 12.9784], elevation: 910 },
  // Whitefield (higher elevation)
  { position: [77.7499, 12.9698], elevation: 925 },
  // Koramangala (moderate to high)
  { position: [77.6245, 12.9352], elevation: 915 },
  // Electronic City (moderate elevation)
  { position: [77.6599, 12.8458], elevation: 905 },
  // MG Road CBD
  { position: [77.5946, 12.9716], elevation: 920 },
  // Outer areas (high elevation)
  { position: [77.5500, 12.8500], elevation: 950 },
  { position: [77.7800, 13.0200], elevation: 940 },
];

/**
 * Compute flood risk from elevation
 * For Bengaluru region, typical thresholds are:
 * < 900m = high risk (red)
 * 900-920m = medium risk (orange/yellow)
 * > 920m = low risk (green)
 */
export function computeFloodRiskScore(elevation: number): number {
  if (elevation < 900) {
    return 100; // High risk
  } else if (elevation < 920) {
    return 50; // Medium risk
  } else {
    return 0; // Low risk
  }
}

/**
 * Fetch elevation data from Ola Maps API
 * In production: POST https://api.olamaps.io/places/v1/elevation
 * For Phase 1: Return mock elevation grid
 */
export async function fetchElevation(_latitude: number, _longitude: number): Promise<ElevationPoint[]> {
  try {
    // Placeholder: In production, would query Ola Maps Elevation API
    // For now, return fallback elevation grid
    return FALLBACK_ELEVATION;
  } catch {
    return FALLBACK_ELEVATION;
  }
}
