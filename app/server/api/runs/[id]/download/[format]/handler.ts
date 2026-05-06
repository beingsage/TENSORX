import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { getLocalRunDownload } from '@/lib/runs/localRuns';
import { createBinaryFileResponse } from '@/api/runs/_shared';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; format: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id, format } = await context.params;
    const file = await getLocalRunDownload(id, user.userId, format);
    return createBinaryFileResponse(file);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
