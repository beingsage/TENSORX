import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import {
  deleteValuation,
  getValuation,
  getValuationsByProperty,
  updateValuation,
} from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const isPropertyId = id.startsWith('PROP-');
    const data = isPropertyId
      ? await getValuationsByProperty(id, user.userId)
      : await getValuation(id, user.userId);

    return NextResponse.json(
      successResponse({
        count: Array.isArray(data) ? data.length : data ? 1 : 0,
        data,
      })
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const body = await request.json();

    const valuation = await updateValuation(id, user.userId, {
      title: body.title ? String(body.title).trim() : undefined,
      projectId: body.projectId ? String(body.projectId).trim() : undefined,
      pipelineWarnings: Array.isArray(body.pipelineWarnings)
        ? body.pipelineWarnings.map((item: unknown) => String(item))
        : undefined,
      workerStatus: Array.isArray(body.workerStatus) ? body.workerStatus : undefined,
    });

    return NextResponse.json(successResponse({ valuation }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const valuation = await deleteValuation(id, user.userId);
    return NextResponse.json(successResponse({ deleted: true, valuation }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
