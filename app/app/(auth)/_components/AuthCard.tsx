'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthCardProps = {
  mode: 'login' | 'register';
};

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
  });

  const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          setError(payload?.error?.message || 'Authentication failed.');
          return;
        }

        router.push('/dashboard');
        router.refresh();
      })();
    });
  };

  return (
    <Card className="primary-accent-card w-full max-w-xl p-8">
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="metadata-label">
              Real Workspace
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--on-surface)]">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h1>
          </div>
        </div>
        <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
          {mode === 'login'
            ? 'Continue into the connected valuation workspace with your saved projects, assets, and reports.'
            : 'Create a Mongo-backed account and provision your first project workspace immediately.'}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {mode === 'register' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                placeholder="Aparna Mehta"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(event) => setFormData((current) => ({ ...current, company: event.target.value }))}
                placeholder="Northline Capital"
              />
            </div>
          </>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@company.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            placeholder="At least 8 characters"
            required
          />
        </div>

        {error ? (
          <div className="danger-accent-card px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
          {mode === 'login' ? 'Enter Workspace' : 'Create Workspace'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--on-surface-variant)]">
        {mode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
        <Link
          href={mode === 'login' ? '/register' : '/login'}
          className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-fixed)]"
        >
          {mode === 'login' ? 'Create one' : 'Sign in'}
        </Link>
      </p>
    </Card>
  );
}
