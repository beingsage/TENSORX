import { NextResponse } from 'next/server';
import { runFullPropertyInference } from '@/lib/models/inference';
import { enrichPropertyData } from '@/lib/pipeline/enrichment';
import { parsePagination, requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { listValuations, saveProperty, saveValuation } from '@/lib/db/client';
import type { PropertyDocument, ValuationRequest } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = await request.json();
    const properties = Array.isArray(body.properties) ? (body.properties as ValuationRequest[]) : [];

    if (!properties.length) {
      throw new RouteError(400, 'INVALID_INPUT', 'Properties array is required.');
    }

    if (properties.length > 50) {
      throw new RouteError(400, 'BATCH_LIMIT', 'Maximum 50 properties per batch.');
    }

    const startedAt = Date.now();
    const results = await Promise.all(
      properties.map(async (propertyRequest, index) => {
        try {
          const { property: enrichedProperty } = await enrichPropertyData({
            ...propertyRequest,
            builtupArea: asNumber(propertyRequest.builtupArea),
            ageInYears: asNumber(propertyRequest.ageInYears),
            loanAmount: asNumber(propertyRequest.loanAmount),
          });

          const propertyId = generateId('PROP');
          const savedProperty = await saveProperty({
            ...enrichedProperty,
            _id: propertyId,
            propertyId,
            userId: user.userId,
            projectId: propertyRequest.projectId,
            assetIds: propertyRequest.assetIds || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'imported',
          } as PropertyDocument);

          const inference = await runFullPropertyInference(savedProperty);
          const valuationId = generateId('VAL');
          const valuation = await saveValuation({
            ...inference,
            _id: valuationId,
            valuationId,
            propertyId: savedProperty.propertyId,
            userId: user.userId,
            projectId: propertyRequest.projectId,
            title: propertyRequest.address || savedProperty.address,
          });

          return {
            index,
            success: true,
            propertyId: savedProperty.propertyId,
            valuationId: valuation.valuationId,
            estimate: valuation.valuation.pointEstimate,
            warnings: valuation.pipelineWarnings || [],
          };
        } catch (error) {
          return {
            index,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process property',
          };
        }
      })
    );

    return NextResponse.json(
      successResponse({
        total: properties.length,
        successful: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length,
        processingTimeMs: Date.now() - startedAt,
        results,
      })
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url.searchParams);
    const valuations = await listValuations(limit, offset, { userId: user.userId });
    return NextResponse.json(successResponse({ data: valuations, count: valuations.length }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}
