# Collateral Valuation & Resale Liquidity Engine

A **complete end-to-end AI-powered system** for property collateral assessment, liquidity prediction, and risk evaluation targeting Indian NBFCs and LAP (Loan Against Property) products.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│ • Dashboard (stats, recent valuations, risk summary)            │
│ • Valuation Form (property input, real-time feature preview)    │
│ • Results Page (valuation range, liquidity index, risks, SHAP)  │
│ • Market Data Dashboard (micromarket analysis)                  │
│ • Admin Training UI (model training control panel)              │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (RESTful)                        │
├─────────────────────────────────────────────────────────────────┤
│ POST   /api/valuations              (submit property & get valuation)
│ GET    /api/valuations              (list all valuations)       │
│ GET    /api/valuations/[id]         (get specific valuation)    │
│ GET    /api/market-data?city=X      (real-time market intel)    │
│ GET    /api/stats                   (dashboard stats)           │
│ GET    /api/ws/messages?channel=X   (polling alternative to WS) │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   CORE VALUATION PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] ENRICHMENT (lib/pipeline/enrichment.ts)                   │
│      └─ Geocoding → Infrastructure scores → Legal data         │
│         Market data → Circle rates → Rental metrics            │
│                                                                 │
│  [2] FEATURE ENGINEERING (lib/pipeline/featureEngineering.ts) │
│      └─ Tabular features (hedonic regression inputs)           │
│         Geospatial features (POI proximity, GIS)               │
│         Multimodal features (CV/NLP/OCR) [PLACEHOLDER]        │
│         Time-series & interaction features                     │
│                                                                 │
│  [3] MODEL INFERENCE (lib/models/inference.ts)                │
│      └─ [MODEL_TRAINING_REQUIRED]                             │
│         Valuation (GBM-based hedonic regression)              │
│         Confidence intervals (conformal prediction)            │
│         Liquidity scoring (survival analysis)                  │
│         Risk classification (binary flags)                     │
│         Explainability (SHAP-style feature importance)         │
│                                                                 │
│  [4] DATABASE PERSISTENCE (lib/db/client.ts)                  │
│      └─ Properties, valuations, market data, audit logs       │
│         Training metadata (for model versioning)               │
│                                                                 │
│  [5] REAL-TIME BROADCAST (lib/websocket/broadcaster.ts)      │
│      └─ WebSocket subscriptions (valuation complete, market)  │
│         Fallback polling API (/api/ws/messages)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MOCK DATA & STORAGE                          │
├─────────────────────────────────────────────────────────────────┤
│ • lib/mockData.ts: Circle rates, properties, market data,      │
│   infrastructure scores, depreciation rates, models            │
│ • In-memory DB: MongoDB-compatible schema (ready for Atlas)    │
│ • Production-ready: Swap in real MongoDB for persistence      │
└─────────────────────────────────────────────────────────────────┘
```

## What's Implemented

### 1. **Complete Property Enrichment Pipeline**
- **Geocoding**: Auto-detect city/micromarket from address + pincode
- **Infrastructure Scoring**: POI proximity, metro access, connectivity
- **Legal Risk Assessment**: Title clarity, dispute history, legal complexity scores
- **Market Intelligence**: Absorption rates, listing density, price momentum
- **Circle Rate Floors**: Statutory benchmarks per micromarket
- **Rental Yield Analysis**: Income verification, capitalization approach

**Location**: `/lib/pipeline/enrichment.ts`

### 2. **Advanced Feature Engineering**
- **Tabular Features** (30+): Property attributes, location, market, ownership
- **Geospatial Features**: Neighborhood quality, urban planning, spatial clustering
- **Multimodal Placeholders**: Reserved for CV (photos), NLP (descriptions), OCR (legal docs)
- **Interaction Features**: Area × location premium, age × quality, momentum × yield
- **Time-Series**: Recency decay, seasonal patterns, market cycles

**Location**: `/lib/pipeline/featureEngineering.ts`

### 3. **Mock Model Inference with Placeholders**
- **Valuation Model**: Hedonic regression + circle rate floors + depreciation
  - Outputs: Point estimate + 95% confidence interval + confidence score
  - Architecture: Weighted ensemble of base price, infrastructure, age, momentum, rental
  - Production: Replace with real XGBoost/LightGBM GBM training
  
- **Liquidity Scoring**: Time-to-sell prediction + Resale Potential Index (0-100)
  - Estimates absorption velocity, buyer-seller balance
  - Calculates distress discount multipliers
  - Production: Replace with survival analysis (Cox model)

- **Risk Flags**: High age, legal complexity, extreme LTV, poor liquidity
  - Severity levels: low, medium, high
  - Impact descriptions with remediation notes
  - Production: Add real classification models

- **Explainability**: SHAP-style feature importance
  - Top drivers ranked by contribution %
  - Confidence breakdown (data completeness, model accuracy, volatility)

**Location**: `/lib/models/inference.ts`

### 4. **REST API Routes**
- `POST /api/valuations`: Submit property → end-to-end pipeline → get valuation ID
- `GET /api/valuations`: List all with pagination
- `GET /api/valuations/[id]`: Details for property/valuation history
- `GET /api/market-data`: Real-time micromarket intelligence
- `GET /api/stats`: Dashboard aggregations
- `GET /api/ws/messages`: Polling fallback for real-time updates

**Location**: `/app/api/`

### 5. **Real-Time Infrastructure**
- **WebSocket Broadcaster**: Manages channels for valuations, market data, training progress
- **Polling Fallback**: `/api/ws/messages` for browser compatibility
- **In-Memory Store**: Last 100 messages per channel (production: use Redis/Upstash)

**Location**: `/lib/websocket/broadcaster.ts` & `/app/api/ws/`

### 6. **Frontend Dashboard**
- **Home Dashboard**: Stats cards, recent valuations, risk summary, feature grid
- **New Valuation Form**: All 20 property fields, real-time validation
- **Results Page**: Valuation card + range + liquidity metrics + risk flags + SHAP importance
- **Valuations List**: Searchable, sortable, with risk badges
- **Market Data Dashboard**: Per-city micromarket intelligence with trending indicators
- **Admin Training UI**: Training job control, metrics display, model versioning

**Location**: `/app/page.tsx`, `/app/valuations/`, `/app/market-data/`, `/app/admin/training/`

### 7. **Database Schema (MongoDB-Ready)**
```typescript
Collections:
- properties: Full enriched property documents
- valuations: Complete valuation results with SHAP + risks
- market_data: Time-series snapshots per micromarket
- audit_logs: All actions for compliance
- training_metadata: Model versions + performance metrics
```

**Location**: `/lib/db/schema.ts` & `/lib/db/client.ts`

### 8. **Mock Data (Single Replaceable File)**
- 5 realistic sample properties across 4 metros
- Circle rates, market data, infrastructure scores
- Depreciation rates, property type factors, quality multipliers
- Liquidity benchmarks, distress discounts, risk thresholds
- Model coefficients (ready for real training)

**Location**: `/lib/mockData.ts` ← **Replace with your data sources**

## [MODEL_TRAINING_REQUIRED] - How to Add Real Models

### Step 1: Prepare Training Data
```
Sources to integrate:
1. Circle rates: State revenue portals, scrape public PDF registries
2. Transaction prices: Portal APIs (Magicbricks, 99acres, Housing.com)
3. Rental data: NoBroker, rental platforms for yield
4. Geospatial: Google Earth Engine API, ISRO Bhuvan, OpenStreetMap
5. Legal: CERSAI registry, court dispute databases, RERA
6. Images: Property portal photos, Street View for CV training
7. Text: Listing descriptions, legal documents for NLP/OCR
```

### Step 2: Replace Mock Coefficients
Edit `/lib/mockData.ts`:
```typescript
// BEFORE (mock)
export const MOCK_VALUATION_COEFFICIENTS = {
  basePrice: 500000,
  areaCoefficient: 1.0,
  ...
};

// AFTER (real trained weights from XGBoost/LightGBM)
export const TRAINED_MODEL_WEIGHTS = {
  // Load from saved .pkl or .h5 files
  gbm: loadGBMModel('/models/gbm-valuation-v2.pkl'),
  feature_importance: loadJSON('/models/feature_importance.json'),
  ...
};
```

### Step 3: Implement Training Pipeline
In `/lib/models/training.ts` (new file):
```typescript
import xgboost from 'xgboost';
import { engineerAllFeatures } from './featureEngineering';

export async function trainValuationModel(trainingData: PropertyDocument[]) {
  // Engineer features for all properties
  const X = trainingData.map(p => engineerAllFeatures(p, enrichmentData));
  const y = trainingData.map(p => p.lastTransactionPrice);

  // Train GBM
  const booster = xgboost.train({
    data: X,
    labels: y,
    params: {
      n_estimators: 500,
      learning_rate: 0.05,
      max_depth: 6,
      subsample: 0.8,
    },
    objective: 'reg:squarederror',
  });

  // Save + version
  await saveTrainingMetadata({
    modelName: 'valuation-gbm',
    version: '2.0.0',
    metrics: { rmse: 0.085, mape: 8.5, r2: 0.863 },
    modelPath: '/models/valuation-gbm-v2.pkl',
  });

  return booster;
}
```

### Step 4: Add CV/NLP/OCR Features
Multimodal features are placeholders. To implement:
```typescript
// CV: ResNet-18 for condition scoring
const conditionModel = loadResNet('/models/resnet-condition.pt');
const conditionScore = conditionModel.forward(propertyPhotos);

// NLP: BERT embeddings from descriptions
const nlpModel = loadBERT('/models/bert-property-text');
const textEmbedding = nlpModel.encode(propertyDescription);

// OCR: EasyOCR for document extraction
const ocrModel = easyOCR.Reader(['en', 'hi']);
const legalText = ocrModel.readtext(legalDocumentImages);
```

### Step 5: Update Inference
In `/lib/models/inference.ts`, replace mock logic:
```typescript
export function inferValuation(context: ModelInferenceContext) {
  // BEFORE: Mock hedonic calculation
  const pointEstimate = areaComponent * weights.area + ...;

  // AFTER: Real GBM prediction
  const booster = loadTrainedModel();
  const predictions = booster.predict(context.features.tabularFeatures);
  const quantiles = booster.predict(context.features.tabularFeatures, output_margin=true);
  const pointEstimate = predictions[0];
  const lowerBound = quantiles[0.025];
  const upperBound = quantiles[0.975];
  
  return {
    pointEstimate,
    lowerBound,
    upperBound,
    confidence: calculateConfidence(predictions, context),
  };
}
```

## Data Sources to Integrate

### High-Priority (Immediate)
1. **Circle Rates**: State portals (Bhulekh, Jamabandi), RERA registrations
2. **Market Data**: Portal APIs (99acres, Magicbricks), absorption rates
3. **Geospatial**: Google Earth Engine (free tier), OpenStreetMap, Bhuvan

### Medium-Priority (Weeks 2-4)
4. **Satellite Imagery**: ISRO Bhuvan, Landsat (land-use classification, vacancy proxies)
5. **Legal Data**: CERSAI scraping, court case summaries
6. **Rental Income**: NoBroker API, leasing platforms

### Advanced (Research/Lateral Ideas)
7. **Ride-Hailing Mobility**: Ola/Uber anonymized heatmaps (accessibility proxy)
8. **Climate Risk**: IMD weather data, flood zone mapping
9. **Social Sentiment**: Twitter/LinkedIn property chatter (demand signals)
10. **Virtual Inspections**: User-uploaded 360° photos for CV confidence

## Quick Start

### 1. Run the Dev Server
```bash
pnpm install
pnpm dev
```
Visit `http://localhost:3000`

### 2. Create a Valuation
- Click **New Valuation**
- Fill form (or use auto-filled sample)
- Click **Get Valuation**
- Wait ~2-3 seconds for processing
- View results with range, risks, drivers

### 3. Explore Dashboards
- **Home** (`/`): Stats, recent valuations, feature grid
- **Market Data** (`/market-data`): Micromarket intelligence
- **Admin Training** (`/admin/training`): Simulate model training

### 4. Replace Mock Data
Edit `/lib/mockData.ts`:
- Update `CIRCLE_RATES`, `MARKET_DATA`, `INFRASTRUCTURE_SCORES`
- Or integrate real APIs (call them in enrichment.ts)
- Update `MOCK_PROPERTIES` with real samples
- Once you train models: update `MOCK_VALUATION_COEFFICIENTS`

## File Structure
```
/app
  /api
    /valuations          → Main valuation submission + retrieval
    /market-data         → Market intelligence API
    /stats               → Dashboard aggregations
    /ws/messages         → WebSocket polling fallback
  /admin/training        → Model training UI
  /market-data           → Market dashboard page
  /valuations
    /new                 → Property input form
    /[id]               → Valuation results display
  /page.tsx             → Home dashboard
  /layout.tsx           → Root layout
  /globals.css          → Design tokens

/lib
  /mockData.ts          → Single file with all mock data (REPLACE THIS)
  /pipeline
    /enrichment.ts      → Geocoding, infrastructure, market, legal
    /featureEngineering.ts → Tabular, geospatial, multimodal features
  /models
    /inference.ts       → Valuation, liquidity, risks, explainability
    /training.ts        → [TODO] Real GBM/survival model training
  /db
    /schema.ts          → TypeScript types for MongoDB
    /client.ts          → In-memory DB mock (swap for MongoDB Atlas)
  /websocket
    /broadcaster.ts     → Real-time channels, polling fallback
```

## Production Deployment Checklist

- [ ] **Database**: Connect MongoDB Atlas (swap `/lib/db/client.ts`)
- [ ] **Model Weights**: Upload trained .pkl/.pt files to S3 or local
- [ ] **Data Pipelines**: Schedule ETL for circle rates, market data (Airflow/n8n)
- [ ] **Real-time**: Deploy Redis/Upstash for WebSocket backing
- [ ] **Image Storage**: S3 or Vercel Blob for property photos
- [ ] **Auth**: Add user roles (loan officer, credit analyst, admin)
- [ ] **Audit Logs**: Enable MongoDB transaction support for compliance
- [ ] **Model Monitoring**: Set up drift detection, retraining triggers
- [ ] **API Rate Limiting**: Add to prevent abuse
- [ ] **Explainability**: Audit SHAP outputs for bias/fairness

## Key Design Decisions

1. **Mock Data File**: Single `/lib/mockData.ts` for easy replacement
2. **Placeholder Models**: Clear `[MODEL_TRAINING_REQUIRED]` markers
3. **Modular Pipeline**: Each step (enrichment → features → inference) is independent
4. **Flexible Backend**: In-memory DB → MongoDB without changing API contracts
5. **Real-time Ready**: WebSocket broadcaster + polling fallback
6. **Explainability First**: Every valuation includes SHAP-style drivers
7. **India-Focused**: Circle rates, micromarket segmentation, legal complexity
8. **Risk Transparency**: Explicit flags with severity + impact descriptions

## Next Steps (Priority Order)

1. **Week 1**: Integrate real circle rates + basic market data APIs
2. **Week 2**: Add training data (portal transactions, rental data)
3. **Week 3**: Train GBM models, replace mock coefficients
4. **Week 4**: Add CV/NLP/OCR multimodal features
5. **Week 5**: Deploy to production, monitor performance, iterate

---

**Built with**: Next.js 16, TypeScript, Tailwind CSS, Recharts, shadcn/ui, Vercel

**Architecture**: SOTA AVM (Automated Valuation Model) + liquidity prediction + explainability
