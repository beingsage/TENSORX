import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { readLocalRunSvg } from '@/lib/runs/localRuns';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const svgText = await readLocalRunSvg(id, user.userId, true);
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
