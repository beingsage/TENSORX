import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { requireLocalRun } from '@/lib/runs/localRuns';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const run = await requireLocalRun(id, user.userId);
    return NextResponse.json(
      {
        ok: true,
        run_id: run.runId,
        status: run.status,
        current_task: run.currentTask,
        message: run.message,
        error: run.error,
      },
      { status: 200 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
