/**
 * COMPREHENSIVE MOCK DATA FOR COLLATERAL VALUATION ENGINE
 * Replace these with real data sources (circle rates API, property portals, etc.)
 * 
 * Format: All values in INR for Indian properties
 * Locations: Major Indian metros (Delhi NCR, Mumbai, Bangalore, Hyderabad)
 */

export const CIRCLE_RATES = {
  'delhi': {
    'new-delhi': 1800000, // per sqft
    'dwarka': 800000,
    'noida': 600000,
    'gurgaon': 950000,
    'south-delhi': 2200000,
  },
  'mumbai': {
    'bandra': 3500000,
    'andheri': 1900000,
    'thane': 1100000,
    'navi-mumbai': 900000,
  },
  'bangalore': {
    'koramangala': 1400000,
    'indiranagar': 1200000,
    'whitefield': 800000,
    'outer-ring-road': 600000,
  },
  'hyderabad': {
    'hitech-city': 1000000,
    'jubilee-hills': 1300000,
    'gachibowli': 900000,
    'kukatpally': 650000,
  },
};

export const MOCK_PROPERTIES = [
  {
    id: 'PROP-001',
    address: '123 Lodhi Colony, New Delhi',
    pincode: '110003',
    latitude: 28.5941,
    longitude: 77.2270,
    city: 'delhi',
    micromarket: 'new-delhi',
    propertyType: '2BHK',
    subType: 'Apartment',
    builtupArea: 1200, // sqft
    landArea: null,
    ageInYears: 8,
    constructionQuality: 'premium',
    isFreehold: true,
    loanAmount: 5000000, // INR
    description: 'Well-maintained 2BHK apartment with modern amenities, gym, swimming pool, dedicated parking',
    rentalIncome: 80000, // monthly
    occupancyStatus: 'occupied',
    lastTransactionPrice: 12000000,
    lastTransactionDate: '2023-06-15',
    photoUrls: ['photo1.jpg', 'photo2.jpg'],
    legalStatus: 'clear',
    mortgageStatus: 'clear',
    floodRiskZone: false,
  },
  {
    id: 'PROP-002',
    address: 'Sector 50, Gurgaon',
    pincode: '122001',
    latitude: 28.4595,
    longitude: 77.0611,
    city: 'delhi',
    micromarket: 'gurgaon',
    propertyType: '3BHK',
    subType: 'Villa',
    builtupArea: 2000,
    landArea: 3000,
    ageInYears: 12,
    constructionQuality: 'standard',
    isFreehold: true,
    loanAmount: 8000000,
    description: 'Spacious villa with private garden, triple parking, located in gated community',
    rentalIncome: 120000,
    occupancyStatus: 'occupied',
    lastTransactionPrice: 16000000,
    lastTransactionDate: '2023-09-20',
    photoUrls: ['photo1.jpg'],
    legalStatus: 'pending-clearance',
    mortgageStatus: 'clear',
    floodRiskZone: false,
  },
  {
    id: 'PROP-003',
    address: 'Bandra West, Mumbai',
    pincode: '400050',
    latitude: 19.0596,
    longitude: 72.8295,
    city: 'mumbai',
    micromarket: 'bandra',
    propertyType: '2BHK',
    subType: 'Apartment',
    builtupArea: 950,
    landArea: null,
    ageInYears: 15,
    constructionQuality: 'premium',
    isFreehold: false,
    loanAmount: 10000000,
    description: 'Luxury apartment with sea view, modern finishes, high-end amenities',
    rentalIncome: 150000,
    occupancyStatus: 'occupied',
    lastTransactionPrice: 20000000,
    lastTransactionDate: '2024-01-10',
    photoUrls: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    legalStatus: 'clear',
    mortgageStatus: 'clear',
    floodRiskZone: true,
  },
  {
    id: 'PROP-004',
    address: 'Koramangala, Bangalore',
    pincode: '560034',
    latitude: 12.9352,
    longitude: 77.6245,
    city: 'bangalore',
    micromarket: 'koramangala',
    propertyType: '1BHK',
    subType: 'Apartment',
    builtupArea: 650,
    landArea: null,
    ageInYears: 3,
    constructionQuality: 'premium',
    isFreehold: true,
    loanAmount: 4000000,
    description: 'Modern 1BHK near tech park, excellent connectivity, prime location',
    rentalIncome: 45000,
    occupancyStatus: 'occupied',
    lastTransactionPrice: 8000000,
    lastTransactionDate: '2023-11-05',
    photoUrls: ['photo1.jpg'],
    legalStatus: 'clear',
    mortgageStatus: 'clear',
    floodRiskZone: false,
  },
  {
    id: 'PROP-005',
    address: 'Jubilee Hills, Hyderabad',
    pincode: '500033',
    latitude: 17.3850,
    longitude: 78.4867,
    city: 'hyderabad',
    micromarket: 'jubilee-hills',
    propertyType: '4BHK',
    subType: 'Villa',
    builtupArea: 3500,
    landArea: 4500,
    ageInYears: 6,
    constructionQuality: 'premium',
    isFreehold: true,
    loanAmount: 12000000,
    description: 'Luxury villa with pool, guest house, smart home features, premium location',
    rentalIncome: 200000,
    occupancyStatus: 'occupied',
    lastTransactionPrice: 24000000,
    lastTransactionDate: '2023-08-30',
    photoUrls: ['photo1.jpg', 'photo2.jpg'],
    legalStatus: 'clear',
    mortgageStatus: 'clear',
    floodRiskZone: false,
  },
];

export const MARKET_DATA = {
  'delhi': {
    'new-delhi': {
      avgDaysOnMarket: 45,
      absorptionRate: 0.75,
      listingDensity: 120,
      priceGrowthYoY: 0.08,
    },
    'gurgaon': {
      avgDaysOnMarket: 55,
      absorptionRate: 0.70,
      listingDensity: 150,
      priceGrowthYoY: 0.06,
    },
  },
  'mumbai': {
    'bandra': {
      avgDaysOnMarket: 60,
      absorptionRate: 0.65,
      listingDensity: 100,
      priceGrowthYoY: 0.09,
    },
  },
  'bangalore': {
    'koramangala': {
      avgDaysOnMarket: 50,
      absorptionRate: 0.72,
      listingDensity: 180,
      priceGrowthYoY: 0.10,
    },
  },
  'hyderabad': {
    'jubilee-hills': {
      avgDaysOnMarket: 55,
      absorptionRate: 0.68,
      listingDensity: 90,
      priceGrowthYoY: 0.07,
    },
  },
};

/**
 * INFRASTRUCTURE PROXIMITY SCORES (0-100)
 * Higher = better accessibility
 * Generated from POI analysis (distance to metro, schools, hospitals, commercial hubs)
 */
export const INFRASTRUCTURE_SCORES = {
  'new-delhi': 85,
  'dwarka': 75,
  'noida': 70,
  'gurgaon': 80,
  'south-delhi': 88,
  'bandra': 82,
  'andheri': 78,
  'thane': 72,
  'navi-mumbai': 68,
  'koramangala': 84,
  'indiranagar': 80,
  'whitefield': 76,
  'outer-ring-road': 65,
  'hitech-city': 79,
  'jubilee-hills': 86,
  'gachibowli': 75,
  'kukatpally': 70,
};

/**
 * LEGAL COMPLEXITY SCORES (0-100, higher = more risk)
 * Based on area dispute history, title clarity, encroachment rates
 */
export const LEGAL_RISK_SCORES = {
  'new-delhi': 15,
  'dwarka': 25,
  'noida': 35,
  'gurgaon': 20,
  'south-delhi': 10,
  'bandra': 25,
  'andheri': 30,
  'thane': 40,
  'navi-mumbai': 35,
  'koramangala': 18,
  'indiranagar': 22,
  'whitefield': 28,
  'outer-ring-road': 45,
  'hitech-city': 20,
  'jubilee-hills': 12,
  'gachibowli': 30,
  'kukatpally': 38,
};

/**
 * DEPRECIATION RATES (annual %)
 * Property values decline by age; newer construction benefits
 */
export const DEPRECIATION_RATES = {
  premium: 0.02, // 2% per year
  standard: 0.03, // 3% per year
  basic: 0.04, // 4% per year
};

/**
 * PROPERTY TYPE ADJUSTMENT FACTORS
 * Multipliers to base price; used in hedonic regression
 */
export const PROPERTY_TYPE_FACTORS = {
  '1BHK': 0.75,
  '2BHK': 1.0,
  '3BHK': 1.35,
  '4BHK': 1.60,
  '5BHK': 1.85,
  'Villa': 1.5,
  'Studio': 0.6,
  'Townhouse': 1.2,
};

/**
 * CONSTRUCTION QUALITY MULTIPLIERS
 */
export const QUALITY_MULTIPLIERS = {
  premium: 1.25,
  standard: 1.0,
  basic: 0.85,
};

/**
 * LIQUIDITY DISTRESS DISCOUNT FACTORS
 * Applied when property has legal issues, remote location, or unusual configuration
 */
export const DISTRESS_DISCOUNT_RANGES = {
  clear: { min: 0.95, max: 1.0 }, // No discount
  pending_clearance: { min: 0.85, max: 0.92 }, // 8-15% discount
  disputed: { min: 0.70, max: 0.85 }, // 15-30% discount
  multiple_mortgages: { min: 0.75, max: 0.88 },
};

/**
 * RESALE POTENTIAL INDEX THRESHOLDS
 * 0-30: Poor (long time-to-sell, niche asset)
 * 31-60: Moderate
 * 61-85: Good
 * 86-100: Excellent (liquid, fast absorption)
 */
export const RESALE_BENCHMARKS = {
  1: { timeToSellDays: 120, absorbable: false },
  35: { timeToSellDays: 85, absorbable: true },
  70: { timeToSellDays: 50, absorbable: true },
  90: { timeToSellDays: 30, absorbable: true },
};

/**
 * RISK FLAGS THRESHOLDS
 * Model outputs risk flags when certain conditions are met
 */
export const RISK_THRESHOLDS = {
  HIGH_AGE: 30, // years
  LOW_RENTAL_YIELD: 0.02, // 2% annual
  EXTREME_LTV: 0.90, // Loan-to-Value ratio
  LEGAL_RISK_THRESHOLD: 60, // legal risk score
  DISTRESS_DISCOUNT_THRESHOLD: 0.85, // Price multiplier
};

/**
 * RENTAL YIELD BENCHMARKS (%)
 * Typical expected yields by micro-market
 */
export const RENTAL_YIELD_BENCHMARKS = {
  'new-delhi': 4.5,
  'gurgaon': 4.2,
  'bandra': 5.8,
  'koramangala': 5.0,
  'jubilee-hills': 5.5,
};

/**
 * MOCK MODEL COEFFICIENTS
 * [MODEL_TRAINING_REQUIRED] - Replace with real GBM/ensemble weights
 * These are simplified linear weights for mock demo purposes
 */
export const MOCK_VALUATION_COEFFICIENTS = {
  basePrice: 500000, // Base per sqft
  areaCoefficient: 1.0, // Weight for property size
  ageCoefficient: -0.02, // Depreciation multiplier per year
  infrastructureScore: 8000, // Per point (0-100)
  rentalYieldMultiplier: 2.0, // Capitalization approach weight
  marketMomentumCoeff: 0.05, // YoY growth impact
  constructionQualityBoost: 0.15, // Premium/standard/basic
};

/**
 * MOCK MULTIMODAL WEIGHTS
 * [MODEL_TRAINING_REQUIRED] - CV/NLP feature extractions pending
 */
export const MOCK_MULTIMODAL_WEIGHTS = {
  conditionFromPhotos: 0.1, // Extracted from CV on interior/exterior photos
  textSentimentFromListing: 0.05, // Extracted from NLP on description
  legalComplexityFromOCR: 0.08, // Extracted from document scanning
};

/**
 * MOCK LIQUIDITY SURVIVAL ANALYSIS COEFFICIENTS
 * [MODEL_TRAINING_REQUIRED] - Real survival curves pending
 * Predicts time-to-sell based on property attributes
 */
export const MOCK_LIQUIDITY_COEFFICIENTS = {
  baseTimeToSell: 60, // days
  infrascoreWeight: -0.5, // Higher infrastructure = faster sale
  legalRiskWeight: 1.2, // Higher risk = slower sale
  areaWeight: 0.001, // Larger properties take longer
  pricePointWeight: 0.00001, // Premium properties may take longer
};

/**
 * CONFIDENCE SCORE PARAMETERS
 * How confident is the model in each prediction?
 */
export const CONFIDENCE_PARAMS = {
  baseConfidence: 0.75,
  dataCompletenessBoost: 0.05, // Per complete data field (photos, legal docs, etc.)
  maxConfidence: 0.95,
};

/**
 * MOCK VALUATIONS
 * Pre-computed valuations for the mock properties (for demo/testing)
 */
export const MOCK_VALUATIONS = [
  {
    _id: 'VAL-001',
    valuationId: 'VAL-001',
    timestamp: new Date('2024-01-15T10:30:00Z'),
    propertyId: 'PROP-001',
    status: 'completed' as const,
    modelVersion: '1.0.0-mock-gbm',
    processingTimeMs: 342,
    valuation: {
      pointEstimate: 11500000,
      lowerBound: 10350000,
      upperBound: 12650000,
      confidence: 0.82,
      estimationMethod: 'hedonic-gbm-ensemble',
      stressTest: {
        recession10: 10350000,
        recession20: 9200000,
        rateHike: 10925000,
      },
    },
    liquidity: {
      resalePotentialIndex: 78,
      estimatedTimeToSell: 45,
      liquidityTier: 'high',
      distressDiscount: 0.92,
      flipPotential: 15,
      explanation: 'High liquidity in prime Delhi location. Strong rental market.',
    },
    riskFlags: [],
    explanation: {
      topDrivers: [
        { feature: 'metroProximity', contribution: 22, direction: 'positive' },
        { feature: 'infrastructureScore', contribution: 18, direction: 'positive' },
        { feature: 'rentalYield', contribution: 12, direction: 'positive' },
      ],
      confidenceBreakdown: {
        dataCompleteness: 92,
        modelAccuracy: 85,
        marketVolatility: 8,
      },
      riskSummary: 'Risk Tier: Low. Score: 15/100. 0 flag(s).',
      riskCategories: { low: 5, medium: 0, high: 0 },
    },
    features: {
      tabular: {},
      geospatial: {},
      multimodal: {},
      count: 87,
    },
  },
  {
    _id: 'VAL-002',
    valuationId: 'VAL-002',
    timestamp: new Date('2024-01-10T14:15:00Z'),
    propertyId: 'PROP-002',
    status: 'completed' as const,
    modelVersion: '1.0.0-mock-gbm',
    processingTimeMs: 385,
    valuation: {
      pointEstimate: 15800000,
      lowerBound: 14220000,
      upperBound: 17380000,
      confidence: 0.78,
      estimationMethod: 'hedonic-gbm-ensemble',
      stressTest: {
        recession10: 14220000,
        recession20: 12640000,
        rateHike: 15010000,
      },
    },
    liquidity: {
      resalePotentialIndex: 62,
      estimatedTimeToSell: 68,
      liquidityTier: 'medium',
      distressDiscount: 0.88,
      flipPotential: 8,
      explanation: 'Medium liquidity. Villa in Gurgaon with pending legal clearance.',
    },
    riskFlags: [
      {
        flag: 'legal_complexity',
        severity: 'medium',
        description: 'Legal status is pending-clearance. May include title disputes.',
        impact: 'Reduces liquidity by 20-30%, complicates resale',
      },
    ],
    explanation: {
      topDrivers: [
        { feature: 'propertySize', contribution: 25, direction: 'positive' },
        { feature: 'legalRiskScore', contribution: -15, direction: 'negative' },
        { feature: 'ageInYears', contribution: -8, direction: 'negative' },
      ],
      confidenceBreakdown: {
        dataCompleteness: 88,
        modelAccuracy: 85,
        marketVolatility: 12,
      },
      riskSummary: 'Risk Tier: Medium. Score: 35/100. 1 flag(s).',
      riskCategories: { low: 2, medium: 2, high: 0 },
    },
    features: {
      tabular: {},
      geospatial: {},
      multimodal: {},
      count: 92,
    },
  },
  {
    _id: 'VAL-003',
    valuationId: 'VAL-003',
    timestamp: new Date('2024-01-05T09:45:00Z'),
    propertyId: 'PROP-003',
    status: 'completed' as const,
    modelVersion: '1.0.0-mock-gbm',
    processingTimeMs: 298,
    valuation: {
      pointEstimate: 18500000,
      lowerBound: 16650000,
      upperBound: 20350000,
      confidence: 0.85,
      estimationMethod: 'hedonic-gbm-ensemble',
      stressTest: {
        recession10: 16650000,
        recession20: 14800000,
        rateHike: 17575000,
      },
    },
    liquidity: {
      resalePotentialIndex: 85,
      estimatedTimeToSell: 32,
      liquidityTier: 'high',
      distressDiscount: 0.95,
      flipPotential: 22,
      explanation: 'Very high liquidity in prime Bandra location. Strong investor demand.',
    },
    riskFlags: [],
    explanation: {
      topDrivers: [
        { feature: 'location', contribution: 28, direction: 'positive' },
        { feature: 'metroProximity', contribution: 20, direction: 'positive' },
        { feature: 'rentalYield', contribution: 15, direction: 'positive' },
      ],
      confidenceBreakdown: {
        dataCompleteness: 95,
        modelAccuracy: 85,
        marketVolatility: 6,
      },
      riskSummary: 'Risk Tier: Low. Score: 12/100. 0 flag(s).',
      riskCategories: { low: 4, medium: 0, high: 0 },
    },
    features: {
      tabular: {},
      geospatial: {},
      multimodal: {},
      count: 89,
    },
  },
];

export type MockProperty = (typeof MOCK_PROPERTIES)[0];
export type CircleRateCity = keyof typeof CIRCLE_RATES;
export type MarketDataCity = keyof typeof MARKET_DATA;
