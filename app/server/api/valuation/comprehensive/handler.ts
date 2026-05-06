/**
 * Comprehensive Valuation API endpoint
 * Master endpoint that orchestrates all 10 ideas
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  computeComprehensiveValuation,
  batchComputeComprehensiveValuation,
  generateMarketReport,
} from '@/lib/valuation/comprehensive';

/**
 * GET /api/valuation/comprehensive?lat={lat}&lng={lng}&baseValuation={amount}&propertyId={id}
 * Compute comprehensive valuation using all 10 ideas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const baseValuation = parseFloat(searchParams.get('baseValuation') || '1000000');
    const propertyId = searchParams.get('propertyId') || 'unknown';
    const includeRaw = searchParams.get('includeRaw') === 'true';

    if (isNaN(lat) || isNaN(lng) || isNaN(baseValuation)) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const result = await computeComprehensiveValuation(
      propertyId,
      lat,
      lng,
      baseValuation,
      includeRaw
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Comprehensive Valuation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compute valuation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/valuation/batch
 * Compute valuations for multiple properties
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { properties, parallel } = data as {
      properties: Array<{
        propertyId: string;
        latitude: number;
        longitude: number;
        baseValuation: number;
      }>;
      parallel?: number;
    };

    if (!properties || !Array.isArray(properties)) {
      return NextResponse.json(
        { error: 'Invalid properties array' },
        { status: 400 }
      );
    }

    const results = await batchComputeComprehensiveValuation(properties, parallel || 5);
    const report = await generateMarketReport(results);

    return NextResponse.json({
      count: results.length,
      results,
      marketReport: report,
    });
  } catch (error) {
    console.error('[Comprehensive Valuation API] Batch error:', error);
    return NextResponse.json(
      { error: 'Failed to compute batch valuations' },
      { status: 500 }
    );
  }
}
