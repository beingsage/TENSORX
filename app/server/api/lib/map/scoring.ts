export function computeLivabilityScore(input: {
  poiCount: number;         // nearby schools + hospitals + parks (capped at 20)
  avgTravelMinutes: number; // average minutes to nearest 3 destinations
  greenCoverPct: number;    // 0–1, fraction of area that is green
}): number {
  const poiScore = Math.min(input.poiCount / 20, 1) * 40;
  const travelScore = Math.max(0, 1 - input.avgTravelMinutes / 60) * 40;
  const greenScore = input.greenCoverPct * 20;
  return Math.round(poiScore + travelScore + greenScore);
}

export function computeLiquidityScore(input: {
  avgTravelMinutes: number;  // to city center — lower = more liquid
  poiCount: number;          // amenity density — higher = more liquid
  valueScore: number;        // 0–100 — high value areas tend to be liquid
}): number {
  const accessScore = Math.max(0, 1 - input.avgTravelMinutes / 90) * 40;
  const amenityScore = Math.min(input.poiCount / 20, 1) * 30;
  const valueBonus = (input.valueScore / 100) * 30;
  return Math.round(accessScore + amenityScore + valueBonus);
}

export function computeRiskScore(input: {
  floodRisk: number;   // 0–100, from elevation data
  legalRisk: number;   // 0–100, mocked in Phase 1
}): number {
  return Math.round(input.floodRisk * 0.6 + input.legalRisk * 0.4);
}

export function computeBestBuyScore(input: {
  valueScore: number;      // 0–100, higher = undervalued (inverted from price)
  liquidityScore: number;  // 0–100, higher = easier to sell
  riskScore: number;       // 0–100, higher = MORE risk (inverted below)
  livabilityScore: number; // 0–100, higher = better amenities
}): number {
  return Math.round(
    input.valueScore * 0.35 +
    input.liquidityScore * 0.25 +
    (100 - input.riskScore) * 0.20 +
    input.livabilityScore * 0.20
  );
}
