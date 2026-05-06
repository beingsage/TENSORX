import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { generateId } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';
import { getNerfstudioJob, startNerfstudioJob } from '@/lib/intake/nerfstudio';

export async function GET(request: Request) {
  try {
    await requireRouteUser(request);
    const url = new URL(request.url);
    const jobId = String(url.searchParams.get('jobId') || '').trim();

    if (!jobId) {
      throw new RouteError(400, 'INVALID_INPUT', 'jobId is required.');
    }

    const job = getNerfstudioJob(jobId);
    if (!job) {
      throw new RouteError(404, 'JOB_NOT_FOUND', 'NeRFstudio job not found.');
    }

    return NextResponse.json(successResponse({ job }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = await request.json();
    const assetIds = Array.isArray(body.assetIds)
      ? body.assetIds.map((assetId: unknown) => String(assetId)).filter(Boolean)
      : [];

    if (!assetIds.length) {
      throw new RouteError(
        400,
        'INVALID_INPUT',
        'At least one uploaded exterior asset is required.'
      );
    }

    const jobId = generateId('NRF');
    const job = await startNerfstudioJob({
      assetIds,
      userId: user.userId,
      projectId: body.projectId ? String(body.projectId) : undefined,
      jobId,
    });

    return NextResponse.json(successResponse({ job }), { status: 202 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
