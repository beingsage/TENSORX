'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  Camera,
  LayoutGrid,
  Ruler,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ValuationDetailReport } from '@/lib/valuation/report';
import { Noidea3DBuilder } from '../Noidea3DBuilder';

type StudioSection = 'layout' | 'coverage' | 'assumptions' | 'risk';
type InspectorSection = 'summary' | 'media' | 'flags';

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function toneForStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'completed' || normalized === 'ready' || normalized === 'seeded') {
    return 'text-emerald-200';
  }
  if (normalized === 'processing' || normalized === 'queued' || normalized === 'running') {
    return 'text-amber-200';
  }
  return 'text-rose-200';
}

function RailButton({
  active,
  icon: Icon,
  label,
  note,
  onClick,
}: {
  active: boolean;
  icon: typeof LayoutGrid;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition',
        active
          ? 'border-emerald-400/30 bg-emerald-400/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          : 'border-white/10 bg-white/[0.03] text-[#c8d6c5] hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border transition',
          active
            ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-100'
            : 'border-white/10 bg-black/20 text-[#9fb29d] group-hover:text-white'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-[#92a690]">{note}</span>
      </span>
    </button>
  );
}

function PanelCard({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]',
        className
      )}
    >
      <div className="border-b border-white/8 px-4 py-3">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#89a988]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className={cn('text-sm font-semibold text-white', eyebrow ? 'mt-1.5' : '')}>
          {title}
        </h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/6 py-2 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-sm text-[#8fa48d]">{label}</span>
      <span className={cn('text-right text-sm font-medium text-white', valueClassName)}>{value}</span>
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#88a486]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-[#98ab96]">{detail}</p>
    </div>
  );
}

function CoverageChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#88a486]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function ValuationInteriorStudio({
  report,
}: {
  report: ValuationDetailReport;
}) {
  const [activeSection, setActiveSection] = useState<StudioSection>('layout');
  const [inspectorSection, setInspectorSection] = useState<InspectorSection>('summary');

  const layoutReconstruction = report.property.reconstruction?.layout;
  const layoutAsset = report.media.layoutAsset;
  const rooms = report.propertyExperience.virtualTour360.rooms;
  const photos = report.propertyExperience.virtualTour360.photos;
  const topDrivers = report.valuation.explanation?.topDrivers?.slice(0, 3) ?? [];
  const riskFlags = report.valuation.riskFlags?.slice(0, 3) ?? [];
  const warningCount = report.media.legalDocuments.reduce(
    (total, document) => total + document.warnings.length,
    0
  );
  const layoutStatus = layoutReconstruction?.status || (layoutAsset ? 'seeded' : 'missing');
  const coverageScore = rooms.length
    ? Math.min(100, Math.round((photos.length / rooms.length) * 100))
    : photos.length
      ? 100
      : layoutAsset
        ? 64
        : 0;
  const propertyBedrooms = report.property.bedroomCount || report.property.bedrooms || 0;
  const propertyBathrooms = report.property.bathroomCount || report.property.bathrooms || 0;

  const railItems = useMemo(
    () => [
      {
        id: 'layout' as const,
        label: 'Layout Studio',
        note: 'Plan review and 2D/3D canvas',
        icon: LayoutGrid,
        inspector: 'summary' as const,
      },
      {
        id: 'coverage' as const,
        label: 'Media Coverage',
        note: 'Room capture and plan support',
        icon: Camera,
        inspector: 'media' as const,
      },
      {
        id: 'assumptions' as const,
        label: 'AVM Inputs',
        note: 'Area, rooms, age, and amenities',
        icon: Ruler,
        inspector: 'summary' as const,
      },
      {
        id: 'risk' as const,
        label: 'Exceptions',
        note: 'Flags, warnings, and gaps',
        icon: ShieldAlert,
        inspector: 'flags' as const,
      },
    ],
    []
  );

  const captureNotes = [
    `${rooms.length} room${rooms.length === 1 ? '' : 's'} indexed`,
    `${photos.length} photo${photos.length === 1 ? '' : 's'} attached`,
    `${warningCount} document warning${warningCount === 1 ? '' : 's'}`,
  ];

  return (
    <div className="surface-grain relative flex h-full min-h-[780px] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(26,49,35,0.72),rgba(4,10,6,0.97)_55%),linear-gradient(180deg,rgba(6,11,8,0.92),rgba(3,7,5,1))] text-[#edf7eb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-300/8 to-transparent" />

      <header className="relative z-10 border-b border-white/10 bg-black/18 px-5 py-5 backdrop-blur-xl">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] xl:items-start">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#96c39b]">
              Interior Valuation Studio
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-[clamp(1.2rem,2vw,1.6rem)] font-semibold text-white">
                {report.property.address}
              </h2>
              <Badge variant="outline" className="border-white/12 bg-white/[0.04] text-[#d6e4d4]">
                {report.property.propertyType}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'border-white/12 bg-white/[0.04]',
                  layoutAsset ? 'text-emerald-100' : 'text-amber-100'
                )}
              >
                {layoutAsset ? 'Plan attached' : 'Plan missing'}
              </Badge>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#aec1ab]">
              The copied interior editor shell is now mapped into the valuation workflow as a
              focused review studio. It keeps the layout canvas, plan coverage, and reconstruction
              context, while removing design-product features that do not contribute to automatic
              valuation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderMetric
              label="Point Estimate"
              value={formatCurrency(report.valuation.valuation.pointEstimate)}
              detail={`${formatCurrency(report.valuation.valuation.lowerBound)} to ${formatCurrency(report.valuation.valuation.upperBound)}`}
            />
            <HeaderMetric
              label="Confidence"
              value={`${Math.round(report.valuation.valuation.confidence * 100)}%`}
              detail={report.valuation.valuation.estimationMethod || 'Model-backed output'}
            />
            <HeaderMetric
              label="Layout Status"
              value={layoutStatus}
              detail={layoutReconstruction?.provider || 'Awaiting seeded layout context'}
            />
            <HeaderMetric
              label="Coverage"
              value={`${coverageScore}%`}
              detail={captureNotes.join(' • ')}
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="border-b border-white/10 bg-black/14 p-4 backdrop-blur-xl lg:border-b-0 lg:border-r">
          <div className="space-y-3">
            {railItems.map((item) => (
              <RailButton
                key={item.id}
                active={activeSection === item.id}
                icon={item.icon}
                label={item.label}
                note={item.note}
                onClick={() => {
                  setActiveSection(item.id);
                  setInspectorSection(item.inspector);
                }}
              />
            ))}
          </div>

          <PanelCard eyebrow="Scene Readiness" title="Interior signal quality" className="mt-4">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#88a486]">
                  <span>Capture support</span>
                  <span>{coverageScore}%</span>
                </div>
                <Progress value={coverageScore} className="h-2 bg-white/10" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <CoverageChip label="Plan asset" value={layoutAsset ? 'Available' : 'Missing'} />
                <CoverageChip label="Rooms tagged" value={`${rooms.length}`} />
                <CoverageChip label="Media attached" value={`${photos.length}`} />
              </div>
            </div>
          </PanelCard>
        </aside>

        <section className="min-h-0 border-b border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(255,255,255,0.02))] lg:border-b-0 lg:border-r">
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-400/18 bg-emerald-400/10 text-emerald-100">
                  Canvas retained from interior editor
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-[#cfe2cd]">
                  2D and 3D review
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-[#cfe2cd]">
                  Valuation context preserved
                </Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-4">
              <div className="h-full min-h-[520px] overflow-hidden rounded-[34px] border border-white/10 bg-[#050a07] shadow-[0_35px_120px_rgba(1,6,3,0.45)]">
                <Noidea3DBuilder
                  propertyId={report.property.propertyId}
                  propertyType={report.property.propertyType}
                  bedrooms={propertyBedrooms}
                  bathrooms={propertyBathrooms}
                  buildingAge={report.property.ageInYears}
                  hasBalcony={(report.property.balconyCount || 0) > 0}
                  hasGarden={/villa|bungalow|townhouse/i.test(report.property.propertyType)}
                  floorPlanImage={layoutAsset?.secureUrl}
                  address={report.property.address}
                />
              </div>
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              {activeSection === 'layout' ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  <PanelCard eyebrow="Layout asset" title={layoutAsset?.displayName || 'No uploaded plan'}>
                    <div className="space-y-2">
                      <InfoRow label="Status" value={layoutAsset ? 'Seeded into studio' : 'Missing'} />
                      <InfoRow label="Run id" value={layoutReconstruction?.runId || 'Not started'} />
                      <InfoRow
                        label="Resolution"
                        value={
                          layoutAsset?.width && layoutAsset?.height
                            ? `${layoutAsset.width} × ${layoutAsset.height}`
                            : 'Not captured'
                        }
                      />
                    </div>
                  </PanelCard>
                  <PanelCard eyebrow="Property assumptions" title="Model-ready geometry inputs">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CoverageChip label="Bedrooms" value={`${propertyBedrooms || '-'}`} />
                      <CoverageChip label="Bathrooms" value={`${propertyBathrooms || '-'}`} />
                      <CoverageChip label="Built-up area" value={`${report.property.builtupArea} sqft`} />
                      <CoverageChip label="Age" value={`${report.property.ageInYears} years`} />
                    </div>
                  </PanelCard>
                  <PanelCard eyebrow="AVM alignment" title="Why this shell exists">
                    <p className="text-sm leading-6 text-[#b2c4b0]">
                      The studio keeps plan interpretation close to the valuation record so layout
                      evidence, property inputs, and reconstruction status stay in one place.
                    </p>
                  </PanelCard>
                </div>
              ) : null}

              {activeSection === 'coverage' ? (
                <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <PanelCard eyebrow="Coverage score" title="Room media support">
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#88a486]">
                          <span>Coverage</span>
                          <span>{coverageScore}%</span>
                        </div>
                        <Progress value={coverageScore} className="h-2 bg-white/10" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <CoverageChip label="Rooms" value={`${rooms.length}`} />
                        <CoverageChip label="Photos" value={`${photos.length}`} />
                        <CoverageChip label="Warnings" value={`${warningCount}`} />
                      </div>
                    </div>
                  </PanelCard>
                  <PanelCard eyebrow="Captured rooms" title="Virtual tour checklist">
                    <div className="flex flex-wrap gap-2">
                      {rooms.length === 0 ? (
                        <p className="text-sm text-[#97ab95]">No room checklist is attached yet.</p>
                      ) : (
                        rooms.slice(0, 8).map((room, index) => (
                          <span
                            key={`${room.name}-${index}`}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white"
                          >
                            {room.icon} {room.name}
                          </span>
                        ))
                      )}
                    </div>
                  </PanelCard>
                </div>
              ) : null}

              {activeSection === 'assumptions' ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  <PanelCard eyebrow="Structural inputs" title="Primary property dimensions">
                    <div className="space-y-2">
                      <InfoRow label="Built-up area" value={`${report.property.builtupArea} sqft`} />
                      <InfoRow
                        label="Land / plot"
                        value={`${report.property.landArea || report.property.plotArea || 0} sqft`}
                      />
                      <InfoRow label="Occupancy" value={report.property.occupancyStatus} />
                      <InfoRow label="Construction" value={report.property.constructionQuality} />
                    </div>
                  </PanelCard>
                  <PanelCard eyebrow="Home features" title="Value-relevant fitouts">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CoverageChip label="Balconies" value={`${report.property.balconyCount || 0}`} />
                      <CoverageChip label="Garden" value={/villa|bungalow|townhouse/i.test(report.property.propertyType) ? 'Yes' : 'No'} />
                      <CoverageChip label="Facing" value={report.property.facing || 'Not tagged'} />
                      <CoverageChip label="Ownership" value={report.property.isFreehold ? 'Freehold' : 'Lease/other'} />
                    </div>
                  </PanelCard>
                  <PanelCard eyebrow="Top drivers" title="Current valuation influences">
                    <div className="space-y-2">
                      {topDrivers.length === 0 ? (
                        <p className="text-sm text-[#97ab95]">No driver narrative was attached.</p>
                      ) : (
                        topDrivers.map((driver) => (
                          <InfoRow
                            key={driver.feature}
                            label={driver.feature}
                            value={`${driver.direction === 'positive' ? '+' : '-'}${Math.abs(driver.contribution).toFixed(2)}`}
                            valueClassName={
                              driver.direction === 'positive'
                                ? 'text-emerald-200'
                                : 'text-rose-200'
                            }
                          />
                        ))
                      )}
                    </div>
                  </PanelCard>
                </div>
              ) : null}

              {activeSection === 'risk' ? (
                <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <PanelCard eyebrow="Valuation flags" title="Current exceptions">
                    <div className="space-y-3">
                      {riskFlags.length === 0 ? (
                        <p className="text-sm text-[#97ab95]">No lender-facing risk flags are attached.</p>
                      ) : (
                        riskFlags.map((flag) => (
                          <div
                            key={flag.flag}
                            className="rounded-[20px] border border-white/10 bg-black/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-white">{flag.flag}</p>
                              <Badge variant="outline" className="border-rose-300/18 bg-rose-300/10 text-rose-100">
                                {flag.severity}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[#b3c5b1]">{flag.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </PanelCard>
                  <PanelCard eyebrow="Document warnings" title="Upstream issues">
                    <div className="space-y-3">
                      {warningCount === 0 ? (
                        <p className="text-sm text-[#97ab95]">No document warnings were attached.</p>
                      ) : (
                        report.media.legalDocuments
                          .filter((document) => document.warnings.length > 0)
                          .map((document, index) => (
                            <div
                              key={`${document.displayName}-${index}`}
                              className="rounded-[20px] border border-white/10 bg-black/20 p-3"
                            >
                              <p className="text-sm font-semibold text-white">{document.displayName}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#88a486]">
                                {document.category}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-[#ffcf94]">
                                {document.warnings.join(' • ')}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                  </PanelCard>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="bg-black/16 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap gap-2">
            {([
              ['summary', 'Summary'],
              ['media', 'Media'],
              ['flags', 'Flags'],
            ] as Array<[InspectorSection, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setInspectorSection(key)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition',
                  inspectorSection === key
                    ? 'border-emerald-300/25 bg-emerald-300/12 text-white'
                    : 'border-white/10 bg-white/[0.03] text-[#8fa48d] hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {inspectorSection === 'summary' ? (
              <>
                <PanelCard eyebrow="Reconstruction" title={layoutReconstruction?.provider || 'Layout pipeline'}>
                  <div className="space-y-2">
                    <InfoRow
                      label="Status"
                      value={layoutStatus}
                      valueClassName={toneForStatus(layoutStatus)}
                    />
                    <InfoRow label="Run id" value={layoutReconstruction?.runId || 'Not started'} />
                    <InfoRow
                      label="Message"
                      value={layoutReconstruction?.message || 'Using the current floor plan asset as the seeded review source.'}
                    />
                  </div>
                </PanelCard>

                <PanelCard eyebrow="Automatic valuation" title="Interior-linked metrics">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <CoverageChip
                      label="Point estimate"
                      value={formatCurrency(report.valuation.valuation.pointEstimate)}
                    />
                    <CoverageChip
                      label="Confidence"
                      value={`${Math.round(report.valuation.valuation.confidence * 100)}%`}
                    />
                    <CoverageChip
                      label="Liquidity"
                      value={`${report.valuation.liquidity.resalePotentialIndex}/100`}
                    />
                    <CoverageChip
                      label="Days to sell"
                      value={`${report.valuation.liquidity.estimatedTimeToSell}`}
                    />
                  </div>
                </PanelCard>
              </>
            ) : null}

            {inspectorSection === 'media' ? (
              <>
                <PanelCard eyebrow="Uploaded plan" title={layoutAsset?.displayName || 'No floor plan attached'}>
                  {layoutAsset?.secureUrl ? (
                    <img
                      src={layoutAsset.secureUrl}
                      alt={layoutAsset.displayName}
                      className="h-56 w-full rounded-[18px] border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-6 text-center text-sm text-[#97ab95]">
                      No floor plan image is attached to this valuation yet.
                    </div>
                  )}
                </PanelCard>

                <PanelCard eyebrow="Captured media" title={`${photos.length} property photo${photos.length === 1 ? '' : 's'}`}>
                  <div className="space-y-3">
                    {photos.length === 0 ? (
                      <p className="text-sm text-[#97ab95]">No property photos are attached.</p>
                    ) : (
                      photos.slice(0, 4).map((photo, index) => (
                        <div
                          key={`${photo.url}-${index}`}
                          className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/20 p-2"
                        >
                          <img
                            src={photo.url}
                            alt={photo.label}
                            className="h-14 w-16 rounded-[12px] object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{photo.label}</p>
                            <p className="text-xs text-[#8fa48d]">Attached to valuation evidence</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PanelCard>
              </>
            ) : null}

            {inspectorSection === 'flags' ? (
              <>
                <PanelCard eyebrow="Flags" title={`${riskFlags.length} active risk flag${riskFlags.length === 1 ? '' : 's'}`}>
                  <div className="space-y-3">
                    {riskFlags.length === 0 ? (
                      <p className="text-sm text-[#97ab95]">No risk flags were attached.</p>
                    ) : (
                      riskFlags.map((flag) => (
                        <div
                          key={flag.flag}
                          className="rounded-[18px] border border-white/10 bg-black/20 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-white">{flag.flag}</p>
                            <Badge variant="outline" className="border-rose-300/18 bg-rose-300/10 text-rose-100">
                              {flag.severity}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#b3c5b1]">{flag.impact}</p>
                        </div>
                      ))
                    )}
                  </div>
                </PanelCard>

                <PanelCard eyebrow="Documents" title={`${warningCount} warning${warningCount === 1 ? '' : 's'}`}>
                  <div className="space-y-3">
                    {warningCount === 0 ? (
                      <p className="text-sm text-[#97ab95]">No document warnings were attached.</p>
                    ) : (
                      report.media.legalDocuments
                        .filter((document) => document.warnings.length > 0)
                        .map((document, index) => (
                          <div
                            key={`${document.displayName}-${index}`}
                            className="rounded-[18px] border border-white/10 bg-black/20 p-3"
                          >
                            <p className="text-sm font-semibold text-white">{document.displayName}</p>
                            <p className="mt-2 text-sm leading-6 text-[#ffcf94]">
                              {document.warnings.join(' • ')}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </PanelCard>
              </>
            ) : null}
          </div>

          <div className="mt-4 rounded-[26px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Valuation-safe editor mapping</p>
                <p className="mt-1 text-sm leading-6 text-[#a9bca7]">
                  This studio keeps the interior shell focused on evidence and property inputs. It
                  intentionally drops sales, upgrade, and generic design-product controls.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
