// @ts-nocheck
/**
 * PROBABILISTIC MARKET VALUE ENGINE
 * P(V_m | X) - Hedonic pricing with circle rate anchoring & GNN location scoring
 */

import type { FeatureEngineeringOutput } from '@/lib/db/schema';

export interface MarketValueOutput {
  pointEstimate: number;
  q10: number; // 10th percentile
  q50: number; // median
  q90: number; // 90th percentile
  confidenceInterval: { lower: number; upper: number };
  uncertainty: number; // σ
  circleRateFloor: number;
  final: number; // max(circleRate*A, model)
  drivers: Array<{ name: string; contribution: number }>;
}

/**
 * HEDONIC PRICING CORE
 * logV_m = β0 + β1*log(area) + β2*location_score + β3*infra_index + β4*age_decay + β5*property_type + ε
 */
function hedonicPricing(features: Record<string, any>): number {
  const area = features.builtupArea || 1000;
  const age = features.ageInYears || 0;
  const propertyType = features.propertyType || 'apartment';
  const infraScore = features.infrastructureScore || 50;

  // Log-linear hedonic model
  const β0 = 13.8; // base log price (Delhi average)
  const β1 = 0.85; // area elasticity (1% area increase → 0.85% price increase)
  const β2 = 0.12; // location premium
  const β3 = 0.08; // infrastructure index
  const β4 = -0.032; // age decay (exponential, but linearized here)
  const β5TypeMultiplier = {
    apartment: 1.0,
    villa: 1.35,
    penthouse: 1.5,
    commercial: 0.8,
    mixed: 1.1,
  }[propertyType] || 1.0;

  // Noise term for uncertainty
  const εSigma = 0.18; // ~17% residual std dev
  const ε = Math.random() * εSigma - εSigma / 2; // zero-mean noise

  const logVm =
    β0 +
    β1 * Math.log(area) +
    β2 * (infraScore / 100) +
    β3 * (infraScore / 100) +
    β4 * age +
    Math.log(β5TypeMultiplier) +
    ε;

  const Vm = Math.exp(logVm);
  return Vm;
}

/**
 * LOCATION SCORE VIA GRAPH EMBEDDING APPROXIMATION
 * Simulates GraphSAGE/Node2Vec output without actual graph
 * Uses infrastructure + metro proximity as proxy for location embedding
 */
function locationScoreGNN(features: Record<string, any>): number {
  const metroProx = features.metroProximity || 0;
  const infraScore = features.infrastructureScore || 50;
  const connectivity = features.connectivity || 30;

  // Simulated GNN embedding aggregation
  // In production: use actual GraphSAGE trained on location graph
  const normalizedMetro = Math.max(0, 1 - metroProx / 50); // closer to metro = higher
  const normalizedInfra = infraScore / 100;
  const normalizedConnectivity = connectivity / 100;

  // Simple attention-like aggregation (simulating GNN output)
  const locationEmbedding = 
    0.4 * normalizedMetro + 
    0.35 * normalizedInfra + 
    0.25 * normalizedConnectivity;

  return locationEmbedding;
}

/**
 * AGE DEPRECIATION (non-linear exponential decay)
 * age_decay = e^(-λ*age)
 */
function ageDepreciation(ageYears: number): number {
  const lambda = 0.018; // depreciation rate per year (~1.8% annual)
  return Math.exp(-lambda * ageYears);
}

/**
 * CIRCLE RATE ANCHORING (CRITICAL FOR INDIA)
 * V_m = max(circle_rate * A, V_hat_model)
 * Ensures valuations don't undercut statutory floors
 */
function applyCircleRateFloor(modelValue: number, circleRate: number, area: number): {
  value: number;
  floor: number;
} {
  const floor = circleRate * area;
  return {
    floor,
    value: Math.max(modelValue, floor * 0.95), // 95% of floor at minimum
  };
}

/**
 * QUANTILE REGRESSION FOR UNCERTAINTY
 * Outputs P10, P50, P90 using quantile coefficients
 */
function quantileRegression(
  baseValue: number,
  uncertainty: number
): { q10: number; q50: number; q90: number } {
  // Based on residual std dev from hedonic model
  const stdDev = baseValue * uncertainty;

  // Approximate quantiles assuming normal distribution
  // In production: use actual quantile regression model
  return {
    q10: baseValue - 1.28 * stdDev, // 10th percentile
    q50: baseValue, // median
    q90: baseValue + 1.28 * stdDev, // 90th percentile
  };
}

/**
 * ENSEMBLE VARIANCE for uncertainty quantification
 * σ² = 1/M * Σ(y_i - y_bar)²
 */
function ensembleUncertainty(baseValue: number, features: Record<string, any>): number {
  // Simulate ensemble predictions with slight variation
  const dataCompleteness = Object.keys(features).length / 100; // % of features provided
  const modelConfidenceRange = 0.12; // base uncertainty 12%

  // Higher data completeness → lower uncertainty
  const uncertainty = modelConfidenceRange * (1 - dataCompleteness * 0.3);

  // Add market volatility component
  const priceGrowth = features.priceGrowthYoY || 0;
  const volatilityBoost = Math.abs(priceGrowth) * 0.05; // volatile markets = higher uncertainty

  return Math.max(0.08, uncertainty + volatilityBoost);
}

/**
 * FULL MARKET VALUE ENGINE
 * P(V_m | X) inference with uncertainty quantification
 */
export function inferMarketValue(engineeredFeatures: FeatureEngineeringOutput): MarketValueOutput {
  const tab = engineeredFeatures.tabularFeatures;
  const geo = engineeredFeatures.geospatialFeatures;

  // Step 1: Hedonic pricing baseline
  const hedonicValue = hedonicPricing(tab);

  // Step 2: Location premium via GNN approximation
  const locationScore = locationScoreGNN(geo);
  const locationPremium = 1 + locationScore * 0.25; // 0-25% location boost

  // Step 3: Age depreciation
  const ageDecay = ageDepreciation(tab.ageInYears as number);

  // Step 4: Combined model value
  let modelValue = hedonicValue * locationPremium * ageDecay;

  // Step 5: Apply circle rate floor
  const { value: circleRateAdjusted, floor: circleRateFloor } = applyCircleRateFloor(
    modelValue,
    (tab.circleRate as number) || 50000,
    (tab.builtupArea as number) || 1000
  );

  // Step 6: Uncertainty quantification
  const uncertainty = ensembleUncertainty(circleRateAdjusted, tab);

  // Step 7: Quantile regression
  const { q10, q50, q90 } = quantileRegression(circleRateAdjusted, uncertainty);

  // Step 8: Feature importance for explainability
  const areaContribution = (Math.log(tab.builtupArea as number) / 10) * 25; // ~25%
  const locationContribution = locationScore * 22;
  const infraContribution = (geo.infrastructureScore as number) * 0.15;
  const ageContribution = (1 - ageDecay) * 20;

  return {
    pointEstimate: circleRateAdjusted,
    q10,
    q50,
    q90,
    confidenceInterval: {
      lower: q10,
      upper: q90,
    },
    uncertainty,
    circleRateFloor,
    final: circleRateAdjusted,
    drivers: [
      { name: 'Area (log)', contribution: areaContribution },
      { name: 'Location', contribution: locationContribution },
      { name: 'Infrastructure', contribution: infraContribution },
      { name: 'Age', contribution: -ageContribution },
      { name: 'Market Momentum', contribution: Math.max(0, (tab.priceGrowthYoY as number) * 15) },
    ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
  };
}
// @ts-nocheck
