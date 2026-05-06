import { NextRequest, NextResponse } from 'next/server';
import { fetchAllDemographicData } from '@/lib/providers/demographicsAPI';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, address } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude required' },
        { status: 400 }
      );
    }

    const data = await fetchAllDemographicData(latitude, longitude, address);
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
    endpoint: 'POST /api/data/demographics',
    requires: { latitude: 'number', longitude: 'number', address: 'string (optional)' },
    sources: ['OpenStreetMap', 'Overpass API', 'Nominatim', 'Open-Meteo', 'India proxy model'],
  });
}
