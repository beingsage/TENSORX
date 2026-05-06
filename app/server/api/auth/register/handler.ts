import { NextResponse } from 'next/server';
import {
  applySessionCookie,
  beginUserSession,
  hashPassword,
  normalizeEmail,
  readClientIp,
} from '@/lib/auth';
import { RouteError, ensureMongoOrThrow, routeErrorResponse } from '@/lib/api';
import { createProjectRecord, createUserRecord, getUserByEmail, markUserLogin } from '@/lib/db/client';
import { generateSessionToken } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';

export async function POST(request: Request) {
  try {
    ensureMongoOrThrow();
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    const company = String(body.company || '').trim() || undefined;

    if (!name || !email || password.length < 8) {
      throw new RouteError(
        400,
        'INVALID_INPUT',
        'Name, email, and a password with at least 8 characters are required.'
      );
    }

    const emailLower = normalizeEmail(email);
    const existingUser = await getUserByEmail(emailLower);
    if (existingUser) {
      throw new RouteError(409, 'EMAIL_IN_USE', 'An account already exists for this email address.');
    }

    const user = await createUserRecord({
      email,
      emailLower,
      passwordHash: hashPassword(password),
      name,
      company,
    });

    await createProjectRecord({
      userId: user.userId,
      name: `${name.split(' ')[0]}'s Workspace`,
      description: 'Starter workspace created during sign up.',
      status: 'active',
      tags: ['starter'],
    });

    const sessionToken = generateSessionToken();
    await beginUserSession({
      userId: user.userId,
      token: sessionToken,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: readClientIp(request),
    });
    await markUserLogin(user.userId);

    const response = NextResponse.json(successResponse({ user }));
    applySessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}
