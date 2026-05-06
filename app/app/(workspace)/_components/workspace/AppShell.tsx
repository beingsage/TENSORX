'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import {
  Activity,
  Boxes,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Home,
  LogOut,
  Search,
  Shield,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SafeUser } from '@/lib/db/schema';

type AppShellProps = {
  user: SafeUser;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/search', label: 'Properties', icon: Search },
  { href: '/valuations', label: 'Valuations', icon: Activity },
  { href: '/assets', label: 'Assets', icon: Boxes },
  { href: '/market-data', label: 'System', icon: Waves },
  { href: '/admin/training', label: 'Audit', icon: Shield },
];

export function AppShell({ user, title, subtitle, actions, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarPreferenceReady, setSidebarPreferenceReady] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem('sidebar-expanded');
    if (storedValue !== null) {
      setSidebarExpanded(storedValue === 'true');
    }
    setSidebarPreferenceReady(true);
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceReady) return;
    window.localStorage.setItem('sidebar-expanded', String(sidebarExpanded));
  }, [sidebarExpanded, sidebarPreferenceReady]);

  const handleLogout = () => {
    startTransition(() => {
      void (async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      })();
    });
  };

  return (
    <div className="terminal-grid min-h-screen text-[var(--on-surface)]">
      <div className="page-enter mx-auto flex min-h-screen max-w-[1600px] gap-4 px-4 py-4 pb-[calc(var(--dock-height)+16px)] lg:px-6 xl:pb-4">
        <aside
          className={cn(
            'surface-grain hidden shrink-0 flex-col overflow-hidden border-r border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] transition-all duration-300 ease-[cubic-bezier(0.05,0.7,0.1,1)] xl:flex',
            sidebarExpanded ? 'w-[var(--rail-expanded)] p-4' : 'w-[var(--rail-collapsed)] p-2'
          )}
        >
          <div className={cn('mb-4 flex', sidebarExpanded ? 'justify-end' : 'justify-center')}>
            <button
              type="button"
              aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => setSidebarExpanded((current) => !current)}
              className="flex h-10 w-10 items-center justify-center border border-[var(--outline-variant)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
            >
              {sidebarExpanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mb-8 space-y-4 border-b border-[var(--outline-variant)] pb-5">
            <div className={cn('flex items-center gap-3', !sidebarExpanded && 'justify-center')}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div
                className={cn(
                  'transition-opacity duration-200',
                  !sidebarExpanded && 'h-0 w-0 overflow-hidden opacity-0'
                )}
              >
                <p className="metadata-label">
                  TenzorX
                </p>
                <h1 className="text-lg font-semibold text-[var(--on-surface)]">
                  Collateral Workspace
                </h1>
              </div>
            </div>
            <p
              className={cn(
                'text-sm leading-6 text-[var(--on-surface-variant)] transition-opacity duration-200',
                !sidebarExpanded && 'h-0 w-0 overflow-hidden opacity-0'
              )}
            >
              Mongo-backed projects, Cloudinary assets, live valuation runs, and explicit
              worker health.
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-h-12 items-center border border-transparent px-3 py-3 text-sm font-medium transition',
                    sidebarExpanded ? 'gap-3' : 'justify-center',
                    active
                      ? 'border-[var(--outline-variant)] bg-[var(--surface-bright)] text-[var(--primary)]'
                      : 'text-[var(--on-surface-variant)] hover:border-[var(--outline-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      'transition-opacity duration-200',
                      !sidebarExpanded && 'w-0 overflow-hidden opacity-0'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div
            className={cn(
              'mt-auto border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-4 transition-opacity duration-200',
              !sidebarExpanded && 'w-0 overflow-hidden border-transparent p-0 opacity-0'
            )}
          >
            <p className="metadata-label">Signed In</p>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--on-surface)]">
              {user.name}
            </p>
            <p className="text-sm text-[var(--on-surface-variant)]">{user.email}</p>
            {user.company ? (
              <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{user.company}</p>
            ) : null}
            <Button
              onClick={handleLogout}
              disabled={isPending}
              variant="outline"
              className="mt-4 w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isPending ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="surface-grain border border-[var(--outline-variant)] bg-[var(--surface-container)] px-5 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <Badge className="tag-confidence">
                  Workspace Live
                </Badge>
                <div>
                  <h2 className="font-[family-name:var(--font-heading)] text-4xl leading-[1.05] tracking-normal text-[var(--on-surface)] md:text-5xl">
                    {title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)] md:text-base">
                    {subtitle}
                  </p>
                </div>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--dock-height)] items-center justify-around border-t border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-2 xl:hidden">
        {navigation.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                'flex h-12 w-12 items-center justify-center border transition',
                active
                  ? 'border-[var(--outline-variant)] bg-[var(--surface-bright)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
