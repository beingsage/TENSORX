import { type Db, MongoClient } from 'mongodb';

declare global {
  var __costAnalysisMongoClientPromise: Promise<MongoClient> | undefined;
  var __costAnalysisMongoIndexesPromise: Promise<void> | undefined;
}

const mongoUri = process.env.MONGODB_URI?.trim();

function resolveDatabaseName() {
  if (process.env.MONGODB_DB_NAME?.trim()) {
    return process.env.MONGODB_DB_NAME.trim();
  }

  if (!mongoUri) {
    return 'cost_analysis';
  }

  try {
    const parsed = new URL(mongoUri);
    return parsed.pathname.replace(/^\//, '') || 'cost_analysis';
  } catch {
    return 'cost_analysis';
  }
}

export function isMongoConfigured() {
  return Boolean(mongoUri);
}

async function ensureIndexes(db: Db) {
  if (!global.__costAnalysisMongoIndexesPromise) {
    global.__costAnalysisMongoIndexesPromise = Promise.all([
      db.collection('users').createIndex({ emailLower: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('projects').createIndex({ userId: 1, updatedAt: -1 }),
      db.collection('properties').createIndex({ userId: 1, updatedAt: -1 }),
      db.collection('properties').createIndex({ projectId: 1, updatedAt: -1 }),
      db.collection('valuations').createIndex({ userId: 1, timestamp: -1 }),
      db.collection('valuations').createIndex({ projectId: 1, timestamp: -1 }),
      db.collection('valuations').createIndex({ propertyId: 1, timestamp: -1 }),
      db.collection('assets').createIndex({ userId: 1, updatedAt: -1 }),
      db.collection('assets').createIndex({ projectId: 1, updatedAt: -1 }),
      db.collection('market_data').createIndex({ city: 1, micromarket: 1, timestamp: -1 }),
      db.collection('audit_logs').createIndex({ userId: 1, timestamp: -1 }),
    ]).then(() => undefined);
  }

  await global.__costAnalysisMongoIndexesPromise;
}

export async function getMongoDb() {
  if (!mongoUri) {
    throw new Error('MongoDB is not configured. Set MONGODB_URI and optionally MONGODB_DB_NAME.');
  }

  if (!global.__costAnalysisMongoClientPromise) {
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    global.__costAnalysisMongoClientPromise = client.connect();
  }

  const client = await global.__costAnalysisMongoClientPromise;
  const db = client.db(resolveDatabaseName());
  await ensureIndexes(db);
  return db;
}
