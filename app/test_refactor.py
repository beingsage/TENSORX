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

const ExteriorReconstructionStage = dynamic(
  () =>
    import('./ExteriorReconstructionStage').then(
      (module) => module.ExteriorReconstructionStage
    ),
  { loading: () => <PanelSkeleton label="Loading exterior stage" className="min-h-[640px]" /> }
);

const Noidea3DBuilder = dynamic(
  () => import('../Noidea3DBuilder').then((module) => module.Noidea3DBuilder),
  { loading: () => <PanelSkeleton label="Loading interior reconstruction" className="min-h-[640px]" /> }
);

const RiskRadar = dynamic(
  () => import('./RiskRadar').then((module) => module.RiskRadar),
  { loading: () => <PanelSkeleton label="Loading risk radar" /> }
);

const LiquidityGauge = dynamic(
  () => import('./LiquidityGauge').then((module) => module.LiquidityGauge),
  { loading: () => <PanelSkeleton label="Loading liquidity gauge" /> }
);

const AmenityCards = dynamic(
  () => import('./AmenityCards').then((module) => module.AmenityCards),
  { loading: () => <PanelSkeleton label="Loading amenity summary" /> }
);

const ComparisonScatter = dynamic(
  () =>
    import('./ComparisonScatter').then((module) => module.ComparisonScatter),
  { loading: () => <PanelSkeleton label="Loading comparable scatter" /> }
);

const HistoricalEvolution = dynamic(
  () =>
    import('./HistoricalEvolution').then((module) => module.HistoricalEvolution),
  { loading: () => <PanelSkeleton label="Loading historical evolution" /> }
);

const UrbanDevelopmentTimeline = dynamic(
  () =>
    import('./UrbanDevelopmentTimeline').then(
      (module) => module.UrbanDevelopmentTimeline
    ),
  { loading: () => <PanelSkeleton label="Loading development timeline" /> }
);

const ClimateHeatmap = dynamic(
  () => import('./ClimateHeatmap').then((module) => module.ClimateHeatmap),
  { loading: () => <PanelSkeleton label="Loading climate layers" /> }
);

const NoiseHeatmap = dynamic(
  () => import('./NoiseHeatmap').then((module) => module.NoiseHeatmap),
  { loading: () => <PanelSkeleton label="Loading acoustic layers" /> }
);

const TrafficVisualization = dynamic(
  () =>
    import('./TrafficVisualization').then(
      (module) => module.TrafficVisualization
    ),
  { loading: () => <PanelSkeleton label="Loading traffic layer" /> }
);

const CommutePath = dynamic(
  () => import('./CommutePath').then((module) => module.CommutePath),
  { loading: () => <PanelSkeleton label="Loading commute path" /> }
);

const SunlightSimulation = dynamic(
  () =>
    import('./SunlightSimulation').then((module) => module.SunlightSimulation),
  { loading: () => <PanelSkeleton label="Loading sunlight simulation" /> }
);

const EnvironmentLayers = dynamic(
  () =>
    import('./EnvironmentLayers').then((module) => module.EnvironmentLayers),
  { loading: () => <PanelSkeleton label="Loading environment layers" /> }
);

const AdvancedLayers = dynamic(
  () => import('./AdvancedLayers').then((module) => module.AdvancedLayers),
  { loading: () => <PanelSkeleton label="Loading advanced overlays" /> }
);

const DemographicRings = dynamic(
  () => import('./DemographicRings').then((module) => module.DemographicRings),
  { loading: () => <PanelSkeleton label="Loading demographic layers" /> }
);

const VirtualTour360 = dynamic(
  () => import('./VirtualTour360').then((module) => module.VirtualTour360),
  { loading: () => <PanelSkeleton label="Loading property media" /> }
);

const PerformanceOptimizer = dynamic(
  () =>
    import('./PerformanceOptimizer').then(
      (module) => module.PerformanceOptimizer
    ),
  { loading: () => <PanelSkeleton label="Loading performance diagnostics" /> }
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
  const fraudLevel =
    report.valuation.fraudAnalysis?.riskLevel ||
    riskTone(report.diagnostics.overallRiskScore);
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date(report.valuation.timestamp));

  const autosaveLabel = autosaveStatus === 'saving' ? 'Saving...' : `Live · ${lastSaved.toLocaleTimeString()}`;

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

  const handlePrintExport = () => {
    window.print();
  };

  const viewMeta: Record<
    WorkspaceView,
    {
      label: string;
     // description: string;
      accent: string;
    }
  > = {
    map: {
      label: 'Map',
      //description:
        //'MapLibre and deck.gl surface for parcel context, transit reach, amenity distance, and geospatial overlays.',
      accent: 'Spatial canvas',
    },
    exterior: {
      label: 'Exterior',
      // description:
      //   'Exterior imagery and NeRFstudio staging with a property-specific massing proxy while live previews are not yet attached.',
      accent: 'Reconstruction stage',
    },
    interior: {
      label: 'Interior',
      // description:
      //   'noidea layout reconstruction surface driven by the uploaded floor plan asset and current room metadata.',
      accent: 'Interior builder',
    },
    layers: {
      label: 'Layers',
      // description:
      //   'Climate, mobility, demographic, education, employment, and environment layer canvases grouped into a single analytical stage.',
      accent: 'Layer stack',
    },
  };

  const floatingDockActions: Record<
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
          latitude={report.immersive.latitude}
          longitude={report.immersive.longitude}
          propertyType={report.immersive.propertyType}
          address={report.immersive.address}
          spatialContext={report.immersive.spatialContext}
        />

        </div>
      </div>
    );
  }

  function renderExteriorView() {
    return (
      <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-5">
        <ExteriorReconstructionStage
          propertyName={report.property.address}
          propertyType={report.property.propertyType}
          buildingAge={report.property.ageInYears}
          bedrooms={report.property.bedroomCount || report.property.bedrooms}
          bathrooms={report.property.bathroomCount || report.property.bathrooms}
          hasGarden={/villa|bungalow|townhouse/i.test(report.property.propertyType)}
          photos={report.media.exteriorAssets}
          fallbackPhotos={report.propertyExperience.virtualTour360.photos}
          reconstruction={exteriorReconstruction}
        />
      </div>
    );
  }

  function renderInteriorView() {
    return (
      <div className="-mx-4 -mt-4 grid gap-px bg-[#27cf6c]/20 lg:-mx-6 lg:-mt-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-[720px] overflow-hidden bg-[#071008]">
          <Noidea3DBuilder
            propertyId={report.property.propertyId}
            propertyType={report.property.propertyType}
            bedrooms={report.property.bedroomCount || report.property.bedrooms}
            bathrooms={report.property.bathroomCount || report.property.bathrooms}
            buildingAge={report.property.ageInYears}
            hasBalcony={(report.property.balconyCount || 0) > 0}
            hasGarden={/villa|bungalow|townhouse/i.test(report.property.propertyType)}
            floorPlanImage={report.media.layoutAsset?.secureUrl}
            address={report.property.address}
          />
        </div>

        <div className="space-y-4 bg-[#050805] p-4 lg:p-5">
          <SurfaceCard
            eyebrow="Layout run"
            title={layoutReconstruction?.provider || 'noidea'}
            description={
              layoutReconstruction?.message ||
              'Attach a layout plan during intake to replace this placeholder state with a live run.'
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryRow label="Status" value={layoutReconstruction?.status || 'missing'} />
              <SummaryRow label="Run ID" value={layoutReconstruction?.runId || 'not started'} />
              <SummaryRow
                label="Asset"
                value={report.media.layoutAsset?.displayName || 'no uploaded layout asset'}
              />
              <SummaryRow
                label="Warnings"
                value={`${report.media.legalDocuments.reduce(
                  (sum, document) => sum + document.warnings.length,
                  0
                )}`}
              />
            </div>
          </SurfaceCard>

          <div className="overflow-hidden border border-[#27cf6c]/30 bg-[#08110b]">
            <div className="border-b border-[#27cf6c]/28 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#82f2a0]/75">
                Uploaded layout
              </p>
              <p className="mt-1 text-sm text-[#d5e7d1]">
                The current floor plan asset used to seed the noidea experience.
              </p>
            </div>
            {report.media.layoutAsset?.secureUrl ? (
              <img
                src={report.media.layoutAsset.secureUrl}
                alt={report.media.layoutAsset.displayName}
                className="h-[420px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-[#9fb29d]">
                No floor plan image is attached yet for this valuation.
              </div>
            )}
          </div>

          <VirtualTour360
            propertyName={report.propertyExperience.virtualTour360.propertyName}
            rooms={report.propertyExperience.virtualTour360.rooms}
            photos={report.propertyExperience.virtualTour360.photos}
          />
        </div>
      </div>
    );
  }

  function renderLayersView() {
    return (
      <div className="-mx-4 -mt-4 grid gap-px bg-[#27cf6c]/20 lg:-mx-6 lg:-mt-5 xl:grid-cols-2">
        <ClimateHeatmap {...report.environment.climate} />
        <NoiseHeatmap
          baselineNoise={report.environment.noise.baselineNoise}
          sources={report.environment.noise.sources}
        />
        <TrafficVisualization data={report.environment.traffic.data} />
        <CommutePath paths={report.environment.commute.paths} />
        <SunlightSimulation {...report.environment.sunlight} />
        <EnvironmentLayers layers={report.environment.environmentLayers.layers} />
        <AdvancedLayers layers={report.environment.advancedLayers.layers} />
        <DemographicRings rings={report.neighborhood.demographicRings.rings} />
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
        <div className="border-b border-[#27cf6c]/35 px-4 py-4">
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
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[#27cf6c]/35 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#7bf29b]/75">
            Analysis
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={railTabClass(rightSection === 'analysis')}
              onClick={() => setRightSection('analysis')}
            >
              summary
            </button>
            <button
              type="button"
              className={railTabClass(rightSection === 'market')}
              onClick={() => setRightSection('market')}
            >
              market
            </button>
            <button
              type="button"
              className={railTabClass(rightSection === 'diagnostics')}
              onClick={() => setRightSection('diagnostics')}
            >
              diagnostics
            </button>
            <button
              type="button"
              className={railTabClass(rightSection === 'charts')}
              onClick={() => setRightSection('charts')}
            >
              charts
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {rightSection === 'analysis' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-px border border-[var(--outline-variant)] bg-[var(--outline-variant)] mb-4">
                <div className="bg-[var(--surface-container-low)] px-3 py-3">
                  <p className="metadata-label">Value</p>
                  <p data-metric-value className="mt-1 text-base font-semibold text-[var(--primary)]">
                    {formatCurrency(report.valuation.valuation.pointEstimate)}
                  </p>
                </div>
                <div className="bg-[var(--surface-container-low)] px-3 py-3">
                  <p className="metadata-label">Confidence</p>
                  <p data-metric-value className="mt-1 text-base font-semibold text-[var(--on-surface)]">
                    {(report.valuation.valuation.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-[var(--surface-container-low)] px-3 py-3">
                  <p className="metadata-label">Risk</p>
                  <p data-metric-value className={`mt-1 text-base font-semibold ${summaryTone(report.diagnostics.overallRiskScore)}`}>
                    {report.diagnostics.overallRiskScore}/100
                  </p>
                </div>
                <div className="bg-[var(--surface-container-low)] px-3 py-3">
                  <p className="metadata-label">Market</p>
                  <p data-metric-value className="mt-1 text-base font-semibold text-[var(--on-surface)]">
                    {(report.market.summary.priceGrowthYoY * 100).toFixed(1)}% YoY
                  </p>
                </div>
              </div>

              <PrimaryValuationCard
                lowerBound={report.valuation.valuation.lowerBound}
                upperBound={report.valuation.valuation.upperBound}
                pointEstimate={report.valuation.valuation.pointEstimate}
                confidence={report.valuation.valuation.confidence}
                method={report.valuation.valuation.estimationMethod}
              />

              <SurfaceCard
                eyebrow="Signal summary"
                title="Confidence, liquidity, and risk"
                description="Final analysis points consolidated around confidence, resale potential, validation, and risk posture."
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm text-[var(--on-surface)]">
                      <span className="metadata-label">Confidence Score</span>
                      <span data-slot="progress-value" className="text-lg font-semibold">
                        {report.valuation.valuation.confidence.toFixed(2)}
                      </span>
                    </div>
                    <Progress
                      value={report.valuation.valuation.confidence * 100}
                      className="mt-2"
                    />
                  </div>
                  <SummaryRow
                    label="Resale Index"
                    value={`${report.valuation.liquidity.resalePotentialIndex}/100`}
                  />
                  <SummaryRow
                    label="Validation"
                    value={`${report.diagnostics.validation.score}/100`}
                  />
                  <SummaryRow
                    label="Overall risk"
                    value={`${report.diagnostics.overallRiskScore}/100`}
                    valueClassName={summaryTone(report.diagnostics.overallRiskScore)}
                  />
                </div>
              </SurfaceCard>

              <RiskRadar
                dimensions={report.diagnostics.riskDimensions}
                overallScore={report.diagnostics.overallRiskScore}
              />

              <LiquidityGauge
                daysToSell={report.valuation.liquidity.estimatedTimeToSell}
                absorptionRate={report.valuation.liquidity.absorptionProbability}
                resalePotentialIndex={report.valuation.liquidity.resalePotentialIndex}
                minDays={report.diagnostics.liquiditySimulation.p5}
                maxDays={report.diagnostics.liquiditySimulation.p95}
                medianDays={report.diagnostics.liquiditySimulation.median}
                riskLevel={riskTone(report.diagnostics.overallRiskScore)}
              />

              <SurfaceCard
                eyebrow="Top drivers"
                title={`${report.valuation.explanation.topDrivers.length} model explanation point${report.valuation.explanation.topDrivers.length === 1 ? '' : 's'}`}
                description="Key pushes and pulls behind the final valuation."
              >
                <div className="space-y-3">
                  {report.valuation.explanation.topDrivers.map((driver) => (
                    <div
                      key={`${driver.feature}-${driver.value}`}
                      className="border-l-[3px] border-l-[var(--success)] bg-[var(--surface-container-low)] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[var(--success)]" />
                          <p className="text-sm font-semibold text-[var(--on-surface)]">
                            {driver.feature}
                          </p>
                        </div>
                        <Badge className={driver.direction === 'positive' ? 'tag-driver' : 'tag-confidence'}>
                          {driver.direction === 'positive' ? '+' : '-'}
                          {Math.abs(driver.contribution).toFixed(2)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                        {String(driver.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <AmenityCards amenities={report.immersive.amenities} />

              {report.valuation.riskFlags.length ? (
                <SurfaceCard
                  eyebrow="Risk flags"
                  title={`${report.valuation.riskFlags.length} flagged signal${report.valuation.riskFlags.length === 1 ? '' : 's'}`}
                  description="High-signal issues carried into the valuation result."
                >
                  <div className="space-y-3">
                    {report.valuation.riskFlags.map((flag) => (
                      <div
                        key={`${flag.flag}-${flag.impact}`}
                        className="danger-accent-card p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-[var(--error)]" />
                            <p className="font-[family-name:var(--font-data)] text-sm font-semibold text-[var(--on-surface)]">
                              {flag.flag}
                            </p>
                          </div>
                          <Badge className={riskBadgeClass(flag.severity)}>{flag.severity}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-[var(--error)]">{flag.description}</p>
                        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{flag.impact}</p>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              ) : null}
            </div>
          ) : null}

          {rightSection === 'market' ? (
            <div className="space-y-4">
              <SurfaceCard
                eyebrow="Market pulse"
                title={`${report.market.summary.demandIndex} demand / ${report.market.summary.supplyIndex} supply`}
                description="All market-side charts from the existing screen collected into one rail."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniMetric
                    label="Avg days on market"
                    value={`${report.market.summary.avgDaysOnMarket}d`}
                  />
                  <MiniMetric
                    label="Absorption"
                    value={`${(report.market.summary.absorptionRate * 100).toFixed(0)}%`}
                  />
                  <MiniMetric
                    label="YoY growth"
                    value={`${(report.market.summary.priceGrowthYoY * 100).toFixed(1)}%`}
                  />
                  <MiniMetric
                    label="Liquidity"
                    value={`${report.valuation.liquidity.resalePotentialIndex}/100`}
                  />
                </div>
              </SurfaceCard>

              <ComparisonScatter
                properties={report.market.comparisonScatter.properties}
                currentProperty={report.market.comparisonScatter.currentProperty}
              />

              <HistoricalEvolution history={report.market.historicalEvolution.history} />

              <UrbanDevelopmentTimeline
                projects={report.market.urbanDevelopmentTimeline.projects}
              />
            </div>
          ) : null}

          {rightSection === 'diagnostics' ? (
            <div className="space-y-4">
              <SurfaceCard
                eyebrow="Diagnostics"
                title="Risk and validation review"
                description="Validation, fraud screening, and liquidity simulation remain attached in the redesigned rail."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.diagnostics.riskDimensions.map((dimension) => (
                    <SummaryRow
                      key={dimension.name}
                      label={dimension.name}
                      value={String(dimension.score)}
                      valueClassName="text-white"
                    />
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow="Liquidity simulation"
                title={`${report.diagnostics.liquiditySimulation.median.toFixed(0)} day median`}
                description={`P5 ${report.diagnostics.liquiditySimulation.p5.toFixed(0)}d · P95 ${report.diagnostics.liquiditySimulation.p95.toFixed(0)}d`}
              >
                <div className="space-y-3">
                  <SummaryRow
                    label="Standard deviation"
                    value={`${report.diagnostics.liquiditySimulation.std.toFixed(1)}d`}
                  />
                  <SummaryRow
                    label="Stress -10%"
                    value={formatCurrency(
                      report.valuation.valuation.stressTest?.recession10 ||
                        report.valuation.valuation.lowerBound
                    )}
                  />
                  <SummaryRow
                    label="Stress -20%"
                    value={formatCurrency(
                      report.valuation.valuation.stressTest?.recession20 ||
                        report.valuation.valuation.lowerBound
                    )}
                  />
                  <SummaryRow
                    label="Rate hike"
                    value={formatCurrency(
                      report.valuation.valuation.stressTest?.rateHike ||
                        report.valuation.valuation.pointEstimate
                    )}
                  />
                </div>
              </SurfaceCard>

              <div className="rounded-[1.6rem] border border-white/10 bg-[#08110b] px-4 py-3">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="validation" className="border-white/10">
                    <AccordionTrigger className="text-white">
                      Validation findings
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-[#d0e2cd]">
                      <p>Score: {report.diagnostics.validation.score}/100</p>
                      {report.diagnostics.validation.errors.length === 0 ? (
                        <p className="text-emerald-200">No blocking validation errors.</p>
                      ) : (
                        report.diagnostics.validation.errors.map((error) => (
                          <div
                            key={`${error.field}-${error.message}`}
                            className="rounded-[1rem] border border-rose-500/20 bg-rose-500/10 p-3"
                          >
                            <p className="font-medium text-rose-100">{error.field}</p>
                            <p className="text-rose-100/85">{error.message}</p>
                          </div>
                        ))
                      )}
                      {report.diagnostics.validation.warnings.map((warning) => (
                        <div
                          key={`${warning.field}-${warning.message}`}
                          className="rounded-[1rem] border border-amber-400/20 bg-amber-400/10 p-3"
                        >
                          <p className="font-medium text-amber-50">{warning.field}</p>
                          <p className="text-amber-100/90">{warning.message}</p>
                          <p className="mt-1 text-xs text-amber-50/80">{warning.suggestion}</p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="fraud" className="border-white/10">
                    <AccordionTrigger className="text-white">
                      Fraud screening
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm text-[#d0e2cd]">
                      <p>
                        Recommendation: {report.diagnostics.fraudReview.recommendation}
                      </p>
                      {report.diagnostics.fraudReview.flags.length === 0 ? (
                        <p className="text-emerald-200">No fraud flags triggered.</p>
                      ) : (
                        report.diagnostics.fraudReview.flags.map((flag) => (
                          <div
                            key={`${flag.type}-${flag.message}`}
                            className="rounded-[1rem] border border-white/10 bg-black/20 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-white">{flag.type}</p>
                              <Badge className={riskBadgeClass(flag.severity)}>
                                {flag.severity}
                              </Badge>
                            </div>
                            <p className="mt-2 text-[#d0e2cd]">{flag.message}</p>
                            <p className="mt-1 text-xs text-[#a7b9a3]">
                              {flag.recommendedAction}
                            </p>
                          </div>
                        ))
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <PerformanceOptimizer
                components={report.diagnostics.performanceOptimizer.components}
              />
            </div>
          ) : null}

          {rightSection === 'charts' ? (
            <div className="space-y-4">
              <VirtualTour360
                propertyName={report.propertyExperience.virtualTour360.propertyName}
                rooms={report.propertyExperience.virtualTour360.rooms}
                photos={report.propertyExperience.virtualTour360.photos}
              />

              <DemographicRings rings={report.neighborhood.demographicRings.rings} />

              <ClimateHeatmap {...report.environment.climate} />

              <TrafficVisualization data={report.environment.traffic.data} />
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

          <header className="relative z-20 border-b border-[var(--outline-variant)] px-4 py-4 lg:px-6">
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
                <Button onClick={handlePrintExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <SystemHealthDot />
              </div>
            </div>
          </header>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="border-b border-[#27cf6c]/35 lg:hidden">
              {renderLeftRailContent()}
            </div>

            <motion.aside
              initial={false}
              animate={{ width: focusMode ? 0 : leftExpanded ? 320 : 78 }}
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

                <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
                  <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[#27cf6c]/50 bg-black/70 px-3 py-2 shadow-[0_24px_50px_rgba(0,0,0,0.45)] backdrop-blur">
                    {floatingDockActions[activeView].map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition',
                          action.active
                            ? 'border-[#ff8f98] bg-[#2b1419] text-[#ffd9de]'
                            : 'border-white/10 bg-white/5 text-[#dcecd9] hover:border-[#27cf6c]/45 hover:bg-[#0c1a10]'
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </main>

            <div className="border-t border-[#27cf6c]/35 lg:hidden">
              {renderRightRailContent()}
            </div>

            <motion.aside
              initial={false}
              animate={{ width: focusMode ? 0 : rightExpanded ? 420 : 78 }}
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
        
        if (data.status === 'ok') {
          setPipelineStatus('UP');
        } else if (data.status === 'degraded' || data.summary?.totals?.degraded > 0) {
          setPipelineStatus('UNDER_PRESSURE');
        } else {
          setPipelineStatus('DOWN');
        }
      } catch (err) {
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
    pipelineStatus === 'UP' ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.55)]' :
    pipelineStatus === 'UNDER_PRESSURE' ? 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.55)]' :
    'bg-rose-500 shadow-[0_0_8px_2px_rgba(244,63,94,0.58)]';

  const tooltip =
    pipelineStatus === 'UP' ? 'All Pipelines UP' :
    pipelineStatus === 'UNDER_PRESSURE' ? 'System Under Pressure' :
    'Pipelines DOWN / Fetch Failed';

  return (
    <div className="relative group">
      <div
        className="group flex h-10 items-center justify-center border border-[var(--outline-variant)] bg-[var(--surface-container-high)] px-3 text-[var(--on-surface-variant)] transition hover:border-[var(--outline)] hover:bg-[var(--surface-bright)]"
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            dotClass,
            pipelineStatus === 'UP' ? 'animate-pulse' : ''
          )}
        />
      </div>

      <span className="pointer-events-none absolute -bottom-8 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-container-highest)] px-2 py-1 text-[10px] font-mono text-[var(--on-surface)] opacity-0 transition-opacity group-hover:opacity-100">
        {tooltip}
      </span>
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
