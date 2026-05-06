/**
 * FEDERATED LEARNING CONSORTIUM ACROSS NBFCS
 * Idea #2: Train shared GBM/GNN models on private loan performance data
 * without sharing raw records. Adds real exit certainty signals.
 * 
 * Implementation: Flower (federated learning framework) + XGBoost
 * Each NBFC trains local model → federated aggregation → global model
 * 
 * Output: historical_liquidation_multiplier, real_exit_certainty
 * Directly scales time_to_sell_days and distress_value_range
 */

export interface LoanPerformanceData {
  loanId: string;
  propertyValue: number;
  loanAmount: number;
  ltv: number;
  durationMonths: number;
  
  // Outcome variables
  defaulted: boolean;
  daysToLiquidate?: number; // If sold/liquidated
  liquidationValue?: number;
  recoveryRate: number; // Actual sale price / loan amount
  
  // Features
  propertyType: string;
  propertyAge: number;
  location: { pincode: string; district: string };
  borrowerCreditScore: number;
  borrowerEmploymentType: string; // salaried, self-employed, business
}

export interface FederatedClientConfig {
  clientId: string; // NBFC identifier
  localDataSize: number;
  modelVersion: string;
  privacyBudget: number; // Differential privacy epsilon
}

export interface FederatedRound {
  roundNumber: number;
  participatingClients: string[];
  globalModelWeights: Record<string, number[]>;
  averageLoss: number;
  timestamp: Date;
}

export interface LiquidationMultiplier {
  propertyType: string;
  ltv: number;
  ltvBucket: string;
  medianDaysToLiquidate: number;
  p25DaysToLiquidate: number;
  p75DaysToLiquidate: number;
  recoveryRateAvg: number;
  recoveryRateStdDev: number;
  sampleSize: number;
  confidence: number;
}

/**
 * LOCAL MODEL TRAINING FOR SINGLE NBFC
 * Each NBFC trains XGBoost locally on their data
 * Returns model weights (not raw data)
 */
export function trainLocalXGBoostModel(
  loanData: LoanPerformanceData[],
  config: FederatedClientConfig
): {
  modelWeights: Record<string, number[]>;
  loss: number;
  sampleCount: number;
  clientId: string;
} {
  // In production: Use XGBoost library
  // Inputs: Feature engineering on loan + property data
  // Target: Time-to-liquidate (regression) or Default (classification)
  // Output: Tree weights + intercepts

  console.log(
    `[Federated] Client ${config.clientId}: Training on ${loanData.length} local samples`
  );

  // Extract features and targets
  const features = loanData.map(loan => ({
    ltv: loan.ltv,
    propertyAge: loan.propertyAge,
    borrowerScore: loan.borrowerCreditScore,
    durationMonths: loan.durationMonths,
    isCommercial: loan.propertyType === 'commercial' ? 1 : 0,
  }));

  const targets = loanData.map(loan => loan.daysToLiquidate || 180); // Default 180 days if not liquidated

  // Mock XGBoost training (in production: use xgboost-py or xgb library)
  // Simulate feature importance + tree weights
  const mockWeights: Record<string, number[]> = {
    featureImportance: [0.3, 0.25, 0.2, 0.15, 0.1], // LTV, age, score, duration, type
    treeWeights: Array.from({ length: 100 }, () => Math.random() - 0.5),
    learningRate: [0.1],
    maxDepth: [6],
  };

  const mockLoss = 15 + Math.random() * 10; // MSE ~15-25 days

  return {
    modelWeights: mockWeights,
    loss: mockLoss,
    sampleCount: loanData.length,
    clientId: config.clientId,
  };
}

/**
 * FEDERATED AGGREGATION (SERVER-SIDE)
 * Aggregates weights from multiple NBFCs securely
 * FedAvg algorithm: Global weights = mean of local weights
 */
export function federatedAverage(
  clientUpdates: Array<{
    clientId: string;
    modelWeights: Record<string, number[]>;
    sampleCount: number;
  }>
): Record<string, number[]> {
  console.log(
    `[Federated] Aggregating ${clientUpdates.length} client updates...`
  );

  if (clientUpdates.length === 0) return {};

  // Calculate weighted average (weight by sample size for fairness)
  const totalSamples = clientUpdates.reduce((sum, c) => sum + c.sampleCount, 0);

  const aggregatedWeights: Record<string, number[]> = {};

  // Get all keys from first update
  const firstUpdate = clientUpdates[0];
  for (const key of Object.keys(firstUpdate.modelWeights)) {
    const weightArrays = clientUpdates.map(c => c.modelWeights[key]);
    const maxLength = Math.max(...weightArrays.map(w => w.length));

    aggregatedWeights[key] = Array.from({ length: maxLength }, (_, idx) => {
      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < clientUpdates.length; i++) {
        const weight = clientUpdates[i].sampleCount / totalSamples;
        if (idx < clientUpdates[i].modelWeights[key].length) {
          weightedSum += clientUpdates[i].modelWeights[key][idx] * weight;
          weightSum += weight;
        }
      }

      return weightSum > 0 ? weightedSum / weightSum : 0;
    });
  }

  return aggregatedWeights;
}

/**
 * DIFFERENTIAL PRIVACY: ADD NOISE TO PROTECT INDIVIDUAL NBFC DATA
 * Laplace mechanism: noise = Laplace(0, sensitivity/epsilon)
 */
export function addDifferentialPrivacyNoise(
  weights: Record<string, number[]>,
  epsilon: number = 1.0,
  sensitivity: number = 1.0
): Record<string, number[]> {
  const scale = sensitivity / epsilon;
  const noisyWeights: Record<string, number[]> = {};

  for (const [key, weightArray] of Object.entries(weights)) {
    noisyWeights[key] = weightArray.map(w => {
      // Laplace noise
      const u = Math.random();
      const laplacNoise = scale * (Math.log(u) - Math.log(1 - u));
      return w + laplacNoise;
    });
  }

  console.log(
    `[Federated] Applied differential privacy (ε=${epsilon}, Δ=${sensitivity})`
  );

  return noisyWeights;
}

/**
 * FEDERATED ROUND EXECUTION
 * Orchestrates one communication round
 */
export async function executeFederatedRound(
  roundNumber: number,
  clientConfigs: FederatedClientConfig[],
  clientDataSources: Map<string, LoanPerformanceData[]>,
  currentGlobalWeights: Record<string, number[]>
): Promise<FederatedRound> {
  console.log(`\n[Federated] ROUND ${roundNumber} starting...`);

  // 1. Distribute global model to all clients
  // 2. Each client trains locally
  const clientUpdates: Array<{
    clientId: string;
    modelWeights: Record<string, number[]>;
    sampleCount: number;
  }> = [];

  for (const config of clientConfigs) {
    const clientData = clientDataSources.get(config.clientId) || [];
    if (clientData.length === 0) continue;

    const update = trainLocalXGBoostModel(clientData, config);
    clientUpdates.push({
      clientId: config.clientId,
      modelWeights: update.modelWeights,
      sampleCount: update.sampleCount,
    });

    console.log(`  ✓ Client ${config.clientId}: Loss=${update.loss.toFixed(2)}`);
  }

  // 3. Aggregate updates
  let globalWeights = federatedAverage(clientUpdates);

  // 4. Add differential privacy
  globalWeights = addDifferentialPrivacyNoise(globalWeights, 1.0);

  // 5. Calculate average loss
  const averageLoss =
    clientUpdates.length > 0
      ? 15 + Math.random() * 5 // Mock loss
      : 100;

  const round: FederatedRound = {
    roundNumber,
    participatingClients: clientUpdates.map(c => c.clientId),
    globalModelWeights: globalWeights,
    averageLoss,
    timestamp: new Date(),
  };

  console.log(
    `[Federated] ROUND ${roundNumber} complete | Loss: ${averageLoss.toFixed(2)} | Clients: ${clientUpdates.length}`
  );

  return round;
}

/**
 * MULTI-ROUND FEDERATED TRAINING
 * Trains for N communication rounds
 */
export async function runFederatedTraining(
  clientConfigs: FederatedClientConfig[],
  clientDataSources: Map<string, LoanPerformanceData[]>,
  numRounds: number = 10
): Promise<{
  finalGlobalModel: Record<string, number[]>;
  trainingHistory: FederatedRound[];
}> {
  let globalWeights: Record<string, number[]> = {};
  const trainingHistory: FederatedRound[] = [];

  for (let round = 1; round <= numRounds; round++) {
    const result = await executeFederatedRound(
      round,
      clientConfigs,
      clientDataSources,
      globalWeights
    );

    trainingHistory.push(result);
    globalWeights = result.globalModelWeights;

    // Early stopping: check convergence
    if (round > 2 && trainingHistory[round - 1].averageLoss > trainingHistory[round - 2].averageLoss * 0.99) {
      console.log(`[Federated] Converged after ${round} rounds`);
      break;
    }
  }

  return {
    finalGlobalModel: globalWeights,
    trainingHistory,
  };
}

/**
 * EXTRACT LIQUIDATION MULTIPLIERS FROM CONSORTIUM DATA
 * Aggregated historical liquidation outcomes by property type, LTV
 */
export function extractLiquidationMultipliers(
  loanPerformanceData: LoanPerformanceData[]
): LiquidationMultiplier[] {
  const propertyTypes = ['apartment', 'villa', 'commercial', 'land'];
  const ltvBuckets = ['0-30', '30-50', '50-70', '70-90'];

  const multipliers: LiquidationMultiplier[] = [];

  for (const propType of propertyTypes) {
    for (const ltv of [0.2, 0.4, 0.6, 0.8]) {
      const bucket = ltvBuckets[Math.floor(ltv * 100 / 25)];
      const filtered = loanPerformanceData.filter(
        loan => loan.propertyType === propType && Math.abs(loan.ltv - ltv) < 0.1
      );

      if (filtered.length === 0) continue;

      const daysToLiquidate = filtered
        .filter(l => l.daysToLiquidate)
        .map(l => l.daysToLiquidate!)
        .sort((a, b) => a - b);

      const recoveryRates = filtered
        .map(l => l.recoveryRate)
        .filter(r => !isNaN(r));

      const median = daysToLiquidate[Math.floor(daysToLiquidate.length / 2)] || 180;
      const p25 = daysToLiquidate[Math.floor(daysToLiquidate.length * 0.25)] || median * 0.75;
      const p75 = daysToLiquidate[Math.floor(daysToLiquidate.length * 0.75)] || median * 1.25;

      const avgRecovery = recoveryRates.reduce((a, b) => a + b, 0) / recoveryRates.length;
      const stdDevRecovery = Math.sqrt(
        recoveryRates.reduce((sum, r) => sum + Math.pow(r - avgRecovery, 2), 0) / recoveryRates.length
      );

      multipliers.push({
        propertyType: propType,
        ltv,
        ltvBucket: bucket,
        medianDaysToLiquidate: median,
        p25DaysToLiquidate: p25,
        p75DaysToLiquidate: p75,
        recoveryRateAvg: avgRecovery,
        recoveryRateStdDev: stdDevRecovery,
        sampleSize: filtered.length,
        confidence: Math.min(1, filtered.length / 50), // Confidence increases with sample size
      });
    }
  }

  return multipliers;
}

/**
 * APPLY CONSORTIUM DATA TO INDIVIDUAL VALUATION
 * Use federated model outputs to scale time-to-sell & distress value
 */
export function applyConsortiumLiquidationData(
  baseTimeTosell: number,
  distressValue: number,
  propertyType: string,
  ltv: number,
  multipliers: LiquidationMultiplier[]
): {
  adjustedTimeToSell: number;
  adjustedDistressValue: number;
  consortiumConfidence: number;
  multiplierUsed: LiquidationMultiplier | null;
} {
  // Find matching multiplier
  const match = multipliers.find(
    m =>
      m.propertyType === propertyType &&
      Math.abs(m.ltv - ltv) < 0.15 &&
      m.sampleSize > 10
  );

  if (!match) {
    return {
      adjustedTimeToSell: baseTimeTosell,
      adjustedDistressValue: distressValue,
      consortiumConfidence: 0,
      multiplierUsed: null,
    };
  }

  // Scale time-to-sell by consortium median / default assumption (180 days)
  const defaultAssumption = 180;
  const consortiumMultiplier = match.medianDaysToLiquidate / defaultAssumption;
  const adjustedTimeToSell = baseTimeTosell * consortiumMultiplier;

  // Scale distress value by recovery rate
  const adjustedDistressValue = distressValue * match.recoveryRateAvg;

  return {
    adjustedTimeToSell,
    adjustedDistressValue,
    consortiumConfidence: match.confidence,
    multiplierUsed: match,
  };
}

/**
 * MOCK CONSORTIUM DATA (For demonstration)
 * In production: Store in secure database only server-admins access
 */
export function getMockConsortiumData(): LoanPerformanceData[] {
  const mockData: LoanPerformanceData[] = [];

  for (let i = 0; i < 1000; i++) {
    const propertyType = ['apartment', 'villa', 'commercial'][Math.floor(Math.random() * 3)];
    const ltv = 0.3 + Math.random() * 0.5;
    const defaultRate = ltv > 0.8 ? 0.15 : ltv > 0.6 ? 0.08 : 0.03;

    mockData.push({
      loanId: `loan_${i}`,
      propertyValue: 2000000 + Math.random() * 8000000,
      loanAmount: 1000000 + Math.random() * 4000000,
      ltv,
      durationMonths: 60 + Math.floor(Math.random() * 300),
      defaulted: Math.random() < defaultRate,
      daysToLiquidate:  Math.random() < 0.7 ? 120 + Math.floor(Math.random() * 180) : undefined,
      liquidationValue: 1500000 + Math.random() * 5000000,
      recoveryRate: 0.7 + Math.random() * 0.3,
      propertyType,
      propertyAge: Math.floor(Math.random() * 30),
      location: {
        pincode: `40000${Math.floor(Math.random() * 10)}`,
        district: 'Mumbai',
      },
      borrowerCreditScore: 600 + Math.floor(Math.random() * 350),
      borrowerEmploymentType: ['salaried', 'self-employed', 'business'][Math.floor(Math.random() * 3)],
    });
  }

  return mockData;
}
