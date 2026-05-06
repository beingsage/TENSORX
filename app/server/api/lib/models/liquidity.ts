/**
 * LIQUIDITY & RESALE MODELING
 * Time-to-sell, distress discount, resale potential
 * [MODEL_TRAINING_REQUIRED] - Survival analysis / Cox regression model
 */

import type { FeatureEngineeringOutput } from '@/lib/db/schema';

export interface LiquidityPrediction {
  estimatedTimeToSell: number; // days
  resalePotentialIndex: number; // 0-100
  distressDiscount: number; // 0-1 (1 = no discount, 0.85 = 15% discount)
  liquidityTier: 'A' | 'B' | 'C'; // A = high, C = low
  flipPotential: number; // 0-100, higher = more upside
  explanation: string;
}

/**
 * MOCK LIQUIDITY INFERENCE
 * In production: Cox regression or survival analysis model
 */
export function predictLiquidity(
  features: FeatureEngineeringOutput
): LiquidityPrediction {
  // [MODEL_TRAINING_REQUIRED]
  // Replace with: loadSurvivalModel('./models/survival_timetosell.pkl')
  
  const tabular = features.tabularFeatures;
  const geospatial = features.geospatialFeatures;
  
  // BASE TIME-TO-SELL calculation
  // Influenced by: absorption rate, connectivity, property type, age
  const absorptionRate = (tabular.absorptionRate as number) || 0.5;
  const connectivity = (tabular.connectivity as number) || 0.5;
  const baseDays = 180; // Default: 6 months
  
  // Absorption multiplier: faster absorption = faster sale
  const absorptionMultiplier = absorptionRate > 0.7 ? 0.6 : absorptionRate > 0.4 ? 0.8 : 1.2;
  
  // Connectivity bonus: good connectivity = faster sale
  const connectivityBonus = 1 - connectivity * 0.3; // 0.7 to 1.0 range
  
  // Property type: apartments faster than villas
  const propertyTypeMultiplier = (tabular.propertyType as string) === 'apartment' ? 0.8 : 1.2;
  
  // Age discount: newer properties sell faster
  const ageMultiplier = 1 + ((tabular.ageInYears as number) || 0) / 100;
  
  // Market momentum: growing markets = faster
  const momentumBonus = ((tabular.priceGrowthYoY as number) || 0) > 0 ? 0.9 : 1.1;
  
  const estimatedTimeToSell = Math.round(
    baseDays * absorptionMultiplier * connectivityBonus * propertyTypeMultiplier * ageMultiplier * momentumBonus
  );
  
  // RESALE POTENTIAL INDEX (0-100)
  // Higher = more investor demand, better resale prospects
  const rentalYield = (tabular.rentalYield as number) || 2;
  const yieldScore = Math.min(100, rentalYield * 15); // 5% yield = 75 score
  
  const infrastructureScore = (geospatial.infrastructureScore as number) || 50;
  const locationScore = Math.min(100, infrastructureScore * 1.2);
  
  const priceGrowth = ((tabular.priceGrowthYoY as number) || 0) + 2; // Assume 2% base growth
  const growthScore = Math.min(100, priceGrowth * 20); // 5% growth = 100 score
  
  const resalePotentialIndex = Math.round((yieldScore * 0.35 + locationScore * 0.35 + growthScore * 0.3));
  
  // DISTRESS DISCOUNT
  // 1.0 = no discount (willing seller)
  // 0.85 = 15% discount (forced liquidation)
  let distressDiscount = 1.0;
  
  // Legal risk increases distress discount
  const legalRisk = (tabular.legalRiskScore as number) || 0;
  distressDiscount -= legalRisk / 500; // Up to 20% discount for high legal risk
  
  // Age increases distress need
  distressDiscount -= ((tabular.ageInYears as number) || 0) / 500;
  
  // Strong market = better distress position
  if (absorptionRate > 0.7) distressDiscount = Math.min(1, distressDiscount + 0.05);
  
  distressDiscount = Math.max(0.7, Math.min(1.0, distressDiscount));
  
  // LIQUIDITY TIER
  const liquidityTier: 'A' | 'B' | 'C' =
    estimatedTimeToSell < 120 && resalePotentialIndex > 70 ? 'A' :
    estimatedTimeToSell < 180 && resalePotentialIndex > 50 ? 'B' : 'C';
  
  // FLIP POTENTIAL (0-100)
  // Probability of property appreciating 15-25% within 3 years
  let flipPotential = 0;
  
  if ((tabular.ageInYears as number) < 5 && priceGrowth > 3) {
    flipPotential = 75 + Math.random() * 25; // New, growing market
  } else if ((tabular.ageInYears as number) < 15 && priceGrowth > 2) {
    flipPotential = 50 + Math.random() * 20;
  } else {
    flipPotential = Math.max(0, priceGrowth * 10);
  }
  
  flipPotential = Math.min(100, flipPotential);
  
  // EXPLANATION
  const explanation =
    liquidityTier === 'A'
      ? `High liquidity. Expected to sell in ${estimatedTimeToSell} days. Strong investor demand (${resalePotentialIndex}/100).`
      : liquidityTier === 'B'
      ? `Moderate liquidity. Expected to sell in ${estimatedTimeToSell} days. Average investor interest.`
      : `Low liquidity. May take ${estimatedTimeToSell}+ days to sell. Limited investor demand.`;
  
  return {
    estimatedTimeToSell,
    resalePotentialIndex,
    distressDiscount,
    liquidityTier,
    flipPotential: Math.round(flipPotential),
    explanation,
  };
}

/**
 * COMPARABLE PROPERTIES MATCHING
 * KNN-based similarity matching for liquidity comps
 */
export function findLiquidityComps(
  features: FeatureEngineeringOutput,
  allProperties: Array<{ features: FeatureEngineeringOutput; actualDaysToSell: number }>
): Array<{ daysToSell: number; similarity: number }> {
  // [MODEL_TRAINING_REQUIRED] - Implement real KNN/similarity matching
  
  // Mock: return random comps
  return [
    { daysToSell: 45, similarity: 0.92 },
    { daysToSell: 67, similarity: 0.88 },
    { daysToSell: 89, similarity: 0.85 },
    { daysToSell: 102, similarity: 0.81 },
    { daysToSell: 134, similarity: 0.78 },
  ];
}
