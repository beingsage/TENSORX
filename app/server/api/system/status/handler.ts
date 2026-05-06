import { NextResponse } from 'next/server';
import { getLocalWorkerStatus } from '@/lib/runs/localRuns';

export async function GET() {
  const status = await getLocalWorkerStatus();
  return NextResponse.json(status, { status: 200 });
}
