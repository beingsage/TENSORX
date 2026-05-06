import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import type { SafeUser } from '@/lib/db/schema';
import {
  createSessionRecord,
  deleteSessionByToken,
  getSessionByToken,
  getUserByEmail,
  getUserById,
  touchSession,
} from '@/lib/db/client';

export const SESSION_COOKIE_NAME = 'cost_analysis_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHash] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function sanitizeUser(user: SafeUser | null) {
  return user;
}

export function readClientIp(request: Request | NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }

  return request.headers.get('x-real-ip') || undefined;
}

export async function getAuthenticatedUserFromRequest(request: Request | NextRequest) {
  const sessionToken = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  if (!sessionToken) {
    return null;
  }

  try {
    const session = await getSessionByToken(sessionToken);
    if (!session) {
      return null;
    }

    await touchSession(session.sessionId);
    return getUserById(session.userId);
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserFromCookies() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return null;
  }

  try {
    // Add timeout to prevent hanging on database operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Session lookup timeout')), 5000)
    );

    const sessionPromise = (async () => {
      const session = await getSessionByToken(sessionToken);
      if (!session) {
        return null;
      }

      await touchSession(session.sessionId);
      return getUserById(session.userId);
    })();

    return await Promise.race([sessionPromise, timeoutPromise]);
  } catch {
    return null;
  }
}

export function applySessionCookie(response: NextResponse, token: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });

  return expiresAt;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  });
}

export async function authenticateCredentials(email: string, password: string) {
  const user = await getUserByEmail(normalizeEmail(email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return user;
}

export async function beginUserSession(args: {
  userId: string;
  token: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const tokenHash = hashSessionToken(args.token);
  return createSessionRecord({
    userId: args.userId,
    tokenHash,
    userAgent: args.userAgent,
    ipAddress: args.ipAddress,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function endUserSession(token: string) {
  await deleteSessionByToken(token);
}
