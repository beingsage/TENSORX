# ML Repositories Integration Guide

## Overview

This guide explains how to integrate the 5 ML repositories into the main Next.js valuation application (`app/`) for end-to-end property valuation.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Next.js App (Frontend + API Routes)             │
│         Port: 3000                                       │
├─────────────────────────────────────────────────────────┤
│ /api/ml/external-models          [NEW]                 │
│ /api/valuation/comprehensive     [EXISTING]             │
│ /api/valuations                  [EXISTING]             │
└─────────────────────────────────────────────────────────┘
         ↓ (HTTP REST calls)
┌─────────────────────────────────────────────────────────┐
│      Microservices / External ML Models                  │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐│
│ │ Real-Estate-Valuation-Model (Flask)                 ││
│ │ Port: 5000 | CPU: 2+ cores | RAM: 4GB              ││
│ │ Input: house age, MRT distance, convenience stores  ││
│ │ Output: Price prediction (linear regression)        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ RealValue (TensorFlow CNN + Dense)                  ││
│ │ Port: 5001 | GPU: 6GB+ NVIDIA | RAM: 16GB         ││
│ │ Input: 4 property images + property features        ││
│ │ Output: Price estimate + condition score            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ House-Price-Estimator (Ensemble)                    ││
│ │ Port: 5002 | CPU: 2+ cores | RAM: 8GB             ││
│ │ Input: Property features                            ││
│ │ Output: RF + GBM + SVR predictions                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ GraphSAGE (Market Intelligence)                     ││
│ │ Port: 5003 | GPU: 4GB+ NVIDIA | RAM: 8-16GB       ││
│ │ Input: Broker IDs, location, radius                 ││
│ │ Output: Market sentiment, liquidity indicators      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ PostgreSQL Database                                 ││
│ │ Port: 5432 | Storage: TimescaleDB                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Redis (Optional Job Queues)                         ││
│ │ Port: 6379                                          ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Option 1: Docker Compose (Recommended)

**Start all services with one command:**

```bash
cd /media/sagesujal/DEV1/bytes/psv/ignore/cost_analysis

# Start all services
docker-compose -f docker-compose.ml-services.yml up -d

# View logs
docker-compose -f docker-compose.ml-services.yml logs -f

# Stop all services
docker-compose -f docker-compose.ml-services.yml down
```

**Required system resources:**
- CPU: 8+ cores (for parallel processing)
- RAM: 32GB+ (for RealValue and GraphSAGE)
- GPU: 8GB+ NVIDIA CUDA (for image processing and graph learning)
- Disk: 20GB (for models and data)

### Option 2: Manual Service Setup

**1. Real-Estate-Valuation-Model (Flask API)**
```bash
cd Real-Estate-Valuation-Model
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

**2. RealValue (TensorFlow CNN + Dense)**
```bash
cd RealValue
pip install -r requirements.txt
python pipeline.py  # Or create Flask wrapper
# Runs on http://localhost:5001
```

**3. House-Price-Estimator (Ensemble)**
```bash
cd House-Price-Estimator
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5002
```

**4. GraphSAGE (Market Intelligence)**
```bash
cd GraphSAGE
pip install -r requirements.txt
bash example_unsupervised.sh  # Or create Flask wrapper
# Runs on http://localhost:5003
```

**5. Next.js Main App**
```bash
cd app
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

## Integration Points

### New API Endpoint: `/api/ml/external-models`

**Request:**
```bash
curl -X POST http://localhost:3000/api/ml/external-models \
  -H "Content-Type: application/json" \
  -d '{
    "baseValuation": 1000000,
    "houseAge": 5,
    "mrtDistance": 500,
    "convenienceStores": 10,
    "bedrooms": 3,
    "bathrooms": 2,
    "squareFeet": 1500,
    "postalCode": "M5V 3A8",
    "latitude": 43.6629,
    "longitude": -79.3957,
    "images": {
      "bedroom": "base64_image_data",
      "bathroom": "base64_image_data",
      "kitchen": "base64_image_data",
      "frontal": "base64_image_data"
    },
    "brokerIds": ["broker-123", "broker-456"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "realEstateModel": {
      "prediction": 945000,
      "confidence": 0.82,
      "model": "LinearRegression"
    },
    "housePriceEnsemble": {
      "predictions": {
        "randomForest": 1050000,
        "gradientBoosting": 980000,
        "svr": 1000000
      },
      "ensemble": 1010000,
      "std": 35000,
      "algorithms": ["RandomForest", "GradientBoosting", "SVR"]
    },
    "realValue": {
      "priceEstimate": 1025000,
      "priceRange": {
        "lower": 950000,
        "upper": 1100000
      },
      "confidence": 0.79,
      "conditionScore": 8.2,
      "amenityFlags": ["updated_kitchen", "hardwood_floors"]
    },
    "graphSage": {
      "brokerNetworkScore": 0.78,
      "marketSentiment": "positive",
      "liquidityIndicator": 0.82,
      "competitionLevel": "medium",
      "embeddingDimensions": 128
    },
    "combinedScore": 1018750,
    "adjustments": {
      "realEstateModel": 945000,
      "housePriceEnsemble": 1010000,
      "realValue": 1025000,
      "marketLiquidity": 0.082
    }
  },
  "timestamp": "2026-04-29T12:34:56.789Z"
}
```

## Integration with Existing Valuation System

### In `/lib/valuation/comprehensive.ts`:

```typescript
import { orchestrateExternalModels } from '@/lib/ml/externalModels';

export async function computeComprehensiveValuation(
  propertyId: string,
  lat: number,
  lng: number,
  baseValuation: number,
  includeRaw: boolean = false
) {
  // Existing code...
  
  // NEW: Integrate external ML models
  const externalResults = await orchestrateExternalModels({
    baseValuation,
    houseAge: propertyData.houseAge,
    mrtDistance: propertyData.mrtDistance,
    convenienceStores: propertyData.stores,
    bedrooms: propertyData.bedrooms,
    bathrooms: propertyData.bathrooms,
    squareFeet: propertyData.area,
    postalCode: propertyData.postalCode,
    images: propertyData.images,
    latitude: lat,
    longitude: lng,
  });

  // Blend results
  const weights = {
    existing: 0.4,
    external: 0.6,
  };

  const finalValuation = 
    valuation * weights.existing + 
    externalResults.combinedScore * weights.external;

  return {
    valuation: finalValuation,
    externalModelsContribution: externalResults,
    details: includeRaw ? externalResults : undefined,
  };
}
```

## Model Configuration

### Environment Variables (`app/.env.local`):

```env
# External ML Services
REAL_ESTATE_API_URL=http://localhost:5000
REALVALUE_API_URL=http://localhost:5001
HOUSE_ESTIMATOR_API_URL=http://localhost:5002
GRAPHSAGE_API_URL=http://localhost:5003

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/valuations

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

## Performance Characteristics

| Model | Latency | GPU Needed | Memory | Accuracy |
|-------|---------|-----------|--------|----------|
| **Real-Estate-Valuation-Model** | ~50ms | No | 100MB | ~80% |
| **RealValue** | 500-1000ms | Yes (6GB+) | 2-4GB | ~83% |
| **House-Price-Estimator** | ~200ms | Optional | 500MB | ~75-85% |
| **GraphSAGE** | ~300-500ms | Yes (4GB+) | 2-8GB | ~78% |
| **Combined Inference** | ~2s | Yes | 6GB+ | ~85-90% |

## Deployment Options

### Production Deployment on AWS/Azure/GCP

**1. Kubernetes with GPU support:**
```bash
# Create deployments for each service
kubectl apply -f k8s/real-estate-model.yaml
kubectl apply -f k8s/realvalue.yaml
kubectl apply -f k8s/house-estimator.yaml
kubectl apply -f k8s/graphsage.yaml
kubectl apply -f k8s/app.yaml
```

**2. Lambda + SageMaker (Serverless):**
- Pre-compute model embeddings
- Deploy models as SageMaker endpoints
- Call from Lambda via /api endpoints

**3. EC2 + ECS (Container orchestration):**
- Use ECS task definitions for each service
- Load balancing with ALB
- Auto-scaling based on CPU/memory

## Troubleshooting

### Service Health Checks

```bash
# Check if services are running
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health
```

### Common Issues

| Issue | Solution |
|-------|----------|
| CUDA out of memory | Reduce batch size, use smaller models |
| Service timeout | Increase timeout in externalModels.ts |
| Database connection error | Check DATABASE_URL env var |
| Models not loading | Verify model paths, check file permissions |

## Next Steps

1. **Deploy real-estate-model first** (simplest, CPU-only)
2. **Add house-estimator** (ensemble predictions)
3. **Deploy realvalue** (needs GPU, highest accuracy)
4. **Integrate graphsage** (market intelligence)
5. **Monitor performance** with Prometheus/Grafana
6. **Optimize inference** with model quantization/pruning

## References

- [Real-Estate-Valuation-Model Docs](../Real-Estate-Valuation-Model/Documentation_of_Real_Estate_Valuation_Model.pdf)
- [RealValue GitHub](../RealValue/README.md)
- [House-Price-Estimator Notebooks](../House-Price-Estimator/)
- [GraphSAGE Examples](../GraphSAGE/example_unsupervised.sh)
