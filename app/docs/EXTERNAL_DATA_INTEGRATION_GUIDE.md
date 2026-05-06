# External Data Integration Setup & Configuration Guide

## Overview

This guide covers end-to-end setup and configuration of all 6 external data sources integrated into the property valuation system:

1. **Weather APIs** (OpenWeather, NOAA)
2. **Demographics APIs** (Census Bureau)
3. **Maps APIs** (Google Places, HERE Maps)
4. **Real Estate Listings APIs** (Zillow, Redfin, MLS)
5. **Satellite Imagery APIs** (Sentinel Hub, Planet Labs)
6. **News & Sentiment APIs** (NewsAPI, Twitter, Reddit)

---

## Phase 1: API Setup & Configuration

### 1.1 Weather APIs

#### OpenWeather
```bash
# Get API key from: https://openweathermap.org/api
# Free tier includes: Current weather, 5-day forecast

# Add to .env:
OPENWEATHER_API_KEY=your_key_here
```

**Test Endpoint:**
```bash
curl -X POST http://localhost:3000/api/weather \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

#### NOAA
```bash
# NOAA data is free and public
# No API key required
# Add to .env:
NOAA_API_BASE=https://api.weather.gov
```

---

### 1.2 Demographics APIs

#### US Census Bureau
```bash
# Get API key: https://api.census.gov/data/key_signup.html
# Free tier: Unlimited requests

CENSUS_API_KEY=your_key_here
```

**Required Census Variables:**
- Population (B01003_001E)
- Median Household Income (B19013_001E)
- Population Growth (custom calculation)

**Test Endpoint:**
```bash
curl -X POST http://localhost:3000/api/demographics \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York, NY"
  }'
```

---

### 1.3 Maps APIs

#### Google Maps Platform
```bash
# Setup: https://cloud.google.com/maps-platform
# Enable: Places API, Maps JavaScript API, Directions API

GOOGLE_PLACES_API_KEY=your_key_here
GOOGLE_MAPS_API_KEY=your_key_here

# Pricing: $7/1000 requests after $200 free monthly credit
```

#### HERE Maps
```bash
# Setup: https://developer.here.com
# Create app and get API key

HERE_MAPS_API_KEY=your_key_here

# Pricing: 125,000 free requests/month
```

**Test Endpoint:**
```bash
curl -X POST http://localhost:3000/api/maps \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

---

### 1.4 Real Estate Listings APIs

#### Zillow API (via RapidAPI)
```bash
# Setup: https://rapidapi.com/apidojo/api/zillow-com1
# Subscribe to free tier

ZILLOW_API_KEY=your_rapidapi_key_here
ZILLOW_API_HOST=zillow-com1.p.rapidapi.com

# Pricing: 500 requests/month free
```

#### Redfin API (via RapidAPI)
```bash
# Setup: https://rapidapi.com/redfin
# Subscribe to free tier

REDFIN_API_KEY=your_rapidapi_key_here
REDFIN_API_HOST=redfin-com-real-estate.p.rapidapi.com

# Pricing: Varies by tier
```

#### MLS (Multiple Listing Service)
```bash
# Direct API access varies by region
# Contact your local MLS board for API access
# Usually requires REALTOR® affiliation

MLS_API_KEY=your_mls_key_here
MLS_API_HOST=your_mls_host_here
```

**Test Endpoint:**
```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St, New York, NY",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

---

### 1.5 Satellite Imagery APIs

#### Sentinel Hub
```bash
# Setup: https://www.sentinel-hub.com
# Register account and create OAuth client

SENTINEL_CLIENT_ID=your_client_id_here
SENTINEL_CLIENT_SECRET=your_client_secret_here

# Pricing: Free tier includes 10M pixels/month
```

#### Planet Labs
```bash
# Setup: https://api.planet.com
# Create API account

PLANET_LABS_API_KEY=your_api_key_here

# Pricing: Academic/demo tier available
```

**Test Endpoint:**
```bash
curl -X POST http://localhost:3000/api/satellite \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

---

### 1.6 News & Sentiment APIs

#### NewsAPI
```bash
# Setup: https://newsapi.org
# Create account

NEWSAPI_KEY=your_api_key_here

# Pricing: 500 requests/day free
```

#### Twitter API v2
```bash
# Setup: https://developer.twitter.com
# Create app and get bearer token

TWITTER_BEARER_TOKEN=your_bearer_token_here

# Pricing: Free tier includes 2M tweets/month
```

#### Reddit API
```bash
# Setup: https://www.reddit.com/prefs/apps
# Create app

REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here

# Pricing: Free, no authentication required for public data
```

**Test Endpoint:**
```bash
curl -X POST http://localhost:3000/api/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "address": "New York, NY 10001",
    "keyword": "real estate"
  }'
```

---

## Phase 2: Environment Setup

### 2.1 Create .env File

```bash
# Copy template
cp .env.example .env

# Edit with your API keys
nano .env
```

### 2.2 Validate Configuration

```bash
# Check all required variables are set
npm run validate-env

# Or manually check:
grep -E "API_KEY|BEARER|CLIENT" .env | sort
```

### 2.3 Required Node Packages

```bash
npm install axios dotenv node-cache redis
```

---

## Phase 3: Database Setup

### 3.1 PostgreSQL with TimescaleDB

```bash
# Using Docker Compose
docker-compose -f docker-compose.databases.yml up -d

# Verify connections
psql postgresql://user:password@localhost:5432/property_valuation -c "SELECT version();"
```

### 3.2 Create Cache Tables

```sql
-- Create caching table for API responses
CREATE TABLE api_cache (
  id SERIAL PRIMARY KEY,
  data_source VARCHAR(50),
  property_id INT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  cache_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_cache_property ON api_cache(property_id);
CREATE INDEX idx_cache_expires ON api_cache(expires_at);
```

---

## Phase 4: Testing Individual Data Sources

### 4.1 Test Weather Data

```bash
curl -X POST http://localhost:3000/api/external-data \
  -H "Content-Type: application/json" \
  -d '{
    "address": "New York, NY",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "baseValuation": 1000000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "external": {
      "sources": {
        "weather": {
          "current": "Clear",
          "temperature": 72,
          "alerts": 0
        }
      }
    }
  }
}
```

### 4.2 Individual Source Tests

```bash
# Weather only
curl http://localhost:3000/api/weather?lat=40.7128&lon=-74.0060

# Demographics only
curl http://localhost:3000/api/demographics?lat=40.7128&lon=-74.0060

# Maps only
curl http://localhost:3000/api/maps?lat=40.7128&lon=-74.0060

# Listings only
curl http://localhost:3000/api/listings?address=New+York+NY

# Satellite only
curl http://localhost:3000/api/satellite?lat=40.7128&lon=-74.0060

# Sentiment only
curl http://localhost:3000/api/sentiment?address=New+York+NY
```

---

## Phase 5: Integration with Valuation Pipeline

### 5.1 Modify Comprehensive Valuation Endpoint

**File:** `app/api/valuations/comprehensive/route.ts`

```typescript
import { fetchAllExternalData, calculateValuationAdjustmentsFromExternalData } 
  from '@/lib/providers/allAPIOrchestrator';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address, latitude, longitude, property } = body;

  // Get base valuation from ML models
  const baseValuation = await callMLModels(property);

  // Get external data adjustments
  const externalData = await fetchAllExternalData(
    address,
    latitude,
    longitude
  );

  const adjustments = calculateValuationAdjustmentsFromExternalData(
    externalData,
    baseValuation
  );

  // Combine all valuations
  const finalValuation = baseValuation + adjustments.adjustments.total;

  return NextResponse.json({
    baseValuation,
    externalAdjustments: adjustments.adjustments,
    finalValuation,
    confidence: adjustments.confidence,
    factors: adjustments.factors,
  });
}
```

### 5.2 Update Frontend Valuation Component

**File:** `app/components/ValuationResult.tsx`

```typescript
export async function ValuationResult({ property }) {
  const response = await fetch('/api/external-data', {
    method: 'POST',
    body: JSON.stringify({
      address: property.address,
      latitude: property.lat,
      longitude: property.lon,
      baseValuation: property.estimatedValue,
    }),
  });

  const { data } = await response.json();

  return (
    <div>
      <h2>Property Valuation</h2>
      <div>Base Valuation: ${data.adjustments.baseValuation}</div>
      <div>Weather Adjustment: ${data.adjustments.weather}</div>
      <div>Demographics Adjustment: ${data.adjustments.demographics}</div>
      <div>Maps Adjustment: ${data.adjustments.maps}</div>
      <div>Listings Adjustment: ${data.adjustments.listings}</div>
      <div>Satellite Adjustment: ${data.adjustments.satellite}</div>
      <div>Sentiment Adjustment: ${data.adjustments.sentiment}</div>
      <h3>Final Valuation: ${data.adjustments.finalValuation}</h3>
      <p>Confidence: {(data.confidence * 100).toFixed(1)}%</p>
    </div>
  );
}
```

---

## Phase 6: Running End-to-End

### 6.1 Start All Services

```bash
# Start databases
docker-compose -f docker-compose.databases.yml up -d

# Start ML services
docker-compose -f docker-compose.ml-services.yml up -d

# Start Next.js app
npm run dev

# App should be available at http://localhost:3000
```

### 6.2 Test Complete Workflow

```bash
# 1. Call unified external data endpoint
curl -X POST http://localhost:3000/api/external-data \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St, San Francisco, CA",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "baseValuation": 1500000
  }'

# 2. Use returned data in comprehensive valuation
curl -X POST http://localhost:3000/api/valuations/comprehensive \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St, San Francisco, CA",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "property": {
      "squareFeet": 2500,
      "bedrooms": 4,
      "bathrooms": 2.5,
      "yearBuilt": 1995
    }
  }'

# 3. Verify response includes all adjustments
# Response should contain:
# - baseValuation
# - weather, demographics, maps, listings, satellite, sentiment adjustments
# - totalAdjustment
# - finalValuation
# - confidence score
# - dataQuality breakdown
```

---

## Phase 7: Caching & Performance

### 7.1 Enable Redis Caching

```typescript
// In app/lib/providers/cache.ts
import Redis from 'redis';

const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export async function getCachedData(key: string) {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCachedData(key: string, data: any, ttl: number) {
  await redis.setex(key, ttl, JSON.stringify(data));
}
```

### 7.2 Add Cache to Data Fetching

```typescript
// In app/lib/providers/allAPIOrchestrator.ts
export async function fetchAllExternalData(
  address: string,
  latitude: number,
  longitude: number
): Promise<UnifiedExternalData> {
  const cacheKey = `external-data:${latitude}:${longitude}`;
  
  // Check cache first
  const cached = await getCachedData(cacheKey);
  if (cached) {
    console.log('Cache hit for external data');
    return cached;
  }

  // Fetch fresh data
  const data = await fetchAllDataSources(...);

  // Cache for 1 hour
  await setCachedData(cacheKey, data, 3600);

  return data;
}
```

---

## Phase 8: Monitoring & Logging

### 8.1 Setup Application Logging

```typescript
// In app/lib/logger.ts
export function logExternalDataFetch(
  source: string,
  status: 'success' | 'error',
  duration: number,
  recordCount?: number
) {
  const log = {
    timestamp: new Date().toISOString(),
    source,
    status,
    duration_ms: duration,
    records: recordCount || 0,
  };

  if (status === 'error') {
    console.error('[External Data]', log);
  } else {
    console.info('[External Data]', log);
  }
}
```

### 8.2 Monitor API Rate Limits

```typescript
// Track API calls to ensure we don't exceed quotas
const rateLimitTracker: Record<string, number[]> = {};

export function checkRateLimit(source: string, limit: number): boolean {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  if (!rateLimitTracker[source]) {
    rateLimitTracker[source] = [];
  }

  // Remove calls older than 1 hour
  rateLimitTracker[source] = rateLimitTracker[source].filter(
    time => time > oneHourAgo
  );

  if (rateLimitTracker[source].length >= limit) {
    console.warn(`Rate limit approaching for ${source}`);
    return false;
  }

  rateLimitTracker[source].push(now);
  return true;
}
```

---

## Troubleshooting

### Issue: API Keys Not Recognized
```bash
# Verify .env file is loaded
node -e "console.log(process.env.OPENWEATHER_API_KEY)"

# Restart Next.js dev server
npm run dev
```

### Issue: "External data not found"
```bash
# Check if API is accessible
curl http://localhost:3000/api/external-data

# Verify environment variables are set
npm run validate-env

# Check API service logs
docker-compose logs -f
```

### Issue: Timeout fetching data
```bash
# Increase timeout in allAPIOrchestrator.ts
const timeout = 30000; // 30 seconds

# Or skip slow sources
ENABLED_DATA_SOURCES=weather,demographics,maps,listings
```

---

## Next Steps

1. ✅ All 6 data sources configured
2. ✅ APIs created and tested
3. ✅ Environment variables documented
4. 📌 **Integrate with ML models** - Connect valuation API to this data
5. 📌 **Build UI components** - Display external data in frontend
6. 📌 **Add real-time updates** - WebSocket for live market data
7. 📌 **Deploy to production** - Docker, K8s, or serverless

---

## Useful Commands

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Check environment
npm run validate-env

# View API documentation
curl http://localhost:3000/api/external-data

# Monitor Docker containers
docker stats

# View recent logs
tail -f storage/logs/application.log
```

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** Ready for Integration
