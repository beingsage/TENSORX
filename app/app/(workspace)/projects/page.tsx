'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, FolderKanban, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/workspace/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSessionUser } from '@/hooks/use-session-user';

type Project = {
  projectId: string;
  name: string;
  description?: string;
  city?: string;
  status: string;
  updatedAt: string;
};

export default function ProjectsPage() {
  const { user, loading } = useSessionUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', city: '', description: '' });

  async function loadProjects() {
    const response = await fetch('/api/projects', { cache: 'no-store' });
    const payload = await response.json();
    setProjects(payload?.data?.projects || []);
  }

  useEffect(() => {
    if (!user) return;
    loadProjects();
  }, [user]);

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setFormData({ name: '', city: '', description: '' });
    setSaving(false);
    loadProjects();
  }

  async function deleteProject(projectId: string) {
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    loadProjects();
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading projects...</div>;
  }

  return (
    <AppShell
      user={user}
      title="Projects"
      subtitle="Create portfolio workspaces and keep properties, assets, and valuations scoped to a real user-owned project."
      actions={
        <Link href="/valuations/new">
          <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
            New Valuation
          </Button>
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.7fr]">
        <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-300/15 p-3 text-amber-100">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Create project</h3>
              <p className="text-sm text-white/55">Start a new workspace for a borrower, portfolio, or deal.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={createProject}>
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="border-white/10 bg-slate-950/50 text-white"
                placeholder="South Delhi collateral pool"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-city">City</Label>
              <Input
                id="project-city"
                value={formData.city}
                onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))}
                className="border-white/10 bg-slate-950/50 text-white"
                placeholder="Delhi NCR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
                className="min-h-28 border-white/10 bg-slate-950/50 text-white"
                placeholder="Borrower context, underwriting scope, or portfolio notes"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
            >
              {saving ? 'Creating...' : 'Create project'}
            </Button>
          </form>
        </Card>

        <div className="grid gap-4">
          {projects.length === 0 ? (
            <Card className="rounded-[28px] border border-dashed border-white/15 bg-white/6 p-8 text-white/60">
              No projects yet. Create the first one to begin attaching properties and assets.
            </Card>
          ) : (
            projects.map((project) => (
              <Card key={project.projectId} className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-white/10 p-3">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold">{project.name}</h3>
                        <p className="text-sm text-white/55">
                          {project.city || 'Location pending'} • {project.status}
                        </p>
                      </div>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-white/65">
                      {project.description || 'No description provided yet.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/projects/${project.projectId}`}>
                      <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
                        Open project <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => deleteProject(project.projectId)}
                      className="rounded-2xl border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
