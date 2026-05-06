import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { createProjectRecord, listProjectsByUser } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const projects = await listProjectsByUser(user.userId);
    return NextResponse.json(successResponse({ projects }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = await request.json();
    const name = String(body.name || '').trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Project name is required.' } },
        { status: 400 }
      );
    }

    const project = await createProjectRecord({
      userId: user.userId,
      name,
      description: body.description ? String(body.description).trim() : undefined,
      city: body.city ? String(body.city).trim() : undefined,
      state: body.state ? String(body.state).trim() : undefined,
      address: body.address ? String(body.address).trim() : undefined,
      status: body.status,
      tags: Array.isArray(body.tags)
        ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
        : [],
      heroMetric: body.heroMetric ? String(body.heroMetric).trim() : undefined,
    });

    return NextResponse.json(successResponse({ project }), { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
