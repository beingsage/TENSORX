# Collateral Valuation Engine - Documentation Index

Welcome! This is a complete end-to-end property valuation and liquidity intelligence system for Indian NBFCs.

## Quick Start (5 Minutes)

1. **Start the dev server**:
   ```bash
   pnpm install
   pnpm dev
   ```

2. **Visit the dashboard**: http://localhost:3000

3. **Create a valuation**: Click "New Valuation" and fill the form

4. **View results**: Get instant valuation with range, liquidity metrics, and risk flags

## Documentation Guide

### For Understanding the System

📖 **[BUILD_SUMMARY.md](BUILD_SUMMARY.md)** (START HERE)
- What was built (complete feature list)
- Architecture at a glance
- How components connect
- Production checklist
- Development timeline (~10 hours built)

### For Technical Deep Dives

🏗️ **[SYSTEM_README.md](SYSTEM_README.md)** (COMPREHENSIVE)
- Complete architecture diagram
- Every module explained
- Data enrichment pipeline details
- Feature engineering (40+ features)
- Model inference (valuation, liquidity, risks, explainability)
- Database schema (MongoDB-ready)
- Real-time infrastructure
- How to add real trained models
- Data sources to integrate
- Production deployment checklist

### For API Integration

🔌 **[API_EXAMPLES.md](API_EXAMPLES.md)** (HANDS-ON)
- cURL examples for all endpoints
- JSON request/response samples
- JavaScript/TypeScript code examples
- Full integration walkthrough
- Real-time polling examples
- Error responses

## Project Structure at a Glance

```
/lib
  /mockData.ts                    ← REPLACE WITH REAL DATA HERE
  /pipeline
    /enrichment.ts              ← Geocoding, infrastructure, legal, market
    /featureEngineering.ts      ← 40+ features: tabular, geospatial, multimodal
  /models
    /inference.ts               ← [MODEL_TRAINING_REQUIRED] Valuation, liquidity, risks
    /training.ts                ← TODO: Real GBM training
  /db
    /schema.ts                  ← MongoDB collection types
    /client.ts                  ← In-memory → swap for MongoDB Atlas
  /websocket
    /broadcaster.ts             ← Real-time channels

/app
  /api/
    /valuations                 ← POST/GET valuations
    /market-data               ← GET market intelligence
    /stats                     ← GET dashboard stats
    /ws/messages               ← WebSocket polling fallback
  
  /valuations
    /new                       ← Property input form
    /page.tsx                  ← Valuations list
    /[id]/page.tsx            ← Results page (valuation + liquidity + risks)
  
  /market-data/page.tsx        ← Micromarket analysis dashboard
  /admin/training/page.tsx     ← Model training control panel
  
  /page.tsx                    ← Home dashboard
  /layout.tsx                  ← Root layout
  /globals.css                 ← Design tokens

/public                         ← Assets, images, icons
/components/ui                  ← shadcn components (pre-built)
```

## Key Features by Page

### 🏠 Home Dashboard (`/`)
- **Stats Cards**: Total properties, valuations, confidence %, time-to-sell
- **Recent Valuations**: Latest 3 results with quick links
- **Risk Summary**: Alerts for high-age, legal, liquidity issues
- **Feature Showcase**: Explainer cards for enrichment, GBM, liquidity

### 📝 New Valuation (`/valuations/new`)
- **Property Form**: 20 fields (address, area, age, quality, ownership, loan, etc.)
- **Pipeline Overview**: Visual guide showing enrichment → features → inference
- **Real-time Validation**: Input checking with error feedback
- **Auto-Fill**: Optional fields with smart defaults

### 📊 Results Page (`/valuations/[id]`)
- **Valuation Card**: Point estimate + range (95% confidence) + confidence %
- **Liquidity Metrics**: Resale index, time-to-sell, absorption probability
- **Risk Assessment**: Color-coded flags (high/medium/low) with impact descriptions
- **Feature Importance**: Top drivers with contribution % and value
- **Confidence Breakdown**: Data completeness, model accuracy, market volatility
- **Export Options**: PDF report, share valuation

### 📈 Market Data Dashboard (`/market-data`)
- **City Selector**: Delhi, Mumbai, Bangalore, Hyderabad tabs
- **Per-Micromarket Cards**: Circle rate, infrastructure, absorption, days-on-market
- **Trending Indicators**: Price growth, market momentum
- **Market Analysis**: Strongest, most liquid, premium locations
- **Auto-Refresh**: Optional real-time updates

### 🎓 Admin Training UI (`/admin/training`)
- **Configuration Panel**: Select dataset, epochs, batch size
- **Training Jobs**: Monitor 3 model types (valuation, liquidity, risk)
- **Progress Bars**: Visual training progress for each model
- **Metrics Display**: RMSE, MAE, R², AUC scores
- **Simulate Training**: Click "Start Training" to see progress animation

### 📋 Valuations List (`/valuations`)
- **Search/Filter**: Find by property or valuation ID
- **Grid Layout**: Address, value, confidence, time-to-sell, risk badges
- **Quick Actions**: Click to view detailed results

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/valuations` | Submit property, get valuation |
| `GET` | `/api/valuations` | List all valuations (paginated) |
| `GET` | `/api/valuations/[id]` | Get specific valuation or property history |
| `GET` | `/api/market-data` | Market intelligence by city/micromarket |
| `GET` | `/api/stats` | Dashboard aggregations |
| `GET` | `/api/ws/messages` | Polling for real-time updates |

**Full details**: See [API_EXAMPLES.md](API_EXAMPLES.md)

## Core Algorithms

### 1. Property Enrichment
- Geocoding (lat/long from address)
- Infrastructure scoring (POI proximity)
- Legal risk assessment
- Market demand metrics
- Rental yield analysis

### 2. Feature Engineering
- **Tabular** (30+ features): Area, age, quality, ownership, rental, market
- **Geospatial** (10+ features): POI proximity, neighborhood quality, urban planning
- **Multimodal** (placeholders): CV condition, NLP sentiment, OCR legal clarity
- **Interactions & time-series**: Feature crosses, seasonal patterns

### 3. Valuation Model
- **Type**: Hedonic regression (currently mock)
- **Approach**: Weighted ensemble of property × location × market signals
- **Output**: Point estimate + 95% confidence interval + confidence score
- **Floor**: Enforced against circle rate
- **To deploy real**: Replace with trained XGBoost/LightGBM

### 4. Liquidity Scoring
- **Time-to-Sell**: Days estimate based on infrastructure + legal + area
- **Resale Index**: 0-100 score measuring market absorptivity
- **Distress Discount**: Multiplier for liquidation scenarios
- **Absorption Probability**: % chance of sale within timeframe
- **To deploy real**: Replace with Cox survival analysis

### 5. Risk Classification
- **Flags**: High age, legal complexity, extreme LTV, poor liquidity, flood risk, leasehold
- **Severity**: low, medium, high with impact descriptions
- **To deploy real**: Add binary classifiers for each risk type

## What's Mock vs. Production-Ready

### ✅ Production-Ready
- Architecture (modular, scalable)
- API design (RESTful, extensible)
- Frontend (responsive, accessible)
- Database schema (MongoDB-normalized)
- Feature engineering (comprehensive)
- Explainability (SHAP-style importance)
- Error handling & validation
- Audit logging infrastructure

### ⚠️ Mock (Replace with Real)
- Circle rates (17 static values → integrate APIs)
- Market data (single snapshot → time-series)
- Valuation model (hedonic coefficients → train GBM)
- Liquidity model (simple regression → survival analysis)
- Risk classifiers (flags → real binary models)
- Multimodal features (placeholders → CV/NLP/OCR)
- Database (in-memory → MongoDB Atlas)
- Real-time (memory channels → Redis/Upstash)

## Integration Timeline

| Week | Focus | Effort |
|------|-------|--------|
| 1 | Data sources (circle rates, market data, geo) | 15h |
| 2 | Model training (collect data, feature eng, GBM) | 20h |
| 3 | Multimodal (CV/NLP/OCR feature extraction) | 15h |
| 4 | Production (MongoDB, Vercel, monitoring) | 10h |
| 5 | Optimization (caching, batch processing) | 10h |

**Total to production**: ~70 hours

## Common Tasks

### I want to...

**📌 Add a new data source**
→ See enrichment.ts, add function like `enrichCustomData()`

**🔄 Train a real model**
→ See SYSTEM_README.md "MODEL_TRAINING_REQUIRED" section

**🎨 Customize UI colors**
→ Edit `/app/globals.css` (design tokens)

**🚀 Deploy to production**
→ See SYSTEM_README.md "Production Deployment Checklist"

**📊 Add a new risk flag**
→ Add case to `inferRiskFlags()` in `/lib/models/inference.ts`

**🔌 Integrate an API**
→ Add function to `/lib/mockData.ts`, call from enrichment pipeline

**💾 Use real MongoDB**
→ Replace `/lib/db/client.ts` with MongoDB Atlas driver

**📡 Use real WebSockets**
→ Replace `/lib/websocket/broadcaster.ts` with Socket.io or similar

**🧠 Understand a specific flow**
→ Follow the "Data Flow Example" in BUILD_SUMMARY.md

## Helpful Resources

- **Getting started with Next.js**: https://nextjs.org/docs
- **Tailwind CSS docs**: https://tailwindcss.com/docs
- **shadcn/ui components**: https://ui.shadcn.com
- **Recharts documentation**: https://recharts.org
- **MongoDB schema design**: https://docs.mongodb.com
- **XGBoost Python**: https://xgboost.readthedocs.io
- **Real estate valuation papers**: Search "Automated Valuation Models 2024"

## Support & Questions

For questions about:
- **Architecture & design** → See SYSTEM_README.md
- **API usage** → See API_EXAMPLES.md
- **Code walkthrough** → See BUILD_SUMMARY.md
- **How to customize** → Check comments in source files (marked with `// TODO:` or `[MODEL_TRAINING_REQUIRED]`)

---

## Quick Navigation

```
START HERE
    ↓
BUILD_SUMMARY.md (what was built, how it works)
    ↓
Choose your path:
    
    Path A: I want to understand the system
    → SYSTEM_README.md (deep dive, architecture, data pipelines)
    
    Path B: I want to integrate with APIs
    → API_EXAMPLES.md (cURL, JavaScript, TypeScript examples)
    
    Path C: I want to add real models
    → SYSTEM_README.md (MODEL_TRAINING_REQUIRED sections)
    
    Path D: I want to customize the UI
    → app/ folder (React components, Tailwind CSS)
    
    Path E: I want to deploy to production
    → SYSTEM_README.md (Production Deployment Checklist)
```

---

**Last updated**: April 2024
**Status**: ✅ Complete - ready for real data & models
**Next step**: Replace mock data in `/lib/mockData.ts` with real sources

Happy building! 🚀
