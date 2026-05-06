# API Examples & cURL Commands

Complete reference for using the Collateral Valuation Engine API.

## 1. Submit a Valuation

### Request
```bash
curl -X POST http://localhost:3000/api/valuations \
  -H "Content-Type: application/json" \
  -d '{
    "address": "456 MG Road, Bangalore",
    "pincode": "560034",
    "propertyType": "2BHK",
    "builtupArea": 1100,
    "ageInYears": 7,
    "constructionQuality": "premium",
    "isFreehold": true,
    "loanAmount": 5500000,
    "rentalIncome": 65000,
    "occupancyStatus": "occupied",
    "legalStatus": "clear",
    "mortgageStatus": "clear",
    "description": "Well-maintained apartment near tech park with parking"
  }'
```

### Response
```json
{
  "success": true,
  "valuationId": "VAL-1713452789456",
  "propertyId": "PROP-1713452789123",
  "result": {
    "timestamp": "2024-04-18T10:33:09Z",
    "propertyId": "PROP-1713452789123",
    "valuationId": "VAL-1713452789456",
    
    "valuation": {
      "pointEstimate": 8750000,
      "lowerBound": 7437500,
      "upperBound": 10062500,
      "confidence": 0.87,
      "estimationMethod": "hedonic-gbm-ensemble"
    },

    "liquidity": {
      "resalePotentialIndex": 72,
      "estimatedTimeToSell": 48,
      "distressDiscount": 0.96,
      "absorptionProbability": 0.74
    },

    "riskFlags": [
      {
        "flag": "low_rental_yield",
        "severity": "low",
        "description": "Rental yield is 1.41% (below 2% benchmark)",
        "impact": "Lower income generation, affects investor appeal"
      }
    ],

    "explanation": {
      "topDrivers": [
        {
          "feature": "builtupArea",
          "contribution": 35,
          "direction": "positive",
          "value": 1100
        },
        {
          "feature": "infrastructureScore",
          "contribution": 28,
          "direction": "positive",
          "value": 84
        },
        {
          "feature": "ageInYears",
          "contribution": 12,
          "direction": "negative",
          "value": 7
        },
        {
          "feature": "priceGrowthYoY",
          "contribution": 15,
          "direction": "positive",
          "value": 0.10
        }
      ],
      "confidenceBreakdown": {
        "dataCompleteness": 85.5,
        "modelAccuracy": 85,
        "marketVolatility": 10.5
      },
      "notes": "Valuation based on 42 features including property attributes, market conditions, and geospatial signals. 1 risk flag identified."
    },

    "features": {
      "tabular": {
        "builtupArea": 1100,
        "propertyType": "2BHK",
        "ageInYears": 7,
        "rentalYield": 0.1412,
        "daysOnMarket": 50,
        "infrastructureScore": 84,
        "legalRiskScore": 18,
        "ltvRatio": 0.639
      },
      "geospatial": {
        "infrastructureScore": 84,
        "metroProximity": 16.0,
        "schoolProximity": 67.2,
        "neighborhoodQuality": 0.83
      },
      "multimodal": {}
    },

    "modelVersion": "1.0.0-mock-gbm",
    "status": "completed",
    "processingTimeMs": 247
  },
  "timestamp": "2024-04-18T10:33:09Z"
}
```

## 2. Get Valuation Details

### By Valuation ID
```bash
curl http://localhost:3000/api/valuations/VAL-1713452789456
```

### By Property ID (get all valuations for property)
```bash
curl http://localhost:3000/api/valuations/PROP-1713452789123
```

### Response
```json
{
  "success": true,
  "count": 1,
  "data": { /* Same structure as above */ }
}
```

## 3. List All Valuations

### Request
```bash
curl "http://localhost:3000/api/valuations?limit=10&offset=0"
```

### Response
```json
{
  "success": true,
  "count": 3,
  "limit": 10,
  "offset": 0,
  "data": [
    { /* Full valuation 1 */ },
    { /* Full valuation 2 */ },
    { /* Full valuation 3 */ }
  ]
}
```

## 4. Get Market Data

### For Specific Micromarket
```bash
curl "http://localhost:3000/api/market-data?city=delhi&micromarket=gurgaon"
```

### Response
```json
{
  "success": true,
  "data": {
    "city": "delhi",
    "micromarket": "gurgaon",
    "avgDaysOnMarket": 55,
    "absorptionRate": 0.70,
    "listingDensity": 150,
    "priceGrowthYoY": 0.06,
    "circleRate": 950000,
    "infrastructureScore": 80,
    "timestamp": "2024-04-18T10:33:09Z"
  }
}
```

### For All Micromarkets in City
```bash
curl "http://localhost:3000/api/market-data?city=bangalore"
```

### Response
```json
{
  "success": true,
  "count": 4,
  "data": [
    { "micromarket": "koramangala", "absorptionRate": 0.72, ... },
    { "micromarket": "indiranagar", "absorptionRate": 0.68, ... },
    { "micromarket": "whitefield", "absorptionRate": 0.65, ... },
    { "micromarket": "outer-ring-road", "absorptionRate": 0.62, ... }
  ]
}
```

## 5. Get Dashboard Stats

### Request
```bash
curl http://localhost:3000/api/stats
```

### Response
```json
{
  "success": true,
  "timestamp": "2024-04-18T10:33:09Z",
  
  "properties": {
    "total": 5,
    "byCity": {
      "delhi": 2,
      "mumbai": 1,
      "bangalore": 1,
      "hyderabad": 1
    },
    "byType": {
      "2BHK": 2,
      "3BHK": 2,
      "4BHK": 1
    }
  },

  "valuations": {
    "total": 5,
    "avgValue": 10800000,
    "avgConfidence": 0.85,
    "averageTimeToSell": 52
  },

  "riskFlags": {
    "high_age": 1,
    "legal_complexity": 1,
    "low_rental_yield": 2
  },

  "liquidity": {
    "avgResalePotentialIndex": 68,
    "avgTimeToSell": 52
  },

  "recentData": {
    "properties": [ /* Last 5 properties */ ],
    "valuations": [ /* Last 5 valuations */ ]
  }
}
```

## 6. Get Real-Time Messages (Polling)

### Subscribe to Channel
```bash
curl "http://localhost:3000/api/ws/messages?channel=valuations"
```

### Poll for Updates
```bash
# Get all messages in channel
curl "http://localhost:3000/api/ws/messages?channel=valuations"

# Get messages since last time
curl "http://localhost:3000/api/ws/messages?channel=valuations&lastTime=2024-04-18T10:30:00Z"

# Get market update channel
curl "http://localhost:3000/api/ws/messages?channel=market-data"

# Get property-specific channel
curl "http://localhost:3000/api/ws/messages?channel=property:PROP-123456"
```

### Response
```json
{
  "success": true,
  "channel": "valuations",
  "messageCount": 2,
  "messages": [
    {
      "type": "valuation_complete",
      "timestamp": "2024-04-18T10:33:09Z",
      "data": {
        "valuationId": "VAL-1713452789456",
        "propertyId": "PROP-1713452789123",
        "pointEstimate": 8750000,
        "confidence": 0.87,
        "riskFlags": [ /* ... */ ],
        "liquidity": { /* ... */ }
      },
      "priority": "high"
    }
  ],
  "timestamp": "2024-04-18T10:33:20Z"
}
```

## Response Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 400  | Bad request (validation error) |
| 404  | Not found |
| 500  | Server error |

## Error Response Example

```json
{
  "success": false,
  "error": "Missing required fields: address, pincode, propertyType, builtupArea"
}
```

## JavaScript/TypeScript Examples

### Using Fetch
```typescript
// Submit valuation
const response = await fetch('/api/valuations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '123 Main St, Delhi',
    pincode: '110001',
    propertyType: '2BHK',
    builtupArea: 1200,
    ageInYears: 5,
    constructionQuality: 'standard',
    isFreehold: true,
    loanAmount: 5000000,
  }),
});

const result = await response.json();
console.log('Valuation ID:', result.valuationId);
console.log('Estimated Value:', result.result.valuation.pointEstimate);
console.log('Confidence:', result.result.valuation.confidence);
console.log('Liquidity Index:', result.result.liquidity.resalePotentialIndex);
console.log('Risk Flags:', result.result.riskFlags);
```

### Real-Time Updates with Polling
```typescript
let lastMessageTime = new Date();

async function pollForUpdates() {
  const response = await fetch(
    `/api/ws/messages?channel=valuations&lastTime=${lastMessageTime.toISOString()}`
  );
  const data = await response.json();
  
  data.messages.forEach(message => {
    if (message.type === 'valuation_complete') {
      console.log('New valuation:', message.data.valuationId);
      // Update UI with new valuation
    }
  });
  
  lastMessageTime = new Date();
}

// Poll every 5 seconds
setInterval(pollForUpdates, 5000);
```

### Fetch Market Data
```typescript
const response = await fetch('/api/market-data?city=delhi&micromarket=gurgaon');
const data = await response.json();

console.log('Absorption Rate:', data.data.absorptionRate); // 0.70
console.log('Price Growth YoY:', data.data.priceGrowthYoY); // 0.06
console.log('Infrastructure Score:', data.data.infrastructureScore); // 80
```

## Integration Example: Full Valuation Flow

```typescript
async function submitAndTrackValuation(propertyData) {
  // 1. Submit property
  const submitRes = await fetch('/api/valuations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(propertyData),
  });
  
  const { valuationId, result } = await submitRes.json();
  console.log(`Valuation ${valuationId} created in ${result.processingTimeMs}ms`);

  // 2. Display results
  const valuation = result.valuation;
  console.log(`Estimated: ₹${valuation.pointEstimate}`);
  console.log(`Range: ₹${valuation.lowerBound} - ₹${valuation.upperBound}`);
  console.log(`Confidence: ${(valuation.confidence * 100).toFixed(0)}%`);

  const liquidity = result.liquidity;
  console.log(`Resale Index: ${liquidity.resalePotentialIndex}/100`);
  console.log(`Time-to-Sell: ${liquidity.estimatedTimeToSell} days`);

  // 3. Show risk flags
  if (result.riskFlags.length > 0) {
    console.log('⚠️  Risk Flags:');
    result.riskFlags.forEach(flag => {
      console.log(`  [${flag.severity.toUpperCase()}] ${flag.flag}: ${flag.impact}`);
    });
  }

  // 4. Show top drivers
  console.log('📊 Value Drivers:');
  result.explanation.topDrivers.forEach(driver => {
    console.log(`  ${driver.feature}: ${driver.contribution}% (${driver.direction})`);
  });

  return { valuationId, result };
}
```

---

For more examples and detailed documentation, see `SYSTEM_README.md`
