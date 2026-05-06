import { NextResponse } from 'next/server';
import { parsePagination, requireRouteUser, routeErrorResponse } from '@/lib/api';
import { getAuditLogs } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const url = new URL(request.url);
    const { limit } = parsePagination(url.searchParams);
    const projectId = url.searchParams.get('projectId') || undefined;
    const logs = await getAuditLogs({ userId: user.userId, projectId }, limit);
    return NextResponse.json(successResponse({ logs }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
