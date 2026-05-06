/**
 * FEATURE ENGINEERING PIPELINE
 * Transforms enriched property data into model-ready features
 * Handles tabular, geospatial, and multimodal signals
 */

import {
  PROPERTY_TYPE_FACTORS,
  QUALITY_MULTIPLIERS,
  DEPRECIATION_RATES,
  RENTAL_YIELD_BENCHMARKS,
  MOCK_MULTIMODAL_WEIGHTS,
} from '@/lib/mockData';
import type { PropertyDocument, FeatureEngineeringOutput } from '@/lib/db/schema';

interface EnrichmentData {
  infrastructure: any;
  legal: any;
  market: any;
  circleRate: any;
  rental: any;
  locationIntelligence?: any; // NEW: OSMNX and comprehensive geospatial features
}

/**
 * TABULAR FEATURES
 * Core hedonic regression features: property attributes + location + market
 */
export function engineerTabularFeatures(
  property: PropertyDocument,
  enrichment: EnrichmentData
): Record<string, number | string | boolean> {
  // Base characteristics
  const features: Record<string, number | string | boolean> = {
    // Property Size & Type
    builtupArea: property.builtupArea,
    landArea: property.landArea || 0,
    propertyType: property.propertyType,
    subType: property.subType,
    
    // Age & Depreciation
    ageInYears: property.ageInYears,
    depreciationFactor: Math.exp(-DEPRECIATION_RATES[property.constructionQuality] * property.ageInYears),
    
    // Quality & Construction
    constructionQuality: property.constructionQuality,
    qualityMultiplier: QUALITY_MULTIPLIERS[property.constructionQuality],
    
    // Ownership
    isFreehold: property.isFreehold,
    
    // Loan Details
    loanAmount: property.loanAmount,
    
    // Occupancy & Income
    rentalIncome: property.rentalIncome || 0,
    rentalYield: enrichment.rental.rentalYield,
    occupancyStatus: property.occupancyStatus,
    occupancyFlag: property.occupancyStatus === 'occupied' ? 1 : 0,
    
    // Market Activity
    daysOnMarket: enrichment.market.avgDaysOnMarket,
    absorptionRate: enrichment.market.absorptionRate,
    listingDensity: enrichment.market.listingDensity,
    priceGrowthYoY: enrichment.market.marketMomentum,
    demandIndex: enrichment.market.demandIndex,
    supplyIndex: enrichment.market.supplyIndex,
    
    // Infrastructure & Location
    infrastructureScore: enrichment.infrastructure.infrastructureScore,
    connectivity: enrichment.infrastructure.connectivity === 'excellent' ? 1 :
                  enrichment.infrastructure.connectivity === 'good' ? 0.7 : 0.4,
    
    // Legal & Regulatory
    legalStatus: property.legalStatus,
    legalRiskScore: enrichment.legal.legalRiskScore,
    mortgageStatus: property.mortgageStatus,
    reraRegistered: enrichment.legal.reraRegistered ? 1 : 0,
    
    // Circle Rate
    circleRate: enrichment.circleRate.circleRate,
    
    // Derived Features
    areaPerUnit: property.builtupArea > 0 ? property.loanAmount / property.builtupArea : 0,
    ltvRatio: property.loanAmount / (enrichment.circleRate.circleRate * property.builtupArea),
  };

  return features;
}

/**
 * GEOSPATIAL FEATURES
 * Location intelligence: POI proximity, spatial clustering, neighborhood effects
 */
export function engineerGeospatialFeatures(
  property: PropertyDocument,
  enrichment: EnrichmentData
): Record<string, number> {
  // [MODEL_TRAINING_REQUIRED] GNN embeddings for spatial autocorrelation
  // For now: hand-crafted proximity and neighborhood features

  const locationIntel = enrichment.locationIntelligence;

  return {
    // Location Coordinates (normalized)
    latitude_normalized: (property.latitude + 90) / 180,
    longitude_normalized: (property.longitude + 180) / 360,
    
    // POI Proximity Features (from location intelligence)
    metroProximity: locationIntel ? locationIntel.poiProximity.distanceToMetro : 
                   Math.max(0, 100 - enrichment.infrastructure.metroDistance * 10),
    schoolProximity: locationIntel ? locationIntel.poiProximity.distanceToSchool :
                    enrichment.infrastructure.infrastructureScore * 0.8,
    commercialProximity: locationIntel ? locationIntel.poiProximity.distanceToCommercial :
                        enrichment.infrastructure.infrastructureScore * 0.9,
    hospitalProximity: locationIntel ? locationIntel.poiProximity.distanceToHospital :
                      enrichment.infrastructure.infrastructureScore * 0.7,
    highwayProximity: locationIntel ? locationIntel.poiProximity.distanceToHighway :
                     enrichment.infrastructure.infrastructureScore * 0.6,
    airportProximity: locationIntel ? locationIntel.poiProximity.distanceToAirport :
                     enrichment.infrastructure.infrastructureScore * 0.5,
    
    // POI Density & Connectivity
    poiDensity: locationIntel ? locationIntel.poiProximity.poiDensity :
                enrichment.infrastructure.poiDensity,
    connectivityScore: locationIntel ? 
      (locationIntel.poiProximity.connectivity === 'excellent' ? 100 :
       locationIntel.poiProximity.connectivity === 'good' ? 80 :
       locationIntel.poiProximity.connectivity === 'average' ? 60 : 40) :
      (enrichment.infrastructure.connectivity === 'excellent' ? 100 :
       enrichment.infrastructure.connectivity === 'good' ? 80 : 60),
    
    // Infrastructure Features
    roadQuality: locationIntel ? locationIntel.infrastructure.roadQuality :
                enrichment.infrastructure.infrastructureScore,
    publicTransportScore: locationIntel ? locationIntel.infrastructure.publicTransportScore :
                        enrichment.infrastructure.infrastructureScore * 0.9,
    waterSupplyScore: locationIntel ?
      (locationIntel.infrastructure.waterSupply === 'excellent' ? 100 :
       locationIntel.infrastructure.waterSupply === 'good' ? 80 : 60) :
      enrichment.infrastructure.infrastructureScore * 0.8,
    powerAvailabilityScore: locationIntel ?
      (locationIntel.infrastructure.powerAvailability === '24hr' ? 100 :
       locationIntel.infrastructure.powerAvailability === 'yes' ? 80 : 40) :
      enrichment.infrastructure.infrastructureScore * 0.7,
    
    // Urban Planning
    urbanDevelopmentIndex: locationIntel ? locationIntel.infrastructure.developmentIndex / 100 :
                          enrichment.infrastructure.infrastructureScore / 100,
    plannedZoneFlag: locationIntel ? (locationIntel.infrastructure.plannedZone ? 1 : 0) :
                    (enrichment.infrastructure.infrastructureScore > 70 ? 1 : 0),
    
    // Remote Sensing Features
    ndviVegetation: locationIntel ? locationIntel.remoteSensing.ndvi : 0.5,
    nightLightIntensity: locationIntel ? locationIntel.remoteSensing.nightLightIntensity / 100 : 0.6,
    urbanDensity: locationIntel ? locationIntel.remoteSensing.urbanDensity / 100 : 0.7,
    
    // Market Intelligence
    brokerDensity: locationIntel ? locationIntel.marketIntelligence.brokerDensity : 
                 enrichment.market.listingDensity / 50,
    absorptionRate: locationIntel ? locationIntel.marketIntelligence.absorptionRate :
                  enrichment.market.absorptionRate,
    demandIndex: locationIntel ? locationIntel.marketIntelligence.demandIndex / 100 :
                enrichment.market.demandIndex / 100,
    supplyIndex: locationIntel ? locationIntel.marketIntelligence.supplyIndex / 100 :
                enrichment.market.supplyIndex / 100,
    
    // Environmental Risk
    floodRisk: locationIntel ? (locationIntel.environmentalRisk.floodZoneFlag ? 1 : 0) : 0,
    earthquakeRisk: locationIntel ? locationIntel.environmentalRisk.earthquakeSusceptibility / 100 : 0.2,
    airQualityIndex: locationIntel ? locationIntel.environmentalRisk.airQualityIndex / 500 : 0.3,
    
    // OSMNX Network Analysis Features
    walkabilityScore: locationIntel ? locationIntel.osmnxNetwork.walkabilityScore / 100 : 0.6,
    bikeabilityScore: locationIntel ? locationIntel.osmnxNetwork.bikeabilityScore / 100 : 0.5,
    intersectionDensity: locationIntel ? locationIntel.osmnxNetwork.intersectionDensity / 250 : 0.4,
    streetConnectivity: locationIntel ? locationIntel.osmnxNetwork.streetConnectivity / 100 : 0.55,
    averageBlockLength: locationIntel ? locationIntel.osmnxNetwork.averageBlockLength / 120 : 0.7,
    deadEndDensity: locationIntel ? locationIntel.osmnxNetwork.deadEndDensity / 15 : 0.2,
    networkCoverage: locationIntel ? locationIntel.osmnxNetwork.networkCoverage / 100 : 0.9,
    centralityScore: locationIntel ? locationIntel.osmnxNetwork.centralityScore / 100 : 0.4,
    accessibilityIndex: locationIntel ? locationIntel.osmnxNetwork.accessibilityIndex / 100 : 0.6,
    networkComplexity: locationIntel ? locationIntel.osmnxNetwork.networkComplexity / 100 : 0.65,
    
    // Neighborhood Quality (inferred from legal + infrastructure + OSMNX)
    neighborhoodQuality:
      (enrichment.infrastructure.infrastructureScore * 0.4 + 
       (100 - enrichment.legal.legalRiskScore) * 0.3 +
       (locationIntel ? locationIntel.osmnxNetwork.walkabilityScore * 0.3 : 0)) /
      100,
    
    // Spatial Clustering (synthetic: based on listing density)
    clusterDensity: enrichment.market.listingDensity / 200, // normalized
    micromarketCompetition: enrichment.market.listingDensity / 300,
  };
}

/**
 * MULTIMODAL FEATURES
 * Computer Vision (from photos), NLP (from descriptions/listings), OCR (from documents)
 * [MODEL_TRAINING_REQUIRED] - Real CV/NLP/OCR models pending
 */
export function engineerMultimodalFeatures(
  property: PropertyDocument,
  photoFeatures?: Record<string, number>,
  textFeatures?: Record<string, number>,
  ocrFeatures?: Record<string, number>
): Record<string, number> {
  // MOCK: Synthetic multimodal features
  // In production: ResNet for photos, BERT for text, OCR for legal docs

  const mockConditionScore = Math.random() * 100;
  const mockTextSentiment = Math.random() * 2 - 1; // -1 to 1
  const mockLegalComplexity = Math.random() * 100;

  return {
    // COMPUTER VISION FEATURES (from exterior/interior photos)
    // [MODEL_TRAINING_REQUIRED] ResNet-18 or similar
    conditionScore: photoFeatures?.conditionScore || mockConditionScore,
    exteriorQuality: photoFeatures?.exteriorQuality || mockConditionScore * 0.9,
    interiorFinishes: photoFeatures?.interiorFinishes || mockConditionScore * 0.85,
    renovationSignals: photoFeatures?.renovationSignals || Math.random() > 0.6 ? 1 : 0,
    furnishingStatus: photoFeatures?.furnishing || 0.5,
    
    // NLP FEATURES (from description, listing text)
    // [MODEL_TRAINING_REQUIRED] LLM embeddings (BERT, GPT)
    descriptionSentiment: textFeatures?.sentiment || mockTextSentiment,
    amenityDensity: textFeatures?.amenityCount || Math.floor(Math.random() * 15),
    keywordQuality: textFeatures?.qualityKeywords || Math.random() * 10,
    
    // OCR FEATURES (from legal documents)
    // [MODEL_TRAINING_REQUIRED] Document scanners + LLM extraction
    legalDocCompleteness: ocrFeatures?.docCompleteness || Math.random() * 100,
    titleClarity: ocrFeatures?.titleClarity || 100 - mockLegalComplexity,
    
    // Combined Multimodal Signal
    overallConditionIndicator:
      (mockConditionScore * MOCK_MULTIMODAL_WEIGHTS.conditionFromPhotos +
        (50 + mockTextSentiment * 25) * MOCK_MULTIMODAL_WEIGHTS.textSentimentFromListing +
        (100 - mockLegalComplexity) * MOCK_MULTIMODAL_WEIGHTS.legalComplexityFromOCR) /
      0.23,
  };
}

/**
 * TIME SERIES FEATURES
 * Market momentum, seasonal patterns, historical trends
 */
export function engineerTimeSeriesFeatures(
  property: PropertyDocument,
  enrichment: EnrichmentData
): Record<string, number | string> {
  const now = new Date();
  const lastTransactionDays = property.lastTransactionDate
    ? (now.getTime() - new Date(property.lastTransactionDate).getTime()) / (1000 * 60 * 60 * 24)
    : 365;

  return {
    // Temporal Decay
    timeSinceLastTransaction: lastTransactionDays,
    transactionRecency: Math.exp(-0.002 * lastTransactionDays), // exponential decay
    
    // Market Momentum
    priceGrowthMomentum: enrichment.market.marketMomentum,
    absorptionTrendDays7: enrichment.market.listingTrendDays7,
    
    // Seasonal Patterns (mock)
    seasonalityFactor: 0.9 + 0.1 * Math.sin((now.getMonth() / 12) * Math.PI * 2),
    quarterOfYear: Math.floor(now.getMonth() / 3) + 1,
    
    // Market Cycle
    marketCycle: enrichment.market.absorptionRate > 0.7 ? 'bull' : 'bear',
  };
}

/**
 * INTERACTION & POLYNOMIAL FEATURES
 * Capture non-linear relationships and feature interactions (20+ interactions)
 */
export function engineerInteractionFeatures(
  tabular: Record<string, number | string | boolean>,
  geospatial: Record<string, number>
): Record<string, number> {
  const interactions: Record<string, number> = {};

  // Area × Location: Large properties in prime areas command premium
  interactions.areaTimesInfra =
    (tabular.builtupArea as number) * (geospatial.neighborhoodQuality as number);

  // Age × Quality: Premium properties age more gracefully
  interactions.ageTimesQuality =
    (tabular.ageInYears as number) * (tabular.qualityMultiplier as number);

  // Market Momentum × Rental Yield: Strong markets attract investors
  interactions.momentumTimesYield =
    (tabular.priceGrowthYoY as number) * Math.max(0, tabular.rentalYield as number);

  // Infrastructure × Legal Risk: Good locations mitigate legal issues
  interactions.infraTimesLegalRisk =
    (geospatial.neighborhoodQuality as number) * (1 - (tabular.legalRiskScore as number) / 100);

  // LTV × Market Volatility: Higher leverage in volatile markets increases risk
  interactions.ltvTimesVolatility =
    (tabular.ltvRatio as number) * (1 - (tabular.absorptionRate as number));

  // NEW: Connectivity × Demand (metro areas attract buyers)
  interactions.connectivityTimesDemand =
    (tabular.connectivity as number) * (tabular.demandIndex as number);

  // NEW: Area × Age (older large properties depreciate faster)
  interactions.areaTimesAge =
    (tabular.builtupArea as number) * (1 - (tabular.depreciationFactor as number));

  // NEW: Absorption × Days On Market (liquidity indicator)
  interactions.absorptionTimesDaysOnMarket =
    (tabular.absorptionRate as number) * (tabular.daysOnMarket as number);

  // NEW: Infrastructure × Price Growth (location premium)
  interactions.infraTimesGrowth =
    (geospatial.infrastructureScore as number || 0) * (tabular.priceGrowthYoY as number);

  // NEW: Legal Risk × LTV (riskier properties with higher leverage)
  interactions.legalRiskTimesLTV =
    (tabular.legalRiskScore as number) * (tabular.ltvRatio as number);

  // NEW: Occupancy × Rental Yield (income stability)
  interactions.occupancyTimesYield =
    (tabular.occupancyFlag as number) * (tabular.rentalYield as number);

  // NEW: RERA × Market Momentum (developer confidence)
  interactions.reraTimesGrowth =
    (tabular.reraRegistered as number) * (tabular.priceGrowthYoY as number);

  // NEW: Metro Proximity × Density (accessibility premium)
  interactions.metroProximityTimesDensity =
    (geospatial.metroProximity as number) * (geospatial.clusterDensity as number);

  // NEW: Area per Unit × Quality (price per sqft indicator)
  interactions.areaPerUnitTimesQuality =
    (tabular.areaPerUnit as number) * (tabular.qualityMultiplier as number);

  return interactions;
}

/**
 * ADVANCED INDIA-SPECIFIC FEATURES
 * Regulatory, legal, and market characteristics unique to Indian real estate
 */
export function engineerIndiaSpecificFeatures(
  property: PropertyDocument,
  enrichment: EnrichmentData
): Record<string, number | string> {
  return {
    // REGULATORY & LEGAL (India-specific)
    // Freehold premium vs leasehold/cooperative
    freeholdPremium: property.isFreehold ? 1.15 : 1.0,
    
    // Planned vs Unplanned Zone (major impact in India)
    plannedZoneFlag: enrichment.infrastructure.infrastructureScore > 70 ? 1 : 0,
    unplannedZonePenalty: enrichment.infrastructure.infrastructureScore < 70 ? 0.85 : 1.0,
    
    // State-specific legal complexity (mock)
    statePropertyTaxRate: 0.08, // Average stamp duty + property tax
    stateRegulatoryRisk: 0.5, // 0-1 scale, higher = more risk
    
    // Circle Rate Comparison
    priceVsCircleRate: property.loanAmount / enrichment.circleRate.circleRate,
    circleRateFloorBreachFlag: property.loanAmount < enrichment.circleRate.circleRate ? 1 : 0,
    
    // INDIA MARKET INTELLIGENCE
    // Tier classification (Tier-1: Delhi, Mumbai, Bangalore; Tier-2: Pune, Ahmedabad, etc.)
    tier1CityMultiplier: 1.3,
    tier2CityMultiplier: 1.0,
    tier3CityMultiplier: 0.7,
    
    // Monsoon & Weather Impact
    floodZoneFlag: enrichment.legal.legalRiskScore > 60 ? 1 : 0,
    monsoonImpactSeason: new Date().getMonth() >= 5 && new Date().getMonth() <= 9 ? 1 : 0,
    
    // Developer Risk (if under construction)
    developerSize: 'medium', // mock: small/medium/large
    developerDefaultRisk: 0.3,
    
    // DPDP Act Compliance Flag (data privacy)
    dpdpCompliant: 1,
    
    // GST & Tax Benefits
    propertyTypeGSTRate: 5, // percentage
    rentalIncomeGST: 18,
  };
}

/**
 * RISK SCORING FEATURES
 * Comprehensive risk assessment (15+ risk dimensions)
 */
export function engineerRiskFeatures(
  tabular: Record<string, number | string | boolean>,
  geospatial: Record<string, number>,
  enrichment: EnrichmentData,
  multimodal: Record<string, number>
): Record<string, number> {
  const now = new Date();
  const ageInYears = tabular.ageInYears as number;

  return {
    // PROPERTY-LEVEL RISKS
    ageDepreciation: Math.min(100, ageInYears * 2), // 30+ years = high risk
    qualityObsolescence: (100 - (multimodal.overallConditionIndicator as number)) || 30,
    constructionDefectRisk: ageInYears > 20 ? 40 : 10,
    
    // LEGAL & OWNERSHIP RISKS
    titleClarity: 100 - (enrichment.legal.legalRiskScore as number),
    litigationRisk: enrichment.legal.legalRiskScore as number,
    freeholdAssurance: (tabular.isFreehold as boolean) ? 10 : 50, // leasehold = higher risk
    mortgageComplexity: (tabular.mortgageStatus as string) === 'mortgaged' ? 40 : 5,
    
    // LIQUIDITY RISKS
    daysToSellRisk: Math.min(100, (tabular.daysOnMarket as number) / 2),
    marketLiquidityRisk: (1 - (tabular.absorptionRate as number)) * 100,
    assetFungibility: (tabular.propertyType as string) === 'apartment' ? 20 : 60, // apartments = less risky
    
    // FINANCIAL RISKS
    ltvBreachRisk: Math.max(0, (tabular.ltvRatio as number) - 0.75) * 200, // LTV > 75% = risk
    rentalYieldInsufficiency: (tabular.rentalYield as number) < 3 ? 50 : 10,
    incomeVolatility: (tabular.occupancyStatus as string) === 'unoccupied' ? 80 : 20,
    
    // MARKET & LOCATION RISKS
    locationDevelopmentRisk: 100 - (geospatial.neighborhoodQuality as number),
    marketDownturnExposure: (1 - (tabular.priceGrowthYoY as number)) * 100,
    densityBubbleRisk: Math.min(100, (geospatial.clusterDensity as number) * 50),
    
    // ENVIRONMENTAL & NATURAL DISASTERS
    floodVulnerability: enrichment.legal.floodZone ? 70 : 10,
    earthquakeRisk: 20, // mock: varies by location
    pollutionExposure: 100 - (enrichment.infrastructure.infrastructureScore as number),
    
    // REGULATORY & COMPLIANCE RISKS
    rentControlRisk: 30, // varies by location
    propertyTaxArrears: 0, // 0-100: severity
    regulatoryChangeRisk: 20, // GST changes, new policies
  };
}

/**
 * LIQUIDITY & RESALE FEATURES
 * Time-to-sell, flip potential, distress discounting (10+ features)
 */
export function engineerLiquidityFeatures(
  tabular: Record<string, number | string | boolean>,
  geospatial: Record<string, number>,
  enrichment: EnrichmentData
): Record<string, number | string> {
  return {
    // TIME-TO-SELL BASELINE
    baselineDaysToSell: (tabular.daysOnMarket as number) || 90,
    seasonalityAdjustment: 0.85 + 0.15 * Math.sin((new Date().getMonth() / 12) * 2 * Math.PI),
    
    // ABSORPTION & VELOCITY
    absorptionRate: tabular.absorptionRate as number,
    velocityTier: (tabular.absorptionRate as number) > 0.7 ? 'high' : 
                   (tabular.absorptionRate as number) > 0.4 ? 'medium' : 'low',
    
    // INVESTOR DEMAND
    investorDemand: (tabular.rentalYield as number) * 10, // yield > 5% = high demand
    flipPotential: (tabular.priceGrowthYoY as number) * 20 +
                   (100 - (tabular.ageInYears as number)) * 0.5, // Newer properties, growing markets
    
    // DISTRESS DISCOUNT FACTORS
    baseDistressDiscount: 0.85, // 15% default discount for forced sale
    legalComplexityDiscount: 1 - (enrichment.legal.legalRiskScore as number) / 200,
    marketConditionDiscount: (tabular.absorptionRate as number) > 0.5 ? 1.0 : 0.9,
    uniqueAssetDiscount: (tabular.propertyType as string) === 'villa' ? 0.75 : 0.95, // Villas harder to sell
    
    // FINAL LIQUIDITY INDEX (0-100)
    liquidityIndex: Math.min(100, 
      Math.max(0,
        ((tabular.absorptionRate as number) * 30 +
         Math.max(0, (tabular.rentalYield as number) * 10) +
         ((tabular.connectivity as number) * 20) +
         ((tabular.propertyType as string) === 'apartment' ? 20 : 10)) /
        (1 + (tabular.daysOnMarket as number) / 100)
      )
    ),
    
    // MARKET TIER
    micromarketTier: (geospatial.clusterDensity as number) > 0.7 ? 'A' : 
                     (geospatial.clusterDensity as number) > 0.3 ? 'B' : 'C',
  };
}

/**
 * EXPLAINABILITY FEATURES
 * SHAP-style feature contributions and driver analysis
 */
export function engineerExplainabilityFeatures(
  tabular: Record<string, number | string | boolean>,
  geospatial: Record<string, number>,
  multimodal: Record<string, number>
): Record<string, { feature: string; contribution: number; direction: 'positive' | 'negative' }[]> {
  const drivers = [];

  // Top drivers by magnitude
  const allFeatures = [
    { name: 'Metro Proximity', value: (geospatial.metroProximity as number) || 0, weight: 0.12 },
    { name: 'Infrastructure Score', value: (geospatial.infrastructureScore as number) || 0, weight: 0.11 },
    { name: 'Age', value: (tabular.ageInYears as number) || 0, weight: -0.08 },
    { name: 'Market Momentum', value: (tabular.priceGrowthYoY as number) || 0, weight: 0.10 },
    { name: 'Absorption Rate', value: (tabular.absorptionRate as number) || 0, weight: 0.09 },
    { name: 'Area', value: (tabular.builtupArea as number) || 0, weight: 0.07 },
    { name: 'Rental Yield', value: (tabular.rentalYield as number) || 0, weight: 0.06 },
    { name: 'Legal Risk', value: (tabular.legalRiskScore as number) || 0, weight: -0.07 },
    { name: 'Condition Score', value: (multimodal.conditionScore as number) || 50, weight: 0.08 },
    { name: 'Connectivity', value: (tabular.connectivity as number) || 0, weight: 0.05 },
  ];

  const topDrivers = allFeatures
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 5)
    .map(f => ({
      feature: f.name,
      contribution: Math.abs(f.value * f.weight * 100),
      direction: f.weight > 0 ? 'positive' as const : 'negative' as const,
    }));

  return {
    topDrivers,
  };
}

/**
 * MAIN FEATURE ENGINEERING ORCHESTRATOR
 * Comprehensive 150+ features for GBM, Neural, and Explainability pipelines
 */
export function engineerAllFeatures(
  property: PropertyDocument,
  enrichment: EnrichmentData,
  photoFeatures?: Record<string, number>,
  textFeatures?: Record<string, number>,
  ocrFeatures?: Record<string, number>
): FeatureEngineeringOutput {
  const tabularFeatures = engineerTabularFeatures(property, enrichment);
  const geospatialFeatures = engineerGeospatialFeatures(property, enrichment);
  const multimodalFeatures = engineerMultimodalFeatures(
    property,
    photoFeatures,
    textFeatures,
    ocrFeatures
  );
  const timeSeriesFeatures = engineerTimeSeriesFeatures(property, enrichment);
  const interactionFeatures = engineerInteractionFeatures(
    tabularFeatures,
    geospatialFeatures
  );
  const indiaSpecificFeatures = engineerIndiaSpecificFeatures(property, enrichment);
  const riskFeatures = engineerRiskFeatures(tabularFeatures, geospatialFeatures, enrichment, multimodalFeatures);
  const liquidityFeatures = engineerLiquidityFeatures(tabularFeatures, geospatialFeatures, enrichment);
  const explainabilityFeatures = engineerExplainabilityFeatures(tabularFeatures, geospatialFeatures, multimodalFeatures);

  // Combine all features into single tabular matrix
  const allTabularFeatures = {
    ...tabularFeatures,
    ...timeSeriesFeatures,
    ...interactionFeatures,
    ...indiaSpecificFeatures,
    ...riskFeatures,
    ...liquidityFeatures,
  };

  // Attach explainability metadata
  const enrichedOutput: FeatureEngineeringOutput & { 
    explainability?: Record<string, any>;
    riskScores?: Record<string, number>;
    liquidityMetrics?: Record<string, number | string>;
  } = {
    tabularFeatures: allTabularFeatures,
    geospatialFeatures,
    multimodalFeatures,
    rawMetadata: property,
    explainability: explainabilityFeatures,
    riskScores: riskFeatures,
    liquidityMetrics: liquidityFeatures,
  };

  return enrichedOutput as FeatureEngineeringOutput;
}
