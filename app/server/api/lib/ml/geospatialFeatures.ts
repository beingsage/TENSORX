/**
 * GEOSPATIAL FEATURE ENGINEERING
 * Haversine distance, Kernel Density Estimation (KDE), Spatial Autocorrelation (Moran's I)
 */

export interface Location {
  lat: number;
  lng: number;
}

export interface GeospatialFeaturesOutput {
  metroDistance: number;
  highwayDistance: number;
  marketActivityKDE: number;
  spatialAutocorrelation: number;
  clusterDensity: number;
  proximityScore: number;
  connectivityIndex: number;
  suburbanUrbanMix: number;
}

/**
 * HAVERSINE DISTANCE
 * Calculate great-circle distance between two points on Earth
 * d = 2r * arcsin(sqrt(sin²((lat2-lat1)/2) + cos(lat1)*cos(lat2)*sin²((lng2-lng1)/2)))
 */
export function haversineDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth radius in km
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + 
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * KERNEL DENSITY ESTIMATION (KDE)
 * Estimate market activity density at a given location
 * f(x) = 1/(nh) * Σ K((x - x_i)/h)
 * Using Gaussian kernel
 */
export function kernelDensityEstimation(
  queryPoint: Location,
  referencePoints: Location[],
  bandwidth: number = 0.5
): number {
  if (referencePoints.length === 0) return 0.5; // neutral if no reference points

  let density = 0;
  const n = referencePoints.length;
  const h = bandwidth; // bandwidth parameter

  // Gaussian kernel: K(u) = (1/√(2π)) * exp(-0.5 * u²)
  for (const point of referencePoints) {
    const distance = haversineDistance(queryPoint, point);
    const u = distance / h;
    const gaussianKernel = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
    density += gaussianKernel;
  }

  // Normalize by bandwidth and count
  const normalizedDensity = density / (n * h);
  
  // Scale to 0-100 range
  return Math.min(100, normalizedDensity * 50);
}

/**
 * SPATIAL AUTOCORRELATION (MORAN'S I)
 * Measure spatial clustering: -1 (dispersed), 0 (random), +1 (clustered)
 * I = (N / Σw_ij) * (Σw_ij * (x_i - x_bar) * (x_j - x_bar)) / (Σ(x_i - x_bar)²)
 */
export function moransIndex(
  properties: Array<{ location: Location; value: number }>,
  queryLocation: Location
): number {
  if (properties.length < 3) return 0; // need minimum 3 points

  // Find nearby properties (within 5km)
  const nearbyRadius = 5;
  const nearby = properties.filter(p => 
    haversineDistance(queryLocation, p.location) <= nearbyRadius
  );

  if (nearby.length < 2) return 0;

  // Calculate mean
  const mean = nearby.reduce((sum, p) => sum + p.value, 0) / nearby.length;

  // Calculate Moran's I components
  let numerator = 0;
  let denominator = 0;
  let weightSum = 0;

  for (let i = 0; i < nearby.length; i++) {
    for (let j = 0; j < nearby.length; j++) {
      if (i !== j) {
        // Weight: inverse distance
        const dist = haversineDistance(nearby[i].location, nearby[j].location);
        const weight = 1 / (dist + 0.1); // avoid division by zero

        const deviation_i = nearby[i].value - mean;
        const deviation_j = nearby[j].value - mean;

        numerator += weight * deviation_i * deviation_j;
        weightSum += weight;
      }
    }
  }

  // Denominator: sum of squared deviations
  for (const p of nearby) {
    const deviation = p.value - mean;
    denominator += deviation * deviation;
  }

  if (denominator === 0 || weightSum === 0) return 0;

  // Moran's I (normalized to -1 to 1)
  const n = nearby.length;
  const moransI = (n / weightSum) * (numerator / denominator);

  return Math.max(-1, Math.min(1, moransI));
}

/**
 * CLUSTER DENSITY
 * Local density estimation around property
 */
export function clusterDensity(
  queryPoint: Location,
  allProperties: Location[],
  searchRadius: number = 2 // km
): number {
  const nearbyCount = allProperties.filter(p => 
    haversineDistance(queryPoint, p) <= searchRadius
  ).length;

  // Normalize to 0-1 scale (assume max 200 properties within 2km)
  return Math.min(1, nearbyCount / 200);
}

/**
 * CONNECTIVITY INDEX
 * Measures access to roads, highways, public transit
 * Based on distance to major infrastructure
 */
export function connectivityIndex(
  location: Location,
  infrastructurePoints: {
    metro?: Location[];
    highway?: Location[];
    mainRoad?: Location[];
    airport?: Location[];
  }
): number {
  let connectivityScore = 0;
  let componentCount = 0;

  // Metro proximity (0-100 score, closer = higher)
  if (infrastructurePoints.metro && infrastructurePoints.metro.length > 0) {
    const metroDistances = infrastructurePoints.metro.map(m => 
      haversineDistance(location, m)
    );
    const closestMetro = Math.min(...metroDistances);
    const metroScore = Math.max(0, 100 - closestMetro * 5); // 5km = 75 points
    connectivityScore += metroScore;
    componentCount++;
  }

  // Highway proximity
  if (infrastructurePoints.highway && infrastructurePoints.highway.length > 0) {
    const highwayDistances = infrastructurePoints.highway.map(h => 
      haversineDistance(location, h)
    );
    const closestHighway = Math.min(...highwayDistances);
    const highwayScore = Math.max(0, 100 - closestHighway * 3); // 3km = 91 points
    connectivityScore += highwayScore;
    componentCount++;
  }

  // Main road proximity
  if (infrastructurePoints.mainRoad && infrastructurePoints.mainRoad.length > 0) {
    const roadDistances = infrastructurePoints.mainRoad.map(r => 
      haversineDistance(location, r)
    );
    const closestRoad = Math.min(...roadDistances);
    const roadScore = Math.max(0, 100 - closestRoad * 10); // 1km = 90 points
    connectivityScore += roadScore;
    componentCount++;
  }

  // Airport proximity (if applicable)
  if (infrastructurePoints.airport && infrastructurePoints.airport.length > 0) {
    const airportDistances = infrastructurePoints.airport.map(a => 
      haversineDistance(location, a)
    );
    const closestAirport = Math.min(...airportDistances);
    const airportScore = Math.max(0, 50 - closestAirport * 2); // further away = less impact
    connectivityScore += airportScore;
    componentCount++;
  }

  if (componentCount === 0) return 50; // default middle value
  return connectivityScore / componentCount;
}

/**
 * PROXIMITY SCORE
 * Composite score for how well-connected a location is
 */
export function proximityScore(
  metroDistance: number,
  highwayDistance: number,
  mainRoadDistance: number = 0.5
): number {
  // Normalize distances to 0-100 scores
  const metroScore = Math.max(0, 100 - (metroDistance || 50) * 1.5);
  const highwayScore = Math.max(0, 100 - (highwayDistance || 30) * 2);
  const roadScore = Math.max(0, 100 - mainRoadDistance * 20);

  // Weighted average (metro is most important)
  const score = (metroScore * 0.5 + highwayScore * 0.3 + roadScore * 0.2);
  return score;
}

/**
 * SUBURBAN-URBAN MIX
 * Estimate whether location is urban, suburban, or rural
 * Based on cluster density and connectivity
 */
export function suburbanUrbanMix(
  clusterDensity_: number,
  connectivity: number,
  populationDensity: number = 0.5 // 0-1 scale from external data
): string {
  const densityNorm = clusterDensity_;
  const connNorm = connectivity / 100;

  // Calculate urbanization score
  const urbanScore = densityNorm * 0.4 + connNorm * 0.4 + populationDensity * 0.2;

  if (urbanScore > 0.7) return 'urban';
  if (urbanScore > 0.4) return 'suburban';
  return 'rural';
}

/**
 * COMPLETE GEOSPATIAL FEATURE SET
 */
export function extractGeospatialFeatures(
  location: Location,
  referenceData: {
    metroLocations: Location[];
    highwayLocations: Location[];
    mainRoadLocations: Location[];
    nearbyProperties: Array<{ location: Location; price: number }>;
  }
): GeospatialFeaturesOutput {
  // Distance calculations
  const metroDistances = referenceData.metroLocations.map(m => 
    haversineDistance(location, m)
  );
  const metroDistance = metroDistances.length > 0 ? Math.min(...metroDistances) : 50;

  const highwayDistances = referenceData.highwayLocations.map(h => 
    haversineDistance(location, h)
  );
  const highwayDistance = highwayDistances.length > 0 ? Math.min(...highwayDistances) : 30;

  // KDE for market activity
  const marketActivityKDE = kernelDensityEstimation(location, referenceData.metroLocations);

  // Spatial autocorrelation
  const spatialAuto = moransIndex(
    referenceData.nearbyProperties.map(p => ({
      location: p.location,
      value: p.price / 10000000, // normalize price
    })),
    location
  );

  // Cluster density
  const density = clusterDensity(location, referenceData.mainRoadLocations);

  // Proximity score
  const prox = proximityScore(metroDistance, highwayDistance, 0.5);

  // Connectivity index (simplified - would use real infra data)
  const connectivity = connectivityIndex(location, {
    metro: referenceData.metroLocations,
    highway: referenceData.highwayLocations,
    mainRoad: referenceData.mainRoadLocations,
  });

  return {
    metroDistance,
    highwayDistance,
    marketActivityKDE,
    spatialAutocorrelation: spatialAuto,
    clusterDensity: density * 100,
    proximityScore: prox,
    connectivityIndex: connectivity,
    suburbanUrbanMix: suburbanUrbanMix(density, connectivity) === 'urban' ? 1 : 
                       suburbanUrbanMix(density, connectivity) === 'suburban' ? 0.5 : 0,
  };
}
