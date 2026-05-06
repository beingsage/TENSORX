import { fetchAllWeatherData } from './weatherAPI';
import { fetchAllDemographicData } from './demographicsAPI';
import { fetchAllMapsData } from './mapsAPI';
import { fetchAllListings } from './listingsAPI';
import { fetchAllSatelliteData } from './satelliteAPI';
import { fetchAllSentimentData } from './newsAPI';
import { clamp } from '@/lib/utils/geo';

export interface UnifiedExternalData {
  weather: Awaited<ReturnType<typeof fetchAllWeatherData>>;
  demographics: Awaited<ReturnType<typeof fetchAllDemographicData>>;
  maps: Awaited<ReturnType<typeof fetchAllMapsData>>;
  listings: Awaited<ReturnType<typeof fetchAllListings>>;
  satellite: Awaited<ReturnType<typeof fetchAllSatelliteData>>;
  sentiment: Awaited<ReturnType<typeof fetchAllSentimentData>>;
  timestamp: Date;
  dataQuality: {
    weather: number;
    demographics: number;
    maps: number;
    listings: number;
    satellite: number;
    sentiment: number;
    overall: number;
  };
}

export async function fetchAllExternalData(
  address: string,
  latitude: number,
  longitude: number
): Promise<UnifiedExternalData> {
  const [weather, demographics, maps, listings, satellite, sentiment] =
    await Promise.all([
      fetchAllWeatherData(latitude, longitude).catch(() => null),
      fetchAllDemographicData(latitude, longitude, address).catch(() => null),
      fetchAllMapsData(latitude, longitude).catch(() => null),
      fetchAllListings(address, latitude, longitude).catch(() => null),
      fetchAllSatelliteData(latitude, longitude).catch(() => null),
      fetchAllSentimentData(address).catch(() => null),
    ]);

  const dataQuality = {
    weather: weather ? 0.95 : 0,
    demographics: demographics ? 0.88 : 0,
    maps: maps?.metadata.live ? 0.96 : maps ? 0.7 : 0,
    listings:
      listings && (listings.listings.length > 0 || listings.stats.demandIndex > 0) ? 0.82 : 0,
    satellite:
      satellite && (satellite.images.length > 0 || satellite.analysis.nightLightIntensity > 0)
        ? 0.84
        : 0,
    sentiment: sentiment ? 0.78 : 0,
    overall: 0,
  };

  dataQuality.overall = Number(
    (
      (dataQuality.weather +
        dataQuality.demographics +
        dataQuality.maps +
        dataQuality.listings +
        dataQuality.satellite +
        dataQuality.sentiment) /
      6
    ).toFixed(2)
  );

  return {
    weather:
      weather ||
      ({
        current: {
          temperature: 0,
          humidity: 0,
          precipitation: 0,
          windSpeed: 0,
          condition: 'Unavailable',
          feelsLike: 0,
        },
        historical: {
          avgTemperature: 0,
          avgHumidity: 0,
          avgPrecipitation: 0,
          extremeTemperatures: { max: 0, min: 0 },
          seasonalPatterns: 'Unavailable',
        },
        alerts: [],
        source: 'open-meteo',
        providers: ['Unavailable'],
      } as Awaited<ReturnType<typeof fetchAllWeatherData>>),
    demographics:
      demographics ||
      ({
        population: 0,
        medianAge: 0,
        medianHouseholdIncome: 0,
        unemploymentRate: 0,
        educationLevel: { highSchool: 0, bachelor: 0, graduate: 0 },
        householdSize: 0,
        ownersVsRenters: { owners: 0, renters: 0 },
        urbanicity: 'rural',
        densityPerSqKm: 0,
        administrativeContext: { city: 'unknown' },
        proxySignals: {
          poiDensity: 0,
          builtDensity: 0,
          nightLightIntensity: 0,
          airQualityIndex: 0,
        },
        trends: { growth: 0, trend: 'stable', basis: 'Unavailable' },
        incomeDistribution: {},
        sources: ['Unavailable'],
      } as Awaited<ReturnType<typeof fetchAllDemographicData>>),
    maps:
      maps ||
      ({
        providerStack: {
          primary: 'fallback',
          fallback: 'fallback',
        },
        places: {
          nearby: [],
          categories: {},
        },
        routes: {},
        distanceMatrix: [],
        spatialContext: {
          center: { lat: latitude, lng: longitude },
          subjectBuilding: null,
          nearbyBuildings: [],
          amenities: [],
          roads: [],
          railLines: [],
          greenAreas: [],
          waterBodies: [],
          bounds: {
            minLat: latitude - 0.001,
            maxLat: latitude + 0.001,
            minLng: longitude - 0.001,
            maxLng: longitude + 0.001,
          },
        },
        metadata: {
          providers: ['Unavailable'],
          live: false,
          note: 'Unavailable',
          mapStyleHint: 'open-maplibre',
        },
      } as Awaited<ReturnType<typeof fetchAllMapsData>>),
    listings:
      listings ||
      ({
        listings: [],
        stats: {
          avgPrice: 0,
          avgDaysOnMarket: 0,
          avgPricePerSqft: 0,
          medianPrice: 0,
          listingCount: 0,
          priceChangePercent: 0,
          demandIndex: 0,
          supplyIndex: 0,
        },
        providers: ['Unavailable'],
      } as Awaited<ReturnType<typeof fetchAllListings>>),
    satellite:
      satellite ||
      ({
        images: [],
        analysis: {
          occupancyRate: 0,
          greenCover: 0,
          builtUpArea: 0,
          waterBodies: 0,
          thermalSignature: 0,
          nightLightIntensity: 0,
          changeDetection: 'Unavailable',
        },
        providers: ['Unavailable'],
      } as Awaited<ReturnType<typeof fetchAllSatelliteData>>),
    sentiment:
      sentiment ||
      ({
        overallSentiment: 'neutral',
        sentimentScore: 0,
        articles: [],
        trendingTopics: [],
        socialMediaMentions: 0,
      } as Awaited<ReturnType<typeof fetchAllSentimentData>>),
    timestamp: new Date(),
    dataQuality,
  };
}

export function calculateValuationAdjustmentsFromExternalData(
  externalData: UnifiedExternalData,
  baseValuation: number
) {
  const adjustments: Record<string, number> = {};
  const factors: Record<string, string> = {};

  const weatherPenalty =
    externalData.weather.alerts.some((alert) => alert.severity === 'high')
      ? -0.03
      : externalData.weather.alerts.length > 0
        ? -0.01
        : 0.005;
  adjustments.weather = baseValuation * weatherPenalty;
  factors.weather = `Weather stack ${externalData.weather.providers.join(', ')} -> ${(weatherPenalty * 100).toFixed(1)}%`;

  const demographicsAdjustment = clamp(
    externalData.demographics.trends.growth / 120 +
      (externalData.demographics.ownersVsRenters.owners - 50) / 1000,
    -0.03,
    0.05
  );
  adjustments.demographics = baseValuation * demographicsAdjustment;
  factors.demographics = `Demographic trend ${externalData.demographics.trends.growth.toFixed(1)}% with ${externalData.demographics.urbanicity} density`;

  const routeValues = Object.values(externalData.maps.routes);
  const accessibilityBoost =
    routeValues.length > 0
      ? clamp(
          routeValues.reduce((sum, route) => sum + route.distance, 0) /
            (routeValues.length * 25_000),
          0.01,
          0.06
        )
      : 0;
  adjustments.maps = baseValuation * accessibilityBoost;
  factors.maps = `Map stack ${externalData.maps.metadata.providers.join(', ')} with ${externalData.maps.places.nearby.length} nearby features`;

  const listingMomentum = clamp(
    externalData.listings.stats.priceChangePercent / 100,
    -0.05,
    0.08
  );
  adjustments.listings = baseValuation * listingMomentum;
  factors.listings = `Listing surface ${externalData.listings.providers.join(', ')} -> ${externalData.listings.stats.listingCount} comps`;

  const satelliteAdjustment = clamp(
    (externalData.satellite.analysis.occupancyRate - 70) / 1000 +
      (externalData.satellite.analysis.greenCover - 20) / 2500,
    -0.02,
    0.04
  );
  adjustments.satellite = baseValuation * satelliteAdjustment;
  factors.satellite = `Remote sensing ${externalData.satellite.providers.join(', ')} -> occupancy ${externalData.satellite.analysis.occupancyRate}%`;

  const sentimentValue = externalData.sentiment.sentimentScore || 0;
  const sentimentAdjustment = clamp(sentimentValue * 0.04, -0.02, 0.02);
  adjustments.sentiment = baseValuation * sentimentAdjustment;
  factors.sentiment = `Sentiment ${externalData.sentiment.overallSentiment} (${sentimentValue.toFixed(2)})`;

  const totalAdjustment = Object.values(adjustments).reduce((sum, value) => sum + value, 0);

  return {
    adjustments: {
      weather: adjustments.weather,
      demographics: adjustments.demographics,
      maps: adjustments.maps,
      listings: adjustments.listings,
      satellite: adjustments.satellite,
      sentiment: adjustments.sentiment,
      total: totalAdjustment,
      final: baseValuation + totalAdjustment,
    },
    factors,
    confidence: externalData.dataQuality.overall,
  };
}

export function formatExternalDataForResponse(externalData: UnifiedExternalData) {
  return {
    summary: `India-first stack across ${externalData.dataQuality.overall * 100}% weighted data completeness`,
    sources: {
      weather: {
        providers: externalData.weather.providers,
        current: externalData.weather.current.condition,
        temperature: externalData.weather.current.temperature,
        alerts: externalData.weather.alerts.length,
      },
      demographics: {
        providers: externalData.demographics.sources,
        population: externalData.demographics.population,
        medianIncome: externalData.demographics.medianHouseholdIncome,
        growthTrend: externalData.demographics.trends.trend,
      },
      maps: {
        providers: externalData.maps.metadata.providers,
        placesNearby: externalData.maps.places.nearby.length,
        routes: Object.keys(externalData.maps.routes).length,
      },
      listings: {
        providers: externalData.listings.providers,
        availableListing: externalData.listings.listings.length,
        marketStats: externalData.listings.stats,
      },
      satellite: {
        providers: externalData.satellite.providers,
        imagesAvailable: externalData.satellite.images.length,
        occupancyRate: externalData.satellite.analysis.occupancyRate,
        greenCover: externalData.satellite.analysis.greenCover,
      },
      sentiment: {
        overallSentiment: externalData.sentiment.overallSentiment,
        sentimentScore: externalData.sentiment.sentimentScore,
        articles: externalData.sentiment.articles?.length || 0,
        trendingTopics: externalData.sentiment.trendingTopics,
      },
    },
    metrics: {
      weatherImpact: 'Open-Meteo and OpenWeather conditions around the collateral',
      demographicsImpact: 'India-centric proxy demographics from density and market access',
      accessibilityImpact: 'Mappls/OSM routing and POI proximity',
      marketImpact: 'Indian listing surfaces and internal comparable history',
      occupancyImpact: 'Satellite metadata and remote-sensing occupancy proxies',
      sentimentImpact: 'Market sentiment from media and social platforms',
    },
    dataQuality: externalData.dataQuality,
  };
}
