/**
 * API endpoint for external ML models
 * POST /api/ml/external-models
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrateExternalModels } from '@/lib/ml/externalModels';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await orchestrateExternalModels({
      baseValuation: body.baseValuation || 1000000,
      houseAge: body.houseAge || 0,
      mrtDistance: body.mrtDistance || 0,
      convenienceStores: body.convenienceStores || 0,
      bedrooms: body.bedrooms || 0,
      bathrooms: body.bathrooms || 0,
      squareFeet: body.squareFeet || 0,
      postalCode: body.postalCode || '',
      images: body.images,
      latitude: body.latitude || 0,
      longitude: body.longitude || 0,
      brokerIds: body.brokerIds,
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[External Models API] Error:', error);
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
  return NextResponse.json({
    message: 'External ML Models API',
    endpoints: {
      POST: 'Submit property data for external model predictions',
    },
    supportedModels: [
      'RealEstateValuationModel (linear regression)',
      'RealValue (CNN + Dense)',
      'HousePriceEstimator (ensemble)',
      'GraphSAGE (market intelligence)',
    ],
  });
}
