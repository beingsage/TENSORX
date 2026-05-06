/**
 * Legal Complexity API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeLegalComplexityAnalysis, applyLegalComplexityToValuation } from '@/lib/legal/legalComplexity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const propertyId = searchParams.get('propertyId') || 'unknown';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const analysis = await computeLegalComplexityAnalysis(propertyId, lat, lng);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[Legal API] Error:', error);
    return NextResponse.json({ error: 'Failed to analyze legal complexity' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { legalAnalysis, baseValuation, baseTimeTosell } = data;

    if (!legalAnalysis || !baseValuation) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const impact = applyLegalComplexityToValuation(baseValuation, baseTimeTosell || 180, legalAnalysis);
    return NextResponse.json(impact);
  } catch (error) {
    console.error('[Legal API] Valuation error:', error);
    return NextResponse.json({ error: 'Failed to calculate valuation impact' }, { status: 500 });
  }
}
