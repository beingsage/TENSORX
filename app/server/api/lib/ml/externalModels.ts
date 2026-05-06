/**
 * External ML model integration with graceful fallback behavior.
 * Each call returns a zeroed result plus an error message when the target worker is unavailable.
 */

const ML_SERVICES = {
  realEstate: process.env.REAL_ESTATE_MODEL_URL?.trim(),
  realValue: process.env.REALVALUE_MODEL_URL?.trim(),
  houseEnsemble: process.env.HOUSE_PRICE_ESTIMATOR_URL?.trim(),
  graphSage: process.env.GRAPHSAGE_MODEL_URL?.trim(),
};

async function postJson<T>(url: string | undefined, path: string, body: unknown) {
  if (!url) {
    throw new Error('Worker URL is not configured.');
  }

  const response = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Worker responded with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getRealEstateComparables(input: {
  houseAge: number;
  mrtDistance: number;
  convenienceStores: number;
}) {
  try {
    const result = await postJson<{
      prediction: number;
      confidence?: number;
      model?: string;
    }>(ML_SERVICES.realEstate, '/predict', {
      house_age: input.houseAge,
      mrt_distance: input.mrtDistance,
      convenience_stores: input.convenienceStores,
    });

    return {
      prediction: Number(result.prediction || 0),
      confidence: Number(result.confidence || 0.75),
      model: result.model || 'LinearRegression',
      available: true,
      error: undefined as string | undefined,
    };
  } catch (error) {
    return {
      prediction: 0,
      confidence: 0,
      model: 'LinearRegression',
      available: false,
      error: error instanceof Error ? error.message : 'Worker unavailable',
    };
  }
}

export async function getRealValueAssessment(input: {
  images: {
    bedroom: string;
    bathroom: string;
    kitchen: string;
    frontal: string;
  };
  propertyFeatures: {
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    postalCode: string;
  };
}) {
  try {
    const result = await postJson<{
      price_estimate: number;
      price_range?: { lower: number; upper: number };
      confidence?: number;
      condition_score?: number;
      amenity_flags?: string[];
    }>(ML_SERVICES.realValue, '/predict', {
      images: input.images,
      features: input.propertyFeatures,
    });

    return {
      priceEstimate: Number(result.price_estimate || 0),
      priceRange: {
        lower: Number(result.price_range?.lower || 0),
        upper: Number(result.price_range?.upper || 0),
      },
      confidence: Number(result.confidence || 0),
      conditionScore: Number(result.condition_score || 0),
      amenityFlags: result.amenity_flags || [],
      available: true,
      error: undefined as string | undefined,
    };
  } catch (error) {
    return {
      priceEstimate: 0,
      priceRange: { lower: 0, upper: 0 },
      confidence: 0,
      conditionScore: 0,
      amenityFlags: [],
      available: false,
      error: error instanceof Error ? error.message : 'Worker unavailable',
    };
  }
}

export async function getHousePriceEnsemble(input: {
  features: Record<string, number | string>;
}) {
  try {
    const result = await postJson<{
      predictions?: {
        random_forest?: number;
        gradient_boosting?: number;
        svr?: number;
      };
      ensemble?: number;
      std?: number;
    }>(ML_SERVICES.houseEnsemble, '/predict', input.features);

    return {
      predictions: {
        randomForest: Number(result.predictions?.random_forest || 0),
        gradientBoosting: Number(result.predictions?.gradient_boosting || 0),
        svr: Number(result.predictions?.svr || 0),
      },
      ensemble: Number(result.ensemble || 0),
      std: Number(result.std || 0),
      algorithms: ['RandomForest', 'GradientBoosting', 'SVR'],
      available: true,
      error: undefined as string | undefined,
    };
  } catch (error) {
    return {
      predictions: { randomForest: 0, gradientBoosting: 0, svr: 0 },
      ensemble: 0,
      std: 0,
      algorithms: ['RandomForest', 'GradientBoosting', 'SVR'],
      available: false,
      error: error instanceof Error ? error.message : 'Worker unavailable',
    };
  }
}

export async function getGraphSAGEMarketIntelligence(input: {
  brokerIds?: string[];
  latitude: number;
  longitude: number;
  radius: number;
}) {
  try {
    const result = await postJson<{
      broker_network_score?: number;
      market_sentiment?: string;
      liquidity_indicator?: number;
      competition_level?: string;
      embedding_dimensions?: number;
    }>(ML_SERVICES.graphSage, '/market-intelligence', {
      broker_ids: input.brokerIds,
      latitude: input.latitude,
      longitude: input.longitude,
      radius: input.radius,
    });

    return {
      brokerNetworkScore: Number(result.broker_network_score || 0),
      marketSentiment: result.market_sentiment || 'neutral',
      liquidityIndicator: Number(result.liquidity_indicator || 0),
      competitionLevel: result.competition_level || 'medium',
      embeddingDimensions: Number(result.embedding_dimensions || 128),
      available: true,
      error: undefined as string | undefined,
    };
  } catch (error) {
    return {
      brokerNetworkScore: 0.5,
      marketSentiment: 'neutral',
      liquidityIndicator: 0.5,
      competitionLevel: 'medium',
      embeddingDimensions: 128,
      available: false,
      error: error instanceof Error ? error.message : 'Worker unavailable',
    };
  }
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function orchestrateExternalModels(input: {
  baseValuation: number;
  houseAge: number;
  mrtDistance: number;
  convenienceStores: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  postalCode: string;
  images?: {
    bedroom: string;
    bathroom: string;
    kitchen: string;
    frontal: string;
  };
  latitude: number;
  longitude: number;
  brokerIds?: string[];
}) {
  const [realEstateResult, houseEnsembleResult, graphSageResult, realValueResult] =
    await Promise.all([
      getRealEstateComparables({
        houseAge: input.houseAge,
        mrtDistance: input.mrtDistance,
        convenienceStores: input.convenienceStores,
      }),
      getHousePriceEnsemble({
        features: {
          house_age: input.houseAge,
          mrt_distance: input.mrtDistance,
          convenience_stores: input.convenienceStores,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          square_feet: input.squareFeet,
          postal_code: input.postalCode,
        },
      }),
      getGraphSAGEMarketIntelligence({
        brokerIds: input.brokerIds,
        latitude: input.latitude,
        longitude: input.longitude,
        radius: 5,
      }),
      input.images
        ? getRealValueAssessment({
            images: input.images,
            propertyFeatures: {
              bedrooms: input.bedrooms,
              bathrooms: input.bathrooms,
              squareFeet: input.squareFeet,
              postalCode: input.postalCode,
            },
          })
        : Promise.resolve(null),
    ]);

  const candidateValues = [
    realEstateResult.available ? realEstateResult.prediction : 0,
    houseEnsembleResult.available ? houseEnsembleResult.ensemble : 0,
    realValueResult?.available ? realValueResult.priceEstimate : 0,
  ].filter((value) => value > 0);

  const externalMean = average(candidateValues);
  const blendedBase =
    candidateValues.length > 0
      ? Math.round(input.baseValuation * 0.75 + externalMean * 0.25)
      : input.baseValuation;

  const marketAdjustment = (graphSageResult.liquidityIndicator - 0.5) * 0.1;
  const combinedScore = Math.round(blendedBase * (1 + marketAdjustment));

  const warnings = [
    realEstateResult.error,
    houseEnsembleResult.error,
    graphSageResult.error,
    realValueResult?.error,
  ].filter(Boolean) as string[];

  return {
    realEstateModel: realEstateResult,
    housePriceEnsemble: houseEnsembleResult,
    realValue: realValueResult || undefined,
    graphSage: graphSageResult,
    combinedScore,
    adjustments: {
      baseValuation: input.baseValuation,
      marketLiquidity: marketAdjustment,
      externalMean,
    },
    warnings,
  };
}
