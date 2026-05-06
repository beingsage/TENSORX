'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Script from 'next/script';
import { UUID, WallDefinition, RenderEngineType, FurnitureDefinition, RoomDefinition, HomeDefinition, CommandType } from '@/lib/architecture/types';
import { useRenderingEngine } from '@/lib/architecture/useRenderingEngine';
import { StorageManager } from '@/lib/architecture/storage';

const CATALOG = [
  { catalogId: 'chair', name: 'Chair', width: 1.0, depth: 1.0, height: 1.0, color: '#1f77b4' },
  { catalogId: 'table', name: 'Table', width: 1.6, depth: 1.2, height: 0.8, color: '#8c564b' },
  { catalogId: 'sofa', name: 'Sofa', width: 2.0, depth: 1.0, height: 0.85, color: '#2ca02c' },
  { catalogId: 'bed', name: 'Bed', width: 2.0, depth: 1.8, height: 0.65, color: '#9467bd' },
];

const id = () => `id-${Math.random().toString(36).slice(2, 11)}`;
const toUUID = (source: string): UUID => source as UUID;

function detectRoomsFromWalls(walls: WallDefinition[]) {
  if (walls.length < 4) return [];
  const allWallIds = walls.map((w) => w.id);
  return [
    {
      id: toUUID(`room-${id()}`),
      name: 'As-built room',
      wallIds: allWallIds,
      floorMaterial: { color: '#e2dfd2' },
      ceilingMaterial: { color: '#f7f2eb' },
    },
  ];
}

export default function RoomDesignerPage() {
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);

  const [selectedEngine, setSelectedEngine] = useState<RenderEngineType>(RenderEngineType.THREEJS);
  const [projectName, setProjectName] = useState('untitled-project');
  const [projects, setProjects] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');

  const [walls, setWalls] = useState<WallDefinition[]>([]);
  const [furniture, setFurniture] = useState<FurnitureDefinition[]>([]);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(CATALOG[0].catalogId);
  const [selectedObject, setSelectedObject] = useState<{ type: 'wall' | 'furniture'; id: string } | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, rotation: 0, scale: 1 });
  const [message, setMessage] = useState('');

  const { adapter, home, isLoading, error, executeCommand, undo, redo, on, initializeWithCanvas, loadHome, saveHome: saveHomeCommand, exportHome } =
    useRenderingEngine({ engineType: selectedEngine });

  const roomDefinitions = useMemo(() => detectRoomsFromWalls(walls), [walls]);

  const currentHome = useMemo<HomeDefinition>(() => ({
    id: toUUID(`home-${projectName}-${Date.now()}`),
    name: projectName,
    walls,
    furniture,
    rooms: roomDefinitions.map((room) => ({ ...room, id: toUUID(room.id) })),
    dimensions: [],
    camera: { position: { x: 0, y: 10, z: 15 }, target: { x: 0, y: 0, z: 0 }, zoom: 1 },
    environment: { backgroundColor: '#dddddd' },
  }), [projectName, walls, furniture, roomDefinitions]);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  useEffect(() => {
    const init = async () => {
      if (!canvas3DRef.current || !adapter) return;
      try {
        await initializeWithCanvas(canvas3DRef.current);
        showMessage(`Engine initialized: ${selectedEngine}`);
      } catch (err) {
        showMessage(`Adapter init failed: ${String(err)}`);
        setSyncStatus('error');
      }
    };
    init();
  }, [adapter, selectedEngine, initializeWithCanvas]);

  useEffect(() => {
    const subs: (() => void)[] = [];
    if (adapter) {
      subs.push(
        on('wall-created', () => {
          setSyncStatus('synced');
          showMessage('Wall created');
        }),
      );
      subs.push(
        on('furniture-created', () => {
          setSyncStatus('synced');
          showMessage('Furniture created');
        }),
      );
      subs.push(
        on('error', (event: any) => {
          setSyncStatus('error');
          showMessage(event?.message || 'Error from adapter');
        }),
      );
    }
    return () => subs.forEach((fn) => fn());
  }, [adapter, on]);

  useEffect(() => {
    const loadProjects = async () => {
      const storage = new StorageManager();
      setProjects(await storage.list());
    };
    loadProjects();
  }, []);

  // Blueprint3D initialization
  useEffect(() => {
    const initBlueprint3D = () => {
      if (typeof window !== 'undefined' && (window as any).BP3D) {
        const opts = {
          floorplannerElement: 'floorplanner-canvas',
          threeElement: '#viewer',
          threeCanvasElement: 'viewer-canvas',
          textureDir: "rooms/textures/",
          widget: false
        };
        const blueprint3d = new (window as any).BP3D.Blueprint3d(opts);
        // Additional setup if needed
      }
    };
    // Delay to ensure scripts are loaded
    const timer = setTimeout(initBlueprint3D, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // grid
    ctx.strokeStyle = '#e8e8e8';
    for (let x = 0; x <= rect.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rect.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // walls
    ctx.lineWidth = 3;
    walls.forEach((w) => {
      ctx.strokeStyle = selectedObject?.type === 'wall' && selectedObject.id === w.id ? '#ff6666' : '#333333';
      ctx.beginPath();
      ctx.moveTo(w.startPoint.x, w.startPoint.y);
      ctx.lineTo(w.endPoint.x, w.endPoint.y);
      ctx.stroke();
    });

    // furniture
    furniture.forEach((f) => {
      const catalog = CATALOG.find((item) => item.catalogId === f.catalogId) || CATALOG[0];
      const color = catalog.color;
      ctx.fillStyle = f.catalogId && selectedObject?.type === 'furniture' && selectedObject.id === f.id ? '#ffaa00' : color;
      ctx.strokeStyle = '#222222';
      const x = f.position.x;
      const y = f.position.y;
      const w = (f.width || 1) * (f.scale || 1) * 30;
      const h = (f.depth || 1) * (f.scale || 1) * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((f.rotation || 0) * Math.PI) / 180);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    });

    // annotations
    ctx.fillStyle = '#333333';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Walls: ${walls.length}    Furniture: ${furniture.length}    Rooms: ${roomDefinitions.length}`, 10, 16);
  }, [walls, furniture, roomDefinitions, selectedObject]);

  useEffect(() => {
    const sync = async () => {
      if (!adapter || !home) return;
      await adapter.loadHome(home);
    };
    sync();
  }, [adapter, home]);

  const addWall = async () => {
    const lastWall = walls[walls.length - 1];
    const amount = walls.length + 1;
    const startX = 50 + amount * 30;
    const startY = 80;
    const endX = startX + 120;
    const endY = 80;
    const newWall: WallDefinition = {
      id: toUUID(id()),
      startPoint: { x: startX, y: startY },
      endPoint: { x: endX, y: endY },
      thickness: 10,
      height: 250,
      material: { color: '#ddd' },
    };

    setWalls((prev) => [...prev, newWall]);
    await executeCommand(CommandType.CREATE_WALL, newWall);
    setSyncStatus('pending');
  };

  const addFurniture = async () => {
    const catalog = CATALOG.find((item) => item.catalogId === selectedCatalogItem) || CATALOG[0];
    const newItem: FurnitureDefinition = {
      id: toUUID(id()),
      catalogId: catalog.catalogId,
      position: { x: 200 + furniture.length * 20, y: 180 + furniture.length * 10, z: 0 },
      rotation: 0,
      scale: 1,
      width: catalog.width,
      depth: catalog.depth,
      height: catalog.height,
    };

    setFurniture((prev) => [...prev, newItem]);
    await executeCommand(CommandType.CREATE_FURNITURE, newItem);
    setSyncStatus('pending');
  };

  const selectEntityAt = (x: number, y: number) => {
    const foundFurniture = furniture.find((f) => {
      const size = 30 * (f.scale || 1);
      const centreX = f.position.x;
      const centreY = f.position.y;
      return Math.abs(x - centreX) < size && Math.abs(y - centreY) < size;
    });

    if (foundFurniture) {
      setSelectedObject({ type: 'furniture', id: foundFurniture.id });
      setTransform({ x: foundFurniture.position.x, y: foundFurniture.position.y, rotation: foundFurniture.rotation || 0, scale: foundFurniture.scale || 1 });
      return;
    }

    const foundWall = walls.find((w) => {
      const dx = w.endPoint.x - w.startPoint.x;
      const dy = w.endPoint.y - w.startPoint.y;
      const dist = Math.abs((dx * (w.startPoint.y - y) - dy * (w.startPoint.x - x)) / Math.sqrt(dx * dx + dy * dy));
      return dist < 8;
    });

    if (foundWall) {
      setSelectedObject({ type: 'wall', id: foundWall.id });
      setTransform({ x: foundWall.startPoint.x, y: foundWall.startPoint.y, rotation: 0, scale: 1 });
    }
  };

  const applyTransform = async () => {
    if (!selectedObject) {
      showMessage('Select object first');
      return;
    }

    if (selectedObject.type === 'furniture') {
      setFurniture((prev) =>
        prev.map((f) =>
          f.id === selectedObject.id
            ? { ...f, position: { x: transform.x, y: transform.y, z: 0 }, rotation: transform.rotation, scale: transform.scale }
            : f,
        ),
      );

      await executeCommand(CommandType.UPDATE_FURNITURE, {
        furnitureId: selectedObject.id,
        position: { x: transform.x, y: transform.y, z: 0 },
        rotation: transform.rotation,
        scale: transform.scale,
      });
    }

    if (selectedObject.type === 'wall') {
      const wall = walls.find((w) => w.id === selectedObject.id);
      if (!wall) return;
      const dx = transform.x - wall.startPoint.x;
      const dy = transform.y - wall.startPoint.y;
      const movedWall = {
        ...wall,
        startPoint: { x: wall.startPoint.x + dx, y: wall.startPoint.y + dy },
        endPoint: { x: wall.endPoint.x + dx, y: wall.endPoint.y + dy },
      };

      setWalls((prev) => prev.map((w) => (w.id === wall.id ? movedWall : w)));

      await executeCommand(CommandType.UPDATE_WALL, {
        wallId: wall.id,
        startPoint: movedWall.startPoint,
        endPoint: movedWall.endPoint,
      });
    }

    showMessage('Transform applied');
  };

  const removeSelected = async () => {
    if (!selectedObject) return;

    if (selectedObject.type === 'furniture') {
      setFurniture((prev) => prev.filter((f) => f.id !== selectedObject.id));
      await executeCommand(CommandType.DELETE_FURNITURE, { furnitureId: selectedObject.id });
    }

    if (selectedObject.type === 'wall') {
      setWalls((prev) => prev.filter((w) => w.id !== selectedObject.id));
      await executeCommand(CommandType.DELETE_WALL, { wallId: selectedObject.id });
    }

    setSelectedObject(null);
    showMessage('Object removed');
  };

  const handleSave = async () => {
    const storage = new StorageManager();
    await storage.save(projectName, currentHome, 'json');
    setProjects(await storage.list());
    await saveHomeCommand();
    showMessage('Project saved');
  };

  const handleLoad = async (name: string) => {
    const storage = new StorageManager();
    const loaded = await storage.load(name, 'json');
    if (!loaded) {
      showMessage('Load failed');
      return;
    }

    setProjectName(name);
    setWalls(loaded.walls || []);
    setFurniture(loaded.furniture || []);

    if (adapter && adapter.loadHome) {
      await adapter.loadHome(loaded);
    }

    showMessage(`Loaded ${name}`);
  };

  const handleExport = async () => {
    const result = await exportHome('json');
    if (!result.success) {
      showMessage('Export failed');
      return;
    }

    const blob = result.data instanceof Blob ? result.data : new Blob([JSON.stringify(result.data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showMessage('Exported JSON');
  };

  return (
    <>
      <Script src="/js/jquery.js" strategy="beforeInteractive" />
      <Script src="/js/bootstrap.js" strategy="beforeInteractive" />
      <Script src="/js/three.min.js" strategy="beforeInteractive" />
      <Script src="/js/blueprint3d.js" strategy="beforeInteractive" />
      <Script src="/js/items.js" strategy="beforeInteractive" />
      <Script src="/js/example.js" strategy="beforeInteractive" />
      <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="w-80 bg-white border-r overflow-y-auto p-4 space-y-4">
        <h2 className="text-lg font-semibold">Plan Editor</h2>

        <input className="w-full rounded border px-2 py-1" value={projectName} onChange={(e) => setProjectName(e.target.value)} />

        <div className="space-y-2">
          <button onClick={handleSave} className="w-full rounded bg-green-500 px-2 py-1 text-white">Save</button>
          <button onClick={handleExport} className="w-full rounded bg-blue-500 px-2 py-1 text-white">Export JSON</button>
        </div>

        <label className="block text-xs uppercase text-gray-500">Engine</label>
        <select className="w-full rounded border px-2 py-1" value={selectedEngine} onChange={(e) => setSelectedEngine(e.target.value as RenderEngineType)}>
          <option value={RenderEngineType.THREEJS}>Three.js</option>
          <option value={RenderEngineType.SWEETHOME3D}>SweetHome3D</option>
        </select>

        <label className="block text-xs uppercase text-gray-500">Catalog</label>
        <select className="w-full rounded border px-2 py-1" value={selectedCatalogItem} onChange={(e) => setSelectedCatalogItem(e.target.value)}>
          {CATALOG.map((item) => (
            <option key={item.catalogId} value={item.catalogId}>{item.name}</option>
          ))}
        </select>

        <div className="space-y-2">
          <button onClick={addWall} className="w-full rounded border px-2 py-1">Add Wall</button>
          <button onClick={addFurniture} className="w-full rounded border px-2 py-1">Add Furniture</button>
        </div>

        <h3 className="text-sm font-semibold">Transform</h3>
        <label className="block text-xs">X</label>
        <input type="number" value={transform.x} onChange={(e) => setTransform((t) => ({ ...t, x: Number(e.target.value) }))} className="w-full rounded border px-2 py-1" />
        <label className="block text-xs">Y</label>
        <input type="number" value={transform.y} onChange={(e) => setTransform((t) => ({ ...t, y: Number(e.target.value) }))} className="w-full rounded border px-2 py-1" />
        <label className="block text-xs">Rotation</label>
        <input type="number" value={transform.rotation} onChange={(e) => setTransform((t) => ({ ...t, rotation: Number(e.target.value) }))} className="w-full rounded border px-2 py-1" />
        <label className="block text-xs">Scale</label>
        <input type="number" step="0.1" value={transform.scale} onChange={(e) => setTransform((t) => ({ ...t, scale: Number(e.target.value) }))} className="w-full rounded border px-2 py-1" />
        <div className="space-y-2">
          <button onClick={applyTransform} className="w-full rounded border px-2 py-1">Apply</button>
          <button onClick={removeSelected} className="w-full rounded border px-2 py-1 text-red-600">Delete Selected</button>
        </div>

        <div className="text-xs text-gray-500">
          <p>Walls: {walls.length}</p>
          <p>Furniture: {furniture.length}</p>
          <p>Rooms: {roomDefinitions.length}</p>
          <p>Sync: {syncStatus}</p>
        </div>

        <h4 className="mt-2 text-xs font-semibold">Saved files</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {projects.map((name) => (
            <button key={name} onClick={() => handleLoad(name)} className="block w-full text-left rounded border px-2 py-1 text-xs">{name}</button>
          ))}
        </div>
      </aside>

      <main className="flex-1 grid grid-cols-2 gap-1 p-1">
        <div className="relative min-h-full rounded bg-white border">
          <div className="absolute top-1 left-1 z-10 rounded bg-black/40 px-2 py-1 text-xs text-white">2D Plan</div>
          <canvas ref={canvas2DRef} className="h-full w-full" onClick={(e) => {
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            selectEntityAt(e.clientX - rect.left, e.clientY - rect.top);
          }} />
        </div>

        <div className="relative min-h-full rounded bg-white border">
          <div className="absolute top-1 left-1 z-10 rounded bg-black/40 px-2 py-1 text-xs text-white">3D View</div>
          <canvas ref={canvas3DRef} className="h-full w-full" />
          {isLoading && <div className="absolute inset-0 grid place-items-center bg-black/30 text-white">Initializing 3D...</div>}
          {error && <div className="absolute bottom-1 left-1 rounded bg-red-500 px-2 py-1 text-xs text-white">{error}</div>}
          {message && <div className="absolute bottom-1 right-1 rounded bg-black/70 px-2 py-1 text-xs text-white">{message}</div>}
        </div>
      </main>

      {/* Blueprint3D Integration */}
      <div id="main" className="flex-1">
        <div id="viewer">
          <div id="floorplanner">
            <canvas id="floorplanner-canvas"></canvas>
            <div id="floorplanner-controls">
              <button className="btn btn-primary btn-sm" id="update-floorplan">Done &raquo;</button>
            </div>
          </div>
          <div id="viewer-3d">
            <canvas id="viewer-canvas"></canvas>
          </div>
        </div>
        <div id="side-menu">
          {/* Side menu content can be added here */}
        </div>
      </div>
    </div>
    </>
  );
}
