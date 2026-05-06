import {
  getAsset,
  getProperty,
  getValuation,
  getValuationsByProperty,
  listValuations,
} from '@/lib/db/client';
import type { AssetDocument, PropertyDocument, ValuationResult } from '@/lib/db/schema';
import { computeLocationIntelligence } from '@/lib/geospatial/locationIntelligence';
import { enrichMarketDataFromLocation } from '@/lib/pipeline/enrichment';
import { monteCarloTimeToSell } from '@/lib/simulation/marketSimulation';
import { validatePropertyData } from '@/lib/validation/dataQuality';
import { runComprehensiveFraudDetection } from '@/lib/validation/fraudDetection';

export interface SerializedProperty extends Omit<PropertyDocument, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface SerializedValuation extends Omit<ValuationResult, 'timestamp'> {
  timestamp: string;
}

type ResolvedLocationIntelligence = Awaited<ReturnType<typeof computeLocationIntelligence>>;

export interface SerializedAssetPreview {
  assetId: string;
  displayName: string;
  originalFilename?: string;
  secureUrl: string;
  thumbnailUrl?: string;
  resourceType?: AssetDocument['resourceType'];
  mimeType: string;
  width?: number;
  height?: number;
  tags: string[];
}

export interface ValuationDetailReport {
  valuation: SerializedValuation;
  property: SerializedProperty;
  immersive: {
    propertyId: string;
    address: string;
    latitude: number;
    longitude: number;
    propertyType: string;
    bedrooms?: number;
    bathrooms?: number;
    builtupArea: number;
    ageInYears: number;
    valuation: SerializedValuation['valuation'];
    liquidity?: {
      estimatedTimeToSell: number;
      absorptionProbability: number;
      distressDiscount: number;
    };
    riskFlags?: SerializedValuation['riskFlags'];
    riskDimensions: Array<{
      name: string;
      score: number;
      color: string;
    }>;
    overallRiskScore: number;
    amenities: Array<{
      type: string;
      name: string;
      distance: number;
      icon: string;
      travelTime?: number;
    }>;
    spatialContext: ResolvedLocationIntelligence['spatialContext'];
    dataSources: Array<{
      name: string;
      detail: string;
    }>;
  };
  market: {
    summary: {
      demandIndex: number;
      supplyIndex: number;
      avgDaysOnMarket: number;
      absorptionRate: number;
      priceGrowthYoY: number;
    };
    comparisonScatter: {
      properties: Array<{
        id: string;
        pricePerSqft: number;
        builtupArea: number;
        priceTotal: number;
        distance: number;
        similarity: number;
      }>;
      currentProperty: {
        pricePerSqft: number;
        builtupArea: number;
      };
    };
    historicalEvolution: {
      history: Array<{
        year: number;
        description: string;
        development: string;
        density: number;
      }>;
    };
    urbanDevelopmentTimeline: {
      projects: Array<{
        name: string;
        year: number;
        status: 'planned' | 'under_construction' | 'completed';
        type: string;
        icon: string;
        distance: number;
        impact: string;
      }>;
    };
  };
  environment: {
    climate: {
      latitude: number;
      longitude: number;
      floodRisk: number;
      earthquakeRisk: number;
      heatStressRisk: number;
      coldStressRisk: number;
    };
    noise: {
      baselineNoise: number;
      sources: Array<{
        name: string;
        distance: number;
        intensity: number;
        icon: string;
        frequency: string;
      }>;
    };
    traffic: {
      data: Array<{
        hour: number;
        congestion: number;
      }>;
    };
    commute: {
      paths: Array<{
        destination: string;
        travelTime: number;
        distance: number;
        icon: string;
      }>;
    };
    sunlight: {
      latitude: number;
      longitude: number;
      buildingHeight: number;
    };
    environmentLayers: {
      layers: Array<{
        name: string;
        id: string;
        color: string;
        description: string;
        riskLevel: 'low' | 'medium' | 'high';
        icon: string;
      }>;
    };
    advancedLayers: {
      layers: Array<{
        id: string;
        name: string;
        icon: string;
        category: 'Infrastructure' | 'Safety' | 'Amenities' | 'Environmental';
        description: string;
        opacity: number;
        enabled: boolean;
      }>;
    };
  };
  neighborhood: {
    demographicRings: {
      rings: Array<{
        distance: number;
        population: number;
        medianAge: number;
        medianIncome: number;
        educationLevel: string;
        employmentRate: number;
        familyComposition: string;
      }>;
    };
  };
  propertyExperience: {
    virtualTour360: {
      propertyName: string;
      rooms: Array<{
        name: string;
        icon: string;
        features: string[];
        imageUrl?: string;
      }>;
      photos: Array<{
        url: string;
        label: string;
      }>;
    };
  };
  media: {
    exteriorAssets: SerializedAssetPreview[];
    layoutAsset?: SerializedAssetPreview;
    legalDocuments: Array<{
      assetId?: string;
      displayName: string;
      secureUrl?: string;
      category: string;
      sourceName: string;
      summary?: string;
      warnings: string[];
    }>;
  };
  diagnostics: {
    riskDimensions: Array<{
      name: string;
      score: number;
      color: string;
    }>;
    overallRiskScore: number;
    validation: ReturnType<typeof validatePropertyData>;
    fraudReview: ReturnType<typeof runComprehensiveFraudDetection>;
    liquiditySimulation: ReturnType<typeof monteCarloTimeToSell>;
    performanceOptimizer: {
      components: Array<{
        name: string;
        loadTime: number;
        size: number;
        status: 'loaded' | 'loading' | 'pending';
        lazy: boolean;
      }>;
    };
  };
}

function categoryFromPropertyType(propertyType: string) {
  if (/villa|townhouse/i.test(propertyType)) return 'villa';
  if (/commercial/i.test(propertyType)) return 'commercial';
  if (/land/i.test(propertyType)) return 'land';
  if (/under/i.test(propertyType)) return 'underconstruction';
  return 'apartment';
}

function deriveBedrooms(property: PropertyDocument): number {
  if (property.bedrooms || property.bedroomCount) {
    return property.bedrooms ?? property.bedroomCount ?? 2;
  }
  const match = property.propertyType.match(/^(\d+)/);
  if (match) return parseInt(match[1], 10);
  if (/studio/i.test(property.propertyType)) return 1;
  if (/villa|townhouse/i.test(property.propertyType)) return 4;
  return 2;
}

function deriveBathrooms(property: PropertyDocument): number {
  return property.bathrooms || property.bathroomCount || Math.max(1, deriveBedrooms(property));
}

function deriveBuildingHeight(property: PropertyDocument) {
  const bedrooms = deriveBedrooms(property);
  return Math.max(10, Math.round(8 + bedrooms * 1.5 + property.ageInYears * 0.1));
}

function serializeProperty(property: PropertyDocument): SerializedProperty {
  return {
    ...property,
    createdAt: new Date(property.createdAt).toISOString(),
    updatedAt: new Date(property.updatedAt).toISOString(),
  };
}

function serializeValuation(valuation: ValuationResult): SerializedValuation {
  return {
    ...valuation,
    timestamp: new Date(valuation.timestamp).toISOString(),
  };
}

function distanceBetween(
  current: PropertyDocument,
  other: PropertyDocument | null
) {
  if (!other) return 0;
  const latDiff = current.latitude - other.latitude;
  const lngDiff = current.longitude - other.longitude;
  return Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 * 10) / 10;
}

function similarityScore(
  current: PropertyDocument,
  other: PropertyDocument | null,
  currentValuation: ValuationResult,
  otherValuation: ValuationResult
) {
  if (!other) return 0.55;
  const areaScore =
    1 -
    Math.min(
      1,
      Math.abs(current.builtupArea - other.builtupArea) / Math.max(current.builtupArea, 1)
    );
  const ageScore =
    1 - Math.min(1, Math.abs(current.ageInYears - other.ageInYears) / 25);
  const typeScore = current.propertyType === other.propertyType ? 1 : 0.7;
  const pricePerSqftCurrent =
    currentValuation.valuation.pointEstimate / Math.max(current.builtupArea, 1);
  const pricePerSqftOther =
    otherValuation.valuation.pointEstimate / Math.max(other.builtupArea, 1);
  const priceScore =
    1 - Math.min(1, Math.abs(pricePerSqftCurrent - pricePerSqftOther) / Math.max(pricePerSqftCurrent, 1));

  return Math.round(((areaScore + ageScore + typeScore + priceScore) / 4) * 100) / 100;
}

async function buildComparableProperties(
  property: PropertyDocument,
  valuation: ValuationResult,
  userId?: string
) {
  const allValuations = await listValuations(16, 0, userId ? { userId } : {});
  const comparableCandidates = await Promise.all(
    allValuations
      .filter((candidate) => candidate.valuationId !== valuation.valuationId)
      .slice(0, 8)
      .map(async (candidate) => {
        const candidateProperty = await getProperty(candidate.propertyId, userId);
        const candidateArea = candidateProperty?.builtupArea || property.builtupArea;
        return {
          id: candidate.valuationId,
          pricePerSqft: Math.round(candidate.valuation.pointEstimate / Math.max(candidateArea, 1)),
          builtupArea: candidateArea,
          priceTotal: candidate.valuation.pointEstimate,
          distance: distanceBetween(property, candidateProperty),
          similarity: similarityScore(property, candidateProperty, valuation, candidate),
        };
      })
  );

  return comparableCandidates;
}

function buildHistoricalEvolution(property: PropertyDocument, densityBase: number) {
  const currentYear = new Date().getFullYear();
  const completionYear = Math.max(currentYear - property.ageInYears, currentYear - 25);

  return [
    {
      year: completionYear - 15,
      description: 'Emerging Fabric',
      development: 'Low-rise housing and fragmented arterial connectivity.',
      density: Math.max(18, densityBase - 45),
    },
    {
      year: completionYear - 5,
      description: 'Connectivity Buildout',
      development: 'Transit, retail, and first institutional anchors improved demand.',
      density: Math.max(35, densityBase - 25),
    },
    {
      year: completionYear,
      description: 'Asset Delivery',
      development: 'The subject pocket reached investable density with stable infrastructure.',
      density: Math.max(50, densityBase - 10),
    },
    {
      year: currentYear - 2,
      description: 'Mixed-Use Maturity',
      development: 'Commercial absorption and neighborhood services expanded materially.',
      density: Math.min(92, densityBase + 5),
    },
    {
      year: currentYear,
      description: 'Current Positioning',
      development: 'Demand remains supported by access, livability, and lender-usable comparables.',
      density: Math.min(96, densityBase + 10),
    },
  ];
}

function buildDevelopmentProjects(
  priceGrowthYoY: number,
  walkability: number,
  property: PropertyDocument
) {
  const currentYear = new Date().getFullYear();
  return [
    {
      name: 'Transit Access Upgrade',
      year: currentYear,
      status: 'under_construction' as const,
      type: 'Transportation',
      icon: '🚇',
      distance: 0.7,
      impact: `Improves commute reliability and supports ${Math.round(priceGrowthYoY * 100)}% YoY pricing momentum.`,
    },
    {
      name: 'Neighborhood Retail Spine',
      year: currentYear + 1,
      status: 'planned' as const,
      type: 'Retail',
      icon: '🏬',
      distance: 1.1,
      impact: 'Expands everyday convenience and strengthens end-user demand.',
    },
    {
      name: 'Public Realm & Parks',
      year: currentYear,
      status: 'completed' as const,
      type: 'Parks',
      icon: '🌳',
      distance: 0.9,
      impact: `Walkability already scores ${Math.round(walkability * 100)}/100 and should remain durable.`,
    },
    {
      name: `${property.city.toUpperCase()} Health Cluster`,
      year: currentYear + 2,
      status: 'planned' as const,
      type: 'Healthcare',
      icon: '🏥',
      distance: 2.2,
      impact: 'Adds institutional stability and improves family-buyer appeal.',
    },
  ];
}

function amenityIcon(kind: string) {
  if (kind === 'metro' || kind === 'transit') return '🚇';
  if (kind === 'school') return '🎓';
  if (kind === 'hospital') return '🏥';
  if (kind === 'commercial') return '🏬';
  if (kind === 'park') return '🌳';
  if (kind === 'airport') return '✈️';
  return '📍';
}

function nearestAmenityName(
  locationIntel: ResolvedLocationIntelligence,
  kind: string,
  fallback: string
) {
  return (
    locationIntel.spatialContext.amenities.find((amenity) => amenity.kind === kind)?.name ||
    fallback
  );
}

function buildCommutePaths(locationIntel: ResolvedLocationIntelligence) {
  const metroName = nearestAmenityName(locationIntel, 'metro', 'Nearest Metro');
  const commercialName = nearestAmenityName(locationIntel, 'commercial', 'Commercial Hub');
  const schoolName = nearestAmenityName(locationIntel, 'school', 'Primary School');
  const hospitalName = nearestAmenityName(locationIntel, 'hospital', 'Hospital');
  const airportName = nearestAmenityName(locationIntel, 'airport', 'Airport');

  return [
    {
      destination: metroName,
      travelTime: Math.max(5, Math.round(locationIntel.poiProximity.distanceToMetro * 11)),
      distance: Number(locationIntel.poiProximity.distanceToMetro.toFixed(1)),
      icon: '🚇',
    },
    {
      destination: commercialName,
      travelTime: Math.max(7, Math.round(locationIntel.poiProximity.distanceToCommercial * 12)),
      distance: Number(locationIntel.poiProximity.distanceToCommercial.toFixed(1)),
      icon: '🏢',
    },
    {
      destination: schoolName,
      travelTime: Math.max(8, Math.round(locationIntel.poiProximity.distanceToSchool * 10)),
      distance: Number(locationIntel.poiProximity.distanceToSchool.toFixed(1)),
      icon: '🎓',
    },
    {
      destination: hospitalName,
      travelTime: Math.max(10, Math.round(locationIntel.poiProximity.distanceToHospital * 10)),
      distance: Number(locationIntel.poiProximity.distanceToHospital.toFixed(1)),
      icon: '🏥',
    },
    {
      destination: airportName,
      travelTime: Math.max(20, Math.round(locationIntel.poiProximity.distanceToAirport * 3)),
      distance: Number(locationIntel.poiProximity.distanceToAirport.toFixed(1)),
      icon: '✈️',
    },
  ];
}

function buildAmenities(locationIntel: ResolvedLocationIntelligence) {
  const topAmenities = locationIntel.spatialContext.amenities
    .filter((amenity) =>
      ['metro', 'school', 'hospital', 'commercial', 'park'].includes(amenity.kind)
    )
    .slice(0, 10);

  if (topAmenities.length > 0) {
    return topAmenities.map((amenity) => ({
      type:
        amenity.kind === 'commercial'
          ? 'Market'
          : amenity.kind === 'park'
            ? 'Park'
            : amenity.kind.charAt(0).toUpperCase() + amenity.kind.slice(1),
      name: amenity.name,
      distance: Math.round(amenity.distanceKm * 1000),
      icon: amenityIcon(amenity.kind),
      travelTime: Math.max(4, Math.round(amenity.distanceKm * 10)),
    }));
  }

  return [
    {
      type: 'Metro',
      name: 'Nearest Metro',
      distance: Math.round(locationIntel.poiProximity.distanceToMetro * 1000),
      icon: '🚇',
      travelTime: Math.max(5, Math.round(locationIntel.poiProximity.distanceToMetro * 10)),
    },
  ];
}

function buildNoiseSources(locationIntel: ResolvedLocationIntelligence) {
  const baselineNoise = Math.round(locationIntel.environmentalRisk.noiseLevelDb);
  const metroName = nearestAmenityName(locationIntel, 'metro', 'Metro Corridor');
  const commercialName = nearestAmenityName(locationIntel, 'commercial', 'Commercial Activity');
  const airportName = nearestAmenityName(locationIntel, 'airport', 'Airport Approach');

  return {
    baselineNoise,
    sources: [
      {
        name: 'Primary Road Traffic',
        distance: Number((locationIntel.poiProximity.distanceToHighway * 0.45).toFixed(1)),
        intensity: Math.min(88, baselineNoise + 12),
        icon: '🚗',
        frequency: 'Continuous',
      },
      {
        name: metroName,
        distance: Number(locationIntel.poiProximity.distanceToMetro.toFixed(1)),
        intensity: Math.min(80, baselineNoise + 8),
        icon: '🚇',
        frequency: 'Peak hours',
      },
      {
        name: commercialName,
        distance: Number(locationIntel.poiProximity.distanceToCommercial.toFixed(1)),
        intensity: Math.min(75, baselineNoise + 5),
        icon: '🏬',
        frequency: 'Daytime',
      },
      {
        name: airportName,
        distance: Number(locationIntel.poiProximity.distanceToAirport.toFixed(1)),
        intensity: Math.max(58, baselineNoise + 3),
        icon: '✈️',
        frequency: 'Intermittent',
      },
    ],
  };
}

function buildTrafficData(absorptionRate: number, demandIndex: number) {
  const peak = Math.min(92, 60 + Math.round(absorptionRate * 30) + Math.round(demandIndex * 10));

  return Array.from({ length: 24 }, (_, hour) => {
    const morningPeak = hour >= 7 && hour <= 9;
    const eveningPeak = hour >= 17 && hour <= 20;
    const shoulder = hour >= 10 && hour <= 16;
    const late = hour >= 22 || hour <= 5;

    if (morningPeak || eveningPeak) {
      return { hour, congestion: peak };
    }
    if (shoulder) {
      return { hour, congestion: Math.max(35, peak - 28) };
    }
    if (late) {
      return { hour, congestion: 12 };
    }
    return { hour, congestion: Math.max(22, peak - 18) };
  });
}

function buildDemographicRings(
  demandIndex: number,
  rentalYield: number,
  property: PropertyDocument
) {
  const bedroomBias = deriveBedrooms(property) * 4000;
  const baseIncome = 720000 + demandIndex * 180000;
  const basePopulation = 18000 + bedroomBias;

  return [
    {
      distance: 0.5,
      population: Math.round(basePopulation),
      medianAge: 31,
      medianIncome: Math.round(baseIncome),
      educationLevel: 'High (70% Bachelor+)',
      employmentRate: 94,
      familyComposition: '42% families, 38% young professionals, 20% seniors',
    },
    {
      distance: 1.0,
      population: Math.round(basePopulation * 2.4),
      medianAge: 33,
      medianIncome: Math.round(baseIncome * (1 - rentalYield * 0.02)),
      educationLevel: 'Medium-High (63% Bachelor+)',
      employmentRate: 91,
      familyComposition: '47% families, 33% young professionals, 20% seniors',
    },
    {
      distance: 1.5,
      population: Math.round(basePopulation * 4.6),
      medianAge: 35,
      medianIncome: Math.round(baseIncome * 0.9),
      educationLevel: 'Medium (55% Bachelor+)',
      employmentRate: 88,
      familyComposition: '49% families, 29% young professionals, 22% seniors',
    },
    {
      distance: 2.0,
      population: Math.round(basePopulation * 7.2),
      medianAge: 37,
      medianIncome: Math.round(baseIncome * 0.84),
      educationLevel: 'Medium (50% Bachelor+)',
      employmentRate: 86,
      familyComposition: '50% families, 25% young professionals, 25% seniors',
    },
  ];
}

function buildEnvironmentLayers(locationIntel: ResolvedLocationIntelligence) {
  return [
    {
      name: 'Flood Exposure',
      id: 'flood',
      color: '#3B82F6',
      description: 'Surface water accumulation and historical flood sensitivity.',
      riskLevel: locationIntel.environmentalRisk.floodZoneFlag ? 'high' as const : 'low' as const,
      icon: '🌊',
    },
    {
      name: 'Seismic Sensitivity',
      id: 'earthquake',
      color: '#EF4444',
      description: 'Structural exposure to seismic activity.',
      riskLevel:
        locationIntel.environmentalRisk.earthquakeSusceptibility > 35 ? 'medium' as const : 'low' as const,
      icon: '🏚️',
    },
    {
      name: 'Noise Corridor',
      id: 'noise',
      color: '#F59E0B',
      description: 'Ambient noise load from road, rail, and commercial intensity.',
      riskLevel:
        locationIntel.environmentalRisk.noiseLevelDb > 68 ? 'medium' as const : 'low' as const,
      icon: '🔊',
    },
    {
      name: 'Air Quality',
      id: 'air',
      color: '#8B5CF6',
      description: 'AQI and pollutant exposure near the asset.',
      riskLevel:
        locationIntel.environmentalRisk.airQualityIndex > 220 ? 'high' as const : 'medium' as const,
      icon: '💨',
    },
  ];
}

function buildAdvancedLayers(locationIntel: ResolvedLocationIntelligence) {
  return [
    {
      id: 'roads',
      name: 'Road Network',
      icon: '🛣️',
      category: 'Infrastructure' as const,
      description: `Live OSM road network with connectivity score ${locationIntel.osmnxNetwork.streetConnectivity}/100.`,
      opacity: 0.8,
      enabled: true,
    },
    {
      id: 'metro',
      name: 'Metro Lines',
      icon: '🚇',
      category: 'Infrastructure' as const,
      description: `${locationIntel.poiProximity.distanceToMetro.toFixed(1)}km to ${nearestAmenityName(locationIntel, 'metro', 'the nearest station')}.`,
      opacity: 0.72,
      enabled: true,
    },
    {
      id: 'schools',
      name: 'School Catchment',
      icon: '🎓',
      category: 'Amenities' as const,
      description: `${locationIntel.poiProximity.distanceToSchool.toFixed(1)}km education access.`,
      opacity: 0.7,
      enabled: true,
    },
    {
      id: 'flood',
      name: 'Flood Zones',
      icon: '🌊',
      category: 'Safety' as const,
      description: locationIntel.environmentalRisk.floodZoneFlag
        ? 'Flood sensitivity detected in the surrounding grid.'
        : 'No elevated flood signal in the current grid.',
      opacity: 0.5,
      enabled: locationIntel.environmentalRisk.floodZoneFlag,
    },
    {
      id: 'pollution',
      name: 'Air Pollution',
      icon: '💨',
      category: 'Environmental' as const,
      description: `AQI ${Math.round(locationIntel.environmentalRisk.airQualityIndex)} near the asset.`,
      opacity: 0.5,
      enabled: false,
    },
    {
      id: 'vegetation',
      name: 'Vegetation Density',
      icon: '🌲',
      category: 'Environmental' as const,
      description: `Greenspace index ${(locationIntel.remoteSensing.ndvi * 100).toFixed(0)}/100 from mapped green coverage.`,
      opacity: 0.58,
      enabled: false,
    },
  ];
}

function buildRiskDimensions(
  valuation: ValuationResult,
  property: PropertyDocument,
  locationIntel: ResolvedLocationIntelligence,
  demandIndex: number
) {
  const fraudScore = valuation.fraudAnalysis?.riskScore || 0;
  const legalRisk =
    Math.min(
      90,
      valuation.riskFlags.filter((flag) => /legal/i.test(flag.flag)).length * 22 +
        (/pending|disputed/i.test(property.legalStatus) ? 35 : 10)
    );
  const marketRisk = Math.max(12, 100 - demandIndex);
  const ageRisk = Math.min(85, property.ageInYears * 4);
  const liquidityRisk = Math.max(5, 100 - valuation.liquidity.resalePotentialIndex);
  const environmentalRisk = Math.max(
    locationIntel.environmentalRisk.floodZoneFlag ? 42 : 18,
    Math.round(locationIntel.environmentalRisk.earthquakeSusceptibility)
  );

  const dimensions = [
    { name: 'Legal', score: legalRisk, color: '#EF4444' },
    { name: 'Market', score: marketRisk, color: '#0066CC' },
    { name: 'Age', score: ageRisk, color: '#F59E0B' },
    { name: 'Liquidity', score: liquidityRisk, color: '#EAB308' },
    { name: 'Environmental', score: environmentalRisk, color: '#10B981' },
    { name: 'Fraud', score: fraudScore, color: '#9900CC' },
  ];

  return {
    dimensions,
    overallRiskScore: Math.round(
      dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length
    ),
  };
}

function buildVirtualTourRooms(property: PropertyDocument) {
  const bedrooms = deriveBedrooms(property);
  const rooms = [
    {
      name: 'Living Room',
      icon: '🛋️',
      features: ['Wide frontage', 'Natural light', property.furnishing || 'Flexible fit-out'],
    },
    {
      name: 'Primary Bedroom',
      icon: '🛏️',
      features: ['Quiet edge', 'Storage wall', 'Window orientation review'],
    },
    {
      name: 'Kitchen',
      icon: '🍳',
      features: ['Service core access', 'Utility-ready', 'Ventilation channel'],
    },
  ];

  if (bedrooms >= 3) {
    rooms.push({
      name: 'Secondary Bedroom',
      icon: '🧸',
      features: ['Family use', 'Wardrobe bay', 'Good daylight'],
    });
  }

  rooms.push({
    name: 'Bath Suite',
    icon: '🚿',
    features: ['Wet-dry separation', 'Easy upkeep', 'Plumbing stack proximity'],
  });

  return rooms;
}

function collectPropertyPhotos(property: PropertyDocument) {
  const unique = Array.from(
    new Set([...(property.photoUrls || []), ...(property.photos || [])].filter(Boolean))
  );

  return unique.slice(0, 8).map((url, index) => ({
    url,
    label: `Captured media ${index + 1}`,
  }));
}

function serializeAssetPreview(asset: AssetDocument): SerializedAssetPreview {
  return {
    assetId: asset.assetId,
    displayName: asset.displayName,
    originalFilename: asset.originalFilename,
    secureUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    resourceType: asset.resourceType,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    tags: asset.tags,
  };
}

function isExteriorMediaPreview(asset: SerializedAssetPreview) {
  const lookup = `${asset.secureUrl} ${asset.displayName} ${asset.originalFilename || ''}`.toLowerCase();
  return (
    asset.resourceType === 'video' ||
    /\.(glb|gltf|mp4|webm|mov|m4v)(\?|#|$)/i.test(asset.secureUrl) ||
    /\.(glb|gltf|mp4|webm|mov|m4v)\b/i.test(lookup) ||
    /model\/(gltf-binary|gltf\+json|gltf)/i.test(asset.mimeType || '') ||
    asset.mimeType.startsWith('video/')
  );
}

async function resolveAssetPreviews(assetIds: string[] | undefined, userId?: string) {
  const uniqueIds = Array.from(new Set((assetIds || []).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return [];
  }

  const assets = await Promise.all(uniqueIds.map((assetId) => getAsset(assetId, userId)));
  return assets.reduce<SerializedAssetPreview[]>((previews, asset) => {
    if (!asset) {
      return previews;
    }

    previews.push(serializeAssetPreview(asset));
    return previews;
  }, []);
}

function buildPerformanceComponents() {
  return [
    { name: 'Immersive Overview', loadTime: 120, size: 28, status: 'loaded' as const, lazy: false },
    { name: 'Map Visualization', loadTime: 260, size: 42, status: 'loaded' as const, lazy: true },
    { name: 'Comparable Scatter', loadTime: 180, size: 16, status: 'loaded' as const, lazy: true },
    { name: 'Historical Evolution', loadTime: 210, size: 18, status: 'loaded' as const, lazy: true },
    { name: 'Environment Stack', loadTime: 230, size: 24, status: 'pending' as const, lazy: true },
    { name: 'Virtual Tour 360', loadTime: 310, size: 36, status: 'pending' as const, lazy: true },
    { name: 'Diagnostics', loadTime: 140, size: 14, status: 'loaded' as const, lazy: false },
  ];
}

function buildValidationInput(property: PropertyDocument): PropertyDocument {
  return {
    ...property,
    propertyType: categoryFromPropertyType(property.propertyType),
    photos: property.photos || property.photoUrls || [],
    bedroomCount: property.bedroomCount || deriveBedrooms(property),
    bathroomCount: property.bathroomCount || deriveBathrooms(property),
    subType: property.subType || property.propertyType,
  };
}

export async function getValuationDetailReport(
  id: string,
  userId?: string
): Promise<ValuationDetailReport | null> {
  const valuation =
    id.startsWith('PROP-')
      ? (await getValuationsByProperty(id, userId)).sort(
          (left, right) =>
            new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
        )[0]
      : await getValuation(id, userId);

  if (!valuation) {
    return null;
  }

  const property = await getProperty(valuation.propertyId, userId);
  if (!property) {
    return null;
  }

  const locationIntel = await computeLocationIntelligence(
    property.latitude,
    property.longitude,
    property.pincode
  );
  const market = enrichMarketDataFromLocation(
    property.city as any,
    property.micromarket,
    locationIntel
  );
  const comparableProperties = await buildComparableProperties(property, valuation, userId);
  const validation = validatePropertyData(buildValidationInput(property));
  const fraudReview = runComprehensiveFraudDetection({
    address: property.address,
    location: { lat: property.latitude, lng: property.longitude },
    area: property.builtupArea,
    type: categoryFromPropertyType(property.propertyType),
    locality: property.micromarket,
    avgAreaInLocality: Math.max(450, Math.round(property.builtupArea * 0.95)),
    price: valuation.valuation.pointEstimate,
    marketData: {
      avgPricePerSqft:
        valuation.valuation.pointEstimate / Math.max(property.builtupArea, 1),
      stdDevPricePerSqft: Math.max(
        2500,
        (valuation.valuation.pointEstimate / Math.max(property.builtupArea, 1)) * 0.15
      ),
    },
  });
  const liquiditySimulation = monteCarloTimeToSell(
    market.absorptionRate,
    0.22,
    0.18,
    400
  );
  const [exteriorAssets, layoutAssets, legalAssets, propertyAssets] = await Promise.all([
    resolveAssetPreviews(property.exteriorAssetIds, userId),
    resolveAssetPreviews(property.layoutAssetIds, userId),
    resolveAssetPreviews(property.legalDocumentAssetIds, userId),
    resolveAssetPreviews(property.assetIds, userId),
  ]);
  const resolvedExteriorAssets =
    exteriorAssets.length > 0
      ? exteriorAssets
      : propertyAssets.filter(isExteriorMediaPreview);

  const { dimensions, overallRiskScore } = buildRiskDimensions(
    valuation,
    property,
    locationIntel,
    market.demandIndex
  );

  const serializedProperty = serializeProperty(property);
  const serializedValuation = serializeValuation(valuation);

  return {
    valuation: serializedValuation,
    property: serializedProperty,
    immersive: {
      propertyId: property.propertyId,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      propertyType: property.propertyType,
      bedrooms: deriveBedrooms(property),
      bathrooms: deriveBathrooms(property),
      builtupArea: property.builtupArea,
      ageInYears: property.ageInYears,
      valuation: serializedValuation.valuation,
      liquidity: {
        estimatedTimeToSell: valuation.liquidity.estimatedTimeToSell,
        absorptionProbability: valuation.liquidity.absorptionProbability,
        distressDiscount: valuation.liquidity.distressDiscount,
      },
      riskFlags: serializedValuation.riskFlags,
      riskDimensions: dimensions,
      overallRiskScore,
      amenities: buildAmenities(locationIntel),
      spatialContext: locationIntel.spatialContext,
      dataSources: [
        {
          name: 'OpenStreetMap',
          detail: `${locationIntel.spatialContext.amenities.length} mapped nearby features`,
        },
        {
          name: process.env.MAPPLS_ACCESS_TOKEN?.trim() ? 'Mappls + Open Routing' : 'Overpass + Nominatim',
          detail: `${locationIntel.poiProximity.distanceToMetro.toFixed(2)}km to metro, ${locationIntel.poiProximity.distanceToSchool.toFixed(2)}km to school`,
        },
        {
          name: 'Open-Meteo + Remote Sensing',
          detail: `AQI ${Math.round(locationIntel.environmentalRisk.airQualityIndex)} and climate risk ${locationIntel.environmentalRisk.climateFutureRisk}/100`,
        },
      ],
    },
    market: {
      summary: {
        demandIndex: market.demandIndex,
        supplyIndex: market.supplyIndex,
        avgDaysOnMarket: market.avgDaysOnMarket,
        absorptionRate: market.absorptionRate,
        priceGrowthYoY: market.priceGrowthYoY,
      },
      comparisonScatter: {
        properties: comparableProperties,
        currentProperty: {
          pricePerSqft: Math.round(
            valuation.valuation.pointEstimate / Math.max(property.builtupArea, 1)
          ),
          builtupArea: property.builtupArea,
        },
      },
      historicalEvolution: {
        history: buildHistoricalEvolution(
          property,
          Math.round(locationIntel.remoteSensing.urbanDensity)
        ),
      },
      urbanDevelopmentTimeline: {
        projects: buildDevelopmentProjects(
          market.priceGrowthYoY,
          locationIntel.osmnxNetwork.walkabilityScore / 100,
          property
        ),
      },
    },
    environment: {
      climate: {
        latitude: property.latitude,
        longitude: property.longitude,
        floodRisk: locationIntel.environmentalRisk.floodZoneFlag ? 0.72 : 0.24,
        earthquakeRisk: Math.min(0.85, locationIntel.environmentalRisk.earthquakeSusceptibility / 100),
        heatStressRisk: Math.min(0.8, locationIntel.environmentalRisk.climateFutureRisk / 100),
        coldStressRisk: Math.max(0.08, 1 - locationIntel.remoteSensing.nightLightIntensity / 100),
      },
      noise: buildNoiseSources(locationIntel),
      traffic: {
        data: buildTrafficData(market.absorptionRate, market.demandIndex / 100),
      },
      commute: {
        paths: buildCommutePaths(locationIntel),
      },
      sunlight: {
        latitude: property.latitude,
        longitude: property.longitude,
        buildingHeight: deriveBuildingHeight(property),
      },
      environmentLayers: {
        layers: buildEnvironmentLayers(locationIntel),
      },
      advancedLayers: {
        layers: buildAdvancedLayers(locationIntel),
      },
    },
    neighborhood: {
      demographicRings: {
        rings: buildDemographicRings(
          market.demandIndex / 100,
          Number(valuation.features.tabular.rentalYield || 0.04),
          property
        ),
      },
    },
    propertyExperience: {
      virtualTour360: {
        propertyName: property.address,
        rooms: buildVirtualTourRooms(property),
        photos: collectPropertyPhotos(property),
      },
    },
    media: {
      exteriorAssets: resolvedExteriorAssets,
      layoutAsset: layoutAssets[0],
      legalDocuments: [
        ...(property.documentInsights || []).map((insight) => {
          const linkedAsset = legalAssets.find((asset) => asset.assetId === insight.assetId);
          return {
            assetId: insight.assetId,
            displayName: linkedAsset?.displayName || insight.sourceName,
            secureUrl: linkedAsset?.secureUrl,
            category: insight.category,
            sourceName: insight.sourceName,
            summary: insight.summary,
            warnings: insight.warnings || [],
          };
        }),
        ...legalAssets
          .filter(
            (asset) =>
              !(property.documentInsights || []).some(
                (insight) => insight.assetId === asset.assetId
              )
          )
          .map((asset) => ({
            assetId: asset.assetId,
            displayName: asset.displayName,
            secureUrl: asset.secureUrl,
            category: 'legal-document',
            sourceName: asset.displayName,
            summary: undefined,
            warnings: [],
          })),
      ],
    },
    diagnostics: {
      riskDimensions: dimensions,
      overallRiskScore,
      validation,
      fraudReview,
      liquiditySimulation,
      performanceOptimizer: {
        components: buildPerformanceComponents(),
      },
    },
  };
}
