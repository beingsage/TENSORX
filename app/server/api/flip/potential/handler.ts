/**
 * Flip Potential Scoring API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeFlipPotentialAnalysis, applyFlipPotentialToValuation } from '@/lib/flip/flipPotential';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const baseValuation = parseFloat(searchParams.get('baseValuation') || '0');
    const propertyId = searchParams.get('propertyId') || 'unknown';

    if (isNaN(lat) || isNaN(lng) || isNaN(baseValuation)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const analysis = await computeFlipPotentialAnalysis(propertyId, lat, lng, baseValuation);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[Flip API] Error:', error);
    return NextResponse.json({ error: 'Failed to analyze flip potential' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { flipAnalysis, baseValuation, baseTimeTosell } = data;

    if (!flipAnalysis || !baseValuation) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const impact = applyFlipPotentialToValuation(baseValuation, baseTimeTosell || 180, flipAnalysis);
    return NextResponse.json(impact);
  } catch (error) {
    console.error('[Flip API] Valuation error:', error);
    return NextResponse.json({ error: 'Failed to apply flip potential' }, { status: 500 });
  }
}
