import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { getLocalRunAsset } from '@/lib/runs/localRuns';
import { createBinaryFileResponse } from '@/api/runs/_shared';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; assetPath: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id, assetPath } = await context.params;
    const file = await getLocalRunAsset(id, user.userId, assetPath);
    return createBinaryFileResponse({
      ...file,
      inline: true,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
