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
    await requireLocalRun(id, user.userId);
    return NextResponse.json(
      {
        manifest: {
          version: 1,
          run_id: id,
          updated_at: new Date().toISOString(),
          items: {},
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
