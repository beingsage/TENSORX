import { NextResponse } from 'next/server';
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { parsePagination, requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { createAssetRecord, getProjectById, listAssets } from '@/lib/db/client';
import type { AssetDocument } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';

function parseTags(raw: FormDataEntryValue | null) {
  return String(raw || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url.searchParams);
    const assets = await listAssets(limit, offset, {
      userId: user.userId,
      projectId: url.searchParams.get('projectId') || undefined,
      propertyId: url.searchParams.get('propertyId') || undefined,
      valuationId: url.searchParams.get('valuationId') || undefined,
      search: url.searchParams.get('search') || undefined,
    });

    return NextResponse.json(successResponse({ assets, limit, offset }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = String(formData.get('projectId') || '').trim();

    if (!(file instanceof File) || !projectId) {
      throw new RouteError(400, 'INVALID_INPUT', 'A file and projectId are required.');
    }

    const project = await getProjectById(projectId, user.userId);
    if (!project) {
      throw new RouteError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }

    if (!isCloudinaryConfigured()) {
      throw new RouteError(
        503,
        'CLOUDINARY_NOT_CONFIGURED',
        'Cloudinary is not configured. Add Cloudinary credentials to enable asset uploads.'
      );
    }

    const assetId = generateId('AST');
    const upload = await uploadFileToCloudinary({
      file,
      folder: `cost-analysis/${user.userId}/${projectId}`,
      publicId: assetId.toLowerCase(),
      tags: parseTags(formData.get('tags')),
    });

    const asset: AssetDocument = {
      _id: assetId,
      assetId,
      userId: user.userId,
      projectId,
      propertyId: String(formData.get('propertyId') || '').trim() || undefined,
      valuationId: String(formData.get('valuationId') || '').trim() || undefined,
      publicId: upload.public_id,
      originalFilename: file.name,
      displayName: String(formData.get('displayName') || file.name).trim(),
      resourceType:
        upload.resource_type === 'video' || upload.resource_type === 'raw'
          ? upload.resource_type
          : 'image',
      mimeType: file.type || 'application/octet-stream',
      bytes: file.size,
      secureUrl: upload.secure_url,
      thumbnailUrl: upload.secure_url,
      width: upload.width,
      height: upload.height,
      status: 'ready',
      provider: 'cloudinary',
      tags: parseTags(formData.get('tags')),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await createAssetRecord(asset);
    return NextResponse.json(successResponse({ asset }), { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
