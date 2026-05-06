import { NextRequest, NextResponse } from 'next/server';
import { fetchAllListings } from '@/lib/providers/listingsAPI';

export async function POST(request: NextRequest) {
  try {
    const { address, latitude, longitude } = await request.json();

    if (!address || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Address, latitude and longitude required' },
        { status: 400 }
      );
    }

    const data = await fetchAllListings(address, latitude, longitude);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'POST /api/data/listings',
    requires: { 
      address: 'string',
      latitude: 'number',
      longitude: 'number'
    },
    sources: ['MagicBricks (custom endpoint)', '99acres (custom endpoint)', 'Housing.com (custom endpoint)', 'Internal comparable surface'],
  });
}
