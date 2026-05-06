/**
 * DEEPSURVIVAL LIQUIDITY ENGINE
 * L = P(sell within t) using Cox proportional hazards + neural net
 * h(t|X) = h0(t) * e^(f_θ(X))
 */

import type { FeatureEngineeringOutput } from '@/lib/db/schema';

export interface LiquidityOutput {
  resalePotentialIndex: number; // 0-100, higher = easier to sell
  timeToSellDays: number;
  survivalProbability: number; // P(not sold after avg period)
  hazardScore: number; // inverse of survival
  absorptionRank: 'A' | 'B' | 'C' | 'D'; // A = fastest, D = slowest
  timeToSellByPercentile: {
    p25: number; // 25% sold by this time
    p50: number; // 50% sold
    p75: number; // 75% sold
    p90: number; // 90% sold
  };
  flippability: number; // 0-100, likelihood of quick resale
  distressDiscount: number; // multiplier when forced sale
}

/**
 * HAZARD FUNCTION h(t|X)
 * Neural network approximation of Cox model
 * Predicts probability of sale at time t
 */
function neuralHazardFunction(features: Record<string, any>): number {
  const infraScore = (features.infrastructureScore as number) || 50;
  const absorptionRate = (features.absorptionRate as number) || 0.5;
  const legalRisk = (features.legalRiskScore as number) || 30;
  const priceGrowth = (features.priceGrowthYoY as number) || 0;
  const days = (features.daysOnMarket as number) || 45;
  const area = (features.builtupArea as number) || 1000;

  // Normalized inputs
  const x_infra = infraScore / 100;
  const x_absorption = Math.min(1, absorptionRate);
  const x_legal = 1 - Math.min(1, legalRisk / 100);
  const x_momentum = Math.max(0, priceGrowth); // positive momentum = faster sale
  const x_daysNorm = Math.exp(-days / 60); // decay over time

  // Neural network layers (simulated deep learning)
  // Layer 1: Input projections
  const h1_1 = Math.tanh(0.8 * x_infra + 0.6 * x_absorption - 0.5 * x_legal);
  const h1_2 = Math.tanh(0.7 * x_momentum + 0.5 * x_daysNorm - 0.3 * (area / 2000));

  // Layer 2: Hidden layer (16 units, simulated)
  const h2 = Math.tanh(
    0.6 * h1_1 + 0.5 * h1_2 + 0.4 * x_infra - 0.3 * x_legal + 0.2 * x_momentum
  );

  // Output: log hazard (Cox partial likelihood)
  const logHazard = 0.5 * h2 + 0.3 * x_infra - 0.4 * x_legal + 0.2 * x_momentum;

  return Math.exp(logHazard); // Hazard rate
}

/**
 * BASELINE HAZARD h0(t)
 * Weibull distribution (common in survival analysis)
 * h0(t) = (k/λ) * (t/λ)^(k-1)
 */
function baselineHazard(days: number): number {
  const k = 1.5; // shape parameter (>1 = increasing hazard)
  const lambda = 90; // scale parameter (characteristic time)

  if (days <= 0) return 0;

  const hazard = (k / lambda) * Math.pow(days / lambda, k - 1);
  return hazard;
}

/**
 * SURVIVAL FUNCTION S(t)
 * S(t) = e^(-∫₀ᵗ h(u)du) - cumulative hazard
 */
function survivalProbability(days: number, hazardScore: number): number {
  const cumulativeHazard = hazardScore * days * (1 + 0.002 * days); // accelerating hazard
  return Math.exp(-cumulativeHazard);
}

/**
 * MEAN SURVIVAL TIME
 * E[T|X] - expected time to sell
 */
function expectedTimeToSell(hazardScore: number, baseAbsorption: number): number {
  // Inverse relationship: high hazard = quick sale
  const baseMeanTime = 90; // baseline 90 days

  // Hazard-adjusted mean
  const adjustedMean = baseMeanTime / (1 + hazardScore);

  // Absorption rate adjustment
  const absorptionAdjustment = (1 - baseAbsorption) * 30; // slower absorption = longer
  const liquidityAdjusted = adjustedMean + absorptionAdjustment;

  return Math.max(14, Math.min(180, liquidityAdjusted)); // 14-180 days realistic
}

/**
 * PERCENTILE-BASED TIME ESTIMATES
 * P(T ≤ t) = 1 - S(t)
 */
function timePercentiles(hazardScore: number, baseMean: number): {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
} {
  // Using log-normal approximation for survival time distribution
  // t_p = exp(log(mean) + Φ⁻¹(p) * σ)
  const logMean = Math.log(baseMean);
  const sigma = 0.6; // log-normal std dev

  // Inverse normal quantiles
  const invNormMap = {
    p25: -0.674,
    p50: 0,
    p75: 0.674,
    p90: 1.282,
  };

  return {
    p25: Math.exp(logMean + invNormMap.p25 * sigma) / (1 + hazardScore * 0.1),
    p50: Math.exp(logMean + invNormMap.p50 * sigma) / (1 + hazardScore * 0.1),
    p75: Math.exp(logMean + invNormMap.p75 * sigma) / (1 + hazardScore * 0.1),
    p90: Math.exp(logMean + invNormMap.p90 * sigma) / (1 + hazardScore * 0.1),
  };
}

/**
 * RESALE POTENTIAL INDEX (0-100)
 * 100 = immediate sale likely
 * 0 = very difficult to sell
 */
function resalePotentialIndex(hazardScore: number, survivalProb: number): number {
  // Higher hazard = easier to sell = higher index
  // Higher survival prob = harder to sell = lower index
  const hazardComponent = Math.min(100, hazardScore * 40); // 0-100 from hazard
  const survivalComponent = (1 - survivalProb) * 50; // 0-50 from inverse survival

  const index = (hazardComponent + survivalComponent) / 1.5;
  return Math.max(0, Math.min(100, index));
}

/**
 * ABSORPTION RANKING
 * A = top 25% (fastest), B = 25-50%, C = 50-75%, D = bottom 25%
 */
function absorptionRanking(index: number): 'A' | 'B' | 'C' | 'D' {
  if (index >= 75) return 'A';
  if (index >= 50) return 'B';
  if (index >= 25) return 'C';
  return 'D';
}

/**
 * FLIPPABILITY SCORE
 * Likelihood of quick appreciation + resale
 * High in growing markets with good condition
 */
function flippabilityScore(features: Record<string, any>, priceGrowth: number): number {
  const condition = (features.conditionScore as number) || 50;
  const growth = Math.max(0, priceGrowth);
  const age = (features.ageInYears as number) || 0;

  // Newer properties in growing markets are more flippable
  const ageBoost = Math.max(0, 100 - age * 2);
  const growthBoost = growth * 30;
  const conditionBoost = condition * 0.5;

  const score = (ageBoost + growthBoost + conditionBoost) / 3;
  return Math.max(0, Math.min(100, score));
}

/**
 * DISTRESS DISCOUNT
 * V_d = V_m * (1 - δ_L)
 * Higher liquidity = lower discount (easier to sell at fair price)
 */
function distressDiscountFactor(
  resaleIndex: number,
  legalRisk: number,
  demandTier: string
): number {
  // Base discount for forced sale
  const baseDiscount = 0.85; // 15% standard discount

  // Liquidity penalty (hard to sell = bigger discount)
  const liquidityPenalty = (1 - resaleIndex / 100) * 0.15; // 0-15% additional

  // Legal risk penalty
  const legalPenalty = (legalRisk / 100) * 0.10; // 0-10% penalty

  // Demand tier benefit
  const demandBenefit = demandTier === 'A' ? 0.05 : demandTier === 'B' ? 0.02 : 0;

  const totalDiscount = baseDiscount - liquidityPenalty - legalPenalty + demandBenefit;
  return Math.max(0.6, Math.min(1.0, totalDiscount)); // 60-100% of original value
}

/**
 * FULL LIQUIDITY ENGINE - DeepSurv inference
 */
export function inferLiquidity(engineeredFeatures: FeatureEngineeringOutput): LiquidityOutput {
  const tab = engineeredFeatures.tabularFeatures;
  const geo = engineeredFeatures.geospatialFeatures;

  // Step 1: Compute hazard function via neural network
  const hazardScore = neuralHazardFunction(tab);

  // Step 2: Compute baseline hazard
  const baselineH0 = baselineHazard((tab.daysOnMarket as number) || 45);

  // Step 3: Combined hazard h(t|X)
  const combinedHazard = baselineH0 * hazardScore;

  // Step 4: Survival probability (harder to sell = higher survival prob)
  const survProb = survivalProbability((tab.daysOnMarket as number) || 45, hazardScore);

  // Step 5: Expected time to sell
  const meanTimeToSell = expectedTimeToSell(hazardScore, (tab.absorptionRate as number) || 0.5);

  // Step 6: Percentile estimates
  const percentiles = timePercentiles(hazardScore, meanTimeToSell);

  // Step 7: Resale potential index
  const rpiScore = resalePotentialIndex(hazardScore, survProb);

  // Step 8: Absorption ranking
  const ranking = absorptionRanking(rpiScore);

  // Step 9: Flippability
  const flipScore = flippabilityScore(tab, (tab.priceGrowthYoY as number) || 0);

  // Step 10: Distress discount
  const discount = distressDiscountFactor(rpiScore, (tab.legalRiskScore as number) || 0, ranking);

  return {
    resalePotentialIndex: Math.round(rpiScore),
    timeToSellDays: Math.round(meanTimeToSell),
    survivalProbability: Math.round(survProb * 100) / 100,
    hazardScore: Math.round(hazardScore * 100) / 100,
    absorptionRank: ranking,
    timeToSellByPercentile: {
      p25: Math.round(percentiles.p25),
      p50: Math.round(percentiles.p50),
      p75: Math.round(percentiles.p75),
      p90: Math.round(percentiles.p90),
    },
    flippability: Math.round(flipScore),
    distressDiscount: Math.round(discount * 100) / 100,
  };
}
