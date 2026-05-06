import { NextRequest, NextResponse } from 'next/server';
import { fetchAllWeatherData } from '@/lib/providers/weatherAPI';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude required' },
        { status: 400 }
      );
    }

    const data = await fetchAllWeatherData(latitude, longitude);
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
    endpoint: 'POST /api/data/weather',
    requires: { latitude: 'number', longitude: 'number' },
    sources: ['Open-Meteo', 'OpenWeather'],
  });
}
