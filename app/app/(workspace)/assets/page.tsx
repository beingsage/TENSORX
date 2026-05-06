'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/workspace/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSessionUser } from '@/hooks/use-session-user';

type Asset = {
  assetId: string;
  displayName: string;
  secureUrl: string;
  status: string;
  projectId: string;
  tags: string[];
};

type Project = { projectId: string; name: string };

export default function AssetsPage() {
  const { user, loading } = useSessionUser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');

  async function loadData() {
    const [assetResponse, projectResponse] = await Promise.all([
      fetch('/api/assets', { cache: 'no-store' }),
      fetch('/api/projects', { cache: 'no-store' }),
    ]);
    const assetPayload = await assetResponse.json();
    const projectPayload = await projectResponse.json();
    setAssets(assetPayload?.data?.assets || []);
    setProjects(projectPayload?.data?.projects || []);
    setProjectId((current) => current || projectPayload?.data?.projects?.[0]?.projectId || '');
  }

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!uploadFile || !projectId) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('projectId', projectId);
    formData.append('displayName', displayName || uploadFile.name);
    await fetch('/api/assets', { method: 'POST', body: formData });

    setUploadFile(null);
    setDisplayName('');
    loadData();
  }

  async function remove(assetId: string) {
    await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
    loadData();
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading assets...</div>;
  }

  return (
    <AppShell
      user={user}
      title="Asset Library"
      subtitle="Project-scoped files stored through Cloudinary and linked back into valuations and properties."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_1.8fr]">
        <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
          <h3 className="text-xl font-semibold">Upload asset</h3>
          <p className="mt-2 text-sm text-white/55">
            Choose the target project and upload a file into the connected Cloudinary bucket.
          </p>

          <form className="mt-6 space-y-4" onSubmit={upload}>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
            >
              {projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.name}
                </option>
              ))}
            </select>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="border-white/10 bg-slate-950/50 text-white"
              placeholder="Display name"
            />
            <Input
              type="file"
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
              className="border-white/10 bg-slate-950/50 text-white"
            />
            <Button type="submit" className="w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
              Upload
            </Button>
          </form>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <Card key={asset.assetId} className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
              <p className="text-lg font-semibold">{asset.displayName}</p>
              <p className="mt-2 text-sm text-white/55">
                {asset.status} • {asset.projectId}
              </p>
              {asset.tags?.length ? (
                <p className="mt-2 text-sm text-cyan-200">{asset.tags.join(', ')}</p>
              ) : null}
              <div className="mt-5 flex gap-3">
                <a
                  href={asset.secureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-2xl bg-white px-4 text-sm font-medium text-slate-950 hover:bg-slate-100"
                >
                  Open
                </a>
                <Button
                  variant="outline"
                  onClick={() => remove(asset.assetId)}
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
