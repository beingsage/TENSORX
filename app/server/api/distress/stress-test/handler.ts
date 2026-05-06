/**
 * Distress Stress Test API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDistressStressTests, applyDistressStressTestToValuation } from '@/lib/distress/distressStressTester';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId') || 'unknown';
    const baseValuation = parseFloat(searchParams.get('baseValuation') || '0');
    const description = searchParams.get('description') || 'Standard residential property';
    const conditionScore = parseFloat(searchParams.get('conditionScore') || '5');

    if (isNaN(baseValuation)) {
      return NextResponse.json({ error: 'Invalid valuation' }, { status: 400 });
    }

    const result = await runDistressStressTests(propertyId, baseValuation, description, conditionScore);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Distress API] Error:', error);
    return NextResponse.json({ error: 'Failed to run distress tests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { stressTestResult, baseValuation, baseTimeTosell, riskProfile } = data;

    if (!stressTestResult || !baseValuation) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const impact = applyDistressStressTestToValuation(
      baseValuation,
      baseTimeTosell || 180,
      stressTestResult,
      riskProfile || 'moderate'
    );
    return NextResponse.json(impact);
  } catch (error) {
    console.error('[Distress API] Valuation error:', error);
    return NextResponse.json({ error: 'Failed to apply stress test' }, { status: 500 });
  }
}
