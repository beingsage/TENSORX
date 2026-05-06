import { NextRequest, NextResponse } from 'next/server';
import { fetchAllSentimentData } from '@/lib/providers/newsAPI';

export async function POST(request: NextRequest) {
  try {
    const { address, keyword } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address required' },
        { status: 400 }
      );
    }

    const data = await fetchAllSentimentData(address, keyword || 'real estate');
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
    endpoint: 'POST /api/data/sentiment',
    requires: { 
      address: 'string',
      keyword: 'string (optional, default: "real estate")'
    },
    sources: ['NewsAPI', 'Twitter API', 'Reddit API'],
  });
}
