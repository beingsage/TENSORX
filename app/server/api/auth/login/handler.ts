import { NextResponse } from 'next/server';
import {
  applySessionCookie,
  authenticateCredentials,
  beginUserSession,
  readClientIp,
} from '@/lib/auth';
import { RouteError, ensureMongoOrThrow, routeErrorResponse } from '@/lib/api';
import { getUserById, markUserLogin } from '@/lib/db/client';
import { generateSessionToken } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';

export async function POST(request: Request) {
  try {
    ensureMongoOrThrow();
    const body = await request.json();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      throw new RouteError(400, 'INVALID_INPUT', 'Email and password are required.');
    }

    const userDocument = await authenticateCredentials(email, password);
    if (!userDocument) {
      throw new RouteError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const sessionToken = generateSessionToken();
    await beginUserSession({
      userId: userDocument.userId,
      token: sessionToken,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: readClientIp(request),
    });
    await markUserLogin(userDocument.userId);

    const user = await getUserById(userDocument.userId);
    const response = NextResponse.json(successResponse({ user }));
    applySessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}
