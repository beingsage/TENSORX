'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Boxes, FolderKanban, Home, Waves } from 'lucide-react';
import { AppShell } from '@/components/workspace/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSessionUser } from '@/hooks/use-session-user';

type WorkspacePayload = {
  counts: {
    projects: number;
    properties: number;
    valuations: number;
    assets: number;
  };
  propertyStats: { total: number; byCity: Record<string, number> };
  valuationStats: {
    total: number;
    avgValue: number;
    avgConfidence: number;
    averageTimeToSell: number;
  };
  recentProjects: Array<{ projectId: string; name: string; status: string; city?: string; updatedAt: string }>;
  recentValuations: Array<{
    valuationId: string;
    propertyId: string;
    valuation: { pointEstimate: number; confidence: number };
    liquidity: { estimatedTimeToSell: number };
    pipelineWarnings?: string[];
  }>;
  recentAssets: Array<{ assetId: string; displayName: string; projectId: string; status: string }>;
  modelStatus: {
    summary: { overallStatus: string; message: string };
    workers: Array<{ id: string; name: string; status: string; message: string }>;
  };
};

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString()}`;
}

export default function DashboardPage() {
  const { user, loading } = useSessionUser();
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);

  useEffect(() => {
    if (!user) return;

    let active = true;
    async function loadWorkspace() {
      const response = await fetch('/api/workspace', { cache: 'no-store' });
      const payload = await response.json();
      if (active) {
        setWorkspace(payload?.data || null);
      }
    }

    loadWorkspace();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading || !user || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5">
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      title="Connected Control Room"
      subtitle="Live workspace metrics across projects, properties, valuations, assets, and model workers."
      actions={
        <>
          <Link href="/projects">
            <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
              New Project
            </Button>
          </Link>
          <Link href="/valuations/new">
            <Button variant="outline" className="rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10">
              Run Valuation
            </Button>
          </Link>
        </>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Projects', value: workspace.counts.projects, icon: FolderKanban },
            { label: 'Properties', value: workspace.counts.properties, icon: Home },
            { label: 'Valuations', value: workspace.counts.valuations, icon: Activity },
            { label: 'Assets', value: workspace.counts.assets, icon: Boxes },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="rounded-[26px] border border-white/10 bg-white/6 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/55">{item.label}</p>
                    <p className="mt-3 text-4xl font-semibold">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/55">Portfolio valuation average</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-none">
                  {formatCurrency(workspace.valuationStats.avgValue)}
                </h3>
              </div>
              <Badge className="rounded-full bg-cyan-300/15 px-3 py-1 text-cyan-100 hover:bg-cyan-300/15">
                {(workspace.valuationStats.avgConfidence * 100).toFixed(0)}% avg confidence
              </Badge>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm text-white/55">Avg time to sell</p>
                <p className="mt-2 text-2xl font-semibold">
                  {workspace.valuationStats.averageTimeToSell} days
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm text-white/55">Indexed cities</p>
                <p className="mt-2 text-2xl font-semibold">
                  {Object.keys(workspace.propertyStats.byCity || {}).length}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm text-white/55">Worker posture</p>
                <p className="mt-2 text-2xl font-semibold capitalize">
                  {workspace.modelStatus.summary.overallStatus}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-300/15 p-3 text-amber-100">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-white/55">Worker status</p>
                <h3 className="text-xl font-semibold">Model infrastructure</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/65">
              {workspace.modelStatus.summary.message}
            </p>
            <div className="mt-6 space-y-3">
              {workspace.modelStatus.workers.map((worker) => (
                <div
                  key={worker.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{worker.name}</p>
                    <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
                      {worker.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-white/55">{worker.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Recent projects</h3>
              <Link href="/projects">
                <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white">
                  Open all <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {workspace.recentProjects.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-white/55">
                  No projects yet. Create the first workspace to start attaching properties and assets.
                </p>
              ) : (
                workspace.recentProjects.map((project) => (
                  <Link
                    key={project.projectId}
                    href={`/projects/${project.projectId}`}
                    className="block rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 transition hover:border-white/20 hover:bg-slate-950/55"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{project.name}</p>
                        <p className="mt-1 text-sm text-white/55">
                          {project.city || 'Location pending'} • {project.status}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/40" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Recent valuations</h3>
              <Link href="/valuations">
                <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white">
                  Review all <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {workspace.recentValuations.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-white/55">
                  No valuations have been run yet.
                </p>
              ) : (
                workspace.recentValuations.map((valuation) => (
                  <Link
                    key={valuation.valuationId}
                    href={`/valuation-results/${valuation.valuationId}`}
                    className="block rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 transition hover:border-white/20 hover:bg-slate-950/55"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{formatCurrency(valuation.valuation.pointEstimate)}</p>
                        <p className="mt-1 text-sm text-white/55">
                          {valuation.propertyId} • {valuation.liquidity.estimatedTimeToSell} days to sell
                        </p>
                        {valuation.pipelineWarnings?.length ? (
                          <p className="mt-2 text-xs text-amber-200">
                            {valuation.pipelineWarnings[0]}
                          </p>
                        ) : null}
                      </div>
                      <Badge className="rounded-full bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/15">
                        {(valuation.valuation.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
