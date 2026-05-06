'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Box,
  Download,
  Loader2,
  MousePointer2,
  Pencil,
  Ruler,
  Trash2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/modules/valuation-interior/hooks/useKeyboardShortcuts';
import { RoomDesignerEmbedded } from '@/modules/valuation-interior/components/editor/RoomDesignerEmbedded';
import { useFloorplanStore } from '@/modules/valuation-interior/store/floorplanStore';

type ValuationEmbeddedEditorProps = {
  address: string;
  propertyType: string;
  planName: string;
  initialPlanUrl: string;
  initialRunId?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  onReplacePlan: () => void;
};

type WorkerStatus = {
  available: boolean;
  detail: string;
  provider: string;
  workersOnline: number;
  checking: boolean;
};

function formatMeters(length: number) {
  if (!Number.isFinite(length) || length <= 0) return '';
  return length >= 10 ? length.toFixed(1) : length.toFixed(2);
}

function runStatusTone(status: 'idle' | 'processing' | 'completed' | 'failed') {
  if (status === 'completed') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
  if (status === 'processing') return 'border-amber-400/25 bg-amber-500/10 text-amber-100';
  if (status === 'failed') return 'border-rose-400/25 bg-rose-500/10 text-rose-100';
  return 'border-white/12 bg-white/6 text-slate-200';
}

function workerStatusTone(available: boolean) {
  return available
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-rose-400/25 bg-rose-500/10 text-rose-100';
}

export function ValuationEmbeddedEditor({
  address,
  propertyType,
  planName,
  initialPlanUrl,
  initialRunId,
  onReplacePlan,
}: ValuationEmbeddedEditorProps) {
  useKeyboardShortcuts();

  const resetFloorplan = useFloorplanStore((state) => state.resetFloorplan);
  const setUploadedImage = useFloorplanStore((state) => state.setUploadedImage);
  const setRunId = useFloorplanStore((state) => state.setRunId);
  const setRunStatus = useFloorplanStore((state) => state.setRunStatus);
  const setMode = useFloorplanStore((state) => state.setMode);
  const setActiveTool = useFloorplanStore((state) => state.setActiveTool);
  const setGlbPreviewSource = useFloorplanStore((state) => state.setGlbPreviewSource);
  const setWorkersOnline = useFloorplanStore((state) => state.setWorkersOnline);
  const triggerBlenderGeneration = useFloorplanStore((state) => state.triggerBlenderGeneration);
  const calibrate = useFloorplanStore((state) => state.calibrate);
  const showToast = useFloorplanStore((state) => state.showToast);
  const mode = useFloorplanStore((state) => state.mode);
  const activeTool = useFloorplanStore((state) => state.activeTool);
  const glbPreviewSource = useFloorplanStore((state) => state.glbPreviewSource);
  const currentRunId = useFloorplanStore((state) => state.currentRunId);
  const runStatus = useFloorplanStore((state) => state.runStatus);
  const selectedId = useFloorplanStore((state) => state.selectedId);
  const walls = useFloorplanStore((state) => state.walls);
  const isCalibrated = useFloorplanStore((state) => state.isCalibrated);
  const isGenerating3D = useFloorplanStore((state) => state.isGenerating3D);
  const toast = useFloorplanStore((state) => state.toast);

  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>({
    available: false,
    detail: 'Checking FloorplanToBlender worker availability...',
    provider: 'floorplan-to-blender',
    workersOnline: 0,
    checking: true,
  });
  const [runMessage, setRunMessage] = useState(
    'Load a floor plan, calibrate one wall, and generate a GLB preview.'
  );
  const [hasGeneratedGlb, setHasGeneratedGlb] = useState(false);
  const [calibrationMeters, setCalibrationMeters] = useState('');

  const selectedWall = useMemo(
    () => walls.find((wall) => wall.id === selectedId) || null,
    [selectedId, walls]
  );
  const selectedWallLength = useMemo(() => {
    if (!selectedWall) return null;
    return Math.hypot(
      selectedWall.end.x - selectedWall.start.x,
      selectedWall.end.y - selectedWall.start.y
    );
  }, [selectedWall]);

  useEffect(() => {
    let active = true;

    resetFloorplan();
    setRunId(initialRunId || null);
    setRunStatus('idle');
    setMode('2d');
    setActiveTool('wall');
    setGlbPreviewSource('none');
    setHasGeneratedGlb(false);
    setImageLoadError(null);
    setRunMessage(
      initialRunId
        ? 'Loading the latest valuation floor plan state...'
        : 'Load a floor plan, calibrate one wall, and generate a GLB preview.'
    );

    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!active) return;
      setImageLoadError(null);
      setUploadedImage(initialPlanUrl, image.naturalWidth, image.naturalHeight);
    };
    image.onerror = () => {
      if (!active) return;
      const errorMsg = `Failed to load plan image. The file at ${initialPlanUrl} may be invalid, inaccessible, or not a valid image format.`;
      console.error('[ValuationEmbeddedEditor] Image load error:', errorMsg);
      setUploadedImage(null);
      setImageLoadError(errorMsg);
    };
    image.src = initialPlanUrl;

    return () => {
      active = false;
    };
  }, [
    initialPlanUrl,
    initialRunId,
    resetFloorplan,
    setActiveTool,
    setGlbPreviewSource,
    setMode,
    setRunId,
    setRunStatus,
    setUploadedImage,
  ]);

  useEffect(() => {
    const pollWorkerStatus = async () => {
      try {
        const response = await fetch(`/api/system/status?t=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          throw new Error('Worker availability check failed.');
        }

        const nextWorkersOnline =
          typeof data.workers_online === 'number' ? data.workers_online : 0;
        setWorkersOnline(nextWorkersOnline);
        setWorkerStatus({
          available: Boolean(data.available),
          detail:
            typeof data.detail === 'string' && data.detail.trim()
              ? data.detail
              : 'Worker status is unavailable.',
          provider:
            typeof data.provider === 'string' && data.provider.trim()
              ? data.provider
              : 'floorplan-to-blender',
          workersOnline: nextWorkersOnline,
          checking: false,
        });
      } catch (error) {
        setWorkersOnline(0);
        setWorkerStatus({
          available: false,
          detail:
            error instanceof Error && error.message
              ? error.message
              : 'Worker availability check failed.',
          provider: 'floorplan-to-blender',
          workersOnline: 0,
          checking: false,
        });
      }
    };

    void pollWorkerStatus();
    const intervalId = window.setInterval(() => {
      void pollWorkerStatus();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [setWorkersOnline]);

  useEffect(() => {
    if (!selectedWallLength) return;
    setCalibrationMeters(formatMeters(selectedWallLength));
  }, [selectedWall?.id, selectedWallLength]);

  useEffect(() => {
    if (!currentRunId) {
      setHasGeneratedGlb(false);
      setRunMessage('Upload a project-backed floor plan to enable server-side 3D generation.');
      return;
    }

    let active = true;
    let intervalId: number | null = null;

    const syncRun = async () => {
      try {
        const response = await fetch(`/api/runs/${currentRunId}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          throw new Error('Failed to load floorplan run state.');
        }

        if (!active) return;

        const serverStatus = String(data.status || '').toUpperCase();
        const hasGlb = Boolean(data.outputs?.glb);
        setHasGeneratedGlb(hasGlb);

        if (serverStatus === 'PROCESSING') {
          setRunStatus('processing');
          setRunMessage(
            typeof data.message === 'string' && data.message.trim()
              ? data.message
              : 'Generating the updated 3D model...'
          );
          return;
        }

        if (serverStatus === 'FAILED') {
          setRunStatus('failed');
          setGlbPreviewSource('none');
          setRunMessage(
            typeof data.error === 'string' && data.error.trim()
              ? data.error
              : typeof data.message === 'string' && data.message.trim()
                ? data.message
                : '3D generation failed.'
          );
          return;
        }

        if (hasGlb) {
          setRunStatus('completed');
          if (mode === '3d') {
            setGlbPreviewSource('generated');
          }
          setRunMessage(
            typeof data.message === 'string' && data.message.trim()
              ? data.message
              : 'Generated GLB is ready to preview.'
          );
          return;
        }

        setRunStatus('idle');
        setGlbPreviewSource('none');
        setRunMessage(
          typeof data.message === 'string' && data.message.trim()
            ? data.message
            : 'Floorplan is ready for calibration, editing, and 3D generation.'
        );
      } catch (error) {
        if (!active) return;
        setRunMessage(
          error instanceof Error && error.message
            ? error.message
            : 'Failed to load floorplan run state.'
        );
      }
    };

    void syncRun();

    if (runStatus === 'processing') {
      intervalId = window.setInterval(() => {
        void syncRun();
      }, 4000);
    }

    return () => {
      active = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [currentRunId, mode, runStatus, setGlbPreviewSource, setRunStatus]);

  const toolButtons = [
    {
      key: 'select',
      label: 'Select',
      icon: MousePointer2,
      active: activeTool === 'select',
      onClick: () => {
        setMode('2d');
        setActiveTool('select');
      },
    },
    {
      key: 'wall',
      label: 'Draw Walls',
      icon: Pencil,
      active: activeTool === 'wall',
      onClick: () => {
        setMode('2d');
        setActiveTool('wall');
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      active: activeTool === 'delete',
      onClick: () => {
        setMode('2d');
        setActiveTool('delete');
      },
    },
    {
      key: 'ruler',
      label: 'Calibrate',
      icon: Ruler,
      active: activeTool === 'ruler',
      onClick: () => {
        setMode('2d');
        setActiveTool('ruler');
      },
    },
  ] as const;

  const persistCalibration = async () => {
    const state = useFloorplanStore.getState();
    if (!state.currentRunId) return;

    const response = await fetch(`/api/runs/${state.currentRunId}/meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scale: state.exportScale || state.calibrationFactor,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to synchronize the calibrated scale.');
    }
  };

  const handleCalibrationSubmit = async () => {
    if (!selectedWall) {
      showToast('Select a wall before entering the real-world length.', 'error');
      return;
    }

    const realLength = Number(calibrationMeters);
    if (!Number.isFinite(realLength) || realLength <= 0) {
      showToast('Enter a valid wall length in meters.', 'error');
      return;
    }

    calibrate(selectedWall.id, realLength);
    setActiveTool('select');

    try {
      await persistCalibration();
      showToast('Calibration saved.', 'success');
      setRunMessage(`Scale updated using a ${realLength} m wall reference.`);
    } catch {
      showToast('Calibration applied locally, but scale sync failed.', 'error');
    }
  };

  const handleGenerate = async () => {
    if (!currentRunId) {
      showToast('This floor plan is not attached to a saved run yet.', 'error');
      return;
    }
    if (!isCalibrated) {
      showToast('Calibrate one wall before generating the 3D model.', 'error');
      return;
    }
    if (!workerStatus.available) {
      showToast(workerStatus.detail, 'error');
      return;
    }

    setMode('3d');
    setGlbPreviewSource('none');
    setRunMessage('Syncing the edited floor plan and starting FloorplanToBlender...');
    await triggerBlenderGeneration(['glb']);
  };

  const open3DPreview = () => {
    setMode('3d');
    setGlbPreviewSource(runStatus === 'completed' && hasGeneratedGlb ? 'generated' : 'none');
  };

  const downloadEnabled = Boolean(hasGeneratedGlb && currentRunId && runStatus !== 'processing');

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.78),rgba(2,6,23,1)_58%)] text-white">
      <div className="border-b border-white/10 bg-slate-950/72 px-4 py-4 backdrop-blur xl:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
              Valuation Interior
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-white">{planName}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              {propertyType} · {address}. Edit the 2D floor plan, calibrate one wall, then
              generate a browser preview of the GLB created by FloorplanToBlender.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('2d');
                setGlbPreviewSource('none');
              }}
              className={cn(
                'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition',
                mode === '2d'
                  ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-50'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              )}
            >
              2D Edit
            </button>
            <button
              type="button"
              onClick={open3DPreview}
              className={cn(
                'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition',
                mode === '3d'
                  ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-50'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              )}
            >
              3D Preview
            </button>
            <button
              type="button"
              onClick={onReplacePlan}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-white/10"
            >
              <Upload className="h-3.5 w-3.5" />
              Replace Plan
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isGenerating3D || runStatus === 'processing' || !workerStatus.available}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#031006] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating3D || runStatus === 'processing' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Box className="h-3.5 w-3.5" />
              )}
              Generate 3D
            </button>
            <a
              href={downloadEnabled ? `/api/runs/${currentRunId}/download/glb` : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition',
                downloadEnabled
                  ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                  : 'pointer-events-none border-white/10 bg-white/5 text-slate-500 opacity-50'
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Download GLB
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 bg-slate-950/55 px-4 py-3 backdrop-blur xl:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {toolButtons.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.key}
                  type="button"
                  onClick={tool.onClick}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition',
                    tool.active
                      ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-50'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tool.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 xl:min-w-[34rem] xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Calibration
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">
                    {selectedWall
                      ? `Selected wall length in editor: ${formatMeters(selectedWallLength || 0)} m`
                      : 'Select a wall, then enter its real-world length in meters.'}
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={calibrationMeters}
                    onChange={(event) => setCalibrationMeters(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/35"
                    placeholder="Wall length in meters"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleCalibrationSubmit()}
                  disabled={!selectedWall}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Scale
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  'rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]',
                  workerStatusTone(workerStatus.available)
                )}
              >
                {workerStatus.checking
                  ? 'Checking worker...'
                  : `${workerStatus.provider} · ${workerStatus.workersOnline > 0 ? 'online' : 'offline'}`}
              </div>
              <div
                className={cn(
                  'rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]',
                  runStatusTone(runStatus)
                )}
              >
                Run · {runStatus}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <p className="font-medium text-white">Workflow status</p>
            <p className="mt-1 leading-6 text-slate-300">{runMessage}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 xl:max-w-md">
            <p className="font-medium text-white">Worker detail</p>
            <p className="mt-1 leading-6">{workerStatus.detail}</p>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 p-3 xl:p-4">
        <div className="relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.92),rgba(2,6,23,0.98)_65%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(2,6,23,0.75))] shadow-[0_35px_120px_rgba(2,6,23,0.55)]">
          <RoomDesignerEmbedded />

          {mode === '3d' && glbPreviewSource === 'none' ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/76 px-6 text-center backdrop-blur-sm">
              <div className="max-w-xl rounded-[32px] border border-white/10 bg-slate-950/90 p-8 shadow-2xl">
                {runStatus === 'processing' ? (
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-200" />
                ) : (
                  <AlertCircle className="mx-auto h-10 w-10 text-cyan-200" />
                )}
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {runStatus === 'processing'
                    ? 'Generating the updated GLB'
                    : runStatus === 'failed'
                      ? '3D generation needs attention'
                      : 'Generate a GLB from the edited floor plan'}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{runMessage}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{workerStatus.detail}</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('2d');
                      setGlbPreviewSource('none');
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Back to 2D
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating3D || runStatus === 'processing' || !workerStatus.available}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/85 px-4 py-2 text-sm font-semibold text-[#031006] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {runStatus === 'processing' ? 'Generating...' : 'Generate 3D'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {imageLoadError ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/82 px-6 py-4 text-center">
              <div className="rounded-3xl border border-rose-400/25 bg-rose-500/10 p-6 text-white shadow-xl backdrop-blur-md">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-200">
                  Plan load error
                </p>
                <p className="mt-2 text-sm leading-6 text-white/90">{imageLoadError}</p>
                <p className="mt-3 text-xs text-rose-100/80">
                  Replace the plan or verify that the image URL is still accessible.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 px-4">
          <div
            className={cn(
              'rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur',
              toast.type === 'success'
                ? 'border-emerald-400/25 bg-emerald-500/15 text-emerald-100'
                : toast.type === 'error'
                  ? 'border-rose-400/25 bg-rose-500/15 text-rose-100'
                  : 'border-cyan-400/20 bg-slate-950/80 text-cyan-100'
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
