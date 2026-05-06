/**
 * API Route: External Data Integration
 * POST /api/external-data
 * Endpoint that brings together all external data sources
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllExternalData,
  calculateValuationAdjustmentsFromExternalData,
  formatExternalDataForResponse,
} from '@/lib/providers/allAPIOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { address, latitude, longitude, baseValuation = 1000000 } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Fetch all external data in parallel
    const externalData = await fetchAllExternalData(
      address || 'Unknown',
      latitude,
      longitude
    );

    // Calculate adjustments
    const adjustments = calculateValuationAdjustmentsFromExternalData(
      externalData,
      baseValuation
    );

    // Format response
    const formattedData = formatExternalDataForResponse(externalData);

    return NextResponse.json(
      {
        success: true,
        data: {
          external: formattedData,
          adjustments: {
            weather: adjustments.adjustments.weather,
            demographics: adjustments.adjustments.demographics,
            maps: adjustments.adjustments.maps,
            listings: adjustments.adjustments.listings,
            satellite: adjustments.adjustments.satellite,
            sentiment: adjustments.adjustments.sentiment,
            totalAdjustment: adjustments.adjustments.total,
            baseValuation,
            finalValuation: adjustments.adjustments.final,
          },
          confidence: adjustments.confidence,
          dataQuality: externalData.dataQuality,
          timestamp: externalData.timestamp,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[External Data API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'External Data Integration API',
      description: 'Aggregates data from all external sources',
      endpoint: 'POST /api/external-data',
      requires: {
        latitude: 'number',
        longitude: 'number',
        address: 'string (optional)',
        baseValuation: 'number (optional, default: 1000000)',
      },
      dataSources: {
        weather: ['Open-Meteo', 'OpenWeather'],
        demographics: ['OpenStreetMap', 'Nominatim', 'India proxy model'],
        maps: ['Mappls', 'OpenStreetMap', 'Overpass API', 'Ola Maps (optional tiles)'],
        listings: ['MagicBricks (custom endpoint)', '99acres (custom endpoint)', 'Housing.com (custom endpoint)', 'Internal comparables'],
        satellite: ['Sentinel Hub', 'Planet Labs', 'OSM-derived remote sensing priors'],
        sentiment: ['NewsAPI', 'Twitter API', 'Reddit API'],
      },
      environmentVariables: [
        'OPENWEATHER_API_KEY',
        'MAPPLS_ACCESS_TOKEN',
        'OLA_MAPS_API_KEY',
        'NEXT_PUBLIC_OLA_MAPS_API_KEY',
        'MAGICBRICKS_SEARCH_URL',
        'NINETY_NINE_ACRES_SEARCH_URL',
        'HOUSING_SEARCH_URL',
        'LISTINGS_AGGREGATOR_URL',
        'SENTINEL_CLIENT_ID',
        'SENTINEL_CLIENT_SECRET',
        'PLANET_LABS_API_KEY',
        'NEWSAPI_KEY',
        'TWITTER_BEARER_TOKEN',
      ],
    },
    { status: 200 }
  );
}
