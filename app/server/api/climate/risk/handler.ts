/**
 * Climate Risk & Environmental API endpoints
 * Provides environmental risk metrics for properties
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  computeClimateRiskMetrics,
  applyClimateRiskToValuation,
} from '@/lib/climate/climateRisk';

/**
 * GET /api/climate/risk?lat={lat}&lng={lng}&propertyId={id}
 * Compute climate risk metrics for a property
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const propertyId = searchParams.get('propertyId') || 'unknown';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    const metrics = await computeClimateRiskMetrics(propertyId, lat, lng);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[Climate API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compute climate risk metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/climate/valuation-impact
 * Apply climate risk metrics to property valuation
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { climateRiskMetrics, baseValuation, baseTimeTosell } = data;

    if (!climateRiskMetrics || !baseValuation) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const impact = applyClimateRiskToValuation(
      baseValuation,
      baseTimeTosell || 180,
      climateRiskMetrics
    );

    return NextResponse.json(impact);
  } catch (error) {
    console.error('[Climate API] Valuation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate valuation impact' },
      { status: 500 }
    );
  }
}
