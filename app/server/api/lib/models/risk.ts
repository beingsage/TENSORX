/**
 * RISK ASSESSMENT & SCORING
 * 15+ risk dimensions for credit risk evaluation
 * Outputs risk flags with severity levels
 */

import type { FeatureEngineeringOutput } from '@/lib/db/schema';

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface RiskFlag {
  type: string;
  severity: RiskSeverity;
  score: number; // 0-100
  impact: number; // 0-1, impact on LTV/valuation
  description: string;
  recommendation: string;
}

export interface RiskAssessment {
  overallRiskScore: number; // 0-100
  overallRiskTier: 'A' | 'B' | 'C' | 'D'; // A = safest, D = highest risk
  riskFlags: RiskFlag[];
  ltv: number; // Loan-to-value ratio
  maxSafeLTV: number; // Recommended LTV cap
  stressTestLTV: { // LTV after 10%, 20%, 30% market downturn
    downturn10pct: number;
    downturn20pct: number;
    downturn30pct: number;
  };
}

/**
 * COMPREHENSIVE RISK ASSESSMENT
 */
export function assessRisk(
  features: FeatureEngineeringOutput,
  valuationAmount: number
): RiskAssessment {
  const flags: RiskFlag[] = [];
  const tabular = features.tabularFeatures;
  const riskScores = (features as any).riskScores || {};
  
  // ============ PROPERTY-LEVEL RISKS ============
  
  // 1. AGE & DEPRECIATION
  const ageRisk = (riskScores.ageDepreciation as number) || 0;
  if (ageRisk > 50) {
    flags.push({
      type: 'AGE_DEPRECIATION',
      severity: ageRisk > 80 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
      score: ageRisk,
      impact: 0.1,
      description: `Property is ${tabular.ageInYears} years old. High depreciation risk.`,
      recommendation: 'Consider lower LTV for older properties. Structural inspection recommended.',
    });
  }
  
  // 2. LEGAL/TITLE RISK
  const legalRisk = (tabular.legalRiskScore as number) || 0;
  if (legalRisk > 40) {
    flags.push({
      type: 'LEGAL_TITLE',
      severity: legalRisk > 70 ? RiskSeverity.CRITICAL : legalRisk > 50 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
      score: legalRisk,
      impact: legalRisk > 70 ? 0.25 : legalRisk > 50 ? 0.15 : 0.08,
      description: `Title/legal complexity score: ${legalRisk}/100. Court disputes or unclear ownership possible.`,
      recommendation: 'Conduct full legal audit. Consider title insurance. May require legal clearance certificate.',
    });
  }
  
  // 3. LTV (Loan-to-Value) RISK
  const ltv = (tabular.ltvRatio as number) || 0.5;
  if (ltv > 0.80) {
    flags.push({
      type: 'LTV_BREACH',
      severity: ltv > 0.95 ? RiskSeverity.CRITICAL : ltv > 0.85 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
      score: Math.min(100, ltv * 100),
      impact: 0.2,
      description: `LTV ratio: ${(ltv * 100).toFixed(1)}%. Exceeds recommended 75% threshold.`,
      recommendation: 'Reduce loan amount or increase collateral valuation. Higher haircut required.',
    });
  }
  
  // 4. LIQUIDITY RISK
  const liquidityRisk = (riskScores.daysToSellRisk as number) || 0;
  if (liquidityRisk > 60) {
    flags.push({
      type: 'LIQUIDITY_RISK',
      severity: liquidityRisk > 80 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
      score: liquidityRisk,
      impact: 0.15,
      description: `Time-to-sell estimate: ${tabular.daysOnMarket} days. Property may be hard to liquidate.`,
      recommendation: 'Strong due diligence on market demand. Plan for extended liquidation timeline.',
    });
  }
  
  // 5. MARKET DOWNTURN SENSITIVITY
  const marketDownturnRisk = (riskScores.marketDownturnExposure as number) || 0;
  if (marketDownturnRisk > 60) {
    flags.push({
      type: 'MARKET_SENSITIVITY',
      severity: marketDownturnRisk > 80 ? RiskSeverity.MEDIUM : RiskSeverity.LOW,
      score: marketDownturnRisk,
      impact: 0.1,
      description: `Market is cooling (${tabular.priceGrowthYoY}% YoY). High sensitivity to downturn.`,
      recommendation: 'Stress test LTV at 10-20% market decline. Conservative pricing recommended.',
    });
  }
  
  // 6. RARE PROPERTY TYPE
  const propertyType = tabular.propertyType as string;
  if (['villa', 'commercial', 'industrial'].includes(propertyType.toLowerCase())) {
    flags.push({
      type: 'ASSET_SPECIFICITY',
      severity: RiskSeverity.MEDIUM,
      score: 65,
      impact: 0.12,
      description: `Rare property type: ${propertyType}. Harder to liquidate.`,
      recommendation: 'Niche market. Ensure strong buyer pool. Consider specialty auctioneers.',
    });
  }
  
  // ============ LOCATION & MARKET RISKS ============
  
  // 7. LOCATION DEVELOPMENT RISK
  const locationRisk = (riskScores.locationDevelopmentRisk as number) || 0;
  if (locationRisk > 60) {
    flags.push({
      type: 'LOCATION_RISK',
      severity: locationRisk > 80 ? RiskSeverity.MEDIUM : RiskSeverity.LOW,
      score: locationRisk,
      impact: 0.08,
      description: 'Location development uncertain. Infrastructure/connectivity may decline.',
      recommendation: 'Monitor local development plans. Re-evaluate annually.',
    });
  }
  
  // 8. DENSITY BUBBLE RISK
  const densityRisk = (riskScores.densityBubbleRisk as number) || 0;
  if (densityRisk > 70) {
    flags.push({
      type: 'DENSITY_BUBBLE',
      severity: RiskSeverity.MEDIUM,
      score: densityRisk,
      impact: 0.12,
      description: 'Micromarket is over-supplied. May face downward price pressure.',
      recommendation: 'Exercise caution. Strong buyer demand verification needed.',
    });
  }
  
  // 9. ENVIRONMENTAL/NATURAL DISASTER
  const floodRisk = (riskScores.floodVulnerability as number) || 0;
  const earthquakeRisk = (riskScores.earthquakeRisk as number) || 0;
  const envRisk = Math.max(floodRisk, earthquakeRisk);
  if (envRisk > 40) {
    flags.push({
      type: 'ENVIRONMENTAL_HAZARD',
      severity: envRisk > 70 ? RiskSeverity.HIGH : envRisk > 50 ? RiskSeverity.MEDIUM : RiskSeverity.LOW,
      score: envRisk,
      impact: 0.15,
      description: `Flood vulnerability: ${floodRisk}/100. Earthquake risk: ${earthquakeRisk}/100.`,
      recommendation: 'Mandatory property insurance. Structural assessment for hazard-prone areas.',
    });
  }
  
  // 10. POLLUTION/NUISANCE
  const pollutionRisk = (riskScores.pollutionExposure as number) || 0;
  if (pollutionRisk > 60) {
    flags.push({
      type: 'POLLUTION_RISK',
      severity: RiskSeverity.LOW,
      score: pollutionRisk,
      impact: 0.08,
      description: 'Location has pollution/noise exposure. May impact resale value.',
      recommendation: 'Health and environmental assessment. Insurance considerations.',
    });
  }
  
  // ============ FINANCIAL/INCOME RISKS ============
  
  // 11. RENTAL YIELD INSUFFICIENCY
  const rentalYield = (tabular.rentalYield as number) || 0;
  if (rentalYield < 3) {
    flags.push({
      type: 'YIELD_INSUFFICIENCY',
      severity: rentalYield < 2 ? RiskSeverity.MEDIUM : RiskSeverity.LOW,
      score: 100 - rentalYield * 30,
      impact: 0.08,
      description: `Rental yield: ${rentalYield.toFixed(2)}%. Below market benchmark (3-5%).`,
      recommendation: 'Investor appeal limited. Focus on capital appreciation strategy.',
    });
  }
  
  // 12. OCCUPANCY RISK
  const occupancyStatus = tabular.occupancyStatus as string;
  if (occupancyStatus === 'unoccupied') {
    flags.push({
      type: 'OCCUPANCY_RISK',
      severity: RiskSeverity.MEDIUM,
      score: 70,
      impact: 0.12,
      description: 'Property is unoccupied. No rental income or usage data.',
      recommendation: 'Demand rental comps validation. Consider carrying cost in stress tests.',
    });
  }
  
  // 13. REGULATORY RISK
  const propertyTaxArrears = 0; // Would come from enrichment
  if (propertyTaxArrears > 0) {
    flags.push({
      type: 'REGULATORY_COMPLIANCE',
      severity: RiskSeverity.MEDIUM,
      score: 75,
      impact: 0.1,
      description: 'Property tax arrears exist. May block title transfer.',
      recommendation: 'Clear all dues before disbursement. Get NOC from municipality.',
    });
  }
  
  // 14. DEVELOPER/CONSTRUCTION RISK
  if ((tabular.propertyType as string)?.toLowerCase() === 'underconstruction') {
    flags.push({
      type: 'CONSTRUCTION_RISK',
      severity: RiskSeverity.HIGH,
      score: 80,
      impact: 0.2,
      description: 'Property is under construction. Completion risk present.',
      recommendation: 'Verify builder track record. Demand RERA registration. Completion guarantees.',
    });
  }
  
  // 15. FREEHOLDLEASEHOLD RISK
  if (!(tabular.isFreehold as boolean)) {
    flags.push({
      type: 'LEASEHOLD_RISK',
      severity: RiskSeverity.LOW,
      score: 40,
      impact: 0.05,
      description: 'Property is leasehold. Lease period and renewal terms matter.',
      recommendation: 'Verify remaining lease period (should be >30 years). Renewal process.',
    });
  }
  
  // ============ AGGREGATE RISK SCORING ============
  
  const overallRiskScore = flags.length === 0
    ? 20 // Base low risk
    : Math.min(
        100,
        20 + (flags.reduce((sum, f) => sum + f.score * (f.impact || 0.1), 0) / flags.length) * 0.8
      );
  
  const overallRiskTier: 'A' | 'B' | 'C' | 'D' =
    overallRiskScore < 30 ? 'A' :
    overallRiskScore < 50 ? 'B' :
    overallRiskScore < 75 ? 'C' : 'D';
  
  // SAFE LTV calculation based on risks
  const baseMaxLTV = 0.75; // Standard 75%
  const riskAdjustment = Math.max(0, 1 - (overallRiskScore / 100) * 0.4); // Up to 40% reduction
  const maxSafeLTV = baseMaxLTV * riskAdjustment;
  
  // STRESS TEST LTV
  const stressTestLTV = {
    downturn10pct: maxSafeLTV * 0.9,
    downturn20pct: maxSafeLTV * 0.8,
    downturn30pct: maxSafeLTV * 0.7,
  };
  
  return {
    overallRiskScore: Math.round(overallRiskScore),
    overallRiskTier,
    riskFlags: flags,
    ltv,
    maxSafeLTV: Math.round(maxSafeLTV * 100) / 100,
    stressTestLTV: {
      downturn10pct: Math.round(stressTestLTV.downturn10pct * 100) / 100,
      downturn20pct: Math.round(stressTestLTV.downturn20pct * 100) / 100,
      downturn30pct: Math.round(stressTestLTV.downturn30pct * 100) / 100,
    },
  };
}

/**
 * AGGREGATE RISK CATEGORIES (for dashboard)
 */
export function categorizeRisks(
  assessment: RiskAssessment
): Record<string, RiskFlag[]> {
  const categories: Record<string, RiskFlag[]> = {
    property: [],
    legal: [],
    market: [],
    financial: [],
    environmental: [],
  };
  
  assessment.riskFlags.forEach(flag => {
    const type = flag.type.toLowerCase();
    if (['age', 'construction', 'occupancy', 'asset'].some(t => type.includes(t))) {
      categories.property.push(flag);
    } else if (['legal', 'title', 'regulatory', 'compliance'].some(t => type.includes(t))) {
      categories.legal.push(flag);
    } else if (['liquidity', 'market', 'density', 'location'].some(t => type.includes(t))) {
      categories.market.push(flag);
    } else if (['ltv', 'yield', 'occupancy'].some(t => type.includes(t))) {
      categories.financial.push(flag);
    } else if (['environmental', 'flood', 'pollution'].some(t => type.includes(t))) {
      categories.environmental.push(flag);
    }
  });
  
  return categories;
}
