import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { markRunCompleted } from '@/lib/runs/localRuns';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const run = await markRunCompleted(
      id,
      user.userId,
      'detect',
      'Window detection is not automated in local mode. The latest SVG remains available for manual editing.'
    );
    return NextResponse.json({ ok: true, run_id: run.runId, status: run.status }, { status: 200 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
