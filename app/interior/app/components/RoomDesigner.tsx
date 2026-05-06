// Example component using the architecture
'use client';

import { useCallback, useEffect } from 'react';
import { useRenderingEngine } from '@/lib/architecture/useRenderingEngine';
import { CommandType, RenderEngineType } from '@/lib/architecture/types';

interface RoomDesignerProps {
  initialEngine?: RenderEngineType;
}

/**
 * RoomDesigner component demonstrates how to use the adapter architecture
 */
export function RoomDesigner({ initialEngine = RenderEngineType.SWEETHOME3D }: RoomDesignerProps) {
  const {
    adapter,
    home,
    isLoading,
    error,
    syncStatus,
    executeCommand,
    loadHome,
    saveHome,
    exportHome,
    undo,
    redo,
    canUndo,
    canRedo,
    on,
  } = useRenderingEngine({
    engineType: initialEngine,
    container: 'rendering-container',
  });

  // Load a sample home on mount
  useEffect(() => {
    if (!adapter) return;

    const sampleHome = {
      id: 'sample-1' as any,
      name: 'Sample Home',
      walls: [
        {
          id: 'wall-1' as any,
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 500, y: 0 },
          thickness: 15,
          height: 250,
        },
        {
          id: 'wall-2' as any,
          startPoint: { x: 500, y: 0 },
          endPoint: { x: 500, y: 400 },
          thickness: 15,
          height: 250,
        },
        {
          id: 'wall-3' as any,
          startPoint: { x: 500, y: 400 },
          endPoint: { x: 0, y: 400 },
          thickness: 15,
          height: 250,
        },
        {
          id: 'wall-4' as any,
          startPoint: { x: 0, y: 400 },
          endPoint: { x: 0, y: 0 },
          thickness: 15,
          height: 250,
        },
      ],
      furniture: [
        {
          id: 'furn-1' as any,
          catalogId: 'chair-001',
          position: { x: 100, y: 100, z: 0 },
          rotation: 0,
          width: 50,
          depth: 50,
          height: 80,
        },
      ],
      rooms: [
        {
          id: 'room-1' as any,
          name: 'Living Room',
          wallIds: ['wall-1', 'wall-2', 'wall-3', 'wall-4'] as any,
        },
      ],
      dimensions: [],
    };

    loadHome(sampleHome);
  }, [adapter, loadHome]);

  // Subscribe to events
  useEffect(() => {
    const unsubWallCreated = on('wall-created', (event) => {
      console.log('Wall created:', event.data);
    });

    const unsubFurnitureCreated = on('furniture-created', (event) => {
      console.log('Furniture created:', event.data);
    });

    return () => {
      unsubWallCreated();
      unsubFurnitureCreated();
    };
  }, [on]);

  const handleCreateWall = useCallback(async () => {
    await executeCommand(CommandType.CREATE_WALL, {
      startPoint: { x: 600, y: 0 },
      endPoint: { x: 600, y: 400 },
      thickness: 15,
      height: 250,
    });
  }, [executeCommand]);

  const handleCreateFurniture = useCallback(async () => {
    await executeCommand(CommandType.CREATE_FURNITURE, {
      catalogId: 'table-001',
      position: { x: 250, y: 200, z: 0 },
      width: 100,
      depth: 100,
      height: 75,
    });
  }, [executeCommand]);

  const handleExport = useCallback(async () => {
    const result = await exportHome('json');
    if (result.success && result.data) {
      const blob = result.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'home.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [exportHome]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading {initialEngine}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-100 border-b p-4 flex gap-4">
        <button
          onClick={handleCreateWall}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Wall
        </button>
        <button
          onClick={handleCreateFurniture}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Furniture
        </button>
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Undo
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Redo
        </button>
        <button
          onClick={() => saveHome()}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Save
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Export
        </button>

        {/* Sync Status */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              syncStatus.state === 'synced'
                ? 'bg-green-500'
                : syncStatus.state === 'pending'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-sm">{syncStatus.state}</span>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-white border-b p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">Home:</span> {home?.name}
          </div>
          <div>
            <span className="font-semibold">Walls:</span> {home?.walls.length || 0}
          </div>
          <div>
            <span className="font-semibold">Furniture:</span> {home?.furniture.length || 0}
          </div>
        </div>
      </div>

      {/* Rendering Container */}
      <div id="rendering-container" className="flex-1" />
    </div>
  );
}
