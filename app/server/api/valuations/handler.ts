import { NextResponse } from 'next/server';
import { runFullPropertyInference } from '@/lib/models/inference';
import { enrichPropertyData } from '@/lib/pipeline/enrichment';
import { parsePagination, requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import {
  getProjectById,
  getProperty,
  listValuations,
  saveProperty,
  saveValuation,
  updateAssetRecord,
} from '@/lib/db/client';
import type { PropertyDocument, ValuationRequest, ValuationResponse } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bodyAssetIds(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function bodyStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

async function buildProperty(userId: string, body: ValuationRequest) {
  if (body.propertyId) {
    const existing = await getProperty(body.propertyId, userId);
    if (!existing) {
      throw new RouteError(404, 'PROPERTY_NOT_FOUND', 'Selected property was not found.');
    }

    const merged: PropertyDocument = {
      ...existing,
      projectId: body.projectId || existing.projectId,
      address: body.address || existing.address,
      pincode: body.pincode || existing.pincode,
      latitude: body.latitude ?? existing.latitude,
      longitude: body.longitude ?? existing.longitude,
      city: body.city || existing.city,
      state: body.state || existing.state,
      micromarket: existing.micromarket,
      propertyType: body.propertyType || existing.propertyType,
      propertyConfiguration:
        body.propertyConfiguration || existing.propertyConfiguration,
      builtupArea: body.builtupArea || existing.builtupArea,
      plotArea: body.plotArea ?? body.landArea ?? existing.plotArea,
      landArea: body.landArea ?? body.plotArea ?? existing.landArea,
      ageInYears: body.ageInYears ?? existing.ageInYears,
      yearBuilt: body.yearBuilt ?? existing.yearBuilt,
      renovationYear: body.renovationYear ?? existing.renovationYear,
      bedroomCount: body.bedroomCount ?? existing.bedroomCount,
      bathroomCount: body.bathroomCount ?? existing.bathroomCount,
      bedrooms: body.bedroomCount ?? existing.bedrooms,
      bathrooms: body.bathroomCount ?? existing.bathrooms,
      floorNumber: body.floorNumber ?? existing.floorNumber,
      totalFloors: body.totalFloors ?? existing.totalFloors,
      balconyCount: body.balconyCount ?? existing.balconyCount,
      facing: body.facing || existing.facing,
      condition: body.condition || existing.condition,
      constructionQuality: body.constructionQuality || existing.constructionQuality,
      isFreehold: body.isFreehold ?? existing.isFreehold,
      loanAmount: body.loanAmount ?? existing.loanAmount,
      rentalIncome: body.rentalIncome ?? existing.rentalIncome,
      occupancyStatus: body.occupancyStatus || existing.occupancyStatus,
      legalStatus: body.legalStatus || existing.legalStatus,
      mortgageStatus: body.mortgageStatus || existing.mortgageStatus,
      description: body.description || existing.description,
      assetIds: body.assetIds?.length ? body.assetIds : existing.assetIds,
      exteriorAssetIds:
        body.exteriorAssetIds?.length ? body.exteriorAssetIds : existing.exteriorAssetIds,
      layoutAssetIds:
        body.layoutAssetIds?.length ? body.layoutAssetIds : existing.layoutAssetIds,
      legalDocumentAssetIds:
        body.legalDocumentAssetIds?.length
          ? body.legalDocumentAssetIds
          : existing.legalDocumentAssetIds,
      photos: body.photos?.length ? body.photos : existing.photos,
      photoUrls: body.photoUrls?.length ? body.photoUrls : existing.photoUrls,
      documents: body.documents?.length ? body.documents : existing.documents,
      amenities: body.amenities?.length ? body.amenities : existing.amenities,
      parking: body.parking ?? existing.parking,
      flooring: body.flooring || existing.flooring,
      furnishing: body.furnishing || existing.furnishing,
      documentInsights:
        body.documentInsights?.length ? body.documentInsights : existing.documentInsights,
      reconstruction: body.reconstruction || existing.reconstruction,
      ownerEmail: body.ownerEmail || existing.ownerEmail,
      ownerPhone: body.ownerPhone || existing.ownerPhone,
      reraRegistered: body.reraRegistered ?? existing.reraRegistered,
      leaseRemainingYears: body.leaseRemainingYears ?? existing.leaseRemainingYears,
      updatedAt: new Date(),
    };

    return saveProperty(merged);
  }

  if (!body.address || !body.pincode || !body.propertyType || !body.builtupArea) {
    throw new RouteError(
      400,
      'INVALID_INPUT',
      'Address, pincode, property type, and builtup area are required for new valuations.'
    );
  }

  const { property: enrichedProperty } = await enrichPropertyData({
    ...body,
    builtupArea: Number(body.builtupArea),
    ageInYears: Number(body.ageInYears || 0),
    loanAmount: Number(body.loanAmount || 0),
  });

  const propertyId = generateId('PROP');
  const now = new Date();
  const property: PropertyDocument = {
    ...enrichedProperty,
    _id: propertyId,
    propertyId,
    userId,
    projectId: body.projectId,
    plotArea: body.plotArea ?? body.landArea ?? enrichedProperty.plotArea,
    landArea: body.landArea ?? body.plotArea ?? enrichedProperty.landArea,
    description: body.description || enrichedProperty.description,
    ownerEmail: body.ownerEmail,
    ownerPhone: body.ownerPhone,
    propertyConfiguration: body.propertyConfiguration,
    yearBuilt: body.yearBuilt,
    renovationYear: body.renovationYear,
    floorNumber: body.floorNumber,
    totalFloors: body.totalFloors,
    balconyCount: body.balconyCount,
    facing: body.facing,
    condition: body.condition,
    exteriorAssetIds: body.exteriorAssetIds || [],
    layoutAssetIds: body.layoutAssetIds || [],
    legalDocumentAssetIds: body.legalDocumentAssetIds || [],
    photos: body.photos || [],
    documents: body.documents || [],
    documentInsights: body.documentInsights || [],
    reconstruction: body.reconstruction,
    amenities: body.amenities || [],
    parking: body.parking,
    flooring: body.flooring,
    furnishing: body.furnishing,
    reraRegistered: body.reraRegistered,
    leaseRemainingYears: body.leaseRemainingYears,
    assetIds: body.assetIds || [],
    createdAt: now,
    updatedAt: now,
    source: 'valuation-form',
  };

  return saveProperty(property);
}

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url.searchParams);
    const valuations = await listValuations(limit, offset, {
      userId: user.userId,
      projectId: url.searchParams.get('projectId') || undefined,
      propertyId: url.searchParams.get('propertyId') || undefined,
      search: url.searchParams.get('search') || undefined,
    });

    return NextResponse.json({
      success: true,
      count: valuations.length,
      limit,
      offset,
      data: valuations,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = (await request.json()) as ValuationRequest;

    if (body.projectId) {
      const project = await getProjectById(body.projectId, user.userId);
      if (!project) {
        throw new RouteError(404, 'PROJECT_NOT_FOUND', 'Selected project was not found.');
      }
    }

    const property = await buildProperty(user.userId, {
      ...body,
      builtupArea: toNumber(body.builtupArea),
      ageInYears: toNumber(body.ageInYears),
      loanAmount: toNumber(body.loanAmount),
      rentalIncome: body.rentalIncome ? toNumber(body.rentalIncome) : undefined,
      landArea: body.landArea ? toNumber(body.landArea) : undefined,
      plotArea: body.plotArea ? toNumber(body.plotArea) : undefined,
      bedroomCount: body.bedroomCount ? toNumber(body.bedroomCount) : undefined,
      bathroomCount: body.bathroomCount ? toNumber(body.bathroomCount) : undefined,
      yearBuilt: body.yearBuilt ? toNumber(body.yearBuilt) : undefined,
      renovationYear: body.renovationYear ? toNumber(body.renovationYear) : undefined,
      floorNumber: body.floorNumber ? toNumber(body.floorNumber) : undefined,
      totalFloors: body.totalFloors ? toNumber(body.totalFloors) : undefined,
      balconyCount: body.balconyCount ? toNumber(body.balconyCount) : undefined,
      parking: body.parking ? toNumber(body.parking) : undefined,
      assetIds: bodyAssetIds(body.assetIds),
      exteriorAssetIds: bodyStrings(body.exteriorAssetIds),
      layoutAssetIds: bodyStrings(body.layoutAssetIds),
      legalDocumentAssetIds: bodyStrings(body.legalDocumentAssetIds),
      photoUrls: bodyStrings(body.photoUrls),
      photos: bodyStrings(body.photos),
      documents: bodyStrings(body.documents),
      amenities: bodyStrings(body.amenities),
    });

    const inferenceResult = await runFullPropertyInference(property);
    const valuationId = generateId('VAL');
    const valuation = await saveValuation({
      ...inferenceResult,
      _id: valuationId,
      valuationId,
      propertyId: property.propertyId,
      userId: user.userId,
      projectId: body.projectId || property.projectId,
      title: body.address || property.address,
    });

    const assetIds = bodyAssetIds(body.assetIds || property.assetIds);
    await Promise.all(
      assetIds.map((assetId) =>
        updateAssetRecord(assetId, user.userId, {
          propertyId: property.propertyId,
          valuationId,
        })
      )
    );

    const response: ValuationResponse = {
      success: true,
      valuationId,
      propertyId: property.propertyId,
      result: valuation,
      warnings: valuation.pipelineWarnings,
      workerStatus: valuation.workerStatus,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
