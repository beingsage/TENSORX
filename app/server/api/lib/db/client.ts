import { createHash } from 'crypto';
import type {
  AssetDocument,
  AuditLog,
  MarketDataSnapshot,
  ProjectDocument,
  PropertyDocument,
  SafeUser,
  TrainingMetadata,
  UserDocument,
  UserSessionDocument,
  ValuationResult,
} from './schema';
import { getMongoDb } from './mongodb';
import { generateId, slugify } from '@/lib/ids';

type ProjectStatus = ProjectDocument['status'];

type PropertyScope = {
  userId?: string;
  projectId?: string;
  city?: string;
  propertyType?: string;
  search?: string;
};

type ValuationScope = {
  userId?: string;
  projectId?: string;
  propertyId?: string;
  search?: string;
};

type AssetScope = {
  userId?: string;
  projectId?: string;
  propertyId?: string;
  valuationId?: string;
  search?: string;
};

type AuditScope = {
  userId?: string;
  projectId?: string;
};

const COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  projects: 'projects',
  assets: 'assets',
  properties: 'properties',
  valuations: 'valuations',
  marketData: 'market_data',
  auditLogs: 'audit_logs',
  trainingMetadata: 'training_metadata',
} as const;

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function toSafeUser(user: UserDocument): SafeUser {
  const { passwordHash: _passwordHash, emailLower: _emailLower, ...safeUser } = user;
  return safeUser;
}

function deriveBedroomCount(propertyType: string | undefined) {
  if (!propertyType) return 2;
  const bhkMatch = propertyType.match(/^(\d+)\s*bhk$/i);
  if (bhkMatch) return parseInt(bhkMatch[1], 10);
  if (/studio/i.test(propertyType)) return 1;
  if (/villa|townhouse/i.test(propertyType)) return 4;
  return 2;
}

function deriveBathroomCount(propertyType: string | undefined) {
  const bedrooms = deriveBedroomCount(propertyType);
  return Math.max(1, Math.min(5, bedrooms));
}

function inferFraudRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function normalizeProperty(raw: Partial<PropertyDocument> & Record<string, any>): PropertyDocument {
  const propertyId = raw.propertyId || raw.id || generateId('PROP');
  const propertyType = raw.propertyType || raw.subType || '2BHK';
  const builtupArea = raw.builtupArea || raw.plotArea || 0;
  const photoUrls = raw.photoUrls || raw.photos || [];
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();
  const updatedAt = raw.updatedAt ? new Date(raw.updatedAt) : createdAt;
  const bedroomCount = raw.bedroomCount ?? raw.bedrooms ?? deriveBedroomCount(propertyType);
  const bathroomCount = raw.bathroomCount ?? raw.bathrooms ?? deriveBathroomCount(propertyType);

  return {
    _id: raw._id || propertyId,
    propertyId,
    userId: raw.userId,
    projectId: raw.projectId,
    address: raw.address || 'Unknown address',
    pincode: raw.pincode || '000000',
    latitude: raw.latitude ?? 28.6139,
    longitude: raw.longitude ?? 77.209,
    city: raw.city || 'unknown',
    state: raw.state || 'Unknown',
    micromarket: raw.micromarket || raw.city || 'unknown',
    propertyType,
    propertyConfiguration: raw.propertyConfiguration,
    subType: raw.subType || propertyType,
    builtupArea,
    landArea: raw.landArea ?? raw.plotArea,
    plotArea: raw.plotArea ?? raw.landArea,
    ageInYears: raw.ageInYears ?? 0,
    yearBuilt: raw.yearBuilt,
    renovationYear: raw.renovationYear,
    bedroomCount,
    bathroomCount,
    bedrooms: raw.bedrooms ?? bedroomCount,
    bathrooms: raw.bathrooms ?? bathroomCount,
    floorNumber: raw.floorNumber,
    totalFloors: raw.totalFloors,
    balconyCount: raw.balconyCount,
    facing: raw.facing,
    condition: raw.condition,
    constructionQuality: raw.constructionQuality || 'standard',
    isFreehold: raw.isFreehold ?? true,
    loanAmount: raw.loanAmount ?? 0,
    ltvRatio: raw.ltvRatio,
    description: raw.description || '',
    locationDisplayName: raw.locationDisplayName,
    geoSource: raw.geoSource,
    rentalIncome: raw.rentalIncome ?? 0,
    occupancyStatus: raw.occupancyStatus || 'occupied',
    lastTransactionPrice: raw.lastTransactionPrice,
    lastTransactionDate: raw.lastTransactionDate,
    photoUrls,
    photos: raw.photos || photoUrls,
    documents: raw.documents || [],
    assetIds: raw.assetIds || [],
    exteriorAssetIds: raw.exteriorAssetIds || [],
    layoutAssetIds: raw.layoutAssetIds || [],
    legalDocumentAssetIds: raw.legalDocumentAssetIds || [],
    amenities: raw.amenities || [],
    parking: raw.parking ?? 0,
    flooring: raw.flooring,
    furnishing: raw.furnishing,
    documentInsights: raw.documentInsights || [],
    reconstruction: raw.reconstruction,
    legalStatus: raw.legalStatus || 'clear',
    mortgageStatus: raw.mortgageStatus || 'clear',
    reraRegistered: raw.reraRegistered,
    leaseRemainingYears: raw.leaseRemainingYears,
    ownerEmail: raw.ownerEmail,
    ownerPhone: raw.ownerPhone,
    floodRiskZone: raw.floodRiskZone ?? false,
    source: raw.source || 'manual',
    createdAt,
    updatedAt,
  };
}

function normalizeValuation(raw: Partial<ValuationResult> & Record<string, any>): ValuationResult {
  const pointEstimate = raw.valuation?.pointEstimate ?? 0;
  const distressDiscount = raw.liquidity?.distressDiscount ?? 0.9;
  const estimatedTimeToSell = raw.liquidity?.estimatedTimeToSell ?? 90;
  const resalePotentialIndex = raw.liquidity?.resalePotentialIndex ?? 60;
  const absorptionProbability =
    raw.liquidity?.absorptionProbability ??
    raw.liquidity?.survivalProbability ??
    Math.max(0.12, Math.min(0.96, resalePotentialIndex / 100));
  const fraudScore =
    raw.fraudAnalysis?.riskScore ??
    Math.min(95, raw.riskFlags?.length ? raw.riskFlags.length * 18 : 12);
  const valuationId = raw.valuationId || raw._id || generateId('VAL');

  return {
    _id: raw._id || valuationId,
    valuationId,
    propertyId: raw.propertyId || generateId('PROP'),
    userId: raw.userId,
    projectId: raw.projectId,
    title: raw.title,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
    sourceAssets: raw.sourceAssets || [],
    workerStatus: raw.workerStatus || [],
    pipelineWarnings: raw.pipelineWarnings || [],
    valuation: {
      pointEstimate,
      lowerBound: raw.valuation?.lowerBound ?? Math.round(pointEstimate * 0.9),
      upperBound: raw.valuation?.upperBound ?? Math.round(pointEstimate * 1.1),
      confidence: raw.valuation?.confidence ?? 0.8,
      estimationMethod: raw.valuation?.estimationMethod || 'hedonic-gnn-ensemble',
      stressTest: raw.valuation?.stressTest || {
        recession10: Math.round(pointEstimate * 0.9),
        recession20: Math.round(pointEstimate * 0.8),
        rateHike: Math.round(pointEstimate * 0.95),
      },
    },
    liquidity: {
      resalePotentialIndex,
      estimatedTimeToSell,
      distressDiscount,
      absorptionProbability,
      liquidityTier: raw.liquidity?.liquidityTier,
      flipPotential: raw.liquidity?.flipPotential,
      explanation: raw.liquidity?.explanation,
      distressValue:
        raw.liquidity?.distressValue ?? Math.round(pointEstimate * distressDiscount),
      timeToSellByPercentile: raw.liquidity?.timeToSellByPercentile || {
        p25: Math.max(10, Math.round(estimatedTimeToSell * 0.75)),
        p50: estimatedTimeToSell,
        p75: Math.round(estimatedTimeToSell * 1.25),
      },
      survivalProbability: raw.liquidity?.survivalProbability ?? absorptionProbability,
    },
    riskFlags: (raw.riskFlags || []).map((flag: any) => ({
      flag: flag.flag || flag.type || 'risk_flag',
      severity: flag.severity || 'low',
      description: flag.description || flag.message || 'No description provided.',
      impact: flag.impact || flag.recommendedAction || 'Monitor this risk.',
    })),
    explanation: {
      topDrivers: (raw.explanation?.topDrivers || []).map((driver: any) => ({
        feature: driver.feature || driver.name || 'unknown_feature',
        contribution: Math.abs(driver.contribution ?? 0),
        direction: driver.direction || ((driver.contribution ?? 0) >= 0 ? 'positive' : 'negative'),
        value: driver.value ?? driver.contribution ?? 0,
      })),
      confidenceBreakdown: {
        dataCompleteness: raw.explanation?.confidenceBreakdown?.dataCompleteness ?? 85,
        modelAccuracy: raw.explanation?.confidenceBreakdown?.modelAccuracy ?? 80,
        marketVolatility: raw.explanation?.confidenceBreakdown?.marketVolatility ?? 8,
      },
      notes:
        raw.explanation?.notes ||
        (raw as any).explanation?.riskSummary ||
        'Valuation report generated from the connected backend pipeline.',
    },
    features: {
      tabular: raw.features?.tabular || {},
      geospatial: raw.features?.geospatial || {},
      multimodal: raw.features?.multimodal || {},
    },
    modelVersion: raw.modelVersion || '1.0.0-local',
    status: raw.status || 'completed',
    processingTimeMs: raw.processingTimeMs ?? 0,
    fraudAnalysis: raw.fraudAnalysis || {
      riskScore: fraudScore,
      riskLevel: inferFraudRiskLevel(fraudScore),
      consistencyScore: Math.max(0.35, 1 - fraudScore / 120),
    },
    validation: raw.validation,
    marketSimulation: raw.marketSimulation,
  };
}

async function collections() {
  const db = await getMongoDb();
  return {
    db,
    users: db.collection<UserDocument>(COLLECTIONS.users),
    sessions: db.collection<UserSessionDocument>(COLLECTIONS.sessions),
    projects: db.collection<ProjectDocument>(COLLECTIONS.projects),
    assets: db.collection<AssetDocument>(COLLECTIONS.assets),
    properties: db.collection<PropertyDocument>(COLLECTIONS.properties),
    valuations: db.collection<ValuationResult>(COLLECTIONS.valuations),
    marketData: db.collection<MarketDataSnapshot>(COLLECTIONS.marketData),
    auditLogs: db.collection<AuditLog>(COLLECTIONS.auditLogs),
    trainingMetadata: db.collection<TrainingMetadata>(COLLECTIONS.trainingMetadata),
  };
}

function projectFilter(userId?: string, projectId?: string) {
  const filter: Record<string, any> = {};
  if (userId) filter.userId = userId;
  if (projectId) filter.projectId = projectId;
  return filter;
}

function propertyFilter(scope: PropertyScope = {}) {
  const filter: Record<string, any> = {};
  if (scope.userId) filter.userId = scope.userId;
  if (scope.projectId) filter.projectId = scope.projectId;
  if (scope.city) filter.city = { $regex: escapeRegex(scope.city), $options: 'i' };
  if (scope.propertyType) {
    filter.propertyType = { $regex: escapeRegex(scope.propertyType), $options: 'i' };
  }
  if (scope.search) {
    const regex = { $regex: escapeRegex(scope.search), $options: 'i' };
    filter.$or = [{ address: regex }, { propertyId: regex }, { city: regex }, { pincode: regex }];
  }
  return filter;
}

function valuationFilter(scope: ValuationScope = {}) {
  const filter: Record<string, any> = {};
  if (scope.userId) filter.userId = scope.userId;
  if (scope.projectId) filter.projectId = scope.projectId;
  if (scope.propertyId) filter.propertyId = scope.propertyId;
  if (scope.search) {
    const regex = { $regex: escapeRegex(scope.search), $options: 'i' };
    filter.$or = [{ valuationId: regex }, { propertyId: regex }, { title: regex }];
  }
  return filter;
}

function assetFilter(scope: AssetScope = {}) {
  const filter: Record<string, any> = {};
  if (scope.userId) filter.userId = scope.userId;
  if (scope.projectId) filter.projectId = scope.projectId;
  if (scope.propertyId) filter.propertyId = scope.propertyId;
  if (scope.valuationId) filter.valuationId = scope.valuationId;
  if (scope.search) {
    const regex = { $regex: escapeRegex(scope.search), $options: 'i' };
    filter.$or = [{ displayName: regex }, { originalFilename: regex }, { tags: regex }];
  }
  return filter;
}

function auditFilter(scope: AuditScope = {}) {
  const filter: Record<string, any> = {};
  if (scope.userId) filter.userId = scope.userId;
  if (scope.projectId) filter.projectId = scope.projectId;
  return filter;
}

export async function createUserRecord(input: {
  email: string;
  emailLower: string;
  passwordHash: string;
  name: string;
  company?: string;
  role?: string;
  avatarUrl?: string;
}) {
  const { users } = await collections();
  const now = new Date();
  const userId = generateId('USR');
  const user: UserDocument = {
    _id: userId,
    userId,
    email: input.email,
    emailLower: input.emailLower,
    passwordHash: input.passwordHash,
    name: input.name,
    company: input.company,
    role: input.role,
    avatarUrl: input.avatarUrl,
    createdAt: now,
    updatedAt: now,
  };

  user._id = user.userId;
  await users.insertOne(user);
  return toSafeUser(user);
}

export async function getUserByEmail(emailLower: string) {
  const { users } = await collections();
  return users.findOne({ emailLower });
}

export async function getUserDocumentById(userId: string) {
  const { users } = await collections();
  return users.findOne({ userId });
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await getUserDocumentById(userId);
  return user ? toSafeUser(user) : null;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserDocument, 'name' | 'company' | 'role' | 'avatarUrl'>>
) {
  const { users } = await collections();
  await users.updateOne(
    { userId },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return getUserById(userId);
}

export async function deleteUserAccount(userId: string) {
  const { users, sessions, projects, assets, properties, valuations, auditLogs } = await collections();
  await Promise.all([
    users.deleteOne({ userId }),
    sessions.deleteMany({ userId }),
    projects.deleteMany({ userId }),
    assets.deleteMany({ userId }),
    properties.deleteMany({ userId }),
    valuations.deleteMany({ userId }),
    auditLogs.deleteMany({ userId }),
  ]);
}

export async function markUserLogin(userId: string) {
  const { users } = await collections();
  await users.updateOne(
    { userId },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  );
}

export async function createSessionRecord(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}) {
  const { sessions } = await collections();
  const now = new Date();
  const sessionId = generateId('SES');
  const session: UserSessionDocument = {
    _id: sessionId,
    sessionId,
    userId: input.userId,
    tokenHash: input.tokenHash,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  };

  session._id = session.sessionId;
  await sessions.insertOne(session);
  return session;
}

export async function getSessionByToken(token: string) {
  const { sessions } = await collections();
  const tokenHash = sha256(token);
  return sessions.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
}

export async function touchSession(sessionId: string) {
  const { sessions } = await collections();
  await sessions.updateOne({ sessionId }, { $set: { updatedAt: new Date() } });
}

export async function deleteSessionByToken(token: string) {
  const { sessions } = await collections();
  await sessions.deleteOne({ tokenHash: sha256(token) });
}

export async function deleteSessionsByUser(userId: string) {
  const { sessions } = await collections();
  await sessions.deleteMany({ userId });
}

export async function createProjectRecord(input: {
  userId: string;
  name: string;
  description?: string;
  city?: string;
  state?: string;
  address?: string;
  status?: ProjectStatus;
  tags?: string[];
  heroMetric?: string;
}) {
  const { projects } = await collections();
  const now = new Date();
  const projectId = generateId('PRJ');
  const baseSlug = slugify(input.name);
  const existing = await projects.countDocuments({ userId: input.userId, slug: baseSlug });
  const project: ProjectDocument = {
    _id: projectId,
    projectId,
    userId: input.userId,
    name: input.name,
    slug: existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug,
    description: input.description,
    city: input.city,
    state: input.state,
    address: input.address,
    status: input.status || 'active',
    tags: input.tags || [],
    heroMetric: input.heroMetric,
    createdAt: now,
    updatedAt: now,
  };

  await projects.insertOne(project);
  return project;
}

export async function listProjectsByUser(userId: string) {
  const { projects } = await collections();
  return projects.find({ userId }).sort({ updatedAt: -1 }).toArray();
}

export async function getProjectById(projectId: string, userId?: string) {
  const { projects } = await collections();
  return projects.findOne(projectFilter(userId, projectId));
}

export async function updateProjectRecord(
  projectId: string,
  userId: string,
  updates: Partial<Pick<ProjectDocument, 'name' | 'description' | 'city' | 'state' | 'address' | 'status' | 'tags' | 'heroMetric'>>
) {
  const { projects } = await collections();
  const payload: Record<string, any> = { ...updates, updatedAt: new Date() };

  if (updates.name) {
    payload.slug = slugify(updates.name);
  }

  await projects.updateOne(projectFilter(userId, projectId), { $set: payload });
  return getProjectById(projectId, userId);
}

export async function deleteProjectRecord(projectId: string, userId: string) {
  const { projects, properties, valuations, assets, auditLogs } = await collections();
  await Promise.all([
    projects.deleteOne(projectFilter(userId, projectId)),
    properties.deleteMany({ userId, projectId }),
    valuations.deleteMany({ userId, projectId }),
    assets.deleteMany({ userId, projectId }),
    auditLogs.deleteMany({ userId, projectId }),
  ]);
}

export async function createAssetRecord(asset: AssetDocument) {
  const { assets } = await collections();
  const now = new Date();
  const document: AssetDocument = {
    ...asset,
    _id: asset._id || asset.assetId,
    createdAt: asset.createdAt || now,
    updatedAt: now,
  };
  await assets.insertOne(document);
  return document;
}

export async function getAsset(assetId: string, userId?: string) {
  const { assets } = await collections();
  return assets.findOne({ assetId, ...(userId ? { userId } : {}) });
}

export async function listAssets(limit = 100, offset = 0, scope: AssetScope = {}) {
  const { assets } = await collections();
  return assets.find(assetFilter(scope)).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray();
}

export async function updateAssetRecord(
  assetId: string,
  userId: string,
  updates: Partial<Pick<AssetDocument, 'displayName' | 'tags' | 'propertyId' | 'valuationId' | 'status' | 'errorMessage'>>
) {
  const { assets } = await collections();
  await assets.updateOne(
    { assetId, userId },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return getAsset(assetId, userId);
}

export async function deleteAssetRecord(assetId: string, userId: string) {
  const { assets } = await collections();
  await assets.deleteOne({ assetId, userId });
}

export async function saveProperty(property: PropertyDocument): Promise<PropertyDocument> {
  const { properties } = await collections();
  const normalized = normalizeProperty(property);
  const existing = await properties.findOne({ propertyId: normalized.propertyId });
  const now = new Date();
  const document = {
    ...normalized,
    _id: normalized.propertyId,
    createdAt: existing?.createdAt || normalized.createdAt || now,
    updatedAt: now,
  };

  await properties.updateOne(
    { propertyId: normalized.propertyId },
    { $set: document },
    { upsert: true }
  );

  return document;
}

export async function getProperty(propertyId: string, userId?: string): Promise<PropertyDocument | null> {
  const { properties } = await collections();
  return properties.findOne({ propertyId, ...(userId ? { userId } : {}) });
}

export async function listProperties(
  limit = 100,
  offset = 0,
  scope: PropertyScope = {}
): Promise<PropertyDocument[]> {
  const { properties } = await collections();
  return properties.find(propertyFilter(scope)).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray();
}

export async function updateProperty(
  propertyId: string,
  updates: Partial<PropertyDocument>,
  userId?: string
): Promise<PropertyDocument | null> {
  const { properties } = await collections();
  const existing = await properties.findOne({ propertyId, ...(userId ? { userId } : {}) });
  if (!existing) return null;

  const updated = normalizeProperty({
    ...existing,
    ...updates,
    propertyId,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  });

  await properties.updateOne(
    { propertyId, ...(userId ? { userId } : {}) },
    { $set: updated }
  );

  return updated;
}

export async function deleteProperty(propertyId: string, userId: string) {
  const { properties, valuations, assets, auditLogs } = await collections();
  await Promise.all([
    properties.deleteOne({ propertyId, userId }),
    valuations.deleteMany({ propertyId, userId }),
    assets.updateMany({ propertyId, userId }, { $set: { propertyId: undefined, updatedAt: new Date() } }),
    auditLogs.deleteMany({ propertyId, userId }),
  ]);
}

export async function saveValuation(valuation: ValuationResult): Promise<ValuationResult> {
  const { valuations } = await collections();
  const normalized = normalizeValuation(valuation);
  const document = { ...normalized, _id: normalized.valuationId };

  await valuations.updateOne(
    { valuationId: normalized.valuationId },
    { $set: document },
    { upsert: true }
  );

  await logAudit(
    'valuation_created',
    normalized.propertyId,
    normalized.valuationId,
    {
      estimatedValue: normalized.valuation.pointEstimate,
      confidence: normalized.valuation.confidence,
      pipelineWarnings: normalized.pipelineWarnings,
    },
    {
      userId: normalized.userId,
      projectId: normalized.projectId,
    }
  );

  return document;
}

export async function getValuation(valuationId: string, userId?: string): Promise<ValuationResult | null> {
  const { valuations } = await collections();
  return valuations.findOne({ valuationId, ...(userId ? { userId } : {}) });
}

export async function getValuationsByProperty(propertyId: string, userId?: string): Promise<ValuationResult[]> {
  const { valuations } = await collections();
  return valuations
    .find({ propertyId, ...(userId ? { userId } : {}) })
    .sort({ timestamp: -1 })
    .toArray();
}

export async function listValuations(
  limit = 100,
  offset = 0,
  scope: ValuationScope = {}
): Promise<ValuationResult[]> {
  const { valuations } = await collections();
  return valuations.find(valuationFilter(scope)).sort({ timestamp: -1 }).skip(offset).limit(limit).toArray();
}

export async function updateValuation(
  valuationId: string,
  userId: string,
  updates: Partial<Pick<ValuationResult, 'title' | 'projectId' | 'pipelineWarnings' | 'workerStatus'>>
) {
  const { valuations } = await collections();
  await valuations.updateOne(
    { valuationId, userId },
    { $set: { ...updates, timestamp: new Date() } }
  );
  return getValuation(valuationId, userId);
}

export async function deleteValuation(valuationId: string, userId: string) {
  const { valuations, assets, auditLogs } = await collections();
  const valuation = await valuations.findOne({ valuationId, userId });
  await Promise.all([
    valuations.deleteOne({ valuationId, userId }),
    assets.updateMany({ valuationId, userId }, { $set: { valuationId: undefined, updatedAt: new Date() } }),
    auditLogs.deleteMany({ valuationId, userId }),
  ]);
  return valuation;
}

export async function saveMarketData(snapshot: MarketDataSnapshot): Promise<MarketDataSnapshot> {
  const { marketData } = await collections();
  const id = snapshot._id || generateId('MKT');
  const document = { ...snapshot, _id: id };
  await marketData.insertOne(document);
  return document;
}

export async function getLatestMarketData(
  city: string,
  micromarket: string
): Promise<MarketDataSnapshot | null> {
  const { marketData } = await collections();
  return marketData.findOne(
    { city, micromarket },
    { sort: { timestamp: -1 } }
  );
}

export async function listMarketData(city?: string): Promise<MarketDataSnapshot[]> {
  const { marketData } = await collections();
  return marketData
    .find(city ? { city } : {})
    .sort({ timestamp: -1 })
    .toArray();
}

export async function logAudit(
  action: string,
  propertyId?: string,
  valuationId?: string,
  details?: Record<string, any>,
  meta?: { userId?: string; projectId?: string }
): Promise<AuditLog> {
  const { auditLogs } = await collections();
  const log: AuditLog = {
    _id: generateId('LOG'),
    timestamp: new Date(),
    action,
    propertyId,
    valuationId,
    projectId: meta?.projectId,
    userId: meta?.userId,
    details: details || {},
  };

  await auditLogs.insertOne(log);
  return log;
}

export async function getAuditLogs(
  scope: AuditScope = {},
  limit = 100
): Promise<AuditLog[]> {
  const { auditLogs } = await collections();
  return auditLogs.find(auditFilter(scope)).sort({ timestamp: -1 }).limit(limit).toArray();
}

export async function saveTrainingMetadata(metadata: TrainingMetadata): Promise<TrainingMetadata> {
  const { trainingMetadata } = await collections();
  const id = `${metadata.modelName}-${metadata.version}`;
  const document = { ...metadata, _id: id };
  await trainingMetadata.updateOne({ _id: id }, { $set: document }, { upsert: true });
  return document;
}

export async function getTrainingMetadata(modelName: string, version: string): Promise<TrainingMetadata | null> {
  const { trainingMetadata } = await collections();
  return trainingMetadata.findOne({ _id: `${modelName}-${version}` });
}

export async function listTrainingMetadata(): Promise<TrainingMetadata[]> {
  const { trainingMetadata } = await collections();
  return trainingMetadata.find({}).sort({ trainingStartDate: -1 }).toArray();
}

export async function saveBatchProperties(properties: PropertyDocument[]): Promise<PropertyDocument[]> {
  return Promise.all(properties.map((property) => saveProperty(property)));
}

export async function saveBatchValuations(valuations: ValuationResult[]): Promise<ValuationResult[]> {
  return Promise.all(valuations.map((valuation) => saveValuation(valuation)));
}

export async function getPropertyStats(scope: { userId?: string; projectId?: string } = {}) {
  const properties = await listProperties(5000, 0, scope);
  return {
    total: properties.length,
    byCity: properties.reduce(
      (acc, property) => {
        acc[property.city] = (acc[property.city] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    byType: properties.reduce(
      (acc, property) => {
        acc[property.propertyType] = (acc[property.propertyType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

export async function getValuationStats(scope: { userId?: string; projectId?: string } = {}) {
  const valuations = await listValuations(5000, 0, scope);
  if (!valuations.length) {
    return {
      total: 0,
      avgValue: 0,
      avgConfidence: 0,
      averageTimeToSell: 0,
    };
  }

  return {
    total: valuations.length,
    avgValue: Math.round(
      valuations.reduce((sum, valuation) => sum + valuation.valuation.pointEstimate, 0) /
        valuations.length
    ),
    avgConfidence: Math.round(
      (valuations.reduce((sum, valuation) => sum + valuation.valuation.confidence, 0) /
        valuations.length) *
        100
    ) / 100,
    averageTimeToSell: Math.round(
      valuations.reduce((sum, valuation) => sum + valuation.liquidity.estimatedTimeToSell, 0) /
        valuations.length
    ),
  };
}

export async function getWorkspaceSnapshot(userId: string) {
  const [projects, properties, valuations, assets, auditLogs] = await Promise.all([
    listProjectsByUser(userId),
    listProperties(500, 0, { userId }),
    listValuations(500, 0, { userId }),
    listAssets(500, 0, { userId }),
    getAuditLogs({ userId }, 50),
  ]);

  const avgValue =
    valuations.length === 0
      ? 0
      : Math.round(
          valuations.reduce((sum, valuation) => sum + valuation.valuation.pointEstimate, 0) /
            valuations.length
        );

  return {
    counts: {
      projects: projects.length,
      properties: properties.length,
      valuations: valuations.length,
      assets: assets.length,
    },
    avgValue,
    projects,
    properties,
    valuations,
    assets,
    auditLogs,
  };
}

export async function getProjectWorkspace(projectId: string, userId: string) {
  const [project, properties, valuations, assets] = await Promise.all([
    getProjectById(projectId, userId),
    listProperties(500, 0, { userId, projectId }),
    listValuations(500, 0, { userId, projectId }),
    listAssets(500, 0, { userId, projectId }),
  ]);

  return {
    project,
    properties,
    valuations,
    assets,
    stats: {
      propertyCount: properties.length,
      valuationCount: valuations.length,
      assetCount: assets.length,
      averageValue:
        valuations.length === 0
          ? 0
          : Math.round(
              valuations.reduce((sum, valuation) => sum + valuation.valuation.pointEstimate, 0) /
                valuations.length
            ),
    },
  };
}

export async function getDatabase() {
  return getMongoDb();
}

export async function clearDatabase() {
  const { users, sessions, projects, assets, properties, valuations, marketData, auditLogs, trainingMetadata } =
    await collections();

  await Promise.all([
    users.deleteMany({}),
    sessions.deleteMany({}),
    projects.deleteMany({}),
    assets.deleteMany({}),
    properties.deleteMany({}),
    valuations.deleteMany({}),
    marketData.deleteMany({}),
    auditLogs.deleteMany({}),
    trainingMetadata.deleteMany({}),
  ]);
}
