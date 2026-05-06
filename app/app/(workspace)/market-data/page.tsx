'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/workspace/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSessionUser } from '@/hooks/use-session-user';

type Worker = { id: string; name: string; status: string; message: string };
type MarketRow = {
  city: string;
  micromarket: string;
  avgDaysOnMarket: number;
  priceGrowthYoY: number;
  demandIndex?: number;
  supplyIndex?: number;
};

export default function MarketDataPage() {
  const { user, loading } = useSessionUser();
  const [city, setCity] = useState('delhi');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [summary, setSummary] = useState<{ message: string; overallStatus: string } | null>(null);

  async function loadData(currentCity = city) {
    const response = await fetch(`/api/market-data?city=${encodeURIComponent(currentCity)}`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    setMarkets(payload?.data || []);
    setWorkers(payload?.workers || []);
    setSummary(payload?.workerSummary || null);
  }

  useEffect(() => {
    if (!user) return;
    loadData('delhi');
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading system data...</div>;
  }

  return (
    <AppShell
      user={user}
      title="System + Market Signals"
      subtitle="Worker health, fallback posture, and the market snapshots currently available to the valuation pipeline."
    >
      <div className="grid gap-6">
        <Card className="rounded-[28px] border border-white/10 bg-white/6 p-5 text-white">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-12 border-white/10 bg-slate-950/50 text-white"
              placeholder="City"
            />
            <Button
              onClick={() => loadData(city)}
              className="h-12 rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
            >
              Refresh city
            </Button>
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <h3 className="text-xl font-semibold">Worker health</h3>
            {summary ? <p className="mt-2 text-sm text-white/55">{summary.message}</p> : null}
            <div className="mt-5 space-y-3">
              {workers.map((worker) => (
                <div key={worker.id} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{worker.name}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/75">
                      {worker.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/55">{worker.message}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <h3 className="text-xl font-semibold">Market records</h3>
            <div className="mt-5 grid gap-3">
              {markets.map((market) => (
                <div key={`${market.city}-${market.micromarket}`} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {market.city} / {market.micromarket}
                      </p>
                      <p className="mt-1 text-sm text-white/55">
                        {market.avgDaysOnMarket} days on market • {(market.priceGrowthYoY * 100).toFixed(1)}% YoY
                      </p>
                    </div>
                    <div className="text-right text-sm text-white/55">
                      <p>Demand {market.demandIndex ?? '-'}</p>
                      <p>Supply {market.supplyIndex ?? '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
