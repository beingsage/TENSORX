/**
 * GEOSPATIAL & LOCATION INTELLIGENCE MODULE
 * Live open-data implementation backed by Nominatim, Overpass, and Open-Meteo.
 */

import {
  fetchEnvironmentalSnapshot,
  fetchSpatialSnapshot,
  type EnvironmentalSnapshot,
  type SpatialAmenity,
  type SpatialSnapshot,
} from '@/lib/providers/openData';
import {
  clamp,
  distanceToPolylineKm,
  haversineDistanceKm,
  type LatLng,
} from '@/lib/utils/geo';

export interface LocationIntelligence {
  poiProximity: POIProximityFeatures;
  infrastructure: InfrastructureFeatures;
  remoteSensing: RemoteSensingFeatures;
  marketIntelligence: MarketIntelligenceFeatures;
  environmentalRisk: EnvironmentalRiskFeatures;
  osmnxNetwork: OSMNXNetworkFeatures;
  spatialContext: SpatialSnapshot;
  metadata: {
    fetchedAt: string;
    providers: string[];
    status: 'live' | 'partial' | 'fallback';
    liveSignals: number;
  };
}

export interface POIProximityFeatures {
  distanceToMetro: number; // km
  distanceToSchool: number; // km
  distanceToHospital: number; // km
  distanceToCommercial: number; // km
  distanceToHighway: number; // km
  distanceToAirport: number; // km
  poiDensity: number; // POIs per sq km
  connectivity: 'excellent' | 'good' | 'average' | 'poor';
}

export interface InfrastructureFeatures {
  roadQuality: number; // 0-100
  publicTransportScore: number; // 0-100
  waterSupply: 'excellent' | 'good' | 'average' | 'poor';
  powerAvailability: 'yes' | '24hr' | 'intermittent' | 'no';
  sewerageConnection: boolean;
  plannedZone: boolean;
  developmentIndex: number; // 0-100
}

export interface RemoteSensingFeatures {
  ndvi: number; // greenspace proxy 0-1
  nightLightIntensity: number; // 0-100 urban activity proxy
  urbanDensity: number; // 0-100
  landUseType: string;
  satelliteImageDate: string;
  vacancyProxyScore: number; // 0-100 (higher = more vacant)
}

export interface MarketIntelligenceFeatures {
  brokerDensity: number; // Active brokers per sq km
  absorptionRate: number; // 0-1
  daysOnMarket: number; // Average days to sell
  priceTrendMonthly: number; // decimal change over past month
  priceTrendYearly: number; // decimal change over past year
  demandIndex: number; // 0-100
  supplyIndex: number; // 0-100
  rentalYieldBenchmark: number; // % per annum
}

export interface EnvironmentalRiskFeatures {
  floodZoneFlag: boolean;
  earthquakeSusceptibility: number; // 0-100
  airQualityIndex: number; // 0-500
  noiseLevelDb: number; // decibels
  pollutantExposure: number; // 0-100
  climateFutureRisk: number; // 0-100
  naturalDisasterHistory: string[];
}

export interface OSMNXNetworkFeatures {
  walkabilityScore: number; // 0-100
  bikeabilityScore: number; // 0-100
  intersectionDensity: number; // intersections per sq km
  streetConnectivity: number; // 0-100
  averageBlockLength: number; // meters
  deadEndDensity: number; // dead-ends per sq km
  networkCoverage: number; // % of area covered by network
  centralityScore: number; // 0-100
  accessibilityIndex: number; // 0-100
  networkComplexity: number; // 0-100
}

const PRIMARY_ANALYSIS_RADIUS_KM = 1.5;
const PRIMARY_ANALYSIS_AREA_SQKM = Math.PI * PRIMARY_ANALYSIS_RADIUS_KM ** 2;
const NETWORK_ANALYSIS_RADIUS_KM = 0.8;
const NETWORK_ANALYSIS_AREA_SQKM = Math.PI * NETWORK_ANALYSIS_RADIUS_KM ** 2;

function emptySpatialSnapshot(center: LatLng): SpatialSnapshot {
  return {
    center,
    subjectBuilding: null,
    nearbyBuildings: [],
    amenities: [],
    roads: [],
    railLines: [],
    greenAreas: [],
    waterBodies: [],
    bounds: {
      minLat: center.lat - 0.0012,
      maxLat: center.lat + 0.0012,
      minLng: center.lng - 0.0012,
      maxLng: center.lng + 0.0012,
    },
  };
}

function amenitiesByKind(snapshot: SpatialSnapshot, kinds: SpatialAmenity['kind'][]) {
  return snapshot.amenities.filter((amenity) => kinds.includes(amenity.kind));
}

function nearestAmenity(
  snapshot: SpatialSnapshot,
  kinds: SpatialAmenity['kind'][]
): SpatialAmenity | null {
  return (
    amenitiesByKind(snapshot, kinds)
      .sort((left, right) => left.distanceKm - right.distanceKm)[0] || null
  );
}

function nearestDistance(
  snapshot: SpatialSnapshot,
  kinds: SpatialAmenity['kind'][],
  fallbackKm: number
) {
  return nearestAmenity(snapshot, kinds)?.distanceKm ?? fallbackKm;
}

function roadTierScore(highwayType: string | undefined) {
  switch (highwayType) {
    case 'motorway':
      return 58;
    case 'trunk':
      return 64;
    case 'primary':
      return 72;
    case 'secondary':
      return 78;
    case 'tertiary':
      return 82;
    case 'residential':
      return 76;
    case 'service':
      return 62;
    default:
      return 68;
  }
}

function surfaceBonus(surface: string | undefined) {
  switch (surface) {
    case 'asphalt':
    case 'concrete':
      return 10;
    case 'paved':
      return 7;
    case 'compacted':
      return 4;
    case 'unpaved':
    case 'gravel':
      return -6;
    default:
      return 0;
  }
}

function computeRoadQuality(snapshot: SpatialSnapshot) {
  if (snapshot.roads.length === 0) return 52;

  const total = snapshot.roads.reduce((sum, road) => {
    return sum + roadTierScore(road.tags.highway) + surfaceBonus(road.tags.surface);
  }, 0);

  return clamp(Math.round(total / snapshot.roads.length), 35, 95);
}

function computeNetworkStats(snapshot: SpatialSnapshot) {
  const nodeCounts = new Map<string, number>();
  const endpointCounts = new Map<string, number>();
  const totalRoadLengthKm = snapshot.roads.reduce((sum, road) => sum + road.lengthKm, 0);
  const cycleFriendlyRoads = snapshot.roads.filter((road) =>
    ['cycleway', 'residential', 'service', 'tertiary'].includes(road.kind)
  ).length;
  const majorRoads = snapshot.roads.filter((road) =>
    ['motorway', 'trunk', 'primary', 'secondary'].includes(road.kind)
  );

  for (const road of snapshot.roads) {
    road.points.forEach((point, index) => {
      const key = `${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`;
      nodeCounts.set(key, (nodeCounts.get(key) || 0) + 1);
      if (index === 0 || index === road.points.length - 1) {
        endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
      }
    });
  }

  const intersectionCount = Array.from(nodeCounts.values()).filter((count) => count >= 2).length;
  const deadEndCount = Array.from(endpointCounts.values()).filter((count) => count === 1).length;
  const intersectionDensity = Number(
    (intersectionCount / Math.max(NETWORK_ANALYSIS_AREA_SQKM, 0.1)).toFixed(1)
  );
  const deadEndDensity = Number(
    (deadEndCount / Math.max(NETWORK_ANALYSIS_AREA_SQKM, 0.1)).toFixed(1)
  );
  const averageBlockLength =
    snapshot.roads.length > 0
      ? Math.round((totalRoadLengthKm * 1000) / snapshot.roads.length)
      : 180;
  const networkCoverage = clamp(
    Math.round((totalRoadLengthKm / Math.max(NETWORK_ANALYSIS_AREA_SQKM, 0.1)) * 20),
    0,
    100
  );
  const streetConnectivity = clamp(
    Math.round(
      intersectionDensity * 2.1 +
        networkCoverage * 0.35 -
        deadEndDensity * 1.3 +
        (majorRoads.length > 0 ? 8 : 0)
    ),
    18,
    100
  );
  const networkComplexity = clamp(
    Math.round(
      intersectionDensity * 1.7 +
        snapshot.roads.length * 0.8 +
        new Set(snapshot.roads.map((road) => road.kind)).size * 8
    ),
    15,
    100
  );
  const centralityScore = clamp(
    Math.round(streetConnectivity * 0.7 + intersectionDensity * 0.9 - deadEndDensity * 0.4),
    12,
    100
  );
  const bikeabilityScore = clamp(
    Math.round(streetConnectivity * 0.45 + cycleFriendlyRoads * 3.2 - majorRoads.length * 1.8),
    10,
    100
  );

  return {
    totalRoadLengthKm,
    majorRoads,
    intersectionDensity,
    deadEndDensity,
    averageBlockLength,
    networkCoverage,
    streetConnectivity,
    networkComplexity,
    centralityScore,
    bikeabilityScore,
  };
}

function deriveLandUseType(snapshot: SpatialSnapshot) {
  const tags = [
    ...snapshot.greenAreas.map((area) => area.kind),
    ...snapshot.waterBodies.map((area) => area.kind),
  ];
  const commercialCount = amenitiesByKind(snapshot, ['commercial']).length;
  const metroCount = amenitiesByKind(snapshot, ['metro', 'transit']).length;

  if (tags.some((tag) => ['forest', 'wood', 'park', 'garden'].includes(tag))) {
    return commercialCount > 4 ? 'mixed' : 'green';
  }
  if (commercialCount > 6 && metroCount > 0) {
    return 'mixed';
  }
  if (commercialCount > 4) {
    return 'commercial';
  }
  return 'residential';
}

function estimateEarthquakeRisk(point: LatLng) {
  if (point.lat >= 30 || (point.lat >= 24 && point.lng >= 88)) return 78;
  if (point.lat >= 26 && point.lng >= 72 && point.lng <= 84) return 56;
  if (point.lng >= 91 && point.lat >= 22) return 74;
  return 28;
}

function computePoiProximity(
  snapshot: SpatialSnapshot,
  network: ReturnType<typeof computeNetworkStats>
): POIProximityFeatures {
  const distanceToMetro = nearestDistance(snapshot, ['metro', 'transit'], 3.5);
  const distanceToSchool = nearestDistance(snapshot, ['school'], 2.2);
  const distanceToHospital = nearestDistance(snapshot, ['hospital'], 3.2);
  const distanceToCommercial = nearestDistance(snapshot, ['commercial'], 1.8);
  const distanceToAirport = nearestDistance(snapshot, ['airport'], 24);
  const distanceToHighway =
    network.majorRoads.length > 0
      ? Math.min(
          ...network.majorRoads.map((road) =>
            distanceToPolylineKm(snapshot.center, road.points)
          )
        )
      : 5;

  const poiDensity = Number(
    (snapshot.amenities.length / Math.max(PRIMARY_ANALYSIS_AREA_SQKM, 0.1)).toFixed(1)
  );

  const connectivityScore =
    network.streetConnectivity * 0.55 +
    clamp((1.8 - distanceToMetro) * 28, 0, 45) +
    clamp(poiDensity * 0.8, 0, 25);

  return {
    distanceToMetro: Number(distanceToMetro.toFixed(2)),
    distanceToSchool: Number(distanceToSchool.toFixed(2)),
    distanceToHospital: Number(distanceToHospital.toFixed(2)),
    distanceToCommercial: Number(distanceToCommercial.toFixed(2)),
    distanceToHighway: Number(distanceToHighway.toFixed(2)),
    distanceToAirport: Number(distanceToAirport.toFixed(1)),
    poiDensity,
    connectivity:
      connectivityScore >= 82
        ? 'excellent'
        : connectivityScore >= 64
          ? 'good'
          : connectivityScore >= 42
            ? 'average'
            : 'poor',
  };
}

function computeInfrastructure(
  snapshot: SpatialSnapshot,
  poi: POIProximityFeatures,
  network: ReturnType<typeof computeNetworkStats>,
  urbanDensity: number
): InfrastructureFeatures {
  const roadQuality = computeRoadQuality(snapshot);
  const transitStops = amenitiesByKind(snapshot, ['metro', 'transit']).length;
  const publicTransportScore = clamp(
    Math.round(
      100 -
        poi.distanceToMetro * 28 +
        transitStops * 3 +
        network.streetConnectivity * 0.25
    ),
    18,
    100
  );
  const plannedZone =
    network.streetConnectivity >= 55 &&
    network.deadEndDensity <= 18 &&
    urbanDensity >= 18;
  const developmentIndex = clamp(
    Math.round(
      roadQuality * 0.32 +
        publicTransportScore * 0.28 +
        network.networkCoverage * 0.18 +
        urbanDensity * 0.12 +
        poi.poiDensity * 0.6
    ),
    20,
    100
  );

  const waterSupply =
    developmentIndex >= 82
      ? 'excellent'
      : developmentIndex >= 64
        ? 'good'
        : developmentIndex >= 46
          ? 'average'
          : 'poor';

  return {
    roadQuality,
    publicTransportScore,
    waterSupply,
    powerAvailability:
      developmentIndex >= 78
        ? '24hr'
        : developmentIndex >= 55
          ? 'yes'
          : developmentIndex >= 35
            ? 'intermittent'
            : 'no',
    sewerageConnection: plannedZone || urbanDensity > 30,
    plannedZone,
    developmentIndex,
  };
}

function computeRemoteSensing(
  snapshot: SpatialSnapshot,
  poi: POIProximityFeatures,
  network: ReturnType<typeof computeNetworkStats>,
  infrastructure: InfrastructureFeatures,
  fetchedAt: string
): RemoteSensingFeatures {
  const greenAreaSqM = snapshot.greenAreas.reduce((sum, area) => sum + area.areaSqM, 0);
  const builtAreaSqM =
    (snapshot.subjectBuilding?.areaSqM || 0) +
    snapshot.nearbyBuildings.reduce((sum, building) => sum + building.areaSqM, 0);
  const greenCoverageRatio = clamp(
    greenAreaSqM / Math.max(NETWORK_ANALYSIS_AREA_SQKM * 1_000_000, 1),
    0,
    0.7
  );
  const builtCoverageRatio = clamp(
    builtAreaSqM / Math.max(NETWORK_ANALYSIS_AREA_SQKM * 1_000_000, 1),
    0,
    0.6
  );
  const urbanDensity = clamp(Math.round(builtCoverageRatio * 240), 8, 100);
  const ndvi = Number(clamp(greenCoverageRatio * 2.1 + 0.06, 0.06, 0.92).toFixed(2));
  const nightLightIntensity = clamp(
    Math.round(
      urbanDensity * 0.52 +
        poi.poiDensity * 0.95 +
        network.totalRoadLengthKm * 4.6 +
        infrastructure.publicTransportScore * 0.08
    ),
    12,
    100
  );
  const vacancyProxyScore = clamp(
    Math.round(
      92 -
        nightLightIntensity * 0.78 -
        infrastructure.publicTransportScore * 0.08 +
        (snapshot.subjectBuilding ? 0 : 12)
    ),
    4,
    88
  );

  return {
    ndvi,
    nightLightIntensity,
    urbanDensity,
    landUseType: deriveLandUseType(snapshot),
    satelliteImageDate: fetchedAt,
    vacancyProxyScore,
  };
}

function computeEnvironmentalRisk(
  snapshot: SpatialSnapshot,
  environment: EnvironmentalSnapshot,
  poi: POIProximityFeatures,
  point: LatLng
): EnvironmentalRiskFeatures {
  const nearestWaterDistance =
    snapshot.waterBodies.length > 0
      ? Math.min(
          ...snapshot.waterBodies.map((body) =>
            Math.min(
              ...body.points.map((pointOnEdge) =>
                haversineDistanceKm(point, pointOnEdge)
              )
            )
          )
        )
      : Number.POSITIVE_INFINITY;
  const floodDischarge =
    environment.flood.peakRiverDischargeNext7Days ||
    environment.flood.currentRiverDischarge ||
    0;
  const airQualityIndex = clamp(environment.airQuality.usAqi || 96, 20, 500);
  const pollutantExposure = clamp(
    Math.round(
      ((environment.airQuality.pm25 || 20) * 1.8 +
        (environment.airQuality.no2 || 15) * 0.7 +
        (environment.airQuality.ozone || 20) * 0.2) /
        2
    ),
    10,
    100
  );
  const roadNoisePenalty =
    poi.distanceToHighway < 0.12 ? 20 : poi.distanceToHighway < 0.35 ? 13 : 6;
  const railNoisePenalty =
    poi.distanceToMetro < 0.25 ? 10 : poi.distanceToMetro < 0.6 ? 6 : 2;
  const commercialNoisePenalty =
    poi.distanceToCommercial < 0.35 ? 8 : poi.distanceToCommercial < 0.7 ? 5 : 2;
  const noiseLevelDb = clamp(
    Math.round(
      44 +
        roadNoisePenalty +
        railNoisePenalty +
        commercialNoisePenalty +
        (environment.weather.windSpeedKph || 0) * 0.08
    ),
    42,
    82
  );
  const floodZoneFlag =
    floodDischarge >= 120 ||
    (nearestWaterDistance <= 0.35 && floodDischarge >= 28);
  const apparentTemperature = environment.weather.apparentTemperatureC || 28;
  const climateFutureRisk = clamp(
    Math.round(
      (floodZoneFlag ? 34 : 12) +
        Math.max(0, apparentTemperature - 30) * 4 +
        airQualityIndex * 0.18
    ),
    12,
    100
  );
  const earthquakeSusceptibility = estimateEarthquakeRisk(point);

  const naturalDisasterHistory: string[] = [];
  if (floodZoneFlag) {
    naturalDisasterHistory.push('elevated river discharge and nearby water-body exposure');
  }
  if (earthquakeSusceptibility >= 60) {
    naturalDisasterHistory.push('heightened seismic-zone sensitivity');
  }
  if (apparentTemperature >= 36) {
    naturalDisasterHistory.push('heat-stress conditions in current climate snapshot');
  }

  return {
    floodZoneFlag,
    earthquakeSusceptibility,
    airQualityIndex,
    noiseLevelDb,
    pollutantExposure,
    climateFutureRisk,
    naturalDisasterHistory,
  };
}

function computeMarketIntelligence(
  snapshot: SpatialSnapshot,
  poi: POIProximityFeatures,
  network: ReturnType<typeof computeNetworkStats>,
  remote: RemoteSensingFeatures,
  environmental: EnvironmentalRiskFeatures
): MarketIntelligenceFeatures {
  const brokerDensity = Number(
    (
      amenitiesByKind(snapshot, ['broker']).length /
      Math.max(PRIMARY_ANALYSIS_AREA_SQKM, 0.1)
    ).toFixed(1)
  );
  const accessibilityIndex = clamp(
    Math.round(
      (100 - poi.distanceToMetro * 24) * 0.4 +
        (100 - poi.distanceToCommercial * 36) * 0.25 +
        (100 - poi.distanceToHospital * 18) * 0.15 +
        network.streetConnectivity * 0.2
    ),
    12,
    100
  );
  const demandIndex = clamp(
    Math.round(
      accessibilityIndex * 0.42 +
        network.intersectionDensity * 0.35 +
        remote.ndvi * 18 +
        brokerDensity * 1.8 -
        environmental.airQualityIndex * 0.08
    ),
    10,
    100
  );
  const supplyIndex = clamp(
    Math.round(
      snapshot.nearbyBuildings.length * 2.4 +
        remote.urbanDensity * 0.45 +
        Math.max(0, 18 - brokerDensity * 0.8)
    ),
    12,
    100
  );
  const absorptionRate = Number(
    clamp((demandIndex - supplyIndex * 0.22 + 38) / 100, 0.24, 0.92).toFixed(2)
  );
  const daysOnMarket = clamp(
    Math.round(
      168 - demandIndex * 1.12 + supplyIndex * 0.38 + environmental.climateFutureRisk * 0.18
    ),
    24,
    210
  );
  const priceTrendMonthly = Number(
    clamp((demandIndex - supplyIndex) / 1800, -0.015, 0.018).toFixed(3)
  );
  const priceTrendYearly = Number(
    clamp(priceTrendMonthly * 9 + demandIndex / 2200, 0.018, 0.12).toFixed(3)
  );
  const rentalYieldBenchmark = Number(
    clamp(2.4 + demandIndex / 38 - environmental.airQualityIndex / 240, 2.1, 5.4).toFixed(1)
  );

  return {
    brokerDensity,
    absorptionRate,
    daysOnMarket,
    priceTrendMonthly,
    priceTrendYearly,
    demandIndex,
    supplyIndex,
    rentalYieldBenchmark,
  };
}

function computeOSMNXNetwork(
  snapshot: SpatialSnapshot,
  poi: POIProximityFeatures,
  network: ReturnType<typeof computeNetworkStats>,
  remote: RemoteSensingFeatures
): OSMNXNetworkFeatures {
  const amenitiesWithin1Km = snapshot.amenities.filter(
    (amenity) => amenity.distanceKm <= 1
  ).length;
  const accessibilityIndex = clamp(
    Math.round(
      network.streetConnectivity * 0.4 +
        amenitiesWithin1Km * 2.4 +
        (100 - poi.distanceToMetro * 28) * 0.22 +
        remote.ndvi * 24
    ),
    14,
    100
  );
  const walkabilityScore = clamp(
    Math.round(
      accessibilityIndex * 0.55 +
        network.intersectionDensity * 0.45 -
        network.deadEndDensity * 0.8
    ),
    12,
    100
  );

  return {
    walkabilityScore,
    bikeabilityScore: network.bikeabilityScore,
    intersectionDensity: network.intersectionDensity,
    streetConnectivity: network.streetConnectivity,
    averageBlockLength: network.averageBlockLength,
    deadEndDensity: network.deadEndDensity,
    networkCoverage: network.networkCoverage,
    centralityScore: network.centralityScore,
    accessibilityIndex,
    networkComplexity: network.networkComplexity,
  };
}

/**
 * COMPUTE LOCATION INTELLIGENCE FROM LAT/LONG
 * Live implementation with resilient fallbacks on open-data providers.
 */
export async function computeLocationIntelligence(
  latitude: number,
  longitude: number,
  pincode?: string
): Promise<LocationIntelligence> {
  const point = { lat: latitude, lng: longitude };
  const fetchedAt = new Date().toISOString();

  const [spatialResult, environmentalResult] = await Promise.allSettled([
    fetchSpatialSnapshot(point),
    fetchEnvironmentalSnapshot(point),
  ]);

  const spatialContext =
    spatialResult.status === 'fulfilled'
      ? spatialResult.value
      : emptySpatialSnapshot(point);
  const environmentSnapshot =
    environmentalResult.status === 'fulfilled'
      ? environmentalResult.value
      : {
          weather: {},
          airQuality: {},
          flood: {},
        };

  const network = computeNetworkStats(spatialContext);
  const poiProximity = computePoiProximity(spatialContext, network);
  const remoteSensing = computeRemoteSensing(
    spatialContext,
    poiProximity,
    network,
    {
      roadQuality: 0,
      publicTransportScore: 0,
      waterSupply: 'average',
      powerAvailability: 'yes',
      sewerageConnection: false,
      plannedZone: false,
      developmentIndex: 0,
    },
    fetchedAt
  );
  const infrastructure = computeInfrastructure(
    spatialContext,
    poiProximity,
    network,
    remoteSensing.urbanDensity
  );
  const refinedRemoteSensing = computeRemoteSensing(
    spatialContext,
    poiProximity,
    network,
    infrastructure,
    fetchedAt
  );
  const environmentalRisk = computeEnvironmentalRisk(
    spatialContext,
    environmentSnapshot,
    poiProximity,
    point
  );
  const marketIntelligence = computeMarketIntelligence(
    spatialContext,
    poiProximity,
    network,
    refinedRemoteSensing,
    environmentalRisk
  );
  const osmnxNetwork = computeOSMNXNetwork(
    spatialContext,
    poiProximity,
    network,
    refinedRemoteSensing
  );

  const liveSignals =
    (spatialResult.status === 'fulfilled' ? 1 : 0) +
    (environmentalResult.status === 'fulfilled' ? 1 : 0);

  return {
    poiProximity,
    infrastructure,
    remoteSensing: refinedRemoteSensing,
    marketIntelligence,
    environmentalRisk,
    osmnxNetwork,
    spatialContext,
    metadata: {
      fetchedAt,
      providers: ['Nominatim', 'Overpass API', 'OpenStreetMap', 'Open-Meteo'],
      status:
        liveSignals === 2 ? 'live' : liveSignals === 1 ? 'partial' : 'fallback',
      liveSignals,
    },
  };
}

/**
 * INFRASTRUCTURE SCORE (aggregate 0-100)
 */
export function computeInfrastructureScore(intelligence: LocationIntelligence): number {
  const poi = intelligence.poiProximity;
  const infra = intelligence.infrastructure;
  const remote = intelligence.remoteSensing;
  const market = intelligence.marketIntelligence;
  const osmnx = intelligence.osmnxNetwork;

  return Math.round(
    (100 - Math.min(100, poi.distanceToMetro * 24)) * 0.12 +
      (100 - Math.min(100, poi.distanceToCommercial * 38)) * 0.08 +
      (poi.connectivity === 'excellent'
        ? 100
        : poi.connectivity === 'good'
          ? 80
          : poi.connectivity === 'average'
            ? 60
            : 32) *
        0.1 +
      infra.roadQuality * 0.08 +
      infra.developmentIndex * 0.08 +
      (infra.plannedZone ? 100 : 58) * 0.09 +
      osmnx.walkabilityScore * 0.1 +
      osmnx.streetConnectivity * 0.08 +
      osmnx.accessibilityIndex * 0.07 +
      remote.ndvi * 50 * 0.08 +
      remote.urbanDensity * 0.07 +
      market.demandIndex * 0.05
  );
}

/**
 * LOCATION TIER CLASSIFICATION (Tier-1, Tier-2, Tier-3)
 */
export function classifyLocationTier(
  infrastructure: LocationIntelligence,
  pincode: string
): 'tier-1' | 'tier-2' | 'tier-3' {
  const tier1Prefixes = ['11', '40', '56', '50', '60', '70', '12'];
  if (tier1Prefixes.some((prefix) => pincode.startsWith(prefix))) {
    return 'tier-1';
  }

  const infraScore = computeInfrastructureScore(infrastructure);
  if (infraScore > 72) return 'tier-2';
  if (infraScore > 54) return 'tier-2';
  return 'tier-3';
}
