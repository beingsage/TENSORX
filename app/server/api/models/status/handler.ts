import { NextResponse } from 'next/server';
import { getModelWorkerStatuses, summarizeWorkerStatuses } from '@/lib/models/status';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET() {
  const workers = await getModelWorkerStatuses();
  return NextResponse.json(
    successResponse({
      workers,
      summary: summarizeWorkerStatuses(workers),
    })
  );
}
