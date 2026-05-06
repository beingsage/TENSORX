import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { generateLocalRun3D } from '@/lib/runs/localRuns';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      formats?: string[];
      scale?: number;
    };

    const run = await generateLocalRun3D({
      runId: id,
      userId: user.userId,
      formats: Array.isArray(body.formats) ? body.formats : undefined,
      scale: typeof body.scale === 'number' ? body.scale : undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        run_id: run.runId,
        status: run.status,
        blend_available: Boolean(run.outputs.blend),
        glb_available: Boolean(run.outputs.glb),
        outputs: run.outputs,
      },
      { status: 200 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
