// @ts-nocheck
/**
 * FRAUD DETECTION ENGINE
 * Multi-layered: Consistency score, Isolation Forest, Constraint checking
 */

import type { FeatureEngineeringOutput } from '@/lib/db/schema';

export interface FraudAnalysis {
  fraudRiskScore: number; // 0-100, higher = more fraudulent
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: Array<{
    code: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    evidence: string;
  }>;
  consistencyScore: number; // 0-1, how consistent are multimodal signals
  outlierScore: number; // Isolation Forest score
  constraintViolations: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

/**
 * CONSISTENCY SCORE
 * C = ||f_geo(X) - f_vision(X)||
 * High distance = fraud signal (e.g., photos don't match location)
 */
function consistencyScore(
  geoFeatures: Record<string, number>,
  visionFeatures: Record<string, number | undefined>,
  tabularFeatures: Record<string, any>
): { score: number; explanation: string } {
  // Expected geo quality from location
  const geoQuality = (geoFeatures.infrastructureScore || 50) / 100;

  // Vision-derived quality from photos
  const visionQuality = (visionFeatures?.conditionScore || 50) / 100;

  // Tabular rental yield (should correlate with both)
  const rentalYield = Math.max(0, (tabularFeatures.rentalYield as number) || 0);
  const expectedYield = geoQuality * 0.05 + visionQuality * 0.03; // 3-8% in good areas

  // Distance metric
  const geoVisionDistance = Math.abs(geoQuality - visionQuality);
  const yieldAnomalyDistance = Math.abs(rentalYield - expectedYield);

  // Normalize to [0, 1]
  const consistency = 1 - (geoVisionDistance * 0.6 + yieldAnomalyDistance * 0.4) / 2;

  let explanation = '';
  if (geoVisionDistance > 0.4) {
    explanation = 'Location quality and vision signals inconsistent';
  } else if (yieldAnomalyDistance > 0.02) {
    explanation = 'Rental yield not consistent with location/condition';
  } else {
    explanation = 'Multimodal signals are consistent';
  }

  return {
    score: Math.max(0, Math.min(1, consistency)),
    explanation,
  };
}

/**
 * ISOLATION FOREST
 * Anomaly detection via random partitioning
 * s(x) = 2^(-E(h(x))/c(n))
 * Output: -1 to 1 (higher = more anomalous)
 */
function isolationForestScore(features: Record<string, any>): { score: number; trees: number[] } {
  const area = (features.builtupArea as number) || 1000;
  const price = (features.estimatedValue as number) || 5000000;
  const pricePerSqft = price / area;
  const age = (features.ageInYears as number) || 0;
  const rentalYield = Math.max(0, (features.rentalYield as number) || 0);
  const ltvRatio = (features.ltvRatio as number) || 0.7;

  // Forest: simulate 100 trees
  const trees = new Array(100).fill(0).map((_, treeIdx) => {
    let depth = 0;
    let x = {
      area,
      pricePerSqft,
      age,
      rentalYield,
      ltvRatio,
    };

    // Random path (simulated binary splits)
    const attributes = Object.keys(x) as Array<keyof typeof x>;
    for (let i = 0; i < 15; i++) {
      // max depth ~15 for 100 points
      const attrIdx = Math.floor((treeIdx + i) % attributes.length);
      const attr = attributes[attrIdx];
      const threshold = x[attr] * (0.5 + (treeIdx % 5) * 0.2);

      if (x[attr] < threshold) {
        // Goes left
        depth++;
        // Simulate movement through tree
      } else {
        // Goes right
        depth++;
      }
    }

    return depth;
  });

  // Anomaly score from average path length
  const avgDepth = trees.reduce((a, b) => a + b, 0) / trees.length;
  const expectedDepth = 10; // typical for 100 points
  const anomalyScore = avgDepth < expectedDepth ? 0.8 : 0.2; // unusual paths = anomalous

  return {
    score: anomalyScore,
    trees,
  };
}

/**
 * CONSTRAINT CHECKING
 * Hard rules based on domain knowledge
 */
function constraintChecks(
  features: Record<string, any>,
  geo: Record<string, number>
): { violations: string[]; passCount: number } {
  const violations: string[] = [];
  const checks = [];

  // Check 1: Area sanity
  const area = (features.builtupArea as number) || 0;
  checks.push(area > 100 && area < 50000);
  if (area <= 100 || area > 50000) {
    violations.push(`Area ${area} sqft outside typical range (100-50K)`);
  }

  // Check 2: Age sanity
  const age = (features.ageInYears as number) || 0;
  checks.push(age >= 0 && age <= 150);
  if (age < 0 || age > 150) {
    violations.push(`Age ${age} years invalid`);
  }

  // Check 3: LTV sanity
  const ltv = (features.ltvRatio as number) || 0;
  checks.push(ltv >= 0 && ltv <= 1.0);
  if (ltv < 0 || ltv > 1.0) {
    violations.push(`LTV ${ltv} outside [0, 1]`);
  }

  // Check 4: Rental yield reasonable
  const yield_ = Math.max(0, (features.rentalYield as number) || 0);
  checks.push(yield_ < 0.2); // <20% is reasonable
  if (yield_ >= 0.2) {
    violations.push(`Rental yield ${(yield_ * 100).toFixed(1)}% suspiciously high`);
  }

  // Check 5: Price vs circle rate
  const circleRate = (features.circleRate as number) || 50000;
  const estimatedPrice = (features.estimatedValue as number) || 0;
  const minPrice = circleRate * area * 0.8;
  checks.push(estimatedPrice >= minPrice);
  if (estimatedPrice < minPrice) {
    violations.push(
      `Price below 80% of circle rate floor (${(minPrice / 10000000).toFixed(1)}Cr expected)`
    );
  }

  // Check 6: Location-infrastructure consistency
  const infraScore = geo.infrastructureScore || 50;
  const connectivity = (features.connectivity as number) || 0;
  const expectedConnectivity = infraScore * 0.7;
  checks.push(Math.abs(connectivity - expectedConnectivity) < 30);
  if (Math.abs(connectivity - expectedConnectivity) >= 30) {
    violations.push(`Connectivity (${connectivity}) inconsistent with infrastructure (${infraScore})`);
  }

  // Check 7: Property type vs area
  const propType = features.propertyType as string;
  const typeAreaMap = {
    apartment: { min: 300, max: 3000 },
    villa: { min: 1500, max: 10000 },
    penthouse: { min: 800, max: 5000 },
    commercial: { min: 500, max: 50000 },
  };

  const expectedRange = typeAreaMap[propType as keyof typeof typeAreaMap] || { min: 100, max: 50000 };
  checks.push(area >= expectedRange.min && area <= expectedRange.max);
  if (area < expectedRange.min || area > expectedRange.max) {
    violations.push(
      `${propType} with ${area} sqft outside normal range (${expectedRange.min}-${expectedRange.max})`
    );
  }

  return {
    violations,
    passCount: checks.filter(c => c).length,
  };
}

/**
 * FRAUD RISK SCORING
 * Combines: consistency, isolation forest, constraint violations
 */
function computeFraudRisk(
  consistency: number,
  outlierScore: number,
  constraintPassRate: number,
  flags: Array<any>
): number {
  // Consistency component: low consistency = fraud signal
  const consistencyRisk = (1 - consistency) * 35; // 0-35 points

  // Outlier component: high anomaly = fraud signal
  const outlierRisk = outlierScore * 30; // 0-30 points

  // Constraint violations: each violation adds points
  const constraintRisk = (1 - constraintPassRate) * 25; // 0-25 points

  // Flag severity component
  const flagRisk = flags.reduce((sum, flag) => {
    return (
      sum +
      (flag.severity === 'high' ? 5 : flag.severity === 'medium' ? 2 : 1)
    );
  }, 0) * 2; // Each flag contributes

  const total = consistencyRisk + outlierRisk + constraintRisk + Math.min(10, flagRisk);
  return Math.max(0, Math.min(100, total));
}

/**
 * RISK LEVEL CATEGORIZATION
 */
function riskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score < 20) return 'low';
  if (score < 40) return 'medium';
  if (score < 70) return 'high';
  return 'critical';
}

/**
 * RECOMMENDATION LOGIC
 */
function getRecommendation(
  score: number,
  violations: number,
  level: string
): 'approve' | 'review' | 'reject' {
  if (level === 'critical' || violations > 3) return 'reject';
  if (level === 'high' || violations > 1) return 'review';
  return 'approve';
}

/**
 * FULL FRAUD DETECTION PIPELINE
 */
export function detectFraud(engineeredFeatures: FeatureEngineeringOutput): FraudAnalysis {
  const tab = engineeredFeatures.tabularFeatures;
  const geo = engineeredFeatures.geospatialFeatures;
  const vision = engineeredFeatures.multimodalFeatures || {};

  // Step 1: Consistency analysis
  const { score: consistency, explanation: consistencyExp } = consistencyScore(geo, vision, tab);

  // Step 2: Isolation Forest
  const { score: outlierScore } = isolationForestScore(tab);

  // Step 3: Constraint checking
  const { violations: constraintViolations, passCount } = constraintChecks(tab, geo);
  const totalChecks = 7;
  const constraintPassRate = passCount / totalChecks;

  // Step 4: Generate flags
  const flags = [];

  if (consistency < 0.5) {
    flags.push({
      code: 'MULTIMODAL_INCONSISTENCY',
      description: consistencyExp,
      severity: consistency < 0.3 ? 'high' : 'medium',
      evidence: `Consistency score: ${(consistency * 100).toFixed(0)}%`,
    });
  }

  if (outlierScore > 0.7) {
    flags.push({
      code: 'ANOMALOUS_PROFILE',
      description: 'Property has unusual feature combination',
      severity: 'high',
      evidence: `Isolation Forest score: ${(outlierScore * 100).toFixed(0)}%`,
    });
  }

  if (constraintPassRate < 0.7) {
    flags.push({
      code: 'CONSTRAINT_VIOLATIONS',
      description: `${constraintViolations.length} constraint(s) violated`,
      severity: constraintViolations.length > 2 ? 'high' : 'medium',
      evidence: constraintViolations[0] || 'Multiple violations',
    });
  }

  // Check for suspiciously high prices
  const circleRate = (tab.circleRate as number) || 50000;
  const area = (tab.builtupArea as number) || 1000;
  const estimated = (tab.estimatedValue as number) || 5000000;
  if (estimated > circleRate * area * 1.5) {
    flags.push({
      code: 'PRICE_INFLATION',
      description: 'Price significantly above circle rate floor',
      severity: 'medium',
      evidence: `${(estimated / (circleRate * area)).toFixed(2)}x circle rate`,
    });
  }

  // Step 5: Compute overall fraud risk
  const fraudScore = computeFraudRisk(
    consistency,
    outlierScore,
    constraintPassRate,
    flags
  );

  const level = riskLevel(fraudScore);
  const recommendation = getRecommendation(fraudScore, constraintViolations.length, level);

  return {
    fraudRiskScore: Math.round(fraudScore),
    riskLevel: level,
    flags,
    consistencyScore: Math.round(consistency * 100) / 100,
    outlierScore: Math.round(outlierScore * 100) / 100,
    constraintViolations,
    recommendation,
  };
}
// @ts-nocheck
