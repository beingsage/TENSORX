/**
 * Ride-Hailing/Mobility API endpoints
 * Provides real-time mobility metrics for properties
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  computeDynamicAccessibilityMetrics,
  batchFetchMobilityMetrics,
  applyDynamicAccessibilityToValuation,
} from '@/lib/mobility/dynamicAccessibility';

/**
 * GET /api/mobility/accessibility?lat={lat}&lng={lng}&infrastructureScore={score}
 * Fetch dynamic accessibility metrics for a specific location
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const infrastructureScore = parseFloat(searchParams.get('infrastructureScore') || '50');
    const propertyId = searchParams.get('propertyId') || 'unknown';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    const metrics = await computeDynamicAccessibilityMetrics(
      propertyId,
      lat,
      lng,
      infrastructureScore
    );

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[Mobility API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mobility metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobility/batch
 * Fetch mobility metrics for multiple properties
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { properties } = data as {
      properties: Array<{
        propertyId: string;
        latitude: number;
        longitude: number;
        infrastructureScore: number;
      }>;
    };

    if (!properties || !Array.isArray(properties)) {
      return NextResponse.json(
        { error: 'Invalid properties array' },
        { status: 400 }
      );
    }

    const metrics = await batchFetchMobilityMetrics(properties);

    return NextResponse.json({
      count: metrics.length,
      metrics,
    });
  } catch (error) {
    console.error('[Mobility API] Batch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch mobility metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobility/valuation-impact
 * Apply dynamic accessibility metrics to property valuation
 */
export async function valuation(request: NextRequest) {
  try {
    const data = await request.json();
    const { mobilityMetrics, baseResalePotentialIndex, baseTimeTosell } = data;

    if (!mobilityMetrics || baseResalePotentialIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required metrics' },
        { status: 400 }
      );
    }

    const impact = applyDynamicAccessibilityToValuation(
      baseResalePotentialIndex,
      baseTimeTosell || 180, // Default 180 days
      mobilityMetrics
    );

    return NextResponse.json(impact);
  } catch (error) {
    console.error('[Mobility API] Valuation impact error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate valuation impact' },
      { status: 500 }
    );
  }
}
