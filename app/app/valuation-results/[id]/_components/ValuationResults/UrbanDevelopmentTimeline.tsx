'use client';

import React, { useState } from 'react';

interface DevelopmentProject {
  name: string;
  year: number;
  status: 'planned' | 'under_construction' | 'completed';
  type: string;
  icon: string;
  distance: number;
  impact: string;
}

interface UrbanDevelopmentTimelineProps {
  projects?: DevelopmentProject[];
}

export function UrbanDevelopmentTimeline({ projects }: UrbanDevelopmentTimelineProps) {
  const [expandedProject, setExpandedProject] = useState<number | null>(null);

  const displayProjects = projects || [];
  if (displayProjects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="font-bold text-lg mb-4">Urban Development Timeline</h3>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No mapped development pipeline is available for this area yet.
        </div>
      </div>
    );
  }

  const sortedProjects = [...displayProjects].sort((a, b) => a.year - b.year);
  const minYear = Math.min(...sortedProjects.map(p => p.year));
  const maxYear = Math.max(...sortedProjects.map(p => p.year)) + 2;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="font-bold text-lg mb-4">Urban Development Timeline</h3>

      {/* Timeline visualization */}
      <div className="mb-6 overflow-x-auto pb-4">
        <svg width={Math.max(600, (maxYear - minYear) * 80)} height={300} className="min-w-full">
          {/* Timeline axis */}
          <line x1="40" y1="150" x2={Math.max(600, (maxYear - minYear) * 80) - 20} y2="150" stroke="#e5e7eb" strokeWidth="2" />

          {/* Year markers */}
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((year) => {
            const x = 40 + (year - minYear) * 80;
            return (
              <g key={year}>
                <line x1={x} y1="145" x2={x} y2="155" stroke="#d1d5db" strokeWidth="2" />
                <text x={x} y="170" textAnchor="middle" className="text-xs" fill="#6b7280">
                  {year}
                </text>
              </g>
            );
          })}

          {/* Projects */}
          {sortedProjects.map((project, idx) => {
            const x = 40 + (project.year - minYear) * 80;
            const y = 80 + (idx % 3) * 40;
            const statusColor =
              project.status === 'completed'
                ? '#10B981'
                : project.status === 'under_construction'
                  ? '#F59E0B'
                  : '#0066CC';

            return (
              <g key={idx} style={{ cursor: 'pointer' }} onClick={() => setExpandedProject(expandedProject === idx ? null : idx)}>
                {/* Connecting line */}
                <line x1={x} y1="155" x2={x} y2={y} stroke={statusColor} strokeWidth="2" opacity="0.5" />

                {/* Project marker */}
                <circle cx={x} cy={y} r="16" fill={statusColor} opacity="0.9" />
                <text x={x} y={y + 5} textAnchor="middle" className="text-xl" dominantBaseline="middle">
                  {project.icon}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Projects list */}
      <div className="space-y-3">
        <div className="font-semibold text-sm text-slate-700 mb-3">Projects by Timeline</div>
        {sortedProjects.map((project, idx) => (
          <div
            key={idx}
            onClick={() => setExpandedProject(expandedProject === idx ? null : idx)}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
              expandedProject === idx
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl">{project.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{project.name}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">{project.type}</span> • {project.distance} km away
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-slate-900">{project.year}</div>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap mt-1 ${
                    project.status === 'completed'
                      ? 'bg-green-600'
                      : project.status === 'under_construction'
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                  }`}
                >
                  {project.status === 'completed'
                    ? '✓ Completed'
                    : project.status === 'under_construction'
                      ? '🔨 Under Construction'
                      : '📋 Planned'}
                </span>
              </div>
            </div>

            {/* Expanded details */}
            {expandedProject === idx && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 uppercase mb-1">Impact</div>
                  <div className="text-sm text-slate-700">{project.impact}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-xs font-semibold text-slate-600">Distance</div>
                    <div className="text-lg font-bold text-slate-900 mt-1">{project.distance}km</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-xs font-semibold text-slate-600">Timeline</div>
                    <div className="text-lg font-bold text-slate-900 mt-1">{project.year}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 italic pt-2">
                  {project.status === 'completed' && 'This project has been completed and is already impacting the neighborhood.'}
                  {project.status === 'under_construction' && 'This project is currently under construction and should be completed soon.'}
                  {project.status === 'planned' && 'This project is in the planning phase and may impact future property values.'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-3">
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="text-xs font-semibold text-green-700 uppercase">Completed</div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {displayProjects.filter(p => p.status === 'completed').length}
          </div>
        </div>
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 uppercase">In Progress</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">
            {displayProjects.filter(p => p.status === 'under_construction').length}
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-xs font-semibold text-blue-700 uppercase">Planned</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {displayProjects.filter(p => p.status === 'planned').length}
          </div>
        </div>
      </div>

      {/* Outlook */}
      <div className="mt-6 pt-6 border-t">
        <div className="font-semibold text-sm mb-2">Neighborhood Outlook</div>
        <div className="text-sm text-slate-600">
          <p className="mb-2">
            This property is in a rapidly developing area with {displayProjects.length} major projects planned or underway in the next 2 years.
          </p>
          <p>
            Expected impact: <span className="font-semibold text-green-700">Positive growth trajectory</span>
          </p>
        </div>
      </div>
    </div>
  );
}
