'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Download,
  Image,
  Layers3,
  Map,
  Share2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ValuationDetailReport } from '@/lib/valuation/report';

const MapVisualization = dynamic(
  () => import('./MapVisualization').then((module) => module.MapVisualization),
  { loading: () => <PanelSkeleton label="Loading spatial canvas" className="min-h-[640px]" /> }
);

const ExteriorMediaViewport = dynamic(
  () =>
    import('./ExteriorMediaViewport').then((module) => module.ExteriorMediaViewport),
  { loading: () => <PanelSkeleton label="Loading exterior stage" className="min-h-[640px]" /> }
);

const ExteriorMediaTab = dynamic(
  () =>
    import('./ExteriorMediaTab').then((module) => module.ExteriorMediaTab),
  { loading: () => <PanelSkeleton label="Loading exterior media" className="min-h-[640px]" /> }
);

const ValuationInteriorEditorTab = dynamic(
  () =>
    import('./ValuationInteriorEditorTab').then(
      (module) => module.ValuationInteriorEditorTab
    ),
  { loading: () => <PanelSkeleton label="Loading interior editor" className="min-h-[640px]" /> }
);

type WorkspaceView = 'map' | 'exterior' | 'interior' | 'layers';
type LeftRailSection = 'manage' | 'data' | 'media' | 'sources';
type RightRailSection = 'analysis' | 'market' | 'diagnostics' | 'charts';

function PanelSkeleton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[1.6rem] border border-white/10 bg-[#08120c] p-5 text-[#d6e7d2]',
        className
      )}
    >
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-36 rounded bg-white/8" />
        <div className="h-28 rounded-[1.2rem] bg-white/6" />
        <p className="text-sm text-[#a7b9a3]">{label}...</p>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatFullCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function riskTone(score: number) {
  if (score >= 70) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function riskBadgeClass(level: string) {
  if (level === 'critical' || level === 'high') return 'tag-risk';
  if (level === 'medium') return 'tag-confidence';
  return 'tag-driver';
}

function workerStatusClass(status: string) {
  if (status === 'down') return 'tag-risk';
  if (status === 'degraded' || status === 'unconfigured')
    return 'tag-confidence';
  return 'tag-driver';
}

function railTabClass(active: boolean) {
  return cn(
    'border px-3 py-1.5 font-[family-name:var(--font-data)] text-[11px] font-semibold uppercase tracking-[0.08em] transition',
    active
      ? 'border-[var(--outline-variant)] bg-[var(--surface-bright)] text-[var(--primary)]'
      : 'border-[var(--outline-variant)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:border-[var(--outline)] hover:text-[var(--on-surface)]'
  );
}

function summaryTone(score: number) {
  if (score >= 75) return 'text-[var(--error)]';
  if (score >= 55) return 'text-[var(--primary)]';
  return 'text-[var(--success)]';
}

function AnimatedCurrency({
  value,
  compact = true,
}: {
  value: number;
  compact?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplayValue(value);
      return;
    }

    const startedAt = performance.now();
    const duration = 1800;
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return <>{compact ? formatCurrency(displayValue) : formatFullCurrency(displayValue)}</>;
}

function PrimaryValuationCard({
  lowerBound,
  upperBound,
  pointEstimate,
  confidence,
  method,
}: {
  lowerBound: number;
  upperBound: number;
  pointEstimate: number;
  confidence: number;
  method: string;
}) {
  const confidencePercent = Math.round(confidence * 100);
  const midpoint = (lowerBound + upperBound) / 2;
  const delta = lowerBound > 0 ? ((pointEstimate - lowerBound) / lowerBound) * 100 : 0;

  return (
    <div className="surface-grain primary-accent-card card-stagger p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="metadata-label">Estimated Market Value</p>
          <div
            data-metric-value
            className="mt-3 font-[family-name:var(--font-heading)] text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.05] text-[var(--primary)]"
          >
            <AnimatedCurrency value={lowerBound} compact={false} />
            <span className="mx-2 text-[var(--on-surface-variant)]">-</span>
            <AnimatedCurrency value={upperBound} compact={false} />
          </div>
        </div>
        <Badge className="tag-confidence">{method}</Badge>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--surface-container-high)]">
          <div className="range-fill h-full w-full rounded-[var(--radius-full)] bg-[linear-gradient(to_right,rgba(255,181,149,0.3),var(--primary),rgba(255,181,149,0.3))]" />
        </div>
        <div className="mt-2 flex items-center justify-between font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
          <span>{formatCurrency(lowerBound)}</span>
          <span>Mid {formatCurrency(midpoint)}</span>
          <span>{formatCurrency(upperBound)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="metadata-label">Confidence Score</span>
            <span data-slot="progress-value" className="text-lg font-semibold text-[var(--on-surface)]">
              {confidence.toFixed(2)}
            </span>
          </div>
          <Progress value={confidencePercent} />
        </div>
        <div className="border-l border-[var(--outline-variant)] pl-4">
          <p className="metadata-label">Point Estimate</p>
          <p data-metric-value className="mt-1 text-xl font-semibold text-[var(--on-surface)]">
            <AnimatedCurrency value={pointEstimate} />
          </p>
          <p className="mt-2 font-[family-name:var(--font-data)] text-xs text-[var(--success)]">
            ▲ {delta.toFixed(1)}% above lower confidence bound
          </p>
        </div>
      </div>
    </div>
  );
}

export function ValuationResultsWorkspace({
  report,
}: {
  report: ValuationDetailReport;
}) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>('map');
  const [leftExpanded, setLeftExpanded] = useState(true);
  const [rightExpanded, setRightExpanded] = useState(true);
  const [leftSection, setLeftSection] = useState<LeftRailSection>('manage');
  const [rightSection, setRightSection] = useState<RightRailSection>('analysis');
  const [focusMode, setFocusMode] = useState(false);

  const exportJsonUrl = `/api/export?format=json&valuationId=${report.valuation.valuationId}`;
  const exportCsvUrl = `/api/export?format=csv&valuationId=${report.valuation.valuationId}`;
  const exportPdfUrl = `/api/export?format=pdf&valuationId=${report.valuation.valuationId}`;
  const fraudLevel =
    report.valuation.fraudAnalysis?.riskLevel ||
    riskTone(report.diagnostics.overallRiskScore);
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date(report.valuation.timestamp));

  const autosaveLabel = autosaveStatus === 'saving'
    ? 'Saving...'
    : `Autosaved at ${lastSaved.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`;

  useEffect(() => {
    const handler = setTimeout(() => {
      setAutosaveStatus('saving');
      fetch(`/api/valuations/${report.valuation.valuationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceContext: { activeView, leftExpanded, rightExpanded, leftSection, rightSection, focusMode }
        }),
      }).finally(() => {
        setAutosaveStatus('saved');
        setLastSaved(new Date());
      });
    }, 2000);
    return () => clearTimeout(handler);
  }, [activeView, leftExpanded, rightExpanded, leftSection, rightSection, focusMode, report.valuation.valuationId]);
  const layoutReconstruction = report.property.reconstruction?.layout;
  const exteriorReconstruction = report.property.reconstruction?.exterior;
  const pipelineWarnings = report.valuation.pipelineWarnings || [];
  const workerStatuses = report.valuation.workerStatus || [];
  const demandSignal = Math.round(report.market.summary.demandIndex ?? 0);
  const liquidityIndex = report.valuation.liquidity.resalePotentialIndex;
  const infrastructureNote =
    report.immersive.spatialContext?.amenities?.[0]?.name || 'Transit proximity active';
  const layersAnalysisMode = activeView === 'layers';
  const immersiveMediaMode = activeView === 'exterior' || activeView === 'interior';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLeftExpanded(false);
      setRightExpanded(false);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'tenzorx-print-styles';
    style.textContent = `
      @media print {
        body > *:not(#__next) { display: none !important; }
        #__next > *:not(#tenzorx-print-root) { display: none !important; }
        #tenzorx-print-view { display: block !important; }
        @page { margin: 20mm; size: A4 portrait; }
      }
    `;
    if (!document.getElementById('tenzorx-print-styles')) {
      document.head.appendChild(style);
    }
    return () => {
      document.getElementById('tenzorx-print-styles')?.remove();
    };
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: `${report.property.address} valuation`,
      text: `Valuation ${report.valuation.valuationId} for ${report.property.address}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback('Shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setShareFeedback('Link copied');
      } else {
        setShareFeedback('Share unavailable');
      }
    } catch {
      setShareFeedback('Share cancelled');
    }

    window.setTimeout(() => setShareFeedback(null), 2000);
  };

  const viewActions: Record<
    WorkspaceView,
    Array<{ label: string; onClick: () => void; active?: boolean }>
  > = {
    map: [
      {
        label: focusMode ? 'Restore rails' : 'Focus canvas',
        onClick: () => setFocusMode((current) => !current),
        active: focusMode,
      },
      {
        label: 'Analysis rail',
        onClick: () => {
          setRightSection('analysis');
          setRightExpanded(true);
        },
      },
      {
        label: 'Layer stack',
        onClick: () => setActiveView('layers'),
      },
      {
        label: 'Data sources',
        onClick: () => {
          setLeftSection('sources');
          setLeftExpanded(true);
        },
      },
    ],
    exterior: [
      {
        label: focusMode ? 'Restore rails' : 'Focus stage',
        onClick: () => setFocusMode((current) => !current),
        active: focusMode,
      },
      {
        label: 'Media inventory',
        onClick: () => {
          setLeftSection('media');
          setLeftExpanded(true);
        },
      },
      {
        label: 'Diagnostics',
        onClick: () => {
          setRightSection('diagnostics');
          setRightExpanded(true);
        },
      },
      {
        label: 'Interior swap',
        onClick: () => setActiveView('interior'),
      },
    ],
    interior: [
      {
        label: focusMode ? 'Restore rails' : 'Focus builder',
        onClick: () => setFocusMode((current) => !current),
        active: focusMode,
      },
      {
        label: 'Layout asset',
        onClick: () => {
          setLeftSection('media');
          setLeftExpanded(true);
        },
      },
      {
        label: 'Property charts',
        onClick: () => {
          setRightSection('charts');
          setRightExpanded(true);
        },
      },
      {
        label: 'Exterior swap',
        onClick: () => setActiveView('exterior'),
      },
    ],
    layers: [
      {
        label: focusMode ? 'Restore rails' : 'Focus layers',
        onClick: () => setFocusMode((current) => !current),
        active: focusMode,
      },
      {
        label: 'Market rail',
        onClick: () => {
          setRightSection('market');
          setRightExpanded(true);
        },
      },
      {
        label: 'Data points',
        onClick: () => {
          setLeftSection('data');
          setLeftExpanded(true);
        },
      },
      {
        label: 'Back to map',
        onClick: () => setActiveView('map'),
      },
    ],
  };

  function renderMapView() {
    return (
      <div className="w-full h-full relative">
        <MapVisualization
          key="valuation-map"
          latitude={report.immersive.latitude}
          longitude={report.immersive.longitude}
          propertyType={report.immersive.propertyType}
          address={report.immersive.address}
          spatialContext={report.immersive.spatialContext}
          demandSignal={demandSignal}
          liquidityIndex={liquidityIndex}
          infrastructureNote={infrastructureNote}
          insightText="Demand and connectivity signal drive the valuation anchor."
        />
      </div>
    );
  }

  function renderExteriorView() {
    return (
      <div className="relative h-full w-full">
        <ExteriorMediaTab
          projectId={report.property.projectId}
          propertyId={report.property.propertyId}
          assets={report.media.exteriorAssets}
          previewUrl={report.property.reconstruction?.exterior?.previewUrl}
        />
      </div>
    );
  }

  function renderInteriorView() {
    return (
      <ValuationInteriorEditorTab
        projectId={report.property.projectId}
        propertyId={report.property.propertyId}
        propertyType={report.property.propertyType}
        address={report.property.address}
        bedrooms={report.property.bedroomCount || report.property.bedrooms}
        bathrooms={report.property.bathroomCount || report.property.bathrooms}
        assetIds={report.property.assetIds}
        layoutAssetIds={report.property.layoutAssetIds}
        initialLayoutAsset={report.media.layoutAsset}
        initialLayoutRun={report.property.reconstruction?.layout}
      />
    );
  }

  function renderLayersView() {
    return (
      <div className="relative w-full h-full">
        <MapVisualization
          key="valuation-layers-map"
          latitude={report.immersive.latitude}
          longitude={report.immersive.longitude}
          propertyType={report.immersive.propertyType}
          address={report.immersive.address}
          spatialContext={report.immersive.spatialContext}
          demandSignal={demandSignal}
          liquidityIndex={liquidityIndex}
          infrastructureNote={infrastructureNote}
          insightText="Toggle overlay layers to reveal flood, traffic, and environment risk on the map."
          analysisMode
        />
      </div>
    );
  }

  function renderMainCanvas() {
    if (activeView === 'map') return renderMapView();
    if (activeView === 'exterior') return renderExteriorView();
    if (activeView === 'interior') return renderInteriorView();
    return renderLayersView();
  }

  function renderLeftRailContent() {
    const propertyDataRows = [
      ['Bedrooms', `${report.property.bedroomCount || report.property.bedrooms || '-'}`],
      ['Bathrooms', `${report.property.bathroomCount || report.property.bathrooms || '-'}`],
      ['Built-up area', `${report.property.builtupArea} sqft`],
      ['Land / plot', `${report.property.landArea || report.property.plotArea || 0} sqft`],
      ['Age', `${report.property.ageInYears} years`],
      ['Facing', report.property.facing || 'Not tagged'],
      ['Occupancy', report.property.occupancyStatus],
      ['Construction', report.property.constructionQuality],
      ['Ownership', report.property.isFreehold ? 'Freehold' : 'Lease / other'],
      ['Legal status', report.property.legalStatus],
      ['Mortgage', report.property.mortgageStatus],
      ['Coordinates', `${report.property.latitude.toFixed(5)}, ${report.property.longitude.toFixed(5)}`],
    ];

    return (
      <div className="flex h-full flex-col">
        <div className=" px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#7bf29b]/75">
            Manage
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={railTabClass(leftSection === 'manage')}
              onClick={() => setLeftSection('manage')}
            >
              shell
            </button>
            <button
              type="button"
              className={railTabClass(leftSection === 'data')}
              onClick={() => setLeftSection('data')}
            >
              data
            </button>
            <button
              type="button"
              className={railTabClass(leftSection === 'media')}
              onClick={() => setLeftSection('media')}
            >
              media
            </button>
            <button
              type="button"
              className={railTabClass(leftSection === 'sources')}
              onClick={() => setLeftSection('sources')}
            >
              sources
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {leftSection === 'manage' ? (
            <div className="space-y-4">
              <SurfaceCard
                eyebrow="Workspace"
                title={report.property.propertyId}
                description="Route the center canvas and side rails without losing the current valuation data."
              >
                <div className="grid gap-3">
                  <DockShortcut
                    label="Map canvas"
                    icon={<Map className="h-4 w-4" />}
                    note="Parcel, amenities, and layers"
                    onClick={() => setActiveView('map')}
                    active={activeView === 'map'}
                  />
                  <DockShortcut
                    label="Exterior stage"
                    icon={<Box className="h-4 w-4" />}
                    note="NeRFstudio job and uploaded outside imagery"
                    onClick={() => setActiveView('exterior')}
                    active={activeView === 'exterior'}
                  />
                  <DockShortcut
                    label="Interior builder"
                    icon={<Image className="h-4 w-4" />}
                    note="noidea layout reconstruction"
                    onClick={() => setActiveView('interior')}
                    active={activeView === 'interior'}
                  />
                  <DockShortcut
                    label="Layer stack"
                    icon={<Layers3 className="h-4 w-4" />}
                    note="Climate, environment, and demographic overlays"
                    onClick={() => setActiveView('layers')}
                    active={activeView === 'layers'}
                  />
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow="Reconstruction hooks"
                title="Current pipeline handles"
                description="Existing reconstruction metadata already attached to this property."
              >
                <div className="space-y-3 text-sm text-[#d6e7d2]">
                  <SummaryRow
                    label="Exterior"
                    value={`${exteriorReconstruction?.status || 'not started'} · ${exteriorReconstruction?.jobId || exteriorReconstruction?.runId || 'no job id'}`}
                  />
                  <SummaryRow
                    label="Interior"
                    value={`${layoutReconstruction?.status || 'not started'} · ${layoutReconstruction?.runId || 'no run id'}`}
                  />
                  <SummaryRow
                    label="Asset counts"
                    value={`${report.media.exteriorAssets.length} exterior · ${report.media.layoutAsset ? 1 : 0} layout · ${report.media.legalDocuments.length} legal`}
                  />
                </div>
              </SurfaceCard>
            </div>
          ) : null}

          {leftSection === 'data' ? (
            <div className="space-y-3">
              {propertyDataRows.map(([label, value]) => (
                <DataRow key={label} label={label} value={value} />
              ))}
            </div>
          ) : null}

          {leftSection === 'media' ? (
            <div className="space-y-4">
              <SurfaceCard
                eyebrow="Exterior"
                title={`${report.media.exteriorAssets.length} uploaded asset${report.media.exteriorAssets.length === 1 ? '' : 's'}`}
                description="Used by the exterior reconstruction stage."
              >
                <div className="space-y-2">
                  {report.media.exteriorAssets.length === 0 ? (
                    <p className="text-sm text-[#9fb29d]">No exterior assets attached.</p>
                  ) : (
                    report.media.exteriorAssets.map((asset) => (
                      <DataRow key={asset.assetId} label={asset.displayName} value={asset.mimeType} />
                    ))
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow="Layout"
                title={report.media.layoutAsset?.displayName || 'No layout uploaded'}
                description="The floor plan asset currently backing the interior tab."
              >
                <SummaryRow
                  label="Asset id"
                  value={report.media.layoutAsset?.assetId || 'missing'}
                />
              </SurfaceCard>

              <SurfaceCard
                eyebrow="Legal docs"
                title={`${report.media.legalDocuments.length} linked document${report.media.legalDocuments.length === 1 ? '' : 's'}`}
                description="Document summaries and warnings stay attached to the valuation."
              >
                <div className="space-y-3">
                  {report.media.legalDocuments.length === 0 ? (
                    <p className="text-sm text-[#9fb29d]">No legal documents attached.</p>
                  ) : (
                    report.media.legalDocuments.map((document, index) => (
                      <div
                        key={`${document.assetId || document.displayName}-${index}`}
                        className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3"
                      >
                        <p className="text-sm font-semibold text-white">{document.displayName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#7bf29b]/75">
                          {document.category}
                        </p>
                        {document.summary ? (
                          <p className="mt-2 text-sm text-[#d2e3cf]">{document.summary}</p>
                        ) : null}
                        {document.warnings.length ? (
                          <p className="mt-2 text-xs text-[#ffcf94]">
                            {document.warnings.join(' · ')}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </SurfaceCard>
            </div>
          ) : null}

          {leftSection === 'sources' ? (
            <div className="space-y-4">
              <SurfaceCard
                eyebrow="Upstream feeds"
                title="Connected data sources"
                description="These are already contributing to the active valuation."
              >
                <div className="space-y-3">
                  {report.immersive.dataSources.map((source) => (
                    <div
                      key={source.name}
                      className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3"
                    >
                      <p className="text-sm font-semibold text-white">{source.name}</p>
                      <p className="mt-1 text-sm text-[#d0e3ce]">{source.detail}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow="Worker health"
                title={`${report.valuation.workerStatus?.length || 0} model worker${(report.valuation.workerStatus?.length || 0) === 1 ? '' : 's'}`}
                description="Runtime status captured with this valuation."
              >
                <div className="space-y-3">
                  {(report.valuation.workerStatus || []).length === 0 ? (
                    <p className="text-sm text-[#9fb29d]">No worker telemetry was attached.</p>
                  ) : (
                    (report.valuation.workerStatus || []).map((worker) => (
                      <div
                            key={worker.id}
                            className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{worker.name}</p>
                          <Badge className={workerStatusClass(worker.status)}>
                            {worker.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-[#d0e3ce]">{worker.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </SurfaceCard>

              {report.valuation.pipelineWarnings?.length ? (
                <SurfaceCard
                  eyebrow="Pipeline warnings"
                  title="Degraded dependencies"
                  description="The valuation completed, but some external workers were not fully healthy."
                >
                  <div className="space-y-2 text-sm text-[#ffd8b8]">
                    {report.valuation.pipelineWarnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                </SurfaceCard>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderRightRailContent() {
    const confidencePercent = Math.round(report.valuation.valuation.confidence * 100);
    const riskScore = report.diagnostics.overallRiskScore;
    const riskLevel = riskTone(riskScore);
    const marketSummary =
      report.market.summary.demandIndex >= report.market.summary.supplyIndex
        ? 'Demand is ahead of supply, supporting resale depth.'
        : 'Supply pressure is elevated, so liquidity needs monitoring.';
    const rightTabs: Array<{ key: RightRailSection; label: string }> = [
      { key: 'analysis', label: 'analysis' },
      { key: 'market', label: 'market' },
      { key: 'diagnostics', label: 'risks' },
      { key: 'charts', label: 'drivers' },
    ];

    return (
      <div className="flex h-full flex-col bg-[#050805]">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#7bf29b]/75">
            Context Panel
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {rightTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={railTabClass(rightSection === tab.key)}
                onClick={() => setRightSection(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="border border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
            <ContextLine
              label="Value range"
              value={`${formatCurrency(report.valuation.valuation.lowerBound)} - ${formatCurrency(report.valuation.valuation.upperBound)}`}
              note={`Point ${formatCurrency(report.valuation.valuation.pointEstimate)}`}
            />
            <ContextLine
              label="Confidence"
              value={`${confidencePercent}%`}
              note={`${report.valuation.valuation.estimationMethod || 'Model'} score ${report.valuation.valuation.confidence.toFixed(2)}`}
            />
            <ContextLine
              label="Risk score"
              value={`${riskScore}/100`}
              note={riskLevel}
              valueClassName={summaryTone(riskScore)}
            />
            <ContextLine
              label="Market summary"
              value={`${report.market.summary.demandIndex}/${report.market.summary.supplyIndex}`}
              note={marketSummary}
            />
          </div>

          {rightSection === 'analysis' ? (
            <div className="mt-4 space-y-2">
              <SummaryRow
                label="Liquidity"
                value={`${report.valuation.liquidity.resalePotentialIndex}/100`}
              />
              <SummaryRow
                label="Time to sell"
                value={`${report.valuation.liquidity.estimatedTimeToSell} days`}
              />
              <SummaryRow
                label="Distress discount"
                value={`${((1 - report.valuation.liquidity.distressDiscount) * 100).toFixed(0)}%`}
              />
            </div>
          ) : null}

          {rightSection === 'market' ? (
            <div className="mt-4 space-y-2">
              <SummaryRow
                label="Avg days on market"
                value={`${report.market.summary.avgDaysOnMarket} days`}
              />
              <SummaryRow
                label="Absorption"
                value={`${(report.market.summary.absorptionRate * 100).toFixed(0)}%`}
              />
              <SummaryRow
                label="YoY growth"
                value={`${(report.market.summary.priceGrowthYoY * 100).toFixed(1)}%`}
                valueClassName="text-[var(--success)]"
              />
            </div>
          ) : null}

          {rightSection === 'diagnostics' ? (
            <div className="mt-4 space-y-3">
              {report.valuation.riskFlags.length === 0 ? (
                <p className="border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-3 py-3 text-sm text-[var(--on-surface-variant)]">
                  No lender-facing risk flags were attached to this valuation.
                </p>
              ) : (
                report.valuation.riskFlags.slice(0, 4).map((flag) => (
                  <div
                    key={flag.flag}
                    className="border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--on-surface)]">{flag.flag}</p>
                      <Badge className={riskBadgeClass(flag.severity)}>{flag.severity}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-[var(--on-surface-variant)]">
                      {flag.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {rightSection === 'charts' ? (
            <div className="mt-4 space-y-2">
              {report.valuation.explanation.topDrivers.slice(0, 5).map((driver) => (
                <SummaryRow
                  key={driver.feature}
                  label={driver.feature}
                  value={`${driver.direction === 'positive' ? '+' : '-'}${Math.abs(driver.contribution).toFixed(2)}`}
                  valueClassName={driver.direction === 'positive' ? 'text-[var(--success)]' : 'text-[var(--error)]'}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div id="tenzorx-print-root" className="terminal-grid min-h-screen text-[var(--on-surface)]">
      <div className="mx-auto max-w-[1880px] px-3 py-3 lg:px-5 lg:py-5">
        <div className="surface-grain page-enter relative flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] lg:h-[calc(100vh-2.5rem)]">
          <div className="terminal-grid absolute inset-0 opacity-100" />

          <header className="relative z-20 border-b border-[var(--outline-variant)] py-4">
            <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-center gap-3">
                <Link href="/valuations">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border border-[var(--outline-variant)] bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] hover:text-[var(--primary)]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <p className="metadata-label">
                    Autosave
                  </p>
                  <p className="mt-1 text-sm text-[var(--on-surface)]">Live · {autosaveLabel}</p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex flex-wrap items-center justify-center gap-2 border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-1.5">
                  {(['map', 'exterior', 'interior', 'layers'] as WorkspaceView[]).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={cn(
                        'border px-4 py-2 text-sm font-semibold transition',
                        activeView === view
                          ? 'border-[var(--outline-variant)] bg-[var(--surface-bright)] text-[var(--primary)]'
                          : 'border-transparent text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]'
                      )}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                <Button
                  variant="outline"
                  onClick={handleShare}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {shareFeedback || 'Share'}
                </Button>
                <Button
                  asChild
                  variant="outline"
                >
                  <a href={exportCsvUrl}>
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={exportPdfUrl} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </a>
                </Button>
                <SystemHealthDot />
              </div>
            </div>
          </header>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
            {!layersAnalysisMode && !immersiveMediaMode ? (
              <div className=" lg:hidden">
                {renderLeftRailContent()}
              </div>
            ) : null}

            <motion.aside
              initial={false}
              animate={{
                width:
                  focusMode || layersAnalysisMode || immersiveMediaMode
                    ? 0
                    : leftExpanded
                      ? 320
                      : 78,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="relative z-20 hidden border-r border-[#27cf6c]/45 bg-black/18 backdrop-blur lg:flex overflow-hidden shrink-0"
              onMouseEnter={() => setLeftExpanded(true)}
              onMouseLeave={() => setLeftExpanded(false)}
              onFocusCapture={() => setLeftExpanded(true)}
              onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                  setLeftExpanded(false);
                }
              }}
            >
              {leftExpanded ? (
                renderLeftRailContent()
              ) : (
                <div className="flex h-full w-full flex-col items-center py-4">
                  <button
                    type="button"
                    onClick={() => setLeftExpanded(true)}
                    className="rounded-full border border-[#27cf6c]/40 bg-[#0c1a10] p-2 text-[#aef8bd]"
                  >
                    <Wrench className="h-4 w-4" />
                  </button>
                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      className={railTabClass(leftSection === 'manage')}
                      onClick={() => {
                        setLeftSection('manage');
                        setLeftExpanded(true);
                      }}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={railTabClass(leftSection === 'data')}
                      onClick={() => {
                        setLeftSection('data');
                        setLeftExpanded(true);
                      }}
                    >
                      D
                    </button>
                    <button
                      type="button"
                      className={railTabClass(leftSection === 'media')}
                      onClick={() => {
                        setLeftSection('media');
                        setLeftExpanded(true);
                      }}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className={railTabClass(leftSection === 'sources')}
                      onClick={() => {
                        setLeftSection('sources');
                        setLeftExpanded(true);
                      }}
                    >
                      S
                    </button>
                  </div>
                  <div className="mt-auto [writing-mode:vertical-rl] text-[10px] uppercase tracking-[0.28em] text-[#7bf29b]/65">
                    manage
                  </div>
                </div>
              )}
            </motion.aside>

            <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div className="h-full w-full relative">
                  {renderMainCanvas()}
                </div>

              </div>
            </main>

            {!layersAnalysisMode && !immersiveMediaMode ? (
              <div className="border-t border-[#27cf6c]/35 lg:hidden">
                {renderRightRailContent()}
              </div>
            ) : null}

            <motion.aside
              initial={false}
              animate={{
                width:
                  focusMode || layersAnalysisMode || immersiveMediaMode
                    ? 0
                    : rightExpanded
                      ? 420
                      : 78,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="relative z-20 hidden border-l border-[#27cf6c]/45 bg-black/18 backdrop-blur lg:flex overflow-hidden shrink-0"
              onMouseEnter={() => setRightExpanded(true)}
              onMouseLeave={() => setRightExpanded(false)}
              onFocusCapture={() => setRightExpanded(true)}
              onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                  setRightExpanded(false);
                }
              }}
            >
              {rightExpanded ? (
                renderRightRailContent()
              ) : (
                <div className="flex h-full w-full flex-col items-center py-4">
                  <button
                    type="button"
                    onClick={() => setRightExpanded(true)}
                    className="rounded-full border border-[#27cf6c]/40 bg-[#0c1a10] p-2 text-[#aef8bd]"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </button>
                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      className={railTabClass(rightSection === 'analysis')}
                      onClick={() => {
                        setRightSection('analysis');
                        setRightExpanded(true);
                      }}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      className={railTabClass(rightSection === 'market')}
                      onClick={() => {
                        setRightSection('market');
                        setRightExpanded(true);
                      }}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={railTabClass(rightSection === 'diagnostics')}
                      onClick={() => {
                        setRightSection('diagnostics');
                        setRightExpanded(true);
                      }}
                    >
                      D
                    </button>
                    <button
                      type="button"
                      className={railTabClass(rightSection === 'charts')}
                      onClick={() => {
                        setRightSection('charts');
                        setRightExpanded(true);
                      }}
                    >
                      C
                    </button>
                  </div>
                  <div className="mt-auto [writing-mode:vertical-rl] text-[10px] uppercase tracking-[0.28em] text-[#7bf29b]/65">
                    analysis
                  </div>
                </div>
              )}
            </motion.aside>
          </div>
        </div>
      </div>

      <div id="tenzorx-print-view" className="hidden print:block print:text-black print:bg-white print:p-8 print:font-sans">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-mono">TenzorX Collateral Intelligence</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{report.property.address}</h1>
          <p className="mt-1 text-sm text-gray-500">{report.property.city} · {report.property.micromarket} · Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">Estimated Market Value</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(report.valuation.valuation.lowerBound)} – {formatCurrency(report.valuation.valuation.upperBound)}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">Point Estimate</p>
            <p className="text-2xl font-bold text-gray-900">{formatFullCurrency(report.valuation.valuation.pointEstimate)}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">Confidence Score</p>
            <p className="text-xl font-semibold text-gray-900">{report.valuation.valuation.confidence.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">Resale Potential Index</p>
            <p className="text-xl font-semibold text-gray-900">{report.valuation.liquidity.resalePotentialIndex}/100</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">Overall Risk Score</p>
            <p className="text-xl font-semibold text-gray-900">{report.diagnostics.overallRiskScore}/100</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">Time to Sell</p>
            <p className="text-xl font-semibold text-gray-900">{report.valuation.liquidity.estimatedTimeToSell} days</p>
          </div>
        </div>

        {report.valuation.riskFlags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Risk Flags</p>
            {report.valuation.riskFlags.map((flag) => (
              <div key={flag.flag} className="border border-gray-200 p-3 mb-2">
                <p className="font-semibold text-gray-900 text-sm">{flag.flag} <span className="text-gray-500 font-normal text-xs ml-2">{flag.severity}</span></p>
                <p className="text-sm text-gray-700 mt-1">{flag.description}</p>
              </div>
            ))}
          </div>
        )}

        {report.valuation.explanation.topDrivers.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Value Drivers</p>
            {report.valuation.explanation.topDrivers.map((driver) => (
              <div key={driver.feature} className="border border-gray-200 p-3 mb-2 flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{driver.feature}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{String(driver.value)}</p>
                </div>
                <span className="text-sm font-mono font-semibold text-gray-700">
                  {driver.direction === 'positive' ? '+' : '-'}{Math.abs(driver.contribution).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mt-6">
          <p className="text-xs text-gray-400 font-mono">Generated by TenzorX · Valuation ID: {report.valuation.valuationId} · Confidential · Not for external distribution</p>
        </div>
      </div>
    </div>
  );
}

type ReportWorkerStatus = NonNullable<ValuationDetailReport['valuation']['workerStatus']>[number];

function SystemHealthDot() {
  const [pipelineStatus, setPipelineStatus] = useState<'UP' | 'UNDER_PRESSURE' | 'DOWN' | 'UNRESPONSIVE'>('UNRESPONSIVE');
  const [workerStatuses, setWorkerStatuses] = useState<Array<{id:string;name:string;status:string;message?:string;}>>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!mounted) return;
        if (!res.ok) {
          setPipelineStatus('DOWN');
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data) {
          setPipelineStatus('UNRESPONSIVE');
          return;
        }

        setWorkerStatuses(Array.isArray(data.workers) ? data.workers : []);

        if (data.status === 'ok') {
          setPipelineStatus('UP');
        } else if (data.status === 'degraded' || data.summary?.totals?.degraded > 0) {
          setPipelineStatus('UNDER_PRESSURE');
        } else {
          setPipelineStatus('DOWN');
        }
      } catch {
        if (mounted) setPipelineStatus('UNRESPONSIVE');
      }
    }

    void checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (pipelineStatus === 'UNRESPONSIVE') return null;

  const dotClass =
    pipelineStatus === 'UP'
      ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.55)]'
      : pipelineStatus === 'UNDER_PRESSURE'
      ? 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.55)]'
      : 'bg-rose-500 shadow-[0_0_8px_2px_rgba(244,63,94,0.58)]';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPanelOpen((current) => !current)}
        className="flex h-10 items-center justify-center rounded-full border border-[var(--outline-variant)] bg-[var(--surface-container-high)] px-3 text-[var(--on-surface-variant)] transition hover:border-[var(--outline)] hover:bg-[var(--surface-bright)]"
      >
        <span className={cn('h-2.5 w-2.5 rounded-full', dotClass, pipelineStatus === 'UP' ? 'animate-pulse' : '')} />
      </button>

      {panelOpen ? (
        <div className="absolute right-0 top-full z-40 mt-3 w-[320px] rounded-3xl border border-white/10 bg-[#071008]/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Model Execution Status</p>
          <div className="space-y-3">
            {workerStatuses.length > 0 ? (
              workerStatuses.map((worker) => {
                const statusColor =
                  worker.status === 'online'
                    ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20'
                    : worker.status === 'degraded'
                    ? 'bg-amber-400/10 text-amber-200 border-amber-400/20'
                    : 'bg-rose-500/10 text-rose-200 border-rose-500/20';

                return (
                  <div key={worker.id} className={`rounded-2xl border px-3 py-3 ${statusColor}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{worker.name}</p>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{worker.status}</span>
                    </div>
                    {worker.message ? (
                      <p className="mt-2 text-xs text-slate-300">{worker.message}</p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-300">Unable to load pipeline details.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-cell border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-3 text-left">
      <p className="metadata-label">{label}</p>
      <p data-metric-value className="mt-2 text-base font-semibold text-[var(--on-surface)]">
        {value}
      </p>
    </div>
  );
}

function CanvasMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="info-accent-card surface-grain border border-[var(--outline-variant)] bg-[var(--surface-container)] p-4">
      <p className="metadata-label">{label}</p>
      <p data-metric-value className="mt-2 text-lg font-semibold text-[var(--on-surface)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{note}</p>
    </div>
  );
}

function SurfaceCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-grain border border-[var(--outline-variant)] bg-[var(--surface-container)] p-4 transition-[background,border-color] hover:border-[var(--outline)] hover:bg-[var(--surface-container-high)]">
      <p className="metadata-label">{eyebrow}</p>
      <h3 className="mt-2 text-base font-semibold text-[var(--on-surface)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-3 py-3">
      <span className="text-sm text-[var(--on-surface-variant)]">{label}</span>
      <span data-metric-value className="max-w-[60%] text-right text-sm font-medium text-[var(--on-surface)]">
        {value}
      </span>
    </div>
  );
}

function ContextLine({
  label,
  value,
  note,
  valueClassName,
}: {
  label: string;
  value: string;
  note: string;
  valueClassName?: string;
}) {
  return (
    <div className="border-b border-[var(--outline-variant)] px-3 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <p className="metadata-label">{label}</p>
        <p
          data-metric-value
          className={cn('max-w-[58%] text-right text-sm font-semibold text-[var(--on-surface)]', valueClassName)}
        >
          {value}
        </p>
      </div>
      <p className="mt-1 text-sm leading-5 text-[var(--on-surface-variant)]">{note}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-3 py-2.5">
      <span className="text-sm text-[var(--on-surface-variant)]">{label}</span>
      <span data-metric-value className={cn('text-sm font-semibold text-[var(--on-surface)]', valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function DockShortcut({
  label,
  note,
  icon,
  onClick,
  active,
}: {
  label: string;
  note: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-3 border px-3 py-3 text-left transition',
        active
          ? 'border-[var(--outline-variant)] bg-[var(--surface-bright)]'
          : 'border-[var(--outline-variant)] bg-[var(--surface-container-low)] hover:border-[var(--outline)]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="border border-[var(--outline-variant)] bg-[var(--surface-container-high)] p-2 text-[var(--primary)]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--on-surface)]">{label}</p>
          <p className="text-sm text-[var(--on-surface-variant)]">{note}</p>
        </div>
      </div>
      <Sparkles className="h-4 w-4 text-[var(--secondary)]" />
    </button>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="data-cell border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-3">
      <p className="metadata-label">{label}</p>
      <p data-metric-value className="mt-2 text-base font-semibold text-[var(--on-surface)]">
        {value}
      </p>
    </div>
  );
}
