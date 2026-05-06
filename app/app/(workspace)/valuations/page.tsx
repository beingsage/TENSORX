'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/workspace/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSessionUser } from '@/hooks/use-session-user';

type Valuation = {
  valuationId: string;
  propertyId: string;
  title?: string;
  valuation: { pointEstimate: number; confidence: number };
  liquidity: { estimatedTimeToSell: number };
  pipelineWarnings?: string[];
};

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString()}`;
}

export default function ValuationsPage() {
  const { user, loading } = useSessionUser();
  const [query, setQuery] = useState('');
  const [valuations, setValuations] = useState<Valuation[]>([]);

  async function loadValuations(search = '') {
    const response = await fetch(`/api/valuations?search=${encodeURIComponent(search)}`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    setValuations(payload?.data || []);
  }

  useEffect(() => {
    if (!user) return;
    loadValuations();
  }, [user]);

  async function remove(valuationId: string) {
    await fetch(`/api/valuations/${valuationId}`, { method: 'DELETE' });
    loadValuations(query);
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading valuations...</div>;
  }

  return (
    <AppShell
      user={user}
      title="Valuation Queue"
      subtitle="Persisted valuation runs with warning visibility, confidence bands, and direct links into the detailed result workspace."
      actions={
        <Link href="/valuations/new">
          <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
            New valuation
          </Button>
        </Link>
      }
    >
      <div className="grid gap-6">
        <Card className="rounded-[28px] border border-white/10 bg-white/6 p-5 text-white">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 border-white/10 bg-slate-950/50 text-white"
              placeholder="Search by valuation ID, property ID, or title"
            />
            <Button
              onClick={() => loadValuations(query)}
              className="h-12 rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
            >
              Search
            </Button>
          </div>
        </Card>

        <div className="grid gap-4">
          {valuations.map((valuation) => (
            <Card key={valuation.valuationId} className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    {valuation.title || valuation.propertyId}
                  </p>
                  <p className="text-sm text-white/55">{valuation.valuationId}</p>
                  <p className="text-3xl font-semibold">{formatCurrency(valuation.valuation.pointEstimate)}</p>
                  <p className="text-sm text-white/55">
                    {(valuation.valuation.confidence * 100).toFixed(0)}% confidence • {valuation.liquidity.estimatedTimeToSell} days to sell
                  </p>
                  {valuation.pipelineWarnings?.length ? (
                    <p className="text-sm text-amber-200">{valuation.pipelineWarnings[0]}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/valuation-results/${valuation.valuationId}`}>
                    <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
                      Open report
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => remove(valuation.valuationId)}
                    className="rounded-2xl border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
