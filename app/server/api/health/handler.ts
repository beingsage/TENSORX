import { NextResponse } from 'next/server';
import { getModelWorkerStatuses, summarizeWorkerStatuses } from '@/lib/models/status';

export async function GET() {
  const workers = await getModelWorkerStatuses();
  const summary = summarizeWorkerStatuses(workers);

  const status =
    summary.overallStatus === 'healthy'
      ? 'ok'
      : summary.overallStatus === 'degraded'
        ? 'degraded'
        : 'partial';

  return NextResponse.json({
    status,
    workers,
    summary,
    checkedAt: new Date().toISOString(),
  });
}
