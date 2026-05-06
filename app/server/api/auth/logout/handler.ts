import { NextResponse } from 'next/server';
import { clearSessionCookie, endUserSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { routeErrorResponse } from '@/lib/api';
import { successResponse } from '@/lib/utils/errorHandling';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionToken = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split('=')
      .slice(1)
      .join('=');

    if (sessionToken) {
      await endUserSession(sessionToken);
    }

    const response = NextResponse.json(successResponse({ loggedOut: true }));
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}
