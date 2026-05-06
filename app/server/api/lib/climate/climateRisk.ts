// @ts-nocheck
/**
 * CLIMATE RISK & ENVIRONMENTAL FACTORS FOR REAL ESTATE
 * Idea #6: Monitor environmental/climate risks (flood, heat, pollution)
 * as emerging valuation modifiers that traditional appraisals miss
 * 
 * Data sources: Government weather/climate APIs, EPA/CPCB data, satellite imagery
 * Output: climate_risk_score, flood_risk, heat_risk, pollution_index, environmental_trend
 * 
 * Captures future liability risks before insurance markets price them in
 */

import axios from 'axios';

export interface ClimateRiskMetrics {
  propertyId: string;
  latitude: number;
  longitude: number;

  // Overall risk score
  overallClimateRiskScore: number; // 0-100 (higher = riskier)
  riskCategory: 'low' | 'moderate' | 'high' | 'extreme';
  riskTrend: 'improving' | 'stable' | 'worsening';

  // Specific risk factors
  floodRisk: {
    score: number; // 0-100
    historicalFloodEvents: number; // Count in last 30 years
    projectedRisk2050: number; // Score in 2050
    vulnerabilityLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    affectedAreas: string[]; // Nearby flood plains, water bodies
  };

  heatRisk: {
    score: number; // 0-100
    averageTemperature: number; // °C
    extremeHeatDaysPerYear: number; // Days >40°C
    heatIslandEffect: number; // +°C from rural baseline
    projectedRisk2050: number; // Expected increase
    coolingCostImpact: number; // % increase in cooling costs
  };

  pollutionRisk: {
    airQualityIndex: number; // 0-500+ (AQI)
    pm25Concentration: number; // µg/m³
  pm10Concentration: number; // µg/m³
    no2Levels: number; // ppb
    pollutionTrend: 'improving' | 'stable' | 'worsening';
    majorPollutionSources: string[]; // Factories, highways, etc.
    healthRiskRating: string;
  };

  waterQuality: {
    score: number; // 0-100
    contaminationRisk: string;
    sourceOfWater: string;
    salinityIssues: boolean;
  };

  soilQuality: {
    erosionRisk: number; // 0-100
    contaminationScore: number; // 0-100
    landfillProximity: number; // km
  };

  // Insurance and liability implications
  insuranceImpact: {
    premiumMultiplier: number; // 1.0 = baseline, 1.5 = 50% higher
    insurabilityScore: number; // 0-100, likelihood of being insurable
    exclusionsLikely: boolean;
    estimatedAnnualInsuranceCost: number; // USD
  };

  // Future outlook
  futureRiskProjection: {
    year: number; // 2030, 2050
    projectedRiskScore: number;
    potentialPropertyValueImpact: number; // % change
    adaptationCosts: number; // USD for mitigation
  };

  // Recent environmental events
  recentEvents: Array<{
    event: string;
    date: Date;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
    impact: string;
  }>;

  lastUpdated: Date;
  dataQuality: number; // 0-1
}

/**
 * FETCH FLOOD RISK DATA
 * Uses FEMA, state flood maps, and satellite data
 */
export async function fetchFloodRiskData(
  latitude: number,
  longitude: number
): Promise<{
  riskScore: number;
  floodPlanProximity: number; // km
  historicalEvents: number;
  projectedRisk2050: number;
}> {
  try {
    // In production: Fetch from FEMA API, USGS, or Google Maps API
    // const response = await axios.get('https://api.usgs.gov/hazards/earthquakes/search', ...)

    // Mock implementation
    const distanceFromWater = 0.5 + Math.random() * 3; // 0.5-3.5 km from nearest water
    const historicalFloodingInArea = Math.random() > 0.7; // 30% chance of historical flooding

    let baseRiskScore = 20; // Base score

    // Risk increases with proximity to water
    if (distanceFromWater < 0.5) baseRiskScore = 75;
    else if (distanceFromWater < 1) baseRiskScore = 55;
    else if (distanceFromWater < 2) baseRiskScore = 35;
    else baseRiskScore = 15;

    // Historical flooding compounds risk
    if (historicalFloodingInArea) baseRiskScore += 15;

    // Climate change increases 2050 projections
    const projectedRisk2050 = baseRiskScore * 1.3;

    console.log(`[Flood Risk] Lat: ${latitude}, Lng: ${longitude} | Score: ${baseRiskScore}`);

    return {
      riskScore: Math.min(100, baseRiskScore),
      floodPlanProximity: distanceFromWater,
      historicalEvents: historicalFloodingInArea ? 2 + Math.floor(Math.random() * 3) : 0,
      projectedRisk2050: Math.min(100, projectedRisk2050),
    };
  } catch (error) {
    console.error('[Flood Risk API] Error:', error);
    return {
      riskScore: 50,
      floodPlanProximity: 1,
      historicalEvents: 0,
      projectedRisk2050: 60,
    };
  }
}

/**
 * FETCH HEAT RISK DATA
 * Uses weather station data and climate projections
 */
export async function fetchHeatRiskData(
  latitude: number,
  longitude: number
): Promise<{
  currentAvgTemp: number;
  extremeHeatDays: number;
  heatIslandEffect: number;
  projectedTempIncrease2050: number;
}> {
  // Mock implementation based on latitude (rough approximation)
  const latitudeBasedTemp = 25 + (latitude / 90) * 10; // Hotter near equator
  const heatIslandEffect = 2 + Math.random() * 4; // +2-6°C in urban areas

  // More extreme heat days = higher latitude/altitude vulnerability
  const extremeHeatDays = Math.max(0, 60 - latitude * 0.5 + Math.random() * 20);

  // Climate change projections
  const tempIncreaseBy2050 = 1.5 + Math.random() * 1.5; // +1.5-3°C

  return {
    currentAvgTemp: latitudeBasedTemp + heatIslandEffect,
    extremeHeatDays: Math.floor(extremeHeatDays),
    heatIslandEffect,
    projectedTempIncrease2050: tempIncreaseBy2050,
  };
}

/**
 * FETCH AIR QUALITY INDEX
 * Uses CPCB/EPA APIs or weather services
 */
export async function fetchAirQualityData(
  latitude: number,
  longitude: number
): Promise<{
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  trend: 'improving' | 'stable' | 'worsening';
  majorSources: string[];
}> {
  // Mock implementation - simulate AQI data
  // In production: Use OpenWeatherMap, AQI API, or national environmental data
  
  const baseAQI = 80 + Math.random() * 100; // 80-180
  const pm25 = 25 + Math.random() * 75; // 25-100 µg/m³
  const pm10 = 50 + Math.random() * 100; // 50-150 µg/m³
  const no2 = 20 + Math.random() * 80; // 20-100 ppb

  const trend = Math.random() > 0.6 ? 'worsening' : Math.random() > 0.3 ? 'stable' : 'improving';

  const majorSources = [];
  if (Math.random() > 0.6) majorSources.push('Vehicle emissions');
  if (Math.random() > 0.7) majorSources.push('Industrial plants');
  if (Math.random() > 0.8) majorSources.push('Construction dust');
  if (majorSources.length === 0) majorSources.push('Baseline urban pollution');

  return {
    aqi: Math.min(500, baseAQI),
    pm25,
    pm10,
    no2,
    trend,
    majorSources,
  };
}

/**
 * CALCULATE INSURANCE IMPACT
 * Environmental risks affect insurance premiums
 */
export function calculateInsuranceImpact(
  floodScore: number,
  heatScore: number,
  pollutionScore: number
): {
  premiumMultiplier: number;
  insurabilityScore: number;
  exclusionsLikely: boolean;
  estimatedAnnualCost: number;
} {
  // Base premium assumption: $1200/year
  const baseAnnualPremium = 1200;

  let premiumMultiplier = 1.0;
  let exclusionsLikely = false;

  // Flood risk is primary driver of insurance costs
  if (floodScore > 70) {
    premiumMultiplier += 0.8;
    exclusionsLikely = true;
  } else if (floodScore > 50) {
    premiumMultiplier += 0.4;
  } else if (floodScore > 30) {
    premiumMultiplier += 0.1;
  }

  // Heat risk increases cooling/claims
  if (heatScore > 70) premiumMultiplier += 0.2;
  else if (heatScore > 50) premiumMultiplier += 0.1;

  // Pollution risk is secondary
  if (pollutionScore > 70) premiumMultiplier += 0.1;

  const insurabilityScore = Math.max(0, 100 - floodScore * 0.5 - heatScore * 0.2 - pollutionScore * 0.1);

  return {
    premiumMultiplier,
    insurabilityScore,
    exclusionsLikely,
    estimatedAnnualCost: baseAnnualPremium * premiumMultiplier,
  };
}

/**
 * COMPUTE COMPREHENSIVE CLIMATE RISK METRICS
 */
export async function computeClimateRiskMetrics(
  propertyId: string,
  latitude: number,
  longitude: number
): Promise<ClimateRiskMetrics> {
  try {
    // 1. Fetch all climate/environmental data
    const floodData = await fetchFloodRiskData(latitude, longitude);
    const heatData = await fetchHeatRiskData(latitude, longitude);
    const airQualityData = await fetchAirQualityData(latitude, longitude);

    // 2. Calculate flood risk details
    const floodVulnerability =
      floodData.riskScore > 70
        ? 'very_high'
        : floodData.riskScore > 50
        ? 'high'
        : floodData.riskScore > 30
        ? 'moderate'
        : floodData.riskScore > 10
        ? 'low'
        : 'very_low';

    // 3. Calculate heat risk details
    const coolingCostImpact = (heatData.heatIslandEffect / 6) * 25; // Heat island increases AC costs

    // 4. Calculate pollution health rating
    let healthRiskRating = 'Good';
    if (airQualityData.aqi > 300) healthRiskRating = 'Hazardous';
    else if (airQualityData.aqi > 200) healthRiskRating = 'Very Unhealthy';
    else if (airQualityData.aqi > 150) healthRiskRating = 'Unhealthy';
    else if (airQualityData.aqi > 100) healthRiskRating = 'Unhealthy for Sensitive Groups';
    else if (airQualityData.aqi > 50) healthRiskRating = 'Moderate';

    // 5. Calculate overall risk score (weighted average)
    const overallClimateRiskScore =
      floodData.riskScore * 0.4 +
      (heatData.extremeHeatDays / 200) * 100 * 0.3 +
      (airQualityData.aqi / 500) * 100 * 0.2 +
      (pollutionScore * 0.1);

    // 6. Determine risk category
    let riskCategory: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
    if (overallClimateRiskScore > 75) riskCategory = 'extreme';
    else if (overallClimateRiskScore > 60) riskCategory = 'high';
    else if (overallClimateRiskScore > 40) riskCategory = 'moderate';

    // 7. Calculate insurance impact
    const pollutionScore = (airQualityData.aqi / 500) * 100;
    const insuranceData = calculateInsuranceImpact(
      floodData.riskScore,
      (heatData.extremeHeatDays / 200) * 100,
      pollutionScore
    );

    // 8. Project future risks
    const projectedScore2050 =
      floodData.projectedRisk2050 * 0.4 +
      ((heatData.extremeHeatDays + heatData.projectedTempIncrease2050 * 30) / 200) * 100 * 0.3 +
      (airQualityData.aqi / 500) * 100 * 0.2;

    const propertyValueImpact2050 = -(projectedScore2050 / 100) * 15; // Up to -15% by 2050

    // 9. Recent environmental events
    const recentEvents: Array<{
      event: string;
      date: Date;
      severity: 'minor' | 'moderate' | 'severe' | 'extreme';
      impact: string;
    }> = [];

    if (floodData.historicalEvents > 0) {
      recentEvents.push({
        event: 'Heavy rainfall event',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        severity: floodData.historicalEvents > 1 ? 'severe' : 'moderate',
        impact: `${floodData.historicalEvents} flooding incidents recorded`,
      });
    }

    if (heatData.extremeHeatDays > 60) {
      recentEvents.push({
        event: 'Extreme heat wave',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        severity: 'severe',
        impact: `${heatData.extremeHeatDays} days above 40°C annually`,
      });
    }

    if (airQualityData.trend === 'worsening') {
      recentEvents.push({
        event: 'Deteriorating air quality',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        severity: 'moderate',
        impact: `AQI trend: ${airQualityData.trend}`,
      });
    }

    return {
      propertyId,
      latitude,
      longitude,
      overallClimateRiskScore: Math.min(100, overallClimateRiskScore),
      riskCategory,
      riskTrend: airQualityData.trend,
      floodRisk: {
        score: floodData.riskScore,
        historicalFloodEvents: floodData.historicalEvents,
        projectedRisk2050: floodData.projectedRisk2050,
        vulnerabilityLevel: floodVulnerability,
        affectedAreas: floodData.floodPlanProximity < 2 ? ['Flood plain', 'Water basin'] : [],
      },
      heatRisk: {
        score: Math.min(100, (heatData.extremeHeatDays / 200) * 100),
        averageTemperature: heatData.currentAvgTemp,
        extremeHeatDaysPerYear: heatData.extremeHeatDays,
        heatIslandEffect: heatData.heatIslandEffect,
        projectedRisk2050: Math.min(100, ((heatData.extremeHeatDays + heatData.projectedTempIncrease2050 * 30) / 200) * 100),
        coolingCostImpact,
      },
      pollutionRisk: {
        airQualityIndex: airQualityData.aqi,
        pm25Concentration: airQualityData.pm25,
        pm10Concentration: airQualityData.pm10,
        no2Levels: airQualityData.no2,
        pollutionTrend: airQualityData.trend,
        majorPollutionSources: airQualityData.majorSources,
        healthRiskRating,
      },
      waterQuality: {
        score: 80 + Math.random() * 20,
        contaminationRisk: 'Low',
        sourceOfWater: 'Municipal supply',
        salinityIssues: false,
      },
      soilQuality: {
        erosionRisk: 30 + Math.random() * 40,
        contaminationScore: 20 + Math.random() * 30,
        landfillProximity: 5 + Math.random() * 15,
      },
      insuranceImpact: insuranceData,
      futureRiskProjection: {
        year: 2050,
        projectedRiskScore: Math.min(100, projectedScore2050),
        potentialPropertyValueImpact: propertyValueImpact2050,
        adaptationCosts: 50000 + Math.random() * 200000, // $50k-$250k for mitigation
      },
      recentEvents,
      lastUpdated: new Date(),
      dataQuality: 0.75 + Math.random() * 0.25,
    };
  } catch (error) {
    console.error(`[Climate Risk] Error for property ${propertyId}:`, error);
    throw error;
  }
}

/**
 * APPLY CLIMATE RISK TO VALUATION
 * Higher climate risk = lower valuation
 */
export function applyClimateRiskToValuation(
  baseValuation: number,
  baseTimeTosell: number,
  climateRiskMetrics: ClimateRiskMetrics
): {
  adjustedValuation: number;
  adjustedTimeTosell: number;
  riskPenalty: number; // %
  insuranceCostImpact: number;
  futureProofingCosts: number;
} {
  // Risk categories have different valuation impacts
  let valuationPenalty = 0;

  switch (climateRiskMetrics.riskCategory) {
    case 'extreme':
      valuationPenalty = 15;
      break;
    case 'high':
      valuationPenalty = 10;
      break;
    case 'moderate':
      valuationPenalty = 5;
      break;
    default:
      valuationPenalty = 0;
  }

  // Additional penalty for worsening trends
  if (climateRiskMetrics.riskTrend === 'worsening') {
    valuationPenalty += 3;
  }

  // Insurance cost compounds the effective price
  const annualInsuranceCost = climateRiskMetrics.insuranceImpact.estimatedAnnualInsuranceCost;
  const insuranceImpactOnValuation = (annualInsuranceCost * 10) / baseValuation; // Capitalize 10 years

  // Time-to-sell increases with climate risk
  let timeAdjustment = 1.0;
  if (climateRiskMetrics.riskCategory === 'extreme') timeAdjustment = 1.3;
  else if (climateRiskMetrics.riskCategory === 'high') timeAdjustment = 1.2;
  else if (climateRiskMetrics.riskCategory === 'moderate') timeAdjustment = 1.1;

  const adjustedValuation = Math.max(
    baseValuation * 0.5, // Floor at 50% of base
    baseValuation * (1 - (valuationPenalty + insuranceImpactOnValuation) / 100)
  );

  return {
    adjustedValuation,
    adjustedTimeTosell: baseTimeTosell * timeAdjustment,
    riskPenalty: valuationPenalty,
    insuranceCostImpact: annualInsuranceCost,
    futureProofingCosts: climateRiskMetrics.futureRiskProjection.adaptationCosts,
  };
}
// @ts-nocheck
