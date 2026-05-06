'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SafeUser } from '@/lib/db/schema';

export function useSessionUser(options?: { redirectTo?: string }) {
  const redirectTo = options?.redirectTo ?? '/login';
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) {
          router.replace(redirectTo);
          return;
        }

        const payload = await response.json();
        if (!active) return;
        setUser(payload?.data?.user || null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load session');
        router.replace(redirectTo);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [redirectTo, router]);

  return { user, setUser, loading, error };
}
