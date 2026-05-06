import { NextResponse } from 'next/server';
import { deleteCloudinaryAsset } from '@/lib/cloudinary';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { deleteAssetRecord, getAsset, updateAssetRecord } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const asset = await getAsset(id, user.userId);
    return NextResponse.json(successResponse({ asset }));
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

    const asset = await updateAssetRecord(id, user.userId, {
      displayName: body.displayName ? String(body.displayName).trim() : undefined,
      propertyId: body.propertyId ? String(body.propertyId).trim() : undefined,
      valuationId: body.valuationId ? String(body.valuationId).trim() : undefined,
      tags: Array.isArray(body.tags)
        ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
        : undefined,
    });

    return NextResponse.json(successResponse({ asset }));
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
    const asset = await getAsset(id, user.userId);

    if (asset?.publicId) {
      await deleteCloudinaryAsset(asset.publicId);
    }

    await deleteAssetRecord(id, user.userId);
    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
