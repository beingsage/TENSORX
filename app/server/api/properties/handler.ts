import { NextResponse } from 'next/server';
import { enrichPropertyData } from '@/lib/pipeline/enrichment';
import { parsePagination, requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { getProjectById, listProperties, saveProperty } from '@/lib/db/client';
import type { PropertyDocument } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url.searchParams);
    const properties = await listProperties(limit, offset, {
      userId: user.userId,
      projectId: url.searchParams.get('projectId') || undefined,
      city: url.searchParams.get('city') || undefined,
      propertyType: url.searchParams.get('type') || undefined,
      search: url.searchParams.get('search') || undefined,
    });

    return NextResponse.json(
      successResponse({
        data: properties,
        count: properties.length,
        limit,
        offset,
      })
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = await request.json();
    const projectId = body.projectId ? String(body.projectId).trim() : undefined;

    if (!body.address || !body.pincode || !body.propertyType) {
      throw new RouteError(
        400,
        'INVALID_INPUT',
        'Address, pincode, and property type are required.'
      );
    }

    if (projectId) {
      const project = await getProjectById(projectId, user.userId);
      if (!project) {
        throw new RouteError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
      }
    }

    const { property: enrichedProperty } = await enrichPropertyData({
      address: String(body.address).trim(),
      pincode: String(body.pincode).trim(),
      propertyType: String(body.propertyType).trim(),
      builtupArea: toNumber(body.builtupArea),
      landArea: body.landArea ? toNumber(body.landArea) : undefined,
      ageInYears: toNumber(body.ageInYears),
      constructionQuality: body.constructionQuality || 'standard',
      isFreehold: body.isFreehold ?? true,
      loanAmount: toNumber(body.loanAmount),
      rentalIncome: body.rentalIncome ? toNumber(body.rentalIncome) : undefined,
      occupancyStatus: body.occupancyStatus || 'occupied',
      legalStatus: body.legalStatus || 'clear',
      mortgageStatus: body.mortgageStatus || 'clear',
      city: body.city ? String(body.city).trim() : undefined,
      state: body.state ? String(body.state).trim() : undefined,
      latitude: body.latitude ? toNumber(body.latitude) : undefined,
      longitude: body.longitude ? toNumber(body.longitude) : undefined,
      description: body.description ? String(body.description).trim() : undefined,
      plotArea: body.plotArea ? toNumber(body.plotArea) : undefined,
      bedroomCount: body.bedroomCount ? toNumber(body.bedroomCount) : undefined,
      bathroomCount: body.bathroomCount ? toNumber(body.bathroomCount) : undefined,
      propertyConfiguration: body.propertyConfiguration
        ? String(body.propertyConfiguration).trim()
        : undefined,
      yearBuilt: body.yearBuilt ? toNumber(body.yearBuilt) : undefined,
      renovationYear: body.renovationYear ? toNumber(body.renovationYear) : undefined,
      floorNumber: body.floorNumber ? toNumber(body.floorNumber) : undefined,
      totalFloors: body.totalFloors ? toNumber(body.totalFloors) : undefined,
      balconyCount: body.balconyCount ? toNumber(body.balconyCount) : undefined,
      facing: body.facing ? String(body.facing).trim() : undefined,
      condition: body.condition ? String(body.condition).trim() as any : undefined,
      ownerEmail: body.ownerEmail ? String(body.ownerEmail).trim() : undefined,
      ownerPhone: body.ownerPhone ? String(body.ownerPhone).trim() : undefined,
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      photoUrls: Array.isArray(body.photoUrls) ? body.photoUrls : [],
      photos: Array.isArray(body.photos) ? body.photos : [],
      documents: Array.isArray(body.documents) ? body.documents : [],
      documentInsights: Array.isArray(body.documentInsights) ? body.documentInsights : [],
      reconstruction: body.reconstruction || undefined,
      exteriorAssetIds: toStrings(body.exteriorAssetIds),
      layoutAssetIds: toStrings(body.layoutAssetIds),
      legalDocumentAssetIds: toStrings(body.legalDocumentAssetIds),
      parking: body.parking ? toNumber(body.parking) : undefined,
      flooring: body.flooring ? String(body.flooring).trim() : undefined,
      furnishing: body.furnishing ? String(body.furnishing).trim() : undefined,
    });

    const now = new Date();
    const property: PropertyDocument = {
      ...enrichedProperty,
      _id: generateId('PROP'),
      propertyId: generateId('PROP'),
      userId: user.userId,
      projectId,
      plotArea: body.plotArea ? toNumber(body.plotArea) : enrichedProperty.plotArea,
      landArea: body.landArea ? toNumber(body.landArea) : enrichedProperty.landArea,
      description: body.description ? String(body.description).trim() : enrichedProperty.description,
      propertyConfiguration: body.propertyConfiguration
        ? String(body.propertyConfiguration).trim()
        : enrichedProperty.propertyConfiguration,
      yearBuilt: body.yearBuilt ? toNumber(body.yearBuilt) : enrichedProperty.yearBuilt,
      renovationYear: body.renovationYear
        ? toNumber(body.renovationYear)
        : enrichedProperty.renovationYear,
      floorNumber: body.floorNumber ? toNumber(body.floorNumber) : enrichedProperty.floorNumber,
      totalFloors: body.totalFloors ? toNumber(body.totalFloors) : enrichedProperty.totalFloors,
      balconyCount: body.balconyCount ? toNumber(body.balconyCount) : enrichedProperty.balconyCount,
      facing: body.facing ? String(body.facing).trim() : enrichedProperty.facing,
      condition: body.condition ? String(body.condition).trim() as any : enrichedProperty.condition,
      ownerEmail: body.ownerEmail ? String(body.ownerEmail).trim() : undefined,
      ownerPhone: body.ownerPhone ? String(body.ownerPhone).trim() : undefined,
      assetIds: Array.isArray(body.assetIds)
        ? body.assetIds.map((item: unknown) => String(item))
        : [],
      exteriorAssetIds: toStrings(body.exteriorAssetIds),
      layoutAssetIds: toStrings(body.layoutAssetIds),
      legalDocumentAssetIds: toStrings(body.legalDocumentAssetIds),
      documentInsights: Array.isArray(body.documentInsights) ? body.documentInsights : [],
      reconstruction: body.reconstruction || undefined,
      parking: body.parking ? toNumber(body.parking) : enrichedProperty.parking,
      flooring: body.flooring ? String(body.flooring).trim() : enrichedProperty.flooring,
      furnishing: body.furnishing ? String(body.furnishing).trim() : enrichedProperty.furnishing,
      createdAt: now,
      updatedAt: now,
      source: 'manual',
    };

    const savedProperty = await saveProperty(property);
    return NextResponse.json(successResponse({ property: savedProperty }), { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
