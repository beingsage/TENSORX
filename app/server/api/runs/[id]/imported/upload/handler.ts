import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { saveImportedRunAsset } from '@/lib/runs/localRuns';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new RouteError(400, 'INVALID_INPUT', 'A model file is required.');
    }

    const saved = await saveImportedRunAsset(id, user.userId, file);
    return NextResponse.json(
      {
        ok: true,
        item_id: saved.itemId,
        rel_path: saved.relativePath,
      },
      { status: 201 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
