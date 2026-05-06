import { NextResponse } from 'next/server';
import { clearSessionCookie, endUserSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { deleteUserAccount, updateUserProfile } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';

function extractSessionToken(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    return NextResponse.json(successResponse({ user }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = await request.json();
    const updated = await updateUserProfile(user.userId, {
      name: body.name ? String(body.name).trim() : undefined,
      company: body.company ? String(body.company).trim() : undefined,
      role: body.role ? String(body.role).trim() : undefined,
      avatarUrl: body.avatarUrl ? String(body.avatarUrl).trim() : undefined,
    });

    return NextResponse.json(successResponse({ user: updated }));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRouteUser(request);
    await deleteUserAccount(user.userId);

    const sessionToken = extractSessionToken(request);
    if (sessionToken) {
      await endUserSession(sessionToken);
    }

    const response = NextResponse.json(successResponse({ deleted: true }));
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}
