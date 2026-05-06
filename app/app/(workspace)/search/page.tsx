'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/workspace/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSessionUser } from '@/hooks/use-session-user';

type Property = {
  propertyId: string;
  projectId?: string;
  address: string;
  city: string;
  propertyType: string;
  builtupArea: number;
  ageInYears: number;
  loanAmount: number;
};

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString()}`;
}

export default function SearchPage() {
  const { user, loading } = useSessionUser();
  const [query, setQuery] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);

  async function loadProperties(search = '') {
    const response = await fetch(`/api/properties?search=${encodeURIComponent(search)}`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    setProperties(payload?.data?.data || []);
  }

  useEffect(() => {
    if (!user) return;
    loadProperties();
  }, [user]);

  async function remove(propertyId: string) {
    await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
    loadProperties(query);
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading properties...</div>;
  }

  return (
    <AppShell
      user={user}
      title="Property Inventory"
      subtitle="Search the persisted property index, review deal context, and jump directly into new valuation runs."
      actions={
        <Link href="/projects">
          <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
            Add via Project
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
              placeholder="Search by address, city, property ID, or pincode"
            />
            <Button
              onClick={() => loadProperties(query)}
              className="h-12 rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
            >
              Search
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => (
            <Card key={property.propertyId} className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
              <p className="text-lg font-semibold">{property.address}</p>
              <p className="mt-2 text-sm text-white/55">
                {property.city} • {property.propertyType}
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">Area</p>
                  <p className="mt-1 text-sm">{property.builtupArea} sqft</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">Age</p>
                  <p className="mt-1 text-sm">{property.ageInYears} years</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">Exposure</p>
                  <p className="mt-1 text-sm">{formatCurrency(property.loanAmount)}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/valuations/new?projectId=${property.projectId || ''}&propertyId=${property.propertyId}`}>
                  <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
                    Revalue
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => remove(property.propertyId)}
                  className="rounded-2xl border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
