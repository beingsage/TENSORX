'use client';

/**
 * MAP DIAGNOSTIC PAGE
 * 
 * Drop this file into your Next.js app at:
 *   app/map-test/page.tsx   (App Router)
 *   OR
 *   pages/map-test.tsx      (Pages Router)
 * 
 * Then visit http://localhost:3000/map-test
 * 
 * This strips out ALL deck.gl/overlay logic. If tiles appear here,
 * the bug is in MapboxOverlay or buildLayers(). If still gray, the
 * bug is in your Next.js setup (CSS import, canvas, SSR).
 */

import { useEffect, useRef, useState } from 'react';

const TESTS = [
  {
    label: 'OSM Raster (inline style)',
    style: {
      version: 8 as const,
      sources: {
        osm: {
          type: 'raster' as const,
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
    },
  },
  {
    label: 'MapLibre Demo Tiles (vector)',
    style: 'https://demotiles.maplibre.org/style.json',
  },
  {
    label: 'OpenFreeMap Liberty (vector)',
    style: 'https://tiles.openfreemap.org/styles/liberty',
  },
];

export default function MapDiagnosticPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [activeTest, setActiveTest] = useState(0);
  const [log, setLog] = useState<string[]>(['Click a style to test it.']);

  const addLog = (msg: string) =>
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));

  useEffect(() => {
    // Cleanup previous map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (!containerRef.current) return;

    addLog(`Loading style: ${TESTS[activeTest].label}`);

    import('maplibre-gl').then(mod => {
      const maplibregl = mod.default || mod;
      addLog(`maplibre-gl imported OK`);

      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: TESTS[activeTest].style as any,
        center: [77.5946, 12.9716], // Bangalore
        zoom: 12,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => addLog('✅ map "load" event fired — tiles should be visible'));
      map.on('styledata', () => addLog('ℹ️ "styledata" fired'));
      map.on('sourcedataloading', () => addLog('ℹ️ source data loading...'));
      map.on('sourcedata', (e: any) => {
        if (e.isSourceLoaded) addLog(`✅ source "${e.sourceId}" loaded`);
      });
      map.on('error', (e: any) => addLog(`❌ error: ${e.error?.message || JSON.stringify(e)}`));
      map.on('tiledataloading', () => addLog('ℹ️ tile data loading...'));
    }).catch(err => addLog(`❌ import failed: ${err}`));

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [activeTest]);

  return (
    <div style={{ fontFamily: 'monospace', padding: 16, background: '#0f0f0f', minHeight: '100vh', color: '#e0e0e0' }}>
      <h1 style={{ color: '#facc15', marginBottom: 12 }}>🗺 MapLibre Diagnostic</h1>

      {/* Style selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TESTS.map((t, i) => (
          <button
            key={i}
            onClick={() => { setLog([]); setActiveTest(i); }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: i === activeTest ? '#facc15' : '#333',
              color: i === activeTest ? '#000' : '#fff',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Map container — explicit px height, no h-full */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 400,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #333',
          background: '#1a1a1a',
        }}
      />

      {/* Event log */}
      <div style={{ marginTop: 12 }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>EVENT LOG (newest first)</div>
        <div style={{
          background: '#111',
          borderRadius: 6,
          padding: 10,
          maxHeight: 200,
          overflowY: 'auto',
          fontSize: 11,
          lineHeight: '1.8',
        }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: l.includes('❌') ? '#f87171' : l.includes('✅') ? '#4ade80' : '#a0aec0' }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* What to look for */}
      <div style={{ marginTop: 12, fontSize: 11, color: '#666', lineHeight: '1.8' }}>
        <div style={{ color: '#facc15', marginBottom: 4 }}>WHAT TO CHECK:</div>
        <div>• OSM Raster shows tiles → MapLibre + CSS work fine, bug is in your vector style/deck.gl overlay</div>
        <div>• OSM Raster also gray → CSS not loading, canvas broken, or SSR rendering the map on the server</div>
        <div>• Error: "Cannot read properties of undefined" → maplibre-gl import failed (check next.config.js transpilePackages)</div>
        <div>• Error: 401/403 on tile URLs → network/CORS issue</div>
        <div>• "load" fires but gray → container has zero size at paint time (classic h-full collapse)</div>
      </div>
    </div>
  );
}