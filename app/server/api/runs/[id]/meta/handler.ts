import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { updateLocalRunMeta } from '@/lib/runs/localRuns';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const run = await updateLocalRunMeta(id, user.userId, body);
    return NextResponse.json(
      {
        ok: true,
        run_id: run.runId,
        run_meta: run.meta,
      },
      { status: 200 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
