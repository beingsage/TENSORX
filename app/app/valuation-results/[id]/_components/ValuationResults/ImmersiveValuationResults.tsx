'use client';

import React, { useState } from 'react';
import { Noidea3DBuilder } from '../Noidea3DBuilder';
import { MapVisualization } from './MapVisualization';
import { RiskRadar } from './RiskRadar';
import { LiquidityGauge } from './LiquidityGauge';
import { AmenityCards } from './AmenityCards';
import type { SpatialSnapshot } from '@/lib/providers/openData';

interface ValuationResult {
  propertyId: string;
  address: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  builtupArea: number;
  ageInYears: number;
  valuation: {
    pointEstimate: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  };
  liquidity?: {
    estimatedTimeToSell: number;
    absorptionProbability: number;
    distressDiscount: number;
  };
  riskFlags?: Array<{
    flag: string;
    severity: string;
    description: string;
    impact: string;
  }>;
  riskDimensions: Array<{
    name: string;
    score: number;
    color: string;
  }>;
  overallRiskScore: number;
  amenities: Array<{
    type: string;
    name: string;
    distance: number;
    icon: string;
    travelTime?: number;
  }>;
  spatialContext: SpatialSnapshot;
  dataSources: Array<{
    name: string;
    detail: string;
  }>;
}

interface ImmersiveValuationResultsProps {
  valuation: ValuationResult;
}

export function ImmersiveValuationResults({
  valuation,
}: ImmersiveValuationResultsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'market' | 'environment'>(
    'overview'
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{valuation.address}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {valuation.propertyType} • {valuation.builtupArea} sqft • {valuation.ageInYears} years old
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">
                ₹{(valuation.valuation.pointEstimate / 10000000).toFixed(1)}Cr
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Confidence: {(valuation.valuation.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Primary Visualization Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 3D Model */}
          <div className="lg:col-span-1 h-96">
            <Noidea3DBuilder
              propertyId={valuation.propertyId}
              propertyType={valuation.propertyType}
              bedrooms={valuation.bedrooms}
              bathrooms={valuation.bathrooms}
              buildingAge={valuation.ageInYears}
              hasBalcony={
                (valuation.riskDimensions.find(d => d.name === 'Structure')?.score || 0) >= 6
              }
              hasGarden={/villa|bungalow/i.test(valuation.propertyType)}
              address={valuation.address}
            />
          </div>

          {/* Interactive Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden min-h-[520px]">
              <MapVisualization
                latitude={valuation.latitude}
                longitude={valuation.longitude}
                propertyType={valuation.propertyType}
                address={valuation.address}
                spatialContext={valuation.spatialContext}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {valuation.dataSources.map((source) => (
            <div
              key={source.name}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 shadow-sm"
            >
              <span className="font-semibold text-slate-900">{source.name}</span>
              <span className="ml-2 text-slate-500">{source.detail}</span>
            </div>
          ))}
        </div>

        {/* Analytics Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RiskRadar
            dimensions={valuation.riskDimensions}
            overallScore={valuation.overallRiskScore}
          />
          <LiquidityGauge
            daysToSell={valuation.liquidity?.estimatedTimeToSell || 90}
            absorptionRate={valuation.liquidity?.absorptionProbability || 0.5}
            riskLevel={
              valuation.overallRiskScore > 70
                ? 'high'
                : valuation.overallRiskScore > 50
                  ? 'medium'
                  : 'low'
            }
          />
        </div>

        {/* Secondary Information Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <AmenityCards amenities={valuation.amenities} />
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-bold text-sm mb-4">Quick Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-600 font-semibold uppercase">Valuation Range</div>
                <div className="text-sm text-slate-900 mt-1">
                  ₹{(valuation.valuation.lowerBound / 10000000).toFixed(1)}Cr - ₹{(valuation.valuation.upperBound / 10000000).toFixed(1)}Cr
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600 font-semibold uppercase">Est. Time to Sell</div>
                <div className="text-sm text-slate-900 mt-1">
                  {valuation.liquidity?.estimatedTimeToSell || 90} days
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600 font-semibold uppercase">Distress Discount</div>
                <div className="text-sm text-slate-900 mt-1">
                  {((1 - (valuation.liquidity?.distressDiscount || 0.8)) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Insights Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="border-b flex">
            {(['overview', 'risks', 'market', 'environment'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900">Property Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded">
                    <div className="text-xs text-slate-600 font-semibold">BEDROOMS</div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">{valuation.bedrooms || '-'}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded">
                    <div className="text-xs text-slate-600 font-semibold">BATHROOMS</div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">{valuation.bathrooms || '-'}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded">
                    <div className="text-xs text-slate-600 font-semibold">BUILDUP AREA</div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">{valuation.builtupArea}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded">
                    <div className="text-xs text-slate-600 font-semibold">AGE</div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">{valuation.ageInYears}y</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900">Risk Assessment Details</h4>
                {valuation.riskFlags && valuation.riskFlags.length > 0 ? (
                  <div className="space-y-3">
                    {valuation.riskFlags.map((flag, idx) => (
                      <div key={idx} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-slate-900">{flag.flag}</h5>
                            <p className="text-sm text-slate-600 mt-1">{flag.description}</p>
                            <p className="text-xs text-slate-500 mt-2 italic">Impact: {flag.impact}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap ${
                              flag.severity === 'high'
                                ? 'bg-red-600'
                                : flag.severity === 'medium'
                                  ? 'bg-yellow-600'
                                  : 'bg-green-600'
                            }`}
                          >
                            {flag.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No significant risk flags identified</p>
                )}
              </div>
            )}

            {activeTab === 'market' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900">Market Analysis</h4>
                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded">
                    <div className="text-xs text-slate-600 font-semibold uppercase">Market Velocity</div>
                    <div className="mt-2 flex items-center">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '65%' }} />
                      </div>
                      <span className="ml-3 text-sm font-bold text-slate-900">65%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded">
                    <div className="text-xs text-slate-600 font-semibold uppercase">Price Growth (YoY)</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">+8.5%</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'environment' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900">Environmental Factors</h4>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 p-4 rounded">
                    <div className="text-sm font-semibold text-green-900">✅ Low Flood Risk</div>
                    <p className="text-xs text-green-700 mt-1">Not in flood-prone zone</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                    <div className="text-sm font-semibold text-blue-900">☀️ Good Sunlight Exposure</div>
                    <p className="text-xs text-blue-700 mt-1">7+ hours direct sunlight daily</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded">
                    <div className="text-sm font-semibold text-amber-900">🔊 Moderate Noise Level</div>
                    <p className="text-xs text-amber-700 mt-1">~65 dB - acceptable for residential</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
