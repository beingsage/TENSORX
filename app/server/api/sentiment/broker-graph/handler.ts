/**
 * Broker Graph Analysis API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeBrokerGraphAnalysis, applyBrokerGraphToValuation } from '@/lib/sentiment/brokerGraph';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const location = searchParams.get('location') || 'Unknown';
    const propertyId = searchParams.get('propertyId') || 'unknown';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const analysis = await computeBrokerGraphAnalysis(propertyId, lat, lng, location);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[BrokerGraph API] Error:', error);
    return NextResponse.json({ error: 'Failed to analyze broker graph' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { graphAnalysis, baseValuation, baseTimeTosell } = data;

    if (!graphAnalysis || !baseValuation) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const impact = applyBrokerGraphToValuation(baseValuation, baseTimeTosell || 180, graphAnalysis);
    return NextResponse.json(impact);
  } catch (error) {
    console.error('[BrokerGraph API] Valuation error:', error);
    return NextResponse.json({ error: 'Failed to apply broker graph' }, { status: 500 });
  }
}
