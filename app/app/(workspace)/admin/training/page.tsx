'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/workspace/AppShell';
import { Card } from '@/components/ui/card';
import { useSessionUser } from '@/hooks/use-session-user';

type AuditLog = {
  _id?: string;
  timestamp: string;
  action: string;
  propertyId?: string;
  valuationId?: string;
  details: Record<string, unknown>;
};

type Worker = { id: string; name: string; status: string; message: string };

export default function AdminTrainingPage() {
  const { user, loading } = useSessionUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetch('/api/audit-logs', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/models/status', { cache: 'no-store' }).then((response) => response.json()),
    ]).then(([logPayload, workerPayload]) => {
      setLogs(logPayload?.data?.logs || []);
      setWorkers(workerPayload?.data?.workers || []);
    });
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading audit console...</div>;
  }

  return (
    <AppShell
      user={user}
      title="Audit Console"
      subtitle="Operational visibility across user activity, valuation events, and worker posture."
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.5fr]">
        <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
          <h3 className="text-xl font-semibold">Current workers</h3>
          <div className="mt-5 space-y-3">
            {workers.map((worker) => (
              <div key={worker.id} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
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
          <h3 className="text-xl font-semibold">Audit trail</h3>
          <div className="mt-5 space-y-3">
            {logs.map((log) => (
              <div key={log._id || `${log.action}-${log.timestamp}`} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-white/45">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-white/55">
                  Property: {log.propertyId || 'n/a'} • Valuation: {log.valuationId || 'n/a'}
                </p>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950/50 p-3 text-xs text-white/60">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
