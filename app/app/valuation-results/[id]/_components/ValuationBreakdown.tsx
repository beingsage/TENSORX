/**
 * Valuation Breakdown - Waterfall Chart Component
 */

'use client';

import React from 'react';

interface AdjustmentData {
  label: string;
  amount: number;
  percentage: number;
  signal: string;
}

interface ValuationBreakdownProps {
  baseValuation: number;
  adjustments: AdjustmentData[];
  finalValuation: number;
  confidence: number;
}

export default function ValuationBreakdown({
  baseValuation,
  adjustments,
  finalValuation,
  confidence,
}: ValuationBreakdownProps) {
  const maxValue = Math.max(baseValuation, finalValuation) * 1.2;
  const scale = 100 / maxValue;

  return (
    <div className="w-full border rounded-lg bg-white p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-4">Valuation Breakdown</h3>

      {/* Waterfall Chart */}
      <div className="space-y-3 mb-6">
        {/* Base Valuation */}
        <div className="flex items-center gap-4">
          <div className="w-32 text-sm font-medium">Base Valuation</div>
          <div className="flex-1">
            <div
              className="bg-blue-500 h-8 rounded flex items-center justify-end pr-3 text-white text-xs font-bold"
              style={{ width: `${Math.min(100, baseValuation * scale)}%` }}
            >
              ₹{(baseValuation / 100000).toFixed(1)}L
            </div>
          </div>
        </div>

        {/* Adjustments */}
        {adjustments.map((adj, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium truncate">{adj.label}</div>
            <div className="flex-1">
              <div
                className={`h-6 rounded flex items-center justify-end pr-2 text-white text-xs font-semibold ${
                  adj.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.abs(adj.amount * scale))}%`,
                  marginLeft: adj.amount < 0 ? `${Math.abs(adj.amount * scale)}%` : '0',
                }}
              >
                {adj.amount > 0 ? '+' : ''}{adj.percentage.toFixed(1)}%
              </div>
            </div>
            <div className="w-20 text-xs text-gray-600">{adj.signal}</div>
          </div>
        ))}

        {/* Final Valuation */}
        <div className="flex items-center gap-4 pt-2 border-t-2">
          <div className="w-32 text-sm font-bold">Final Valuation</div>
          <div className="flex-1">
            <div
              className="bg-indigo-600 h-8 rounded flex items-center justify-end pr-3 text-white text-xs font-bold"
              style={{ width: `${Math.min(100, finalValuation * scale)}%` }}
            >
              ₹{(finalValuation / 100000).toFixed(1)}L
            </div>
          </div>
          <div className="w-20 text-xs text-indigo-600 font-semibold">
            {((finalValuation - baseValuation) / baseValuation) * 100 > 0 ? '+' : ''}
            {(((finalValuation - baseValuation) / baseValuation) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-600">Confidence Level</div>
          <div className="text-xl font-bold text-blue-600">{confidence.toFixed(0)}%</div>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-600">Net Adjustment</div>
          <div className="text-xl font-bold text-green-600">
            ₹{((finalValuation - baseValuation) / 100000).toFixed(1)}L
          </div>
        </div>
      </div>
    </div>
  );
}
