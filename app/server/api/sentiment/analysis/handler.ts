/**
 * Sentiment/News Analysis API endpoints
 * Provides real-estate focused sentiment metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  computeSentimentAnalysis,
  applySentimentToValuation,
} from '@/lib/sentiment/sentimentAnalysis';

/**
 * GET /api/sentiment/analysis?location={location}&lat={lat}&lng={lng}
 * Compute sentiment analysis for a location
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'Unknown';
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const propertyId = searchParams.get('propertyId') || 'unknown';
    const keywords = searchParams.get('keywords')?.split(',') || [];

    const analysis = await computeSentimentAnalysis(
      propertyId,
      location,
      lat,
      lng,
      keywords
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[Sentiment API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compute sentiment analysis' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sentiment/valuation-impact
 * Apply sentiment metrics to property valuation
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { sentimentAnalysis, baseValuation, baseTimeTosell } = data;

    if (!sentimentAnalysis || !baseValuation) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const impact = applySentimentToValuation(
      baseValuation,
      baseTimeTosell || 180,
      sentimentAnalysis
    );

    return NextResponse.json(impact);
  } catch (error) {
    console.error('[Sentiment API] Valuation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate valuation impact' },
      { status: 500 }
    );
  }
}
