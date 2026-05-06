'use client';

import React from 'react';

interface ComponentMetric {
  name: string;
  loadTime: number;
  size: number;
  status: 'loaded' | 'loading' | 'pending';
  lazy: boolean;
}

interface PerformanceOptimizerProps {
  components?: ComponentMetric[];
}

export function PerformanceOptimizer({ components = [] }: PerformanceOptimizerProps) {
  if (components.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="font-bold text-lg mb-4">Panel Delivery Manifest</h3>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No panel delivery metadata is available for this valuation.
        </div>
      </div>
    );
  }

  const metrics = {
    totalSize: components.reduce((sum, component) => sum + component.size, 0),
    averageLoadTime: Math.round(
      components.reduce((sum, component) => sum + component.loadTime, 0) / components.length
    ),
    lazyCount: components.filter((component) => component.lazy).length,
    loadedCount: components.filter((component) => component.status === 'loaded').length,
  };

  const getStatusColor = (status: ComponentMetric['status']) => {
    switch (status) {
      case 'loaded':
        return 'bg-green-100 text-green-700';
      case 'loading':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h3 className="font-bold text-lg">Panel Delivery Manifest</h3>
        <p className="text-sm text-slate-500">
          Pipeline-reported delivery metadata for the valuation workspace panels.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-xs font-semibold text-blue-700 uppercase">Total Size</div>
          <div className="text-2xl font-bold text-blue-900 mt-2">{metrics.totalSize}KB</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-xs font-semibold text-green-700 uppercase">Avg Load Time</div>
          <div className="text-2xl font-bold text-green-900 mt-2">{metrics.averageLoadTime}ms</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-xs font-semibold text-purple-700 uppercase">Lazy Loaded</div>
          <div className="text-2xl font-bold text-purple-900 mt-2">
            {metrics.lazyCount}/{components.length}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-xs font-semibold text-orange-700 uppercase">Marked Loaded</div>
          <div className="text-2xl font-bold text-orange-900 mt-2">
            {metrics.loadedCount}/{components.length}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {components.map((component) => (
          <div key={component.name} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-slate-900">{component.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {component.loadTime}ms • {component.size}KB • {component.lazy ? 'lazy' : 'eager'}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-bold ${getStatusColor(component.status)}`}
              >
                {component.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
