import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { deleteLocalRun, requireLocalRun } from '@/lib/runs/localRuns';
import { serializeRunDetail } from '../_shared';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const run = await requireLocalRun(id, user.userId);
    return NextResponse.json(serializeRunDetail(run), { status: 200 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    await deleteLocalRun(id, user.userId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
