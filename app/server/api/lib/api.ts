import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth';
import { isMongoConfigured } from '@/lib/db/mongodb';
import { errorResponse } from '@/lib/utils/errorHandling';

export class RouteError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
  }
}

export function ensureMongoOrThrow() {
  if (!isMongoConfigured()) {
    throw new RouteError(
      503,
      'MONGO_NOT_CONFIGURED',
      'MongoDB is not configured. Set MONGODB_URI and MONGODB_DB_NAME to enable auth and persistence.'
    );
  }
}

export async function requireRouteUser(request: Request) {
  ensureMongoOrThrow();
  const user = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    throw new RouteError(401, 'UNAUTHORIZED', 'You must be signed in to access this resource.');
  }
  return user;
}

export function parsePagination(searchParams: URLSearchParams) {
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 50)));
  const offset = Math.max(0, Number(searchParams.get('offset') || 0));
  return { limit, offset };
}

export function routeErrorResponse(error: unknown) {
  if (error instanceof RouteError) {
    return NextResponse.json(
      errorResponse(error.code, error.message, error.details),
      { status: error.status }
    );
  }

  return NextResponse.json(
    errorResponse(
      'SERVER_ERROR',
      error instanceof Error ? error.message : 'Unexpected server error'
    ),
    { status: 500 }
  );
}
