/**
 * DATA ENRICHMENT PIPELINE
 * Takes raw property input and enriches with geospatial, market, and derived data
 */

import {
  CIRCLE_RATES,
  INFRASTRUCTURE_SCORES,
  LEGAL_RISK_SCORES,
  MARKET_DATA,
  RENTAL_YIELD_BENCHMARKS,
  type CircleRateCity,
  type MarketDataCity,
} from '@/lib/mockData';
import {
  geocodeAddress,
  reverseGeocode,
} from '@/lib/providers/openData';
import { computeLocationIntelligence } from '@/lib/geospatial/locationIntelligence';
import type { ValuationRequest, PropertyDocument } from '@/lib/db/schema';

interface MarketBenchmark {
  avgDaysOnMarket: number;
  absorptionRate: number;
  listingDensity: number;
  priceGrowthYoY: number;
}

/**
 * STEP 1: GEOCODE AND LOCATE PROPERTY
 * Live implementation: Nominatim geocoding/reverse geocoding with fallbacks.
 */
export async function geocodeProperty(request: ValuationRequest) {
  const existingPoint =
    typeof request.latitude === 'number' && typeof request.longitude === 'number'
      ? { lat: request.latitude, lng: request.longitude }
      : null;

  const liveLookup = existingPoint
    ? await reverseGeocode(existingPoint)
    : await geocodeAddress(request.address, request.pincode);

  const fallbackCity = inferCityFromPincode(request.pincode);
  const fallbackMicromarket = inferMicromarketFromAddress(request.address);

  return {
    latitude: liveLookup?.latitude ?? existingPoint?.lat ?? 28.6139,
    longitude: liveLookup?.longitude ?? existingPoint?.lng ?? 77.209,
    pincode: liveLookup?.postcode ?? request.pincode,
    city:
      (liveLookup?.city || request.city || fallbackCity).toLowerCase(),
    state: liveLookup?.state || request.state,
    micromarket:
      (liveLookup?.micromarket || request.city || fallbackMicromarket || fallbackCity)
        .toLowerCase()
        .replace(/\s+/g, '-'),
    displayName: liveLookup?.displayName,
    source: liveLookup?.source,
  };
}

function inferCityFromPincode(pincode: string): CircleRateCity {
  // Mock: map pincode ranges to cities
  const pincodePrefix = pincode.substring(0, 2);
  const pinNum = parseInt(pincodePrefix);

  if (pinNum >= 11) return 'delhi';
  if (pinNum >= 40) return 'mumbai';
  if (pinNum >= 56) return 'bangalore';
  if (pinNum >= 50) return 'hyderabad';
  return 'delhi';
}

function inferMicromarketFromAddress(address: string): string {
  const addressLower = address.toLowerCase();

  // Mock: simple keyword matching
  if (addressLower.includes('bandra')) return 'bandra';
  if (addressLower.includes('dwarka')) return 'dwarka';
  if (addressLower.includes('gurgaon') || addressLower.includes('gurugram'))
    return 'gurgaon';
  if (addressLower.includes('koramangala')) return 'koramangala';
  if (addressLower.includes('jubilee')) return 'jubilee-hills';
  if (addressLower.includes('noida')) return 'noida';
  if (addressLower.includes('new delhi') || addressLower.includes('lodhi'))
    return 'new-delhi';
  if (addressLower.includes('south delhi')) return 'south-delhi';

  return 'unknown';
}

/**
 * STEP 2: FETCH INFRASTRUCTURE SCORES
 * In production: Query GIS service, POI database, Graph Neural Networks
 */
export function enrichInfrastructure(
  micromarket: string,
  locationIntelligence?: Awaited<ReturnType<typeof computeLocationIntelligence>>
) {
  if (locationIntelligence) {
    return {
      infrastructureScore: locationIntelligence.infrastructure.developmentIndex,
      metroDistance: locationIntelligence.poiProximity.distanceToMetro,
      poiDensity: locationIntelligence.poiProximity.poiDensity,
      connectivity: locationIntelligence.poiProximity.connectivity,
    };
  }

  const score =
    INFRASTRUCTURE_SCORES[micromarket as keyof typeof INFRASTRUCTURE_SCORES] || 60;
  return {
    infrastructureScore: score, // 0-100
    metroDistance: Math.max(0, 100 - score) * 0.5, // km (inverse relationship)
    poiDensity: score * 1.5, // synthetic POI count
    connectivity: score > 75 ? 'excellent' : score > 50 ? 'good' : 'average',
  };
}

/**
 * STEP 3: FETCH LEGAL/REGULATORY DATA
 * In production: Query RERA, CERSAI, court databases, land records APIs
 */
export function enrichLegal(micromarket: string, legalStatus: string) {
  const riskScore = LEGAL_RISK_SCORES[micromarket as keyof typeof LEGAL_RISK_SCORES] || 30;
  
  return {
    legalRiskScore: riskScore, // 0-100, higher = more risk
    reraRegistered: Math.random() > 0.2, // Mock probability
    mortgageClarity: legalStatus === 'clear' ? 1.0 : 0.7,
    titleClearanceScore: 100 - riskScore,
    disputeHistory: riskScore > 40 ? 'high' : riskScore > 20 ? 'moderate' : 'low',
  };
}

/**
 * STEP 4: FETCH MARKET DATA
 * In production: Query market databases, portal APIs (99acres, Magicbricks, etc.)
 */
export function enrichMarketData(city: CircleRateCity, micromarket: string) {
  const marketKey = city as unknown as MarketDataCity;
  const marketCatalog = (MARKET_DATA[marketKey] || {}) as Record<string, MarketBenchmark>;
  const marketInfo: MarketBenchmark = marketCatalog[micromarket] || {
    avgDaysOnMarket: 60,
    absorptionRate: 0.65,
    listingDensity: 100,
    priceGrowthYoY: 0.06,
  };

  return {
    ...marketInfo,
    demandIndex: Math.round(marketInfo.absorptionRate * 100),
    supplyIndex: Math.round((1 - marketInfo.absorptionRate) * 100),
    marketMomentum: marketInfo.priceGrowthYoY, // YoY growth
    listingTrendDays7: marketInfo.absorptionRate > 0.7 ? 'increasing' : 'stable',
  };
}

export function enrichMarketDataFromLocation(
  city: CircleRateCity,
  micromarket: string,
  locationIntelligence?: Awaited<ReturnType<typeof computeLocationIntelligence>>
) {
  if (!locationIntelligence) {
    return enrichMarketData(city, micromarket);
  }

  return {
    avgDaysOnMarket: locationIntelligence.marketIntelligence.daysOnMarket,
    absorptionRate: locationIntelligence.marketIntelligence.absorptionRate,
    listingDensity: Math.round(locationIntelligence.poiProximity.poiDensity * 10),
    priceGrowthYoY: locationIntelligence.marketIntelligence.priceTrendYearly,
    demandIndex: locationIntelligence.marketIntelligence.demandIndex,
    supplyIndex: locationIntelligence.marketIntelligence.supplyIndex,
    marketMomentum: locationIntelligence.marketIntelligence.priceTrendYearly,
    listingTrendDays7:
      locationIntelligence.marketIntelligence.priceTrendMonthly > 0.003
        ? 'increasing'
        : locationIntelligence.marketIntelligence.priceTrendMonthly < -0.002
          ? 'softening'
          : 'stable',
  };
}

/**
 * STEP 5: FETCH CIRCLE RATE (STATUTORY FLOOR)
 * In production: Query state revenue departments, tax database
 */
export function enrichCircleRate(city: CircleRateCity, micromarket: string) {
  const circleRate =
    CIRCLE_RATES[city]?.[micromarket as never] || 800000;

  return {
    circleRate, // Per sqft
    circleRateFloor: circleRate, // Hard floor for valuation
    benchmarkValue: circleRate, // Reference for lender validation
  };
}

/**
 * STEP 6: RENTAL YIELD & INCOME VERIFICATION
 * In production: Query rental platforms, occupancy data, tenant verification
 */
export function enrichRentalMetrics(
  rentalIncome: number | undefined,
  propertyValue: number,
  city: CircleRateCity,
  micromarket: string
) {
  const benchmark = RENTAL_YIELD_BENCHMARKS[micromarket as keyof typeof RENTAL_YIELD_BENCHMARKS] || 4.5;
  const benchmarkAnnualRent = (propertyValue * benchmark) / 100;

  return {
    reportedMonthlyRent: rentalIncome || 0,
    benchmarkMonthlyRent: benchmarkAnnualRent / 12,
    rentalYield: rentalIncome ? (rentalIncome * 12) / propertyValue : benchmark / 100,
    yieldSuspiciousFlag: rentalIncome && rentalIncome > benchmarkAnnualRent * 0.15, // If too high
    capitalizedValue: rentalIncome ? rentalIncome * 120 : null, // 10-year capitalization
  };
}

/**
 * STEP 7: COMPILE ENRICHED PROPERTY DOCUMENT
 */
export function createEnrichedProperty(
  request: ValuationRequest,
  geo: Awaited<ReturnType<typeof geocodeProperty>>,
  infra: ReturnType<typeof enrichInfrastructure>,
  legal: ReturnType<typeof enrichLegal>,
  market: ReturnType<typeof enrichMarketDataFromLocation>,
  circle: ReturnType<typeof enrichCircleRate>,
  rental: ReturnType<typeof enrichRentalMetrics>,
  locationIntelligence?: Awaited<ReturnType<typeof computeLocationIntelligence>>
): PropertyDocument {
  return {
    propertyId: request.propertyId || `PROP-${Date.now()}`,
    address: request.address,
    pincode: geo.pincode || request.pincode,
    latitude: geo.latitude,
    longitude: geo.longitude,
    city: geo.city,
    state: geo.state,
    micromarket: geo.micromarket,
    propertyType: request.propertyType,
    propertyConfiguration: request.propertyConfiguration,
    subType: request.propertyType,
    builtupArea: request.builtupArea,
    landArea: request.landArea,
    plotArea: request.plotArea,
    ageInYears: request.ageInYears,
    yearBuilt: request.yearBuilt,
    renovationYear: request.renovationYear,
    bedroomCount: request.bedroomCount,
    bathroomCount: request.bathroomCount,
    bedrooms: request.bedroomCount,
    bathrooms: request.bathroomCount,
    floorNumber: request.floorNumber,
    totalFloors: request.totalFloors,
    balconyCount: request.balconyCount,
    facing: request.facing,
    condition: request.condition,
    constructionQuality: request.constructionQuality,
    isFreehold: request.isFreehold,
    loanAmount: request.loanAmount,
    description: request.description || '',
    locationDisplayName: geo.displayName,
    geoSource: geo.source,
    rentalIncome: request.rentalIncome,
    occupancyStatus: request.occupancyStatus || 'occupied',
    lastTransactionPrice: request.lastTransactionPrice,
    lastTransactionDate: request.lastTransactionDate,
    photoUrls: request.photoUrls || [],
    photos: request.photos || request.photoUrls || [],
    documents: request.documents || [],
    assetIds: request.assetIds || [],
    exteriorAssetIds: request.exteriorAssetIds || [],
    layoutAssetIds: request.layoutAssetIds || [],
    legalDocumentAssetIds: request.legalDocumentAssetIds || [],
    documentInsights: request.documentInsights || [],
    reconstruction: request.reconstruction,
    amenities: request.amenities || [],
    parking: request.parking,
    flooring: request.flooring,
    furnishing: request.furnishing,
    ownerEmail: request.ownerEmail,
    ownerPhone: request.ownerPhone,
    reraRegistered: request.reraRegistered,
    leaseRemainingYears: request.leaseRemainingYears,
    legalStatus: (request.legalStatus as any) || 'clear',
    mortgageStatus: (request.mortgageStatus as any) || 'clear',
    floodRiskZone: locationIntelligence?.environmentalRisk.floodZoneFlag ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * MAIN ENRICHMENT ORCHESTRATOR
 */
export async function enrichPropertyData(request: ValuationRequest) {
  const geo = await geocodeProperty(request);
  const city = (['delhi', 'mumbai', 'bangalore', 'hyderabad'].includes(geo.city)
    ? geo.city
    : inferCityFromPincode(request.pincode)) as CircleRateCity;
  const locationIntelligence = await computeLocationIntelligence(
    geo.latitude,
    geo.longitude,
    request.pincode
  );
  const infra = enrichInfrastructure(geo.micromarket, locationIntelligence);
  const legal = enrichLegal(geo.micromarket, request.legalStatus || 'clear');
  const market = enrichMarketDataFromLocation(city, geo.micromarket, locationIntelligence);
  const circle = enrichCircleRate(city, geo.micromarket);

  // Preliminary value estimate for rental enrichment
  const preliminaryValue = circle.circleRate * request.builtupArea * 1.1;
  const rental = enrichRentalMetrics(
    request.rentalIncome,
    preliminaryValue,
    city,
    geo.micromarket
  );

  const enrichedProperty = createEnrichedProperty(
    request,
    geo,
    infra,
    legal,
    market,
    circle,
    rental,
    locationIntelligence
  );

  return {
    property: enrichedProperty,
    enrichmentData: {
      infrastructure: infra,
      legal,
      market,
      circleRate: circle,
      rental,
      locationIntelligence, // NEW: Include OSMNX and other geospatial features
    },
  };
}



