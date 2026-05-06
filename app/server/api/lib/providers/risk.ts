import { Position } from '../map/types';

export interface RiskGridPoint {
  position: Position;
  score: number; // 0-100, combined flood + legal
  floodComponent: number;
  legalComponent: number;
}

// Fallback risk grid combining flood risk (60%) and legal complexity (40%)
export const FALLBACK_RISK_GRID: RiskGridPoint[] = [
  {
    position: [77.6245, 12.9352] as Position,
    score: 72, // 60% flood (100) + 40% legal (30)
    floodComponent: 100,
    legalComponent: 30,
  },
  {
    position: [77.6237, 12.9289] as Position,
    score: 64, // 60% flood (80) + 40% legal (40)
    floodComponent: 80,
    legalComponent: 40,
  },
  {
    position: [77.6180, 12.9315] as Position,
    score: 58, // 60% flood (70) + 40% legal (55)
    floodComponent: 70,
    legalComponent: 55,
  },
  {
    position: [77.6290, 12.9420] as Position,
    score: 48, // 60% flood (50) + 40% legal (70)
    floodComponent: 50,
    legalComponent: 70,
  },
  {
    position: [77.6320, 12.9275] as Position,
    score: 44, // 60% flood (40) + 40% legal (60)
    floodComponent: 40,
    legalComponent: 60,
  },
  {
    position: [77.6160, 12.9380] as Position,
    score: 52, // 60% flood (60) + 40% legal (50)
    floodComponent: 60,
    legalComponent: 50,
  },
  {
    position: [77.6280, 12.9260] as Position,
    score: 60, // 60% flood (75) + 40% legal (45)
    floodComponent: 75,
    legalComponent: 45,
  },
  {
    position: [77.6210, 12.9400] as Position,
    score: 56, // 60% flood (65) + 40% legal (52)
    floodComponent: 65,
    legalComponent: 52,
  },
  {
    position: [77.6300, 12.9330] as Position,
    score: 62, // 60% flood (78) + 40% legal (42)
    floodComponent: 78,
    legalComponent: 42,
  },
  {
    position: [77.6160, 12.9290] as Position,
    score: 54, // 60% flood (58) + 40% legal (48)
    floodComponent: 58,
    legalComponent: 48,
  },
];

/**
 * Compute combined risk score from flood and legal components
 * Formula: 0.6 * floodComponent + 0.4 * legalComponent
 */
export function computeRiskScore(floodComponent: number, legalComponent: number): number {
  return Math.min(100, 0.6 * floodComponent + 0.4 * legalComponent);
}

/**
 * Fetch risk grid data for given location
 * Returns combined flood + legal risk scores for visualization
 */
export async function fetchRiskGrid(
  latitude?: number,
  longitude?: number
): Promise<RiskGridPoint[]> {
  // Placeholder for real risk API call
  // In production, would integrate with Ola Maps routing + property registry APIs
  return FALLBACK_RISK_GRID;
}
