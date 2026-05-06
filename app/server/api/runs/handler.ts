import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import {
  createLocalRunFromFile,
  deleteAllLocalRunsForUser,
  listLocalRunsForUser,
} from '@/lib/runs/localRuns';
import { serializeRunSummary } from './_shared';

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const runs = await listLocalRunsForUser(user.userId);
    return NextResponse.json(runs.map(serializeRunSummary), { status: 200 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const formData = await request.formData();
    const image = formData.get('image') ?? formData.get('file');

    if (!(image instanceof File)) {
      throw new RouteError(400, 'INVALID_INPUT', 'An image file is required.');
    }

    const run = await createLocalRunFromFile({
      userId: user.userId,
      file: image,
      projectId: String(formData.get('projectId') || '').trim() || undefined,
      propertyId: String(formData.get('propertyId') || '').trim() || undefined,
      valuationId: String(formData.get('valuationId') || '').trim() || undefined,
      name: String(formData.get('name') || '').trim() || image.name,
    });

    return NextResponse.json(
      {
        ok: true,
        run_id: run.runId,
        job_id: run.runId,
        status: run.status,
        image_path: run.imageFilename,
      },
      { status: 201 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRouteUser(request);
    await deleteAllLocalRunsForUser(user.userId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
