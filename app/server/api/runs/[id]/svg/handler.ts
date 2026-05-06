import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { readLocalRunSvg, updateLocalRunSvg } from '@/lib/runs/localRuns';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const svgText = await readLocalRunSvg(id, user.userId);
    return new Response(svgText, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const svgText = await request.text();
    if (!svgText.trim()) {
      throw new RouteError(400, 'INVALID_SVG', 'SVG content is required.');
    }

    await updateLocalRunSvg(id, user.userId, svgText);
    return NextResponse.json({ ok: true, status: 'COMPLETED' }, { status: 200 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
