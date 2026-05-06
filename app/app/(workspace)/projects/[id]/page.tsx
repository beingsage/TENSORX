'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRight, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/workspace/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSessionUser } from '@/hooks/use-session-user';

type ProjectWorkspace = {
  project: {
    projectId: string;
    name: string;
    description?: string;
    city?: string;
    status: string;
  } | null;
  properties: Array<{ propertyId: string; address: string; propertyType: string; city: string }>;
  valuations: Array<{
    valuationId: string;
    valuation: { pointEstimate: number };
    pipelineWarnings?: string[];
  }>;
  assets: Array<{ assetId: string; displayName: string; secureUrl: string; status: string }>;
  stats: {
    propertyCount: number;
    valuationCount: number;
    assetCount: number;
    averageValue: number;
  };
};

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString()}`;
}

export default function ProjectDetailPage() {
  const { user, loading } = useSessionUser();
  const params = useParams<{ id: string }>();
  const [projectId, setProjectId] = useState<string>('');
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [propertyForm, setPropertyForm] = useState({
    address: '',
    city: '',
    pincode: '',
    propertyType: '2BHK',
    builtupArea: '1200',
    ageInYears: '4',
    loanAmount: '7500000',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');

  useEffect(() => {
    if (typeof params.id === 'string') {
      setProjectId(params.id);
    }
  }, [params.id]);

  async function loadWorkspace(currentProjectId: string) {
    const response = await fetch(`/api/projects/${currentProjectId}`, { cache: 'no-store' });
    const payload = await response.json();
    setWorkspace(payload?.data || null);
  }

  useEffect(() => {
    if (!user || !projectId) return;
    loadWorkspace(projectId);
  }, [projectId, user]);

  async function createProperty(event: React.FormEvent) {
    event.preventDefault();
    await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...propertyForm,
        projectId,
        builtupArea: Number(propertyForm.builtupArea),
        ageInYears: Number(propertyForm.ageInYears),
        loanAmount: Number(propertyForm.loanAmount),
      }),
    });
    setPropertyForm({
      address: '',
      city: '',
      pincode: '',
      propertyType: '2BHK',
      builtupArea: '1200',
      ageInYears: '4',
      loanAmount: '7500000',
    });
    loadWorkspace(projectId);
  }

  async function uploadAsset(event: React.FormEvent) {
    event.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('projectId', projectId);
    formData.append('displayName', uploadName || uploadFile.name);
    formData.append('tags', 'project-upload');

    await fetch('/api/assets', {
      method: 'POST',
      body: formData,
    });

    setUploadFile(null);
    setUploadName('');
    loadWorkspace(projectId);
  }

  async function deleteProperty(propertyIdToDelete: string) {
    await fetch(`/api/properties/${propertyIdToDelete}`, { method: 'DELETE' });
    loadWorkspace(projectId);
  }

  async function deleteAsset(assetId: string) {
    await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
    loadWorkspace(projectId);
  }

  async function deleteValuation(valuationId: string) {
    await fetch(`/api/valuations/${valuationId}`, { method: 'DELETE' });
    loadWorkspace(projectId);
  }

  if (loading || !user || !workspace?.project) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading project...</div>;
  }

  return (
    <AppShell
      user={user}
      title={workspace.project.name}
      subtitle={workspace.project.description || 'Project workspace for connected properties, asset uploads, and valuation history.'}
      actions={
        <Link href={`/valuations/new?projectId=${workspace.project.projectId}`}>
          <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
            Run valuation
          </Button>
        </Link>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Properties', value: workspace.stats.propertyCount },
            { label: 'Valuations', value: workspace.stats.valuationCount },
            { label: 'Assets', value: workspace.stats.assetCount },
            { label: 'Avg value', value: formatCurrency(workspace.stats.averageValue) },
          ].map((item) => (
            <Card key={item.label} className="rounded-[26px] border border-white/10 bg-white/6 p-5 text-white">
              <p className="text-sm text-white/55">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Add property</h3>
                <p className="text-sm text-white/55">Create a project-scoped property record.</p>
              </div>
            </div>
            <form className="grid gap-4" onSubmit={createProperty}>
              <Input
                value={propertyForm.address}
                onChange={(event) => setPropertyForm((current) => ({ ...current, address: event.target.value }))}
                className="border-white/10 bg-slate-950/50 text-white"
                placeholder="Full property address"
                required
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={propertyForm.city}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, city: event.target.value }))}
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="City"
                  required
                />
                <Input
                  value={propertyForm.pincode}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, pincode: event.target.value }))}
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Pincode"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  value={propertyForm.propertyType}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, propertyType: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Property type"
                />
                <Input
                  value={propertyForm.builtupArea}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, builtupArea: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Built-up area"
                />
                <Input
                  value={propertyForm.loanAmount}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, loanAmount: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Loan amount"
                />
              </div>
              <Button type="submit" className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
                Save property
              </Button>
            </form>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-300/15 p-3 text-cyan-100">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Upload asset</h3>
                <p className="text-sm text-white/55">Push project imagery and documents into Cloudinary.</p>
              </div>
            </div>
            <form className="grid gap-4" onSubmit={uploadAsset}>
              <div className="space-y-2">
                <Label htmlFor="upload-name">Display name</Label>
                <Input
                  id="upload-name"
                  value={uploadName}
                  onChange={(event) => setUploadName(event.target.value)}
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Lobby photo / legal deed / site visit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upload-file">File</Label>
                <Input
                  id="upload-file"
                  type="file"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <Button type="submit" className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
                Upload to Cloudinary
              </Button>
            </form>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white xl:col-span-1">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Properties</h3>
            </div>
            <div className="space-y-3">
              {workspace.properties.map((property) => (
                <div key={property.propertyId} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                  <p className="font-medium">{property.address}</p>
                  <p className="mt-1 text-sm text-white/55">
                    {property.propertyType} • {property.city}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => deleteProperty(property.propertyId)}
                      className="rounded-2xl border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white xl:col-span-1">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Assets</h3>
              <Link href="/assets">
                <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white">
                  Library <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {workspace.assets.map((asset) => (
                <div key={asset.assetId} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                  <p className="font-medium">{asset.displayName}</p>
                  <p className="mt-1 text-sm text-white/55">{asset.status}</p>
                  <div className="mt-3 flex justify-between gap-3">
                    <a
                      href={asset.secureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-cyan-200 hover:text-cyan-100"
                    >
                      Open asset
                    </a>
                    <Button
                      variant="outline"
                      onClick={() => deleteAsset(asset.assetId)}
                      className="rounded-2xl border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white xl:col-span-1">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Valuations</h3>
            </div>
            <div className="space-y-3">
              {workspace.valuations.map((valuation) => (
                <div key={valuation.valuationId} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                  <p className="font-medium">{formatCurrency(valuation.valuation.pointEstimate)}</p>
                  {valuation.pipelineWarnings?.length ? (
                    <p className="mt-1 text-sm text-amber-200">{valuation.pipelineWarnings[0]}</p>
                  ) : null}
                  <div className="mt-3 flex justify-between gap-3">
                    <Link href={`/valuation-results/${valuation.valuationId}`} className="text-sm font-medium text-cyan-200 hover:text-cyan-100">
                      Open report
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => deleteValuation(valuation.valuationId)}
                      className="rounded-2xl border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
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
