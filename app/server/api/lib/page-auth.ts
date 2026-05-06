import { redirect } from 'next/navigation';
import type { SafeUser } from '@/lib/db/schema';
import { getAuthenticatedUserFromCookies } from '@/lib/auth';

export async function requirePageUser(): Promise<SafeUser> {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function getPageUser(): Promise<SafeUser | null> {
  return getAuthenticatedUserFromCookies();
}
