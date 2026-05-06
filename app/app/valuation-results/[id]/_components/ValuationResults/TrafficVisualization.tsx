'use client';

import React, { useEffect, useState } from 'react';

interface TrafficData {
  hour: number;
  congestion: number;
}

interface TrafficVisualizationProps {
  data?: TrafficData[];
}

export function TrafficVisualization({ data = [] }: TrafficVisualizationProps) {
  const [selectedHour, setSelectedHour] = useState(12);

  useEffect(() => {
    if (!data.some((entry) => entry.hour === selectedHour) && data.length > 0) {
      setSelectedHour(data[0].hour);
    }
  }, [data, selectedHour]);

  if (data.length === 0) {
    return (
      <div className="bg-[#071008] p-6 text-[#edf9eb]">
        <h3 className="font-bold text-lg mb-4 text-white">Traffic Pressure Model</h3>
        <div className="border border-dashed border-[#27cf6c]/30 bg-white/5 p-6 text-sm text-[#cfe2ca]">
          No traffic pattern data is available for this property.
        </div>
      </div>
    );
  }

  const current = data.find((entry) => entry.hour === selectedHour) || data[0];
  const peak = data.reduce((best, entry) => (entry.congestion > best.congestion ? entry : best), data[0]);
  const quiet = data.reduce((best, entry) => (entry.congestion < best.congestion ? entry : best), data[0]);
  const average = Math.round(data.reduce((sum, entry) => sum + entry.congestion, 0) / data.length);

  const getCongestionColor = (value: number) => {
    if (value >= 80) return 'bg-red-500';
    if (value >= 60) return 'bg-orange-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getCongestionTone = (value: number) => {
    if (value >= 80) return 'Heavy';
    if (value >= 60) return 'Moderate';
    if (value >= 40) return 'Elevated';
    return 'Light';
  };

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-white">Traffic Pressure Model</h3>
        <span className="bg-white/10 px-3 py-1 text-xs font-semibold text-[#cfe2ca]">
          {String(current.hour).padStart(2, '0')}:00 • {getCongestionTone(current.congestion)}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-[#cfe2ca]">Hour of day</label>
          <span className="text-lg font-bold text-white">
            {String(selectedHour).padStart(2, '0')}:00
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="23"
          value={selectedHour}
          onChange={(event) => setSelectedHour(parseInt(event.target.value, 10))}
          className="w-full h-2 bg-white/10 appearance-none cursor-pointer"
        />
      </div>

      <div className="mb-6 border border-white/10 bg-white/5 p-4">
        <div className="font-semibold text-sm text-white mb-3">24-hour congestion profile</div>
        <div className="flex items-end gap-1 h-40">
          {data.map((entry) => (
            <button
              key={entry.hour}
              onClick={() => setSelectedHour(entry.hour)}
              className={`flex-1 transition ${getCongestionColor(entry.congestion)} ${
                entry.hour === current.hour ? 'ring-2 ring-slate-300' : ''
              }`}
              style={{ height: `${Math.max(8, entry.congestion)}%` }}
              title={`${String(entry.hour).padStart(2, '0')}:00 • ${entry.congestion}%`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-[#9fb29d]">
          <span>00:00</span>
          <span>12:00</span>
          <span>23:00</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Average</div>
          <div className="mt-2 text-2xl font-bold text-white">{average}%</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Peak Hour</div>
          <div className="mt-2 text-2xl font-bold text-white">
            {String(peak.hour).padStart(2, '0')}:00
          </div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Quietest Hour</div>
          <div className="mt-2 text-2xl font-bold text-white">
            {String(quiet.hour).padStart(2, '0')}:00
          </div>
        </div>
      </div>
    </div>
  );
}
