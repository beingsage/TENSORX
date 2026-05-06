/**
 * Core application schema definitions.
 * The app stores operational data in MongoDB using string identifiers for every collection.
 */

export interface UserDocument {
  _id?: string;
  userId: string;
  email: string;
  emailLower: string;
  passwordHash: string;
  name: string;
  company?: string;
  role?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type SafeUser = Omit<UserDocument, 'passwordHash' | 'emailLower'>;

export interface UserSessionDocument {
  _id?: string;
  sessionId: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface ProjectDocument {
  _id?: string;
  projectId: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  city?: string;
  state?: string;
  address?: string;
  status: 'active' | 'draft' | 'archived';
  tags: string[];
  heroMetric?: string;
  createdAt: Date;
  updatedAt: Date;
  lastValuationAt?: Date;
}

export interface AssetDocument {
  _id?: string;
  assetId: string;
  userId: string;
  projectId: string;
  propertyId?: string;
  valuationId?: string;
  publicId?: string;
  originalFilename: string;
  displayName: string;
  resourceType: 'image' | 'video' | 'raw' | 'auto';
  mimeType: string;
  bytes: number;
  secureUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  status: 'ready' | 'failed' | 'processing';
  provider: 'cloudinary' | 'local';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
}

export interface ModelServiceStatus {
  id: string;
  name: string;
  category: 'valuation' | 'vision' | 'ensemble' | 'graph';
  url?: string;
  status: 'online' | 'down' | 'degraded' | 'unconfigured';
  message: string;
  checkedAt: Date;
  responseTimeMs?: number;
  details?: Record<string, unknown>;
}

export interface IntakeDocumentInsight {
  assetId?: string;
  sourceName: string;
  category:
    | 'legal-document'
    | 'sale-deed'
    | 'title-document'
    | 'tax-document'
    | 'layout-plan'
    | 'exterior-photo'
    | 'unknown';
  extractedText?: string;
  summary?: string;
  fields: Record<string, string | number | boolean | null>;
  warnings?: string[];
}

export interface IntakeReconstructionJob {
  provider: 'nerfstudio' | 'noidea' | 'floorplan-to-blender';
  status:
    | 'uploaded'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'unconfigured';
  jobId?: string;
  runId?: string;
  message?: string;
  command?: string;
  outputPath?: string;
  previewUrl?: string;
  assetIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ============= PROPERTY COLLECTION =============
export interface PropertyDocument {
  _id?: string;
  propertyId: string;
  userId?: string;
  projectId?: string;
  address: string;
  pincode: string;
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  micromarket: string;
  propertyType: string;
  propertyConfiguration?: string;
  subType: string;
  builtupArea: number;
  landArea?: number;
  plotArea?: number;
  ageInYears: number;
  yearBuilt?: number;
  renovationYear?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  bedrooms?: number;
  bathrooms?: number;
  floorNumber?: number;
  totalFloors?: number;
  balconyCount?: number;
  facing?: string;
  condition?: 'new' | 'good' | 'needs-renovation' | 'dilapidated';
  constructionQuality: 'premium' | 'standard' | 'basic';
  isFreehold: boolean;
  loanAmount: number;
  ltvRatio?: number;
  description: string;
  locationDisplayName?: string;
  geoSource?: string;
  rentalIncome?: number;
  occupancyStatus: 'occupied' | 'vacant' | 'under-construction';
  lastTransactionPrice?: number;
  lastTransactionDate?: string;
  photoUrls?: string[];
  photos?: string[];
  documents?: string[];
  assetIds?: string[];
  exteriorAssetIds?: string[];
  layoutAssetIds?: string[];
  legalDocumentAssetIds?: string[];
  amenities?: string[];
  parking?: number;
  flooring?: string;
  furnishing?: string;
  documentInsights?: IntakeDocumentInsight[];
  reconstruction?: {
    exterior?: IntakeReconstructionJob;
    layout?: IntakeReconstructionJob;
  };
  legalStatus: 'clear' | 'pending-clearance' | 'disputed';
  mortgageStatus: 'clear' | 'mortgaged' | 'multiple-mortgages';
  reraRegistered?: boolean;
  leaseRemainingYears?: number;
  ownerEmail?: string;
  ownerPhone?: string;
  floodRiskZone: boolean;
  source?: 'manual' | 'valuation-form' | 'imported';
  createdAt: Date;
  updatedAt: Date;
}

// ============= VALUATION COLLECTION =============
export interface ValuationResult {
  _id?: string;
  valuationId: string;
  propertyId: string;
  userId?: string;
  projectId?: string;
  title?: string;
  timestamp: Date;
  sourceAssets?: string[];
  workerStatus?: ModelServiceStatus[];
  pipelineWarnings?: string[];

  valuation: {
    pointEstimate: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    estimationMethod: string;
    stressTest?: {
      recession10: number;
      recession20: number;
      rateHike: number;
    };
  };

  liquidity: {
    resalePotentialIndex: number;
    estimatedTimeToSell: number;
    distressDiscount: number;
    absorptionProbability: number;
    liquidityTier?: string;
    flipPotential?: number;
    explanation?: string;
    distressValue?: number;
    timeToSellByPercentile?: {
      p25: number;
      p50: number;
      p75: number;
    };
    survivalProbability?: number;
  };

  riskFlags: Array<{
    flag: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
  }>;

  explanation: {
    topDrivers: Array<{
      feature: string;
      contribution: number;
      direction: 'positive' | 'negative';
      value: number | string;
    }>;
    confidenceBreakdown: {
      dataCompleteness: number;
      modelAccuracy: number;
      marketVolatility: number;
    };
    notes: string;
  };

  features: {
    tabular: Record<string, any>;
    geospatial?: Record<string, any>;
    multimodal?: {
      conditionScore?: number;
      textSentiment?: number;
      legalComplexity?: number;
      [key: string]: any;
    };
  };

  modelVersion: string;
  status: 'completed' | 'failed' | 'pending';
  processingTimeMs: number;
  fraudAnalysis?: {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    consistencyScore: number;
    recommendation?: string;
    flags?: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      confidence: number;
      message: string;
      recommendedAction: string;
    }>;
  };
  validation?: {
    isValid: boolean;
    score: number;
    errors: Array<{
      field: string;
      message: string;
      severity: 'critical' | 'high';
    }>;
    warnings: Array<{
      field: string;
      message: string;
      suggestion: string;
    }>;
    sanityChecks: Array<{
      check: string;
      passed: boolean;
      details: string;
      impact: string;
    }>;
  };
  marketSimulation?: {
    marketType?: string;
    liquidity?: string;
    expectedDaysToSell?: number;
    confidence95Days?: string;
    medianDaysToSell?: number;
    p25DaysToSell?: number;
    p75DaysToSell?: number;
  };
}

// ============= MARKET DATA COLLECTION =============
export interface MarketDataSnapshot {
  _id?: string;
  city: string;
  micromarket: string;
  timestamp: Date;
  source?: string;

  avgDaysOnMarket: number;
  absorptionRate: number;
  listingDensity: number;
  priceGrowthYoY: number;

  activeListings: number;
  soldProperties: number;

  demandIndex: number;
  supplyIndex: number;

  circleRate: number;
  circleRateChangeYoY: number;
}

// ============= AUDIT LOG COLLECTION =============
export interface AuditLog {
  _id?: string;
  timestamp: Date;
  action: string;
  propertyId?: string;
  valuationId?: string;
  projectId?: string;
  userId?: string;
  details: Record<string, any>;
  ipAddress?: string;
}

// ============= TRAINING METADATA =============
export interface TrainingMetadata {
  _id?: string;
  modelName: string;
  version: string;
  status: 'training' | 'completed' | 'deployed' | 'archived';
  trainingStartDate: Date;
  trainingEndDate?: Date;
  metrics: {
    rmse?: number;
    mae?: number;
    mape?: number;
    r2?: number;
    auc?: number;
  };
  trainingDataSize: number;
  featureCount: number;
  hyperparameters?: {
    nEstimators?: number;
    learningRate?: number;
    maxDepth?: number;
    [key: string]: any;
  };
  modelPath?: string;
  notes?: string;
}

// ============= REQUEST/RESPONSE TYPES =============
export interface ValuationRequest {
  projectId?: string;
  propertyId?: string;
  assetIds?: string[];

  address: string;
  pincode: string;
  propertyType: string;
  propertyConfiguration?: string;
  builtupArea: number;
  landArea?: number;
  ageInYears: number;
  yearBuilt?: number;
  renovationYear?: number;
  constructionQuality: 'premium' | 'standard' | 'basic';
  isFreehold: boolean;
  loanAmount: number;

  rentalIncome?: number;
  occupancyStatus?: 'occupied' | 'vacant' | 'under-construction';
  lastTransactionPrice?: number;
  lastTransactionDate?: string;
  photoUrls?: string[];
  legalStatus?: 'clear' | 'pending-clearance' | 'disputed';
  mortgageStatus?: 'clear' | 'mortgaged' | 'multiple-mortgages';

  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  bedroomCount?: number;
  bathroomCount?: number;
  floorNumber?: number;
  totalFloors?: number;
  balconyCount?: number;
  facing?: string;
  condition?: 'new' | 'good' | 'needs-renovation' | 'dilapidated';
  plotArea?: number;
  ltvRatio?: number;
  ownerEmail?: string;
  ownerPhone?: string;
  reraRegistered?: boolean;
  leaseRemainingYears?: number;
  photos?: string[];
  documents?: string[];
  documentInsights?: IntakeDocumentInsight[];
  reconstruction?: {
    exterior?: IntakeReconstructionJob;
    layout?: IntakeReconstructionJob;
  };
  exteriorAssetIds?: string[];
  layoutAssetIds?: string[];
  legalDocumentAssetIds?: string[];
  amenities?: string[];
  parking?: number;
  flooring?: string;
  furnishing?: string;

  description?: string;
  enrichmentSources?: string[];
}

export interface ValuationResponse {
  success: boolean;
  valuationId: string;
  propertyId: string;
  result: ValuationResult;
  warnings?: string[];
  workerStatus?: ModelServiceStatus[];
  timestamp: Date;
}

export interface BatchValuationRequest {
  properties: ValuationRequest[];
  priorityMode?: 'quick' | 'accurate';
}

export interface FeatureEngineeringOutput {
  tabularFeatures: Record<string, number | string | boolean>;
  geospatialFeatures: Record<string, number>;
  multimodalFeatures?: Record<string, number>;
  rawMetadata: PropertyDocument;
}

export interface EnrichmentData {
  infrastructure: Record<string, any>;
  legal: Record<string, any>;
  market: Record<string, any>;
  circleRate: Record<string, any>;
  rental: Record<string, any>;
  locationIntelligence?: Record<string, any>;
}
