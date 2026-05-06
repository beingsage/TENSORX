import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import {
  getPropertyStats,
  getValuationStats,
  getWorkspaceSnapshot,
} from '@/lib/db/client';
import { getModelWorkerStatuses, summarizeWorkerStatuses } from '@/lib/models/status';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const [snapshot, propertyStats, valuationStats, modelStatuses] = await Promise.all([
      getWorkspaceSnapshot(user.userId),
      getPropertyStats({ userId: user.userId }),
      getValuationStats({ userId: user.userId }),
      getModelWorkerStatuses(),
    ]);

    return NextResponse.json(
      successResponse({
        user,
        counts: snapshot.counts,
        propertyStats,
        valuationStats,
        recentProjects: snapshot.projects.slice(0, 6),
        recentProperties: snapshot.properties.slice(0, 6),
        recentValuations: snapshot.valuations.slice(0, 8),
        recentAssets: snapshot.assets.slice(0, 10),
        auditLogs: snapshot.auditLogs,
        modelStatus: {
          workers: modelStatuses,
          summary: summarizeWorkerStatuses(modelStatuses),
        },
      })
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
