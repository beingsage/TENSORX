'use client';

import React, { useEffect, useState } from 'react';

interface HistoricalYear {
  year: number;
  description: string;
  image?: string;
  development: string;
  density: number;
}

interface HistoricalEvolutionProps {
  history?: HistoricalYear[];
}

export function HistoricalEvolution({ history = [] }: HistoricalEvolutionProps) {
  const [selectedYear, setSelectedYear] = useState(0);

  useEffect(() => {
    if (selectedYear >= history.length) {
      setSelectedYear(Math.max(0, history.length - 1));
    }
  }, [history.length, selectedYear]);

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="font-bold text-lg mb-4">Historical Evolution</h3>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No historical neighborhood timeline is available for this property yet.
        </div>
      </div>
    );
  }

  const currentYear = history[selectedYear];
  const firstYear = history[0];
  const densityDelta = currentYear.density - firstYear.density;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="font-bold text-lg mb-4">Historical Evolution</h3>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-slate-700">Timeline</label>
          <span className="text-2xl font-bold text-slate-900">{currentYear.year}</span>
        </div>
        <input
          type="range"
          min="0"
          max={history.length - 1}
          value={selectedYear}
          onChange={(event) => setSelectedYear(parseInt(event.target.value, 10))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Current density score</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{currentYear.density}%</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Change from first stage</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {densityDelta >= 0 ? '+' : ''}
            {densityDelta} pts
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Years covered</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {history[history.length - 1].year - firstYear.year}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 mb-6">
        <div className="font-semibold text-slate-900">
          {currentYear.year}: {currentYear.description}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{currentYear.development}</p>
      </div>

      <div className="space-y-3 mb-6">
        {history.map((item, index) => (
          <button
            key={item.year}
            onClick={() => setSelectedYear(index)}
            className={`w-full rounded-lg border p-4 text-left transition ${
              selectedYear === index
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900">{item.year}</div>
                <div className="text-sm text-slate-600 mt-1">{item.description}</div>
              </div>
              <div className="w-32">
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.max(0, Math.min(100, item.density))}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-xs font-semibold text-slate-500">
                  {item.density}%
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="font-semibold text-sm text-slate-900 mb-3">Density trend</div>
        <svg width="100%" height="140" viewBox="0 0 600 140" className="w-full">
          <polyline
            points={history
              .map((item, index) => {
                const x = 40 + (index / Math.max(1, history.length - 1)) * 520;
                const y = 110 - item.density * 0.8;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {history.map((item, index) => {
            const x = 40 + (index / Math.max(1, history.length - 1)) * 520;
            const y = 110 - item.density * 0.8;
            return (
              <g key={`point-${item.year}`}>
                <circle cx={x} cy={y} r="4" fill="#2563EB" />
                <text x={x} y="132" textAnchor="middle" fontSize="11" fill="#64748B">
                  {item.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
