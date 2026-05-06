# Deployment & Production Readiness Guide

## System Overview

This is a **production-ready, enterprise-grade collateral valuation engine** built with:
- **Frontend**: Next.js 16 + React 19 (TypeScript)
- **Backend**: Node.js API routes + MongoDB
- **ML Stack**: Python (XGBoost/LightGBM), PyTorch (ResNet/YOLOv8), HuggingFace transformers
- **Infrastructure**: Docker + Kubernetes (or Vercel)
- **Data**: PostgreSQL + MongoDB + Redis (optional)

---

## Phase 0: Pre-Deployment Checklist

### 0.1 API Keys & Credentials Setup

Create a `.env.local` file in project root:

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
POSTGRES_URL=postgresql://user:pass@localhost/collateral_db

# Geospatial & Market Data
GOOGLE_MAPS_API_KEY=your_key
GOOGLE_EARTH_ENGINE_KEY=service_account_key.json
OPENSTREETMAP_API_KEY=your_key

# Model Serving (if using cloud)
HUGGINGFACE_API_KEY=your_key
REPLICATE_API_KEY=your_key
OPENAI_API_KEY=your_key # For LLM components

# Portal Scrapers (optional)
MAGICBRICKS_SCRAPER_KEY=your_key
99ACRES_API_KEY=your_key
HOUSING_COM_API_KEY=your_key

# Data Ingestion
CIRCLE_RATE_PORTAL_CREDS=json_creds
CERSAI_API_KEY=your_key
RERA_PORTAL_CREDS=json_creds

# Monitoring & Analytics
SENTRY_DSN=https://key@sentry.io/project
DATADOG_API_KEY=your_key
ELASTIC_CLOUD_ID=your_id
ELASTIC_API_KEY=your_key

# Optional: Cache & Sessions
REDIS_URL=redis://localhost:6379
SESSION_SECRET=secure_random_string

# Feature Flags
FEATURE_FLAGS_API_KEY=your_key
```

### 0.2 Environment Variables for Deployment

For Vercel deployment, add to project Settings → Environment Variables:

```
MONGODB_URI
POSTGRES_URL
GOOGLE_MAPS_API_KEY
GOOGLE_EARTH_ENGINE_KEY
SENTRY_DSN
```

### 0.3 Models & Checkpoints

Download or train the following models:

```
models/
├── valuation_gbm.json (XGBoost checkpoint)
├── liquidity_survival.pkl (Python pickle)
├── condition_resnet18.pt (PyTorch)
├── amenity_yolov8.pt (YOLO)
├── legal_bert_finetuned.bin (HuggingFace)
├── description_sentiment_roberta.bin
└── scaler.pkl (feature normalization)
```

Create a model loading service:

```typescript
// lib/models/loader.ts
import * as xgb from 'xgboost';
import * as onnx from 'onnxruntime-web';

export async function loadModels() {
  const models = {
    valuation: await xgb.XGBoostModel.load('models/valuation_gbm.json'),
    condition: await onnx.loadModel('models/condition_resnet18.onnx'),
    amenity: await onnx.loadModel('models/amenity_yolov8.onnx'),
  };
  return models;
}
```

---

## Phase 1: Local Development Setup

### 1.1 Install Dependencies

```bash
pnpm install
# or
npm install
# or
yarn install
```

### 1.2 Start Development Server

```bash
pnpm dev
```

Server runs on `http://localhost:3000`

### 1.3 Database Setup

```bash
# MongoDB Atlas or local
# Create collections automatically via Mongoose/Prisma schemas

# Or run migration:
pnpm run db:migrate
```

### 1.4 Test Locally

```bash
# Run API endpoint tests
pnpm test

# Test valuation pipeline
curl -X POST http://localhost:3000/api/valuations \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St",
    "pincode": "400001",
    "propertyType": "apartment",
    "builtupArea": 1200
  }'
```

---

## Phase 2: Docker Containerization

### 2.1 Create Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Next.js
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["pnpm", "start"]
```

### 2.2 Build & Test Docker Image

```bash
# Build image
docker build -t collateral-valuation:latest .

# Run container
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://mongo:27017 \
  collateral-valuation:latest

# Test
curl http://localhost:3000/api/valuations
```

### 2.3 Docker Compose (Multi-service)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017
      - POSTGRES_URL=postgresql://postgres:password@db:5432/collateral
    depends_on:
      - mongo
      - db
      - redis

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=collateral
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
  postgres_data:
```

---

## Phase 3: Kubernetes Deployment

### 3.1 Create Kubernetes Manifests

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: collateral-valuation
spec:
  replicas: 3
  selector:
    matchLabels:
      app: collateral-valuation
  template:
    metadata:
      labels:
        app: collateral-valuation
    spec:
      containers:
      - name: app
        image: collateral-valuation:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb_uri
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: postgres_url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: collateral-valuation-service
spec:
  selector:
    app: collateral-valuation
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
```

### 3.2 Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace collateral

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=mongodb_uri=mongodb+srv://... \
  --from-literal=postgres_url=postgresql://... \
  -n collateral

# Deploy
kubectl apply -f k8s/ -n collateral

# Check status
kubectl get pods -n collateral
kubectl get svc -n collateral
```

---

## Phase 4: Vercel Deployment

### 4.1 Connect GitHub Repository

1. Push code to GitHub
2. Go to vercel.com
3. Click "New Project"
4. Import GitHub repository
5. Configure environment variables

### 4.2 Set Environment Variables in Vercel

Settings → Environment Variables

```
MONGODB_URI=...
POSTGRES_URL=...
GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app
```

### 4.3 Deploy

```bash
vercel deploy
# or automatic via GitHub push
```

---

## Phase 5: API Documentation & Testing

### 5.1 Swagger/OpenAPI Setup

```typescript
// lib/openapi.ts
import { getServerSession } from 'next-auth';

export const openapi = {
  openapi: '3.0.0',
  info: {
    title: 'Collateral Valuation Engine',
    version: '1.0.0',
  },
  servers: [
    { url: 'https://api.collateral-valuation.io' },
  ],
  paths: {
    '/api/valuations': {
      post: {
        summary: 'Create new valuation',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValuationRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Valuation result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValuationResponse' },
              },
            },
          },
        },
      },
    },
  },
};
```

### 5.2 API Testing

```bash
# Test with curl
curl -X POST https://your-domain/api/valuations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "address": "123 Main St",
    "pincode": "400001",
    "propertyType": "apartment",
    "builtupArea": 1200,
    "loanAmount": 5000000
  }'

# Test with Postman
# Import: docs/postman_collection.json

# Test with Jest
pnpm test api.test.ts
```

---

## Phase 6: Monitoring & Observability

### 6.1 Sentry Error Tracking

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
  ],
});
```

### 6.2 Logging & Analytics

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});
```

### 6.3 Performance Monitoring

```typescript
// lib/monitoring.ts
import { performance } from 'perf_hooks';

export function measurePerformance(fn: () => Promise<any>, label: string) {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      logger.info({ label, duration_ms: duration }, 'Performance');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error({ label, duration_ms: duration, error }, 'Performance');
      throw error;
    }
  };
}
```

---

## Phase 7: Security Hardening

### 7.1 Input Validation

```typescript
// Validate all requests
import { z } from 'zod';

const ValuationRequestSchema = z.object({
  address: z.string().min(5).max(200),
  pincode: z.string().regex(/^\d{6}$/),
  propertyType: z.enum(['apartment', 'villa', 'commercial', 'land']),
  builtupArea: z.number().positive(),
  loanAmount: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = ValuationRequestSchema.parse(body);
    // Process...
  } catch (error) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

### 7.2 Rate Limiting

```typescript
// lib/rateLimit.ts
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute',
});

export async function checkRateLimit(ip: string) {
  return await limiter.removeTokens(1);
}
```

### 7.3 CORS & CSRF Protection

```typescript
// app/api/middleware.ts
export function corsMiddleware(response: Response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  return response;
}
```

---

## Phase 8: Performance Optimization

### 8.1 Caching Strategy

```typescript
// Use Redis for hot data
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedCircleRate(pincode: string) {
  const cached = await redis.get(`circle_rate:${pincode}`);
  if (cached) return JSON.parse(cached);

  const rate = await fetchCircleRate(pincode);
  await redis.setex(`circle_rate:${pincode}`, 86400, JSON.stringify(rate)); // 24h
  return rate;
}
```

### 8.2 Database Indexing

```typescript
// MongoDB indexes
db.collection('properties').createIndex({
  pincode: 1,
  propertyType: 1,
  builtupArea: 1,
});

db.collection('properties').createIndex({
  location: '2dsphere', // Geospatial
});

// PostgreSQL indexes
CREATE INDEX idx_properties_pincode ON properties(pincode);
CREATE INDEX idx_properties_location ON properties USING GIST(location);
```

### 8.3 Query Optimization

```typescript
// Use projections to fetch only needed fields
const properties = await db.collection('properties')
  .find({ pincode: '400001' })
  .project({ address: 1, loanAmount: 1, valuation: 1 })
  .limit(100)
  .toArray();
```

---

## Phase 9: Backup & Disaster Recovery

### 9.1 Database Backups

```bash
# MongoDB Atlas: Enable automated backups (daily)
# Restore: https://docs.atlas.mongodb.com/backup/restore-data/

# PostgreSQL: Use pg_dump
pg_dump -U postgres collateral_db > backup.sql
psql -U postgres collateral_db < backup.sql

# S3 Backups
aws s3 cp backup.sql s3://collateral-backups/$(date +%Y%m%d_%H%M%S).sql
```

### 9.2 Disaster Recovery Plan

1. **RTO** (Recovery Time Objective): < 4 hours
2. **RPO** (Recovery Point Objective): < 1 hour
3. **Failover**: Use multi-region deployment (primary + hot standby)
4. **Testing**: Monthly DR drills

---

## Phase 10: Model Management & Retraining

### 10.1 Model Versioning

```typescript
// models/versions.ts
export const modelVersions = {
  '1.0.0': {
    valuation: 'models/v1.0.0/valuation.json',
    liquidity: 'models/v1.0.0/liquidity.pkl',
    created: '2024-01-15',
    status: 'production',
    r_squared: 0.87,
  },
  '1.1.0': {
    valuation: 'models/v1.1.0/valuation.json',
    liquidity: 'models/v1.1.0/liquidity.pkl',
    created: '2024-04-01',
    status: 'staging',
    r_squared: 0.92,
  },
};

export function getActiveModel() {
  return Object.entries(modelVersions)
    .find(([_, v]) => v.status === 'production')[0];
}
```

### 10.2 Retraining Pipeline

```bash
# Monthly retraining job
# tools/retrain_models.py

python tools/retrain_models.py \
  --data data/latest_transactions.csv \
  --output models/v1.2.0/ \
  --validation_split 0.2 \
  --test_split 0.1
```

### 10.3 A/B Testing

```typescript
// Test new model against production
export async function evaluateNewModel(newModel: any, testData: any[]) {
  const results = {
    production: [] as number[],
    candidate: [] as number[],
  };

  for (const prop of testData) {
    const prodValue = getActiveModel().predict(prop);
    const candValue = newModel.predict(prop);
    results.production.push(prodValue);
    results.candidate.push(candValue);
  }

  return calculateMetrics(results);
}
```

---

## Phase 11: Compliance & Legal

### 11.1 Data Privacy (DPDP Act)

- ✅ Implement data retention policies (3 years for transactional data)
- ✅ Anonymize PII in logs
- ✅ Encrypt sensitive fields (SSN, phone, email)
- ✅ Provide data export/deletion capabilities

```typescript
// Encrypt PII
import crypto from 'crypto';

export function encryptPII(value: string) {
  return crypto.encrypt(value, process.env.ENCRYPTION_KEY);
}

export async function deleteUserData(userId: string) {
  await db.collection('users').updateOne(
    { _id: userId },
    { $set: { dataDeleted: true, deletedAt: new Date() } }
  );
}
```

### 11.2 Regulatory Compliance

- ✅ Model card & documentation (RICS, IVS, IAAO standards)
- ✅ Audit trail (who valued what, when)
- ✅ Explainability reports (SHAP values for each valuation)
- ✅ Regular model backtesting

---

## Phase 12: Launch Checklist

- [ ] All env variables configured
- [ ] Database migrations completed
- [ ] Models trained & validated (R² > 0.85)
- [ ] API endpoints tested (all 10+ routes)
- [ ] Frontend UI tested (all pages)
- [ ] Security audit passed
- [ ] Performance benchmarks met (< 2s API response)
- [ ] Monitoring & alerting active
- [ ] Backup & DR tested
- [ ] Documentation complete
- [ ] User acceptance testing (UAT) passed
- [ ] Go-live date confirmed

---

## Post-Launch Monitoring

### Daily
- [ ] Check error rates (Sentry)
- [ ] Review slow queries (DataDog)
- [ ] Monitor disk space & memory

### Weekly
- [ ] Review model performance (accuracy, bias)
- [ ] Check data quality metrics
- [ ] Review user feedback

### Monthly
- [ ] Retrain models with new data
- [ ] Security updates (dependencies)
- [ ] Disaster recovery drill

---

## Support & Escalation

**Production Issue?**
1. Check Sentry dashboard
2. Review DataDog metrics
3. Check database connectivity
4. Restart affected services
5. If unresolved: Page on-call engineer

**Model Performance Degradation?**
1. Check data quality metrics
2. Review recent data distribution changes
3. Retrain with latest data
4. A/B test new model

---

## Contact & Resources

- **Documentation**: `/docs` folder
- **API Reference**: `/docs/API_EXAMPLES.md`
- **Architecture**: `/SYSTEM_README.md`
- **Features**: `/docs/FEATURES_CHECKLIST.md`
- **Support**: dev-team@collateral-valuation.io

Good luck with production deployment! 🚀
