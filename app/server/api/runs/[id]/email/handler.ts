import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { requireLocalRun } from '@/lib/runs/localRuns';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    await requireLocalRun(id, user.userId);
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    return NextResponse.json(
      {
        ok: true,
        queued: true,
        email: body.email || user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
