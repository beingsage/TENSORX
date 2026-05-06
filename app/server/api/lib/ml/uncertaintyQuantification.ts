/**
 * UNCERTAINTY QUANTIFICATION MODULE
 * 12 advanced techniques for prediction intervals, confidence scores, and probabilistic outputs
 * [MODEL_TRAINING_REQUIRED] - Calibration requires historical validation set
 */

/**
 * 1. SPLIT-CONFORMAL PREDICTION
 * Provides guaranteed coverage probability for prediction intervals
 */
export function splitConformalPrediction(
  predictions: number[],
  residuals: number[],
  confidenceLevel: number = 0.95
) {
  // Sort residuals by absolute value
  const sortedResiduals = [...residuals].sort((a, b) => Math.abs(a) - Math.abs(b));

  // Find the quantile
  const alpha = 1 - confidenceLevel;
  const quantileIndex = Math.ceil((residuals.length + 1) * (1 - alpha / 2)) - 1;
  const quantile = sortedResiduals[Math.min(quantileIndex, sortedResiduals.length - 1)];

  // Generate intervals for new predictions
  return predictions.map((pred) => ({
    pointEstimate: pred,
    lowerBound: pred - Math.abs(quantile),
    upperBound: pred + Math.abs(quantile),
    coverage: confidenceLevel,
    method: 'split-conformal',
  }));
}

/**
 * 2. QUANTILE REGRESSION
 * Estimate multiple quantiles (5th, 25th, 50th, 75th, 95th percentiles)
 */
export function quantileRegression(
  features: number[],
  quantileCoefficients: Record<string, number[]>,
  quantiles: number[] = [0.05, 0.25, 0.5, 0.75, 0.95]
) {
  const predictions: Record<string, number> = {};

  quantiles.forEach((q) => {
    const key = `q${Math.round(q * 100)}`;
    const coefs = quantileCoefficients[key] || [];
    let prediction = 0;

    features.forEach((f, idx) => {
      prediction += f * (coefs[idx] || 0);
    });

    predictions[key] = prediction;
  });

  return {
    p5: predictions.q5 || 0,
    p25: predictions.q25 || 0,
    median: predictions.q50 || 0,
    p75: predictions.p75 || 0,
    p95: predictions.q95 || 0,
    intervalWidth: (predictions.q95 || 0) - (predictions.q5 || 0),
    interquartileRange: (predictions.q75 || 0) - (predictions.q25 || 0),
  };
}

/**
 * 3. PREDICTION INTERVAL COVERAGE PROBABILITY (PICP) VALIDATION
 * Measure if prediction intervals have desired coverage
 */
export function validatePICPCoverage(
  actualValues: number[],
  lowerBounds: number[],
  upperBounds: number[],
  expectedCoverage: number = 0.95
) {
  let count = 0;
  actualValues.forEach((actual, idx) => {
    if (actual >= lowerBounds[idx] && actual <= upperBounds[idx]) {
      count++;
    }
  });

  const empiricalCoverage = count / actualValues.length;
  const coverage_error = empiricalCoverage - expectedCoverage;

  // Mean Prediction Interval Width (MPIW)
  const mpiw = lowerBounds.reduce((sum, lb, idx) => sum + (upperBounds[idx] - lb), 0) / lowerBounds.length;

  return {
    empiricalCoverage,
    expectedCoverage,
    coverageError: coverage_error,
    picp: empiricalCoverage,
    mpiw,
    piw: lowerBounds.map((lb, idx) => upperBounds[idx] - lb),
    onTarget: Math.abs(coverage_error) < 0.05, // Within 5% of target
  };
}

/**
 * 4. HETEROSCEDASTIC UNCERTAINTY ESTIMATION
 * Estimate variance per sample (data-dependent uncertainty)
 */
export function heteroscedasticUncertainty(
  predictions: number[],
  uncertaintyModel: (pred: number) => number
) {
  return predictions.map((pred) => {
    const variance = uncertaintyModel(pred);
    const std = Math.sqrt(variance);

    return {
      prediction: pred,
      variance,
      std,
      lowerBound: pred - 1.96 * std,
      upperBound: pred + 1.96 * std,
      cv: std / Math.max(Math.abs(pred), 1), // Coefficient of variation
    };
  });
}

/**
 * 5. BOOTSTRAP CONFIDENCE INTERVAL GENERATION
 * Resample predictions to estimate confidence intervals
 */
export function bootstrapConfidenceInterval(
  predictions: number[],
  nBootstrap: number = 1000,
  confidenceLevel: number = 0.95
) {
  const bootstrapSamples: number[][] = [];

  for (let b = 0; b < nBootstrap; b++) {
    const sample = [];
    for (let i = 0; i < predictions.length; i++) {
      const randomIdx = Math.floor(Math.random() * predictions.length);
      sample.push(predictions[randomIdx]);
    }
    bootstrapSamples.push(sample);
  }

  // Compute percentile confidence intervals
  const alpha = 1 - confidenceLevel;
  const lowerPercentile = (alpha / 2) * 100;
  const upperPercentile = (1 - alpha / 2) * 100;

  const means = bootstrapSamples.map((sample) => sample.reduce((a, b) => a + b, 0) / sample.length);
  means.sort((a, b) => a - b);

  const lowerIdx = Math.floor((lowerPercentile / 100) * means.length);
  const upperIdx = Math.floor((upperPercentile / 100) * means.length);

  return {
    pointEstimate: predictions.reduce((a, b) => a + b, 0) / predictions.length,
    lowerBound: means[lowerIdx],
    upperBound: means[upperIdx],
    bootstrapMeans: means,
    confidence: confidenceLevel,
  };
}

/**
 * 6. BAYESIAN POSTERIOR PREDICTIVE DISTRIBUTIONS
 * Use Bayesian framework for principled uncertainty
 */
export function bayesianPosteriorPredictive(
  priorMean: number,
  priorVariance: number,
  dataPoints: number[],
  likelihood: (x: number, mu: number) => number
) {
  // Update prior with data (simplified Bayes update)
  const dataMean = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  const dataVariance =
    dataPoints.reduce((sum, x) => sum + Math.pow(x - dataMean, 2), 0) / dataPoints.length;

  // Posterior update (simplified conjugate prior)
  const posteriorVariance = 1 / (1 / priorVariance + dataPoints.length / dataVariance);
  const posteriorMean =
    posteriorVariance * (priorMean / priorVariance + (dataPoints.length * dataMean) / dataVariance);

  // Posterior predictive distribution
  const predictiveVariance = posteriorVariance + dataVariance;
  const predictiveStd = Math.sqrt(predictiveVariance);

  return {
    posteriorMean,
    posteriorVariance,
    predictiveMean: posteriorMean,
    predictiveVariance,
    predictiveStd,
    credible95Lower: posteriorMean - 1.96 * predictiveStd,
    credible95Upper: posteriorMean + 1.96 * predictiveStd,
  };
}

/**
 * 7. MONTE CARLO DROPOUT FOR EPISTEMIC UNCERTAINTY
 * Use dropout at inference time to estimate model uncertainty
 */
export function monteCarloDropout(
  features: number[],
  forwardPass: (f: number[]) => number,
  nSamples: number = 100,
  dropoutRate: number = 0.5
) {
  const samples: number[] = [];

  for (let i = 0; i < nSamples; i++) {
    // Simulate dropout: randomly drop features
    const droppedFeatures = features.map((f) => (Math.random() > dropoutRate ? f : 0));
    const prediction = forwardPass(droppedFeatures);
    samples.push(prediction);
  }

  samples.sort((a, b) => a - b);

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / samples.length;

  return {
    predictions: samples,
    mean,
    variance,
    std: Math.sqrt(variance),
    p5: samples[Math.floor(nSamples * 0.05)],
    p50: samples[Math.floor(nSamples * 0.5)],
    p95: samples[Math.floor(nSamples * 0.95)],
    epistemicUncertainty: variance,
    aleatoricUncertainty: variance * 0.3, // Proxy
  };
}

/**
 * 8. GAUSSIAN PROCESS REGRESSION FOR UNCERTAINTY BANDS
 * Non-parametric Bayesian approach with built-in uncertainty
 */
export function gaussianProcessPrediction(
  xTrain: number[][],
  yTrain: number[],
  xTest: number[][],
  kernelFunction: (x1: number[], x2: number[]) => number
) {
  // Compute kernel matrices (simplified)
  const K_train = computeKernelMatrix(xTrain, xTrain, kernelFunction);
  const K_test = computeKernelMatrix(xTest, xTrain, kernelFunction);
  const K_testTest = computeKernelMatrix(xTest, xTest, kernelFunction);

  // Add noise to diagonal
  const noise = 0.01;
  K_train.forEach((row, i) => (row[i] += noise));

  // GP predictions (simplified)
  const predictions: Array<{
    mean: number;
    variance: number;
    std: number;
    lowerBound: number;
    upperBound: number;
  }> = [];

  xTest.forEach((_, testIdx) => {
    const k = K_test[testIdx];
    const mean = k.reduce((sum, ki, idx) => sum + ki * yTrain[idx], 0);

    const variance = K_testTest[testIdx][testIdx] - k.reduce((sum, ki) => sum + ki * ki, 0);
    const std = Math.sqrt(Math.max(variance, 0));

    predictions.push({
      mean,
      variance,
      std,
      lowerBound: mean - 1.96 * std,
      upperBound: mean + 1.96 * std,
    });
  });

  return predictions;
}

/**
 * 9. EVIDENTIAL NEURAL NETWORKS
 * Estimate both aleatoric (data) and epistemic (model) uncertainty
 */
export function evidentialUncertainty(
  alpha: number, // strength parameter
  beta: number, // evidence parameter
  features: number[]
) {
  // Uncertainty decomposition
  const aleatoric = beta / (alpha - 1); // Data uncertainty (irreducible)
  const epistemic = 1 / alpha; // Model uncertainty (reducible)

  const totalUncertainty = aleatoric + epistemic;

  return {
    alpha,
    beta,
    aleatoric,
    epistemic,
    totalUncertainty,
    aleatonicPercentage: (aleatoric / totalUncertainty) * 100,
    epistemicPercentage: (epistemic / totalUncertainty) * 100,
    isModelUncertaintyDominant: epistemic > aleatoric,
  };
}

/**
 * 10. TEMPERATURE SCALING FOR CALIBRATION
 * Post-hoc calibration of confidence scores
 */
export function temperatureScaling(
  predictions: number[],
  confidences: number[],
  valTemperature: number = 1.0
) {
  // Calibrate confidences using temperature
  const scaledConfidences = confidences.map((conf) => {
    // Softmax-based calibration (simplified)
    const scaled = 1 / (1 + Math.exp(-conf / valTemperature));
    return scaled;
  });

  return {
    originalConfidences: confidences,
    scaledConfidences,
    temperature: valTemperature,
    averageConfidence: scaledConfidences.reduce((a, b) => a + b, 0) / scaledConfidences.length,
  };
}

/**
 * 11. CONFORMALIZED QUANTILE REGRESSION (CQR)
 * Combines conformal prediction with quantile regression
 */
export function cqrPredictionInterval(
  lowerQuantile: number,
  upperQuantile: number,
  residuals: number[],
  confidenceLevel: number = 0.95
) {
  // Sort absolute residuals
  const absResiduals = residuals.map(Math.abs).sort((a, b) => a - b);

  // Find quantile
  const alpha = 1 - confidenceLevel;
  const idx = Math.ceil((residuals.length + 1) * (1 - alpha));
  const qhat = absResiduals[Math.min(idx, absResiduals.length - 1)];

  return {
    lowerPredictionBound: lowerQuantile - qhat,
    upperPredictionBound: upperQuantile + qhat,
    adaptiveWidth: 2 * qhat,
    confidenceLevel,
  };
}

/**
 * 12. ADAPTIVE PREDICTION INTERVALS
 * Adjust interval width based on property complexity
 */
export function adaptivePredictionInterval(
  prediction: number,
  baselineStd: number,
  propertyComplexity: number, // 0-1 scale
  numFeatures: number,
  missingDataRate: number // 0-1
) {
  // Increase intervals for complex properties with missing data
  const complexityFactor = 1 + propertyComplexity * 0.5;
  const featureFactor = Math.max(1, 1 + (1 - Math.min(numFeatures / 50, 1)) * 0.2);
  const dataQualityFactor = 1 + missingDataRate * 0.3;

  const adaptiveStd = baselineStd * complexityFactor * featureFactor * dataQualityFactor;

  return {
    prediction,
    adaptiveStd,
    lowerBound: prediction - 1.96 * adaptiveStd,
    upperBound: prediction + 1.96 * adaptiveStd,
    intervalWidth: 2 * 1.96 * adaptiveStd,
    complexity: { complexityFactor, featureFactor, dataQualityFactor },
  };
}

/**
 * COMPOSITE UNCERTAINTY FUNCTION
 * Combines multiple uncertainty methods for robust estimation
 */
export function compositeUncertainty(
  prediction: number,
  methods: {
    quantile?: ReturnType<typeof quantileRegression>;
    bootstrap?: ReturnType<typeof bootstrapConfidenceInterval>;
    heteroscedastic?: number; // variance
    mcDropout?: ReturnType<typeof monteCarloDropout>;
  }
) {
  const bounds: number[] = [];

  if (methods.quantile) {
    bounds.push(methods.quantile.p5, methods.quantile.p95);
  }
  if (methods.bootstrap) {
    bounds.push(methods.bootstrap.lowerBound, methods.bootstrap.upperBound);
  }
  if (methods.mcDropout) {
    bounds.push(methods.mcDropout.p5, methods.mcDropout.p95);
  }

  const minBound = Math.min(...bounds);
  const maxBound = Math.max(...bounds);
  const avgBound = bounds.reduce((a, b) => a + b, 0) / bounds.length;

  return {
    prediction,
    consensusLowerBound: minBound,
    consensusUpperBound: maxBound,
    averageBound: avgBound,
    methodsUsed: Object.keys(methods).length,
    robustness: 1 - (maxBound - minBound) / (2 * avgBound),
  };
}

// Helper: Compute kernel matrix
function computeKernelMatrix(
  X1: number[][],
  X2: number[][],
  kernel: (x1: number[], x2: number[]) => number
): number[][] {
  return X1.map((x1) => X2.map((x2) => kernel(x1, x2)));
}

// RBF Kernel for GP
export function rbfKernel(x1: number[], x2: number[], sigma: number = 1): number {
  const dist = Math.sqrt(x1.reduce((sum, v, i) => sum + Math.pow(v - x2[i], 2), 0));
  return Math.exp((-dist * dist) / (2 * sigma * sigma));
}
