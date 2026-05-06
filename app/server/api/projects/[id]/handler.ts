import { NextResponse } from 'next/server';
import { deleteCloudinaryAsset } from '@/lib/cloudinary';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import {
  deleteProjectRecord,
  getProjectWorkspace,
  listAssets,
  updateProjectRecord,
} from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const workspace = await getProjectWorkspace(id, user.userId);
    return NextResponse.json(successResponse(workspace));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const body = await request.json();

    const project = await updateProjectRecord(id, user.userId, {
      name: body.name ? String(body.name).trim() : undefined,
      description: body.description ? String(body.description).trim() : undefined,
      city: body.city ? String(body.city).trim() : undefined,
      state: body.state ? String(body.state).trim() : undefined,
      address: body.address ? String(body.address).trim() : undefined,
      status: body.status,
      tags: Array.isArray(body.tags)
        ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
        : undefined,
      heroMetric: body.heroMetric ? String(body.heroMetric).trim() : undefined,
    });

    return NextResponse.json(successResponse({ project }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const assets = await listAssets(500, 0, { userId: user.userId, projectId: id });

    await Promise.all(
      assets
        .filter((asset) => asset.publicId)
        .map((asset) => deleteCloudinaryAsset(asset.publicId!))
    );
    await deleteProjectRecord(id, user.userId);

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
