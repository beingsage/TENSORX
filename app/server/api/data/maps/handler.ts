import { NextRequest, NextResponse } from 'next/server';
import { fetchAllMapsData } from '@/lib/providers/mapsAPI';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude required' },
        { status: 400 }
      );
    }

    const data = await fetchAllMapsData(latitude, longitude);
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
    endpoint: 'POST /api/data/maps',
    requires: { latitude: 'number', longitude: 'number' },
    sources: ['Mappls', 'OpenStreetMap', 'Overpass API', 'Nominatim', 'Ola Maps (optional frontend tiles)'],
  });
}
