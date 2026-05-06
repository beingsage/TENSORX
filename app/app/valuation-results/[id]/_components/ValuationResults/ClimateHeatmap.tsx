'use client';

import React, { useState } from 'react';

interface ClimateMetric {
  name: string;
  value: number;
  unit: string;
  icon: string;
  status: 'safe' | 'caution' | 'warning' | 'danger';
}

interface ClimateHeatmapProps {
  latitude: number;
  longitude: number;
  floodRisk?: number;
  earthquakeRisk?: number;
  heatStressRisk?: number;
  coldStressRisk?: number;
}

export function ClimateHeatmap({
  latitude,
  longitude,
  floodRisk = 0,
  earthquakeRisk = 0,
  heatStressRisk = 0,
  coldStressRisk = 0,
}: ClimateHeatmapProps) {
  const [activeMetric, setActiveMetric] = useState<string>('flood');

  const metrics: Record<string, ClimateMetric> = {
    flood: {
      name: 'Flood Risk',
      value: floodRisk * 100,
      unit: '%',
      icon: '🌊',
      status: floodRisk > 0.7 ? 'danger' : floodRisk > 0.5 ? 'warning' : floodRisk > 0.3 ? 'caution' : 'safe',
    },
    earthquake: {
      name: 'Earthquake Risk',
      value: earthquakeRisk * 100,
      unit: '%',
      icon: '🏚️',
      status: earthquakeRisk > 0.7 ? 'danger' : earthquakeRisk > 0.5 ? 'warning' : earthquakeRisk > 0.3 ? 'caution' : 'safe',
    },
    heat: {
      name: 'Heat Stress Risk',
      value: heatStressRisk * 100,
      unit: '%',
      icon: '🔥',
      status: heatStressRisk > 0.7 ? 'danger' : heatStressRisk > 0.5 ? 'warning' : heatStressRisk > 0.3 ? 'caution' : 'safe',
    },
    cold: {
      name: 'Cold Stress Risk',
      value: coldStressRisk * 100,
      unit: '%',
      icon: '❄️',
      status: coldStressRisk > 0.7 ? 'danger' : coldStressRisk > 0.5 ? 'warning' : coldStressRisk > 0.3 ? 'caution' : 'safe',
    },
  };

  const statusColors = {
    safe: { bg: 'bg-emerald-400/10', text: 'text-emerald-100', bar: 'bg-emerald-400' },
    caution: { bg: 'bg-amber-400/10', text: 'text-amber-100', bar: 'bg-amber-400' },
    warning: { bg: 'bg-orange-400/10', text: 'text-orange-100', bar: 'bg-orange-400' },
    danger: { bg: 'bg-rose-400/10', text: 'text-rose-100', bar: 'bg-rose-400' },
  };

  const activeMetricData = metrics[activeMetric];
  const colors = statusColors[activeMetricData.status];

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <h3 className="font-bold text-lg mb-4 text-white">Climate & Natural Hazards</h3>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {Object.entries(metrics).map(([key, metric]) => (
          <button
            key={key}
            onClick={() => setActiveMetric(key)}
            className={`border p-3 transition-all ${
              activeMetric === key
                ? 'border-[#27cf6c] bg-[#27cf6c]/10'
                : 'border-white/10 bg-white/5 hover:border-[#27cf6c]/45'
            }`}
          >
            <div className="text-2xl mb-1">{metric.icon}</div>
            <div className="text-xs font-semibold text-[#cfe2ca] text-center">
              {metric.name.split(' ')[0]}
            </div>
          </button>
        ))}
      </div>

      <div className={`${colors.bg} border border-white/10 p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-[#9fb29d] uppercase">Current Metric</div>
            <div className={`text-4xl font-bold ${colors.text} mt-2`}>
              {activeMetricData.value.toFixed(1)}
              {activeMetricData.unit}
            </div>
          </div>
          <div className="text-6xl">{activeMetricData.icon}</div>
        </div>
        <span
          className={`inline-block px-3 py-1 text-xs font-bold text-white ${
            activeMetricData.status === 'safe'
              ? 'bg-green-600'
              : activeMetricData.status === 'caution'
                ? 'bg-yellow-600'
                : activeMetricData.status === 'warning'
                  ? 'bg-orange-600'
                  : 'bg-red-600'
          }`}
        >
          {activeMetricData.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        <div className="font-semibold text-sm text-white">Risk Summary</div>
        {Object.entries(metrics).map(([key, metric]) => {
          const barColors = statusColors[metric.status];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{metric.icon}</span>
                  <span className="text-sm font-semibold text-[#cfe2ca]">{metric.name}</span>
                </div>
                <span className={`text-sm font-bold ${barColors.text}`}>{metric.value.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${barColors.bar}`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10 text-xs text-[#9fb29d]">
        Modeled for lat {latitude.toFixed(4)}, lon {longitude.toFixed(4)} from the valuation
        pipeline's live environmental feeds.
      </div>
    </div>
  );
}
