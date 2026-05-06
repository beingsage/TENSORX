/**
 * RIDE-HAILING / MOBILITY DATA AS DYNAMIC ACCESSIBILITY ORACLE
 * Idea #4: Ingest anonymized Ola/Uber trip density + commute-time heatmaps
 * as real-time infrastructure proximity updater.
 * 
 * Captures emerging micro-market shifts (new metro impact) faster than static GIS
 * 
 * Data sources: Ola Maps API, Uber Movement data (historical), anonymized trip density
 * Output: dynamic_accessibility_score, mobility_trend, emerging_hotspot_flag
 */

export interface MobilityDataPoint {
  latitude: number;
  longitude: number;
  tripDensity: number; // Trips per km² per hour
  averageCommuteTime: number; // Minutes
  topDestinations: Array<{
    location: string;
    averageCommuteTime: number;
    tripCount: number;
  }>;
  weekdayVsWeekend: number; // Ratio weekday/weekend activity
  peakHourTraffic: number; // 0-1, normalized congestion
  dataQuality: number; // 0-1, confidence in data
  lastUpdated: Date;
}

export interface DynamicAccessibilityMetrics {
  propertyId: string;
  latitude: number;
  longitude: number;
  
  // Core metrics
  mobilityAccessibilityScore: number; // 0-100
  dynamicAccessibilityDelta: number; // Change vs. baseline infrastructure score
  commuteTimeToWorkDistricts: Record<string, number>; // Minutes to major employment zones
  tripDensityScore: number; // 0-100, higher = better connected
  
  // Trend indicators
  mobilityTrendDirection: 'improving' | 'stable' | 'declining';
  trendStrength: number; // 0-1, how strong the trend
  monthOverMonthGrowth: number; // % change in trip density
  
  // Emerging opportunities
  emergingHotspot: boolean;
  hotspotnessScore: number; // 0-1, likelihood of becoming hotspot
  nearbyDevelopment: boolean;
  developmentType?: string; // 'metro', 'commercial_hub', 'residential_cluster'
  
  lastUpdated: Date;
}

/**
 * FETCH OLA MAPS API DATA (Real-world integration point)
 * Requires: Ola Maps API key + institutional access to anonymized trip data
 */
export async function fetchOlaMapsData(
  latitude: number,
  longitude: number,
  radiusKm: number = 2
): Promise<MobilityDataPoint> {
  try {
    // In production:
    // const response = await axios.get('https://api.olamaps.io/places/v1/maps/search', {
    //   params: {
    //     query: 'mobility_density',
    //     location: `${latitude},${longitude}`,
    //     radius: radiusKm * 1000,
    //     api_key: process.env.OLA_MAPS_API_KEY
    //   }
    // });

    // Mock implementation - simulates Ola trip density + commute data
    const baseTripDensity = 10 + Math.random() * 50; // Trips/km²/hr
    const baseCommuteTime = 20 + Math.random() * 40; // Minutes to nearest workplace

    // High-traffic areas (CBD) vs suburbs
    const distanceToCBD = calculateDistanceToCBD(latitude, longitude);
    const tripDensity = distanceToCBD < 3 ? baseTripDensity * 2 : baseTripDensity;
    const averageCommuteTime = distanceToCBD < 3 ? baseCommuteTime * 0.7 : baseCommuteTime;

    return {
      latitude,
      longitude,
      tripDensity,
      averageCommuteTime,
      topDestinations: [
        {
          location: 'Financial District',
          averageCommuteTime: averageCommuteTime * 0.8,
          tripCount: Math.floor(tripDensity * 100),
        },
        {
          location: 'Tech Park',
          averageCommuteTime: averageCommuteTime * 1.2,
          tripCount: Math.floor(tripDensity * 80),
        },
        {
          location: 'Shopping District',
          averageCommuteTime: averageCommuteTime * 1.1,
          tripCount: Math.floor(tripDensity * 60),
        },
      ],
      weekdayVsWeekend: 1.3 + Math.random() * 0.5, // 1.3-1.8x more weekday traffic
      peakHourTraffic: 0.6 + Math.random() * 0.4,
      dataQuality: 0.8 + Math.random() * 0.2,
      lastUpdated: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Last 24h
    };
  } catch (error) {
    console.error('[Mobility API] Error fetching Ola Maps data:', error);
    throw error;
  }
}

/**
 * FETCH HISTORICAL MOBILITY DATA FOR TREND ANALYSIS
 * Compare current vs. 1-month-ago vs. 3-months-ago
 */
export async function fetchMobilityHistoricalTrend(
  latitude: number,
  longitude: number
): Promise<{
  current: number; // Current trip density
  oneMonthAgo: number;
  threeMonthsAgo: number;
  trend: 'improving' | 'stable' | 'declining';
  growthRate: number; // Month-over-month % change
}> {
  // Mock historical data
  const current = 25 + Math.random() * 30;
  const oneMonthAgo = current * (0.85 + Math.random() * 0.3); // Simulate 15-115% of current
  const threeMonthsAgo = current * (0.7 + Math.random() * 0.4);

  const monthOverMonthGrowth = ((current - oneMonthAgo) / oneMonthAgo) * 100;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (monthOverMonthGrowth > 5) trend = 'improving';
  if (monthOverMonthGrowth < -5) trend = 'declining';

  console.log(
    `[Mobility Trend] Lat: ${latitude}, Lng: ${longitude} | Growth: ${monthOverMonthGrowth.toFixed(1)}% | Trend: ${trend}`
  );

  return {
    current,
    oneMonthAgo,
    threeMonthsAgo,
    trend,
    growthRate: monthOverMonthGrowth,
  };
}

/**
 * DETECT EMERGING HOTSPOTS
 * Anomaly detection: Trip density spike + infrastructure proximity changes
 */
export function detectEmergingHotspot(
  tripDensity: number,
  tripDensityHistorical: number,
  mobilityTrend: string,
  baseAccessibilityScore: number
): {
  isHotspot: boolean;
  hotspotnessScore: number; // 0-1
  developmentType?: string;
  strength: string;
} {
  let hotspotnessScore = 0;

  // Rule 1: Trip density spike (>20% growth)
  const densityGrowth = (tripDensity - tripDensityHistorical) / tripDensityHistorical;
  if (densityGrowth > 0.2) hotspotnessScore += 0.3;

  // Rule 2: Improving trend
  if (mobilityTrend === 'improving') hotspotnessScore += 0.25;

  // Rule 3: High baseline connectivity
  if (baseAccessibilityScore > 70) hotspotnessScore += 0.2;

  // Rule 4: Specific hour/day patterns (e.g., new metro opens = rush hour shift)
  if (densityGrowth > 0.3) hotspotnessScore += 0.25;

  const isHotspot = hotspotnessScore > 0.5;

  let developmentType: string | undefined;
  if (isHotspot) {
    if (baseAccessibilityScore > 85) developmentType = 'metro_proximity';
    else if (densityGrowth > 0.4) developmentType = 'commercial_hub';
    else developmentType = 'residential_cluster';
  }

  return {
    isHotspot,
    hotspotnessScore,
    developmentType,
    strength: hotspotnessScore > 0.75 ? 'strong' : 'moderate',
  };
}

/**
 * COMPUTE DYNAMIC ACCESSIBILITY METRICS
 */
export async function computeDynamicAccessibilityMetrics(
  propertyId: string,
  latitude: number,
  longitude: number,
  baselineInfrastructureScore: number // 0-100 from GIS analysis
): Promise<DynamicAccessibilityMetrics> {
  try {
    // 1. Fetch current mobility data
    const mobilityData = await fetchOlaMapsData(latitude, longitude, 2);

    // 2. Fetch historical trend
    const trend = await fetchMobilityHistoricalTrend(latitude, longitude);

    // 3. Detect emerging hotspots
    const hotspotAnalysis = detectEmergingHotspot(
      trend.current,
      trend.oneMonthAgo,
      trend.trend,
      baselineInfrastructureScore
    );

    // 4. Normalize trip density to 0-100 score
    const tripDensityScore = Math.min(100, (mobilityData.tripDensity / 50) * 100);

    // 5. Dynamic accessibility delta vs baseline GIS
    // (Mobility data captures real-time changes that static GIS misses)
    const dynamicAccessibilityDelta = tripDensityScore - baselineInfrastructureScore;

    // 6. Overall mobility accessibility score
    const mobilityAccessibilityScore = Math.min(
      100,
      (tripDensityScore * 0.5 + // Connectivity/density
        (100 - (mobilityData.averageCommuteTime / 60) * 100) * 0.3 + // Commute efficiency
        (mobilityData.dataQuality * 100) * 0.2) // Data quality
    );

    // 7. Nearby development detection
    const nearbyDevelopment = mobilityData.topDestinations.some(
      dest =>
        dest.location.includes('Metro') ||
        dest.location.includes('Commercial') ||
        dest.location.includes('Tech')
    );

    return {
      propertyId,
      latitude,
      longitude,
      mobilityAccessibilityScore,
      dynamicAccessibilityDelta,
      commuteTimeToWorkDistricts: {
        'Financial District': mobilityData.averageCommuteTime * 0.8,
        'Tech Park': mobilityData.averageCommuteTime * 1.2,
        'Shopping District': mobilityData.averageCommuteTime * 1.1,
      },
      tripDensityScore,
      mobilityTrendDirection: trend.trend,
      trendStrength: Math.abs(trend.growthRate) / 100,
      monthOverMonthGrowth: trend.growthRate,
      emergingHotspot: hotspotAnalysis.isHotspot,
      hotspotnessScore: hotspotAnalysis.hotspotnessScore,
      nearbyDevelopment,
      developmentType: hotspotAnalysis.developmentType,
      lastUpdated: mobilityData.lastUpdated,
    };
  } catch (error) {
    console.error(
      `[Dynamic Accessibility] Error for property ${propertyId}:`,
      error
    );
    throw error;
  }
}

/**
 * APPLY DYNAMIC ACCESSIBILITY TO VALUATION
 * Update resale potential index and time-to-sell
 */
export function applyDynamicAccessibilityToValuation(
  baseResalePotentialIndex: number,
  baseTimeTosell: number,
  mobilityMetrics: DynamicAccessibilityMetrics
): {
  adjustedResalePotentialIndex: number;
  adjustedTimeTosell: number;
  keyDriver: string;
} {
  let indexAdjustment = 0;
  let timeAdjustment = 1.0;

  // Positive mobility delta = higher resale potential
  if (mobilityMetrics.dynamicAccessibilityDelta > 10) {
    indexAdjustment = Math.min(15, mobilityMetrics.dynamicAccessibilityDelta * 0.3);
  } else if (mobilityMetrics.dynamicAccessibilityDelta < -10) {
    indexAdjustment = mobilityMetrics.dynamicAccessibilityDelta * 0.2; // Penalty
  }

  // Improving trend = shorter time-to-sell
  if (mobilityMetrics.mobilityTrendDirection === 'improving') {
    timeAdjustment = 0.85; // 15% faster
  } else if (mobilityMetrics.mobilityTrendDirection === 'declining') {
    timeAdjustment = 1.15; // 15% slower
  }

  // Emerging hotspot = significant boost
  if (mobilityMetrics.emergingHotspot && mobilityMetrics.hotspotnessScore > 0.75) {
    indexAdjustment += 20;
    timeAdjustment *= 0.75;
  }

  const adjustedResalePotentialIndex = Math.max(0, Math.min(100, baseResalePotentialIndex + indexAdjustment));
  const adjustedTimeTosell = baseTimeTosell * timeAdjustment;

  let keyDriver = `Mobility: ${mobilityMetrics.mobilityTrendDirection}`;
  if (mobilityMetrics.emergingHotspot) {
    keyDriver = `Emerging hotspot (${mobilityMetrics.developmentType})`;
  }

  return {
    adjustedResalePotentialIndex,
    adjustedTimeTosell,
    keyDriver,
  };
}

/**
 * BATCH FETCH MOBILITY METRICS FOR PORTFOLIO
 */
export async function batchFetchMobilityMetrics(
  properties: Array<{
    propertyId: string;
    latitude: number;
    longitude: number;
    infrastructureScore: number;
  }>
): Promise<DynamicAccessibilityMetrics[]> {
  const results: DynamicAccessibilityMetrics[] = [];
  const batchSize = 5;
  const delayMs = 300; // Rate limit

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    const promises = batch.map(prop =>
      computeDynamicAccessibilityMetrics(
        prop.propertyId,
        prop.latitude,
        prop.longitude,
        prop.infrastructureScore
      )
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    if (i + batchSize < properties.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// Helper function
function calculateDistanceToCBD(latitude: number, longitude: number): number {
  // CBD reference point (e.g., Mumbai Financial District)
  const cbdLat = 19.0176;
  const cbdLng = 72.8479;

  // Simple distance approximation
  const latDiff = Math.abs(latitude - cbdLat);
  const lngDiff = Math.abs(longitude - cbdLng);
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // km

  return distance;
}
