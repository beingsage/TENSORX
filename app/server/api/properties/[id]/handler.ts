import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { deleteProperty, getProperty, updateProperty } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRouteUser(request);
    const { id } = await params;
    const property = await getProperty(id, user.userId);
    return NextResponse.json(successResponse({ property }));
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
    const existing = await getProperty(id, user.userId);
    if (!existing) {
      return NextResponse.json(successResponse({ property: null }), { status: 404 });
    }

    const bodyStrings = (value: unknown) =>
      Array.isArray(value) ? value.map((item) => String(item)) : undefined;
    const nextReconstruction =
      body.reconstruction && typeof body.reconstruction === 'object'
        ? {
            ...existing.reconstruction,
            ...(body.reconstruction.exterior
              ? { exterior: body.reconstruction.exterior }
              : {}),
            ...(body.reconstruction.layout
              ? { layout: body.reconstruction.layout }
              : {}),
          }
        : undefined;

    const property = await updateProperty(
      id,
      {
        address: body.address ? String(body.address).trim() : undefined,
        city: body.city ? String(body.city).trim() : undefined,
        state: body.state ? String(body.state).trim() : undefined,
        pincode: body.pincode ? String(body.pincode).trim() : undefined,
        propertyType: body.propertyType ? String(body.propertyType).trim() : undefined,
        builtupArea: body.builtupArea ? Number(body.builtupArea) : undefined,
        plotArea: body.plotArea ? Number(body.plotArea) : undefined,
        ageInYears: body.ageInYears ? Number(body.ageInYears) : undefined,
        loanAmount: body.loanAmount ? Number(body.loanAmount) : undefined,
        description: body.description ? String(body.description).trim() : undefined,
        occupancyStatus: body.occupancyStatus,
        legalStatus: body.legalStatus,
        mortgageStatus: body.mortgageStatus,
        assetIds: bodyStrings(body.assetIds),
        exteriorAssetIds: bodyStrings(body.exteriorAssetIds),
        layoutAssetIds: bodyStrings(body.layoutAssetIds),
        legalDocumentAssetIds: bodyStrings(body.legalDocumentAssetIds),
        reconstruction: nextReconstruction,
      },
      user.userId
    );

    return NextResponse.json(successResponse({ property }));
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
    await deleteProperty(id, user.userId);
    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
