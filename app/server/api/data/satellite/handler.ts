import { NextRequest, NextResponse } from 'next/server';
import { fetchAllSatelliteData } from '@/lib/providers/satelliteAPI';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude required' },
        { status: 400 }
      );
    }

    const data = await fetchAllSatelliteData(latitude, longitude);
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
    endpoint: 'POST /api/data/satellite',
    requires: { latitude: 'number', longitude: 'number' },
    sources: ['Sentinel Hub', 'Planet Labs', 'OpenStreetMap-derived remote sensing priors'],
  });
}
