import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { geocodeAddress, reverseGeocode, fetchSpatialSnapshot } from '@/lib/providers/openData';
import { successResponse } from '@/lib/utils/errorHandling';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(request: Request) {
  try {
    await requireRouteUser(request);
    const body = await request.json();
    const address = String(body.address || '').trim();
    const pincode = String(body.pincode || '').trim();
    const latitude = toNumber(body.latitude);
    const longitude = toNumber(body.longitude);
    const includeSpatial = Boolean(body.includeSpatial);

    if ((!address || !pincode) && (latitude === undefined || longitude === undefined)) {
      throw new RouteError(
        400,
        'INVALID_INPUT',
        'Provide either address plus pincode, or latitude plus longitude.'
      );
    }

    const lookup =
      latitude !== undefined && longitude !== undefined
        ? await reverseGeocode({ lat: latitude, lng: longitude })
        : await geocodeAddress(address, pincode);

    if (!lookup) {
      throw new RouteError(404, 'LOCATION_NOT_FOUND', 'Location could not be resolved.');
    }

    const spatialContext =
      includeSpatial && lookup.latitude && lookup.longitude
        ? await fetchSpatialSnapshot({ lat: lookup.latitude, lng: lookup.longitude }).catch(
            () => null
          )
        : null;

    return NextResponse.json(
      successResponse({
        location: {
          address: address || lookup.displayName,
          displayName: lookup.displayName,
          latitude: lookup.latitude,
          longitude: lookup.longitude,
          city: lookup.city,
          state: lookup.state,
          pincode: lookup.postcode || pincode,
          micromarket: lookup.micromarket,
          source: lookup.source,
        },
        suggestedPatch: {
          city: lookup.city,
          state: lookup.state,
          pincode: lookup.postcode || pincode || undefined,
          latitude: lookup.latitude,
          longitude: lookup.longitude,
        },
        spatialContext,
      })
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
