'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface LiquidityGaugeProps {
  daysToSell: number;
  absorptionRate: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  resalePotentialIndex?: number;
  minDays?: number;
  maxDays?: number;
  medianDays?: number;
}

function riskLabel(riskLevel: LiquidityGaugeProps['riskLevel']) {
  if (riskLevel === 'critical') return 'Critical';
  if (riskLevel === 'high') return 'High';
  if (riskLevel === 'medium') return 'Moderate';
  return 'Low';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function LiquidityGauge({
  daysToSell,
  absorptionRate,
  riskLevel,
  resalePotentialIndex = Math.round(clamp(absorptionRate * 100, 0, 100)),
  minDays,
  maxDays,
  medianDays,
}: LiquidityGaugeProps) {
  const [displayDays, setDisplayDays] = useState(0);
  const [displayAbsorption, setDisplayAbsorption] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const timeRange = useMemo(() => {
    const low = Math.max(1, Math.round(minDays ?? daysToSell * 0.72));
    const high = Math.max(low + 1, Math.round(maxDays ?? daysToSell * 1.35));
    const median = Math.round(medianDays ?? daysToSell);
    return { low, high, median: clamp(median, low, high) };
  }, [daysToSell, maxDays, medianDays, minDays]);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplayDays(daysToSell);
      setDisplayAbsorption(absorptionRate * 100);
      setDisplayIndex(resalePotentialIndex);
      return;
    }

    const startedAt = performance.now();
    const duration = 1700;
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayDays(Math.round(daysToSell * eased));
      setDisplayAbsorption(absorptionRate * 100 * eased);
      setDisplayIndex(Math.round(resalePotentialIndex * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [absorptionRate, daysToSell, resalePotentialIndex]);

  const index = clamp(resalePotentialIndex, 0, 100);
  const arcOffset = mounted ? 100 - index : 100;
  const band = index >= 80 ? 'STRONG' : index >= 50 ? 'MODERATE' : 'THIN';
  const midpointOffset =
    ((timeRange.median - timeRange.low) / Math.max(1, timeRange.high - timeRange.low)) * 100;

  return (
    <div className="surface-grain border border-[var(--outline-variant)] bg-[var(--surface-container)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="metadata-label">Resale Potential Index</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--on-surface)]">
            Liquidity and market speed
          </h3>
        </div>
        <span className="tag-confidence">{riskLabel(riskLevel)} risk</span>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <svg
          width="220"
          height="140"
          viewBox="0 0 220 140"
          aria-label={`Resale potential index ${index} out of 100`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="resaleGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--error)" />
              <stop offset="55%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--success)" />
            </linearGradient>
          </defs>
          <path
            d="M 30 110 A 80 80 0 0 1 190 110"
            pathLength={100}
            fill="none"
            stroke="var(--surface-container-high)"
            strokeWidth={12}
            strokeLinecap="round"
          />
          <path
            d="M 30 110 A 80 80 0 0 1 190 110"
            pathLength={100}
            fill="none"
            stroke="url(#resaleGaugeGradient)"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={arcOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-[var(--ease-emphasized)]"
          />
          <text
            x="110"
            y="86"
            textAnchor="middle"
            className="fill-[var(--on-surface)] font-[family-name:var(--font-heading)] text-[56px] font-bold"
          >
            {displayIndex}
          </text>
          <text
            x="110"
            y="113"
            textAnchor="middle"
            className="fill-[var(--on-surface-variant)] font-[family-name:var(--font-data)] text-[11px] font-semibold tracking-[0.08em]"
          >
            {band}
          </text>
        </svg>

        <div className="mt-1 flex gap-2" aria-hidden="true">
          {[20, 40, 60, 80, 100].map((threshold) => (
            <span
              key={threshold}
              className="h-2 w-2 rounded-[var(--radius-full)] border border-[var(--outline-variant)]"
              style={{
                background: index >= threshold ? 'var(--primary)' : 'var(--surface-container-high)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-4">
          <p className="metadata-label">Days to Sell</p>
          <p data-metric-value className="mt-2 text-3xl font-bold text-[var(--on-surface)]">
            {displayDays}
          </p>
          <p className="mt-2 text-xs text-[var(--on-surface-variant)]">
            Estimated time to liquidate
          </p>
        </div>

        <div className="border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-4">
          <p className="metadata-label">Absorption</p>
          <p data-metric-value className="mt-2 text-3xl font-bold text-[var(--primary)]">
            {displayAbsorption.toFixed(0)}%
          </p>
          <p className="mt-2 text-xs text-[var(--on-surface-variant)]">
            Market velocity signal
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="metadata-label">Time to Liquidate</p>
          <p data-metric-value className="text-sm font-semibold text-[var(--on-surface)]">
            {timeRange.low} - {timeRange.high} days
          </p>
        </div>
        <div className="relative h-14">
          <div className="absolute left-0 right-0 top-6 h-1.5 rounded-[var(--radius-full)] bg-[var(--surface-container-high)]" />
          <div className="range-fill absolute left-0 right-0 top-6 h-1.5 rounded-[var(--radius-full)] bg-[rgba(255,173,227,0.6)]" />
          <div className="absolute top-0 font-[family-name:var(--font-data)] text-[11px] text-[var(--on-surface-variant)]">
            {timeRange.low}d
          </div>
          <div className="absolute right-0 top-0 font-[family-name:var(--font-data)] text-[11px] text-[var(--on-surface-variant)]">
            {timeRange.high}d
          </div>
          <div
            className="absolute top-1 h-12 border-l border-dashed border-[var(--secondary)]"
            style={{ left: `${midpointOffset}%` }}
          >
            <span className="absolute left-2 top-0 whitespace-nowrap border border-[var(--outline-variant)] bg-[var(--surface-container-high)] px-2 py-1 font-[family-name:var(--font-data)] text-[11px] text-[var(--secondary)]">
              ~{timeRange.median}d avg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
