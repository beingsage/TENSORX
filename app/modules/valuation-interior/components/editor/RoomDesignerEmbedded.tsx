'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { DEFAULT_LEVEL_ID, useFloorplanStore } from '@/modules/valuation-interior/store/floorplanStore'

type Bp3dInstance = any
type Bp3dWindow = Window & {
  $?: any
  jQuery?: any
  THREE?: any
  BP3D?: any
  __BP3D_AUTO_INIT__?: boolean
  __BP3D_EMBED_MODE__?: boolean
  __BP3D_INIT__?: (...args: any[]) => Bp3dInstance
  __BP3D_INSTANCE__?: Bp3dInstance
  __BP3D_READY__?: (bp: Bp3dInstance) => void
  __BP3D_SCRIPTS_PROMISE__?: Promise<void>
  __BP3D_SCRIPTS_READY__?: boolean
  __BP3D_SIDE_MENU__?: unknown
  __BP3D_VIEWER__?: unknown
}

const GLBOverlay = dynamic(() => import('@/modules/valuation-interior/components/editor/GLBOverlay').then(m => m.GLBOverlay), {
  ssr: false,
  loading: () => null
})

const CM_PER_M = 100
const cmToM = (v: number) => v / CM_PER_M
const mToCm = (v: number) => v * CM_PER_M

// Blueprint3D's legacy Three.js stack loads JSON models reliably, while the
// bundled GLTF loader path is still brittle in this app shell.
const DEFAULT_DOOR_MODEL = '/models/js/closed-door28x80_baked.js'
const DEFAULT_WINDOW_MODEL = '/models/js/whitewindow.js'
const EMPTY_SERIALIZED = '{"floorplan":{"corners":{},"walls":[],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}'
const SCENE_SYNC_DEBOUNCE_MS = 160
const HISTORY_SAVE_DEBOUNCE_MS = 600
const BP3D_SCRIPT_SEQUENCE = [
  '/js/jquery.js',
  '/js/bootstrap.js',
  '/js/three.min.js',
  '/js/gltf-compat.js',
  '/js/GLTFLoader.js',
  '/js/MTLLoader.js',
  '/js/OBJLoader.js',
  '/js/OBJMTLLoader.js',
  '/js/blueprint3d.js',
  '/js/items.js',
  '/js/example.js',
]

const genId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const getBp3dWindow = () => window as Bp3dWindow

const disposeBp3dGlobals = (w: Bp3dWindow) => {
  delete w.__BP3D_READY__
  delete w.__BP3D_INSTANCE__
  delete w.__BP3D_SIDE_MENU__
  delete w.__BP3D_VIEWER__
}

const loadLegacyScript = (src: string) => new Promise<void>((resolve, reject) => {
  const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
  if (existing?.dataset.bp3dLoaded === 'true') {
    resolve()
    return
  }
  if (existing && existing.dataset.bp3dLoaded !== 'pending') {
    existing.dataset.bp3dLoaded = 'true'
    resolve()
    return
  }

  const script = existing || document.createElement('script')
  let settled = false

  const cleanup = () => {
    script.removeEventListener('load', handleLoad)
    script.removeEventListener('error', handleError)
  }

  const handleLoad = () => {
    if (settled) return
    settled = true
    script.dataset.bp3dLoaded = 'true'
    cleanup()
    resolve()
  }

  const handleError = () => {
    if (settled) return
    settled = true
    if (!existing) script.remove()
    cleanup()
    reject(new Error(`Failed to load ${src}`))
  }

  script.addEventListener('load', handleLoad)
  script.addEventListener('error', handleError)

  if (!existing) {
    script.src = src
    script.type = 'text/javascript'
    script.async = false
    script.dataset.bp3dLoaded = 'pending'
    document.head.appendChild(script)
  }
})

const ensureBp3dScripts = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  const w = getBp3dWindow()
  if (w.__BP3D_SCRIPTS_READY__) return Promise.resolve()
  if (w.__BP3D_SCRIPTS_PROMISE__) return w.__BP3D_SCRIPTS_PROMISE__

  w.__BP3D_SCRIPTS_PROMISE__ = BP3D_SCRIPT_SEQUENCE
    .reduce(
      (promise, src) => promise.then(() => loadLegacyScript(src)),
      Promise.resolve() as Promise<void>
    )
    .then(() => {
      w.__BP3D_SCRIPTS_READY__ = true
    })
    .catch((error) => {
      delete w.__BP3D_SCRIPTS_PROMISE__
      throw error
    })

  return w.__BP3D_SCRIPTS_PROMISE__
}

const wallKey = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const a = `${start.x.toFixed(3)},${start.y.toFixed(3)}`
  const b = `${end.x.toFixed(3)},${end.y.toFixed(3)}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

const distPointToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const wx = p.x - a.x
  const wy = p.y - a.y
  const c1 = vx * wx + vy * wy
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const c2 = vx * vx + vy * vy
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y)
  const t = c1 / c2
  const proj = { x: a.x + t * vx, y: a.y + t * vy }
  return Math.hypot(p.x - proj.x, p.y - proj.y)
}

const pointInPolygon = (pt: { x: number; y: number }, poly: { x: number; y: number }[]) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + Number.EPSILON) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const polygonArea = (pts: { x: number; y: number }[]) => {
  if (pts.length < 3) return 0
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return a / 2
}

const polygonCenter = (pts: { x: number; y: number }[]) => {
  if (pts.length === 0) return { x: 0, y: 0 }
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / pts.length, y: sum.y / pts.length }
}

const getWallEndpoints = (wall: any): { start: { x: number; y: number }; end: { x: number; y: number } } | null => {
  if (!wall) return null
  if (wall?.getStartX && wall?.getEndX) {
    return {
      start: { x: cmToM(wall.getStartX()), y: cmToM(wall.getStartY()) },
      end: { x: cmToM(wall.getEndX()), y: cmToM(wall.getEndY()) }
    }
  }
  if (wall?.getStart && wall?.getEnd) {
    const s = wall.getStart()
    const e = wall.getEnd()
    if (s && e) {
      return {
        start: { x: cmToM(s.x), y: cmToM(s.y) },
        end: { x: cmToM(e.x), y: cmToM(e.y) }
      }
    }
  }
  if (wall?.wall?.getStartX && wall?.wall?.getEndX) {
    return {
      start: { x: cmToM(wall.wall.getStartX()), y: cmToM(wall.wall.getStartY()) },
      end: { x: cmToM(wall.wall.getEndX()), y: cmToM(wall.wall.getEndY()) }
    }
  }
  return null
}

const mapWallToStoreId = (wall: any, storeWalls: { id: string; start: { x: number; y: number }; end: { x: number; y: number } }[]) => {
  const endpoints = getWallEndpoints(wall)
  if (!endpoints) return null
  const { start, end } = endpoints
  let bestId: string | null = null
  let best = Infinity
  storeWalls.forEach(w => {
    const d1 = dist(start, w.start) + dist(end, w.end)
    const d2 = dist(start, w.end) + dist(end, w.start)
    const d = Math.min(d1, d2)
    if (d < best) {
      best = d
      bestId = w.id
    }
  })
  return bestId
}

const inferOpeningType = (name?: string, modelUrl?: string) => {
  const s = `${name || ''} ${modelUrl || ''}`.toLowerCase()
  if (s.includes('door')) return 'door'
  if (s.includes('window')) return 'window'
  return null
}

const normalizeModelUrl = (url?: string) => {
  if (!url) return ''
  const isAbsolute = url.startsWith('http://') || url.startsWith('https://')
  if (!isAbsolute) return url
  return `/api/proxy-glb?url=${encodeURIComponent(url)}`
}

const matchesLevel = (levelId: string | undefined, activeLevelId: string) => (
  (levelId || DEFAULT_LEVEL_ID) === (activeLevelId || DEFAULT_LEVEL_ID)
)

const filterByLevel = <T extends { levelId?: string }>(items: T[], activeLevelId: string) => (
  items.filter((item) => matchesLevel(item.levelId, activeLevelId))
)

const sameNumber = (a: number | undefined, b: number | undefined, tolerance = 1e-3) =>
  Math.abs((a || 0) - (b || 0)) <= tolerance

const samePoint = (
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
  tolerance = 1e-3
) => {
  if (!a || !b) return a === b
  return sameNumber(a.x, b.x, tolerance) && sameNumber(a.y, b.y, tolerance)
}

const sameWallList = (
  prevWalls: {
    id: string
    levelId?: string
    start: { x: number; y: number }
    end: { x: number; y: number }
    thickness: number
    height: number
    textureDataUrl?: string
    textureTileWidthM?: number
    textureTileHeightM?: number
    color?: string
  }[],
  nextWalls: typeof prevWalls
) => (
  prevWalls.length === nextWalls.length &&
  prevWalls.every((wall, index) => {
    const nextWall = nextWalls[index]
    return (
      wall.id === nextWall?.id &&
      wall.levelId === nextWall.levelId &&
      samePoint(wall.start, nextWall.start) &&
      samePoint(wall.end, nextWall.end) &&
      sameNumber(wall.thickness, nextWall.thickness) &&
      sameNumber(wall.height, nextWall.height) &&
      wall.textureDataUrl === nextWall.textureDataUrl &&
      sameNumber(wall.textureTileWidthM, nextWall.textureTileWidthM) &&
      sameNumber(wall.textureTileHeightM, nextWall.textureTileHeightM) &&
      wall.color === nextWall.color
    )
  })
)

const sameRoomList = (
  prevRooms: {
    id: string
    name: string
    levelId?: string
    points: { x: number; y: number }[]
    center: { x: number; y: number }
    color: string
    textureDataUrl?: string
    textureTileWidthM?: number
    textureTileHeightM?: number
  }[],
  nextRooms: typeof prevRooms
) => (
  prevRooms.length === nextRooms.length &&
  prevRooms.every((room, index) => {
    const nextRoom = nextRooms[index]
    if (
      room.id !== nextRoom?.id ||
      room.name !== nextRoom.name ||
      room.levelId !== nextRoom.levelId ||
      room.color !== nextRoom.color ||
      room.textureDataUrl !== nextRoom.textureDataUrl ||
      !sameNumber(room.textureTileWidthM, nextRoom.textureTileWidthM) ||
      !sameNumber(room.textureTileHeightM, nextRoom.textureTileHeightM) ||
      !samePoint(room.center, nextRoom.center) ||
      room.points.length !== nextRoom.points.length
    ) {
      return false
    }

    return room.points.every((point, pointIndex) => samePoint(point, nextRoom.points[pointIndex]))
  })
)

const sameFurnitureList = (
  prevFurniture: {
    id: string
    type: string
    levelId?: string
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    dimensions: { width: number; height: number; depth: number }
    modelUrl?: string
    mtlUrl?: string
    furnAiId?: string
    label?: string
    color?: string
  }[],
  nextFurniture: typeof prevFurniture
) => (
  prevFurniture.length === nextFurniture.length &&
  prevFurniture.every((item, index) => {
    const nextItem = nextFurniture[index]
    return (
      item.id === nextItem?.id &&
      item.type === nextItem.type &&
      item.levelId === nextItem.levelId &&
      sameNumber(item.position.x, nextItem.position.x) &&
      sameNumber(item.position.y, nextItem.position.y) &&
      sameNumber(item.position.z, nextItem.position.z) &&
      sameNumber(item.rotation.x, nextItem.rotation.x) &&
      sameNumber(item.rotation.y, nextItem.rotation.y) &&
      sameNumber(item.rotation.z, nextItem.rotation.z) &&
      sameNumber(item.dimensions.width, nextItem.dimensions.width) &&
      sameNumber(item.dimensions.height, nextItem.dimensions.height) &&
      sameNumber(item.dimensions.depth, nextItem.dimensions.depth) &&
      item.modelUrl === nextItem.modelUrl &&
      item.mtlUrl === nextItem.mtlUrl &&
      item.furnAiId === nextItem.furnAiId &&
      item.label === nextItem.label &&
      item.color === nextItem.color
    )
  })
)

export function RoomDesignerEmbedded() {
  const mode = useFloorplanStore(s => s.mode)
  const glbPreviewSource = useFloorplanStore(s => s.glbPreviewSource)
  const activeLevelId = useFloorplanStore(s => s.activeLevelId)
  const activeTool = useFloorplanStore(s => s.activeTool)
  const selectedId = useFloorplanStore(s => s.selectedId)
  const walls = useFloorplanStore(s => s.walls)
  const rooms = useFloorplanStore(s => s.rooms)
  const furniture = useFloorplanStore(s => s.furniture)
  const replaceScene = useFloorplanStore(s => s.replaceScene)
  const selectObject = useFloorplanStore(s => s.selectObject)
  const setActiveTool = useFloorplanStore(s => s.setActiveTool)
  const updateFurniture = useFloorplanStore(s => s.updateFurniture)
  const deleteObject = useFloorplanStore(s => s.deleteObject)

  const bpRef = useRef<Bp3dInstance | null>(null)
  const syncRef = useRef<'bp3d' | 'store' | null>(null)
  const syncFromBp3dRef = useRef<() => void>(() => { })
  const debounceRef = useRef<number | null>(null)
  const historyCommitRef = useRef<number | null>(null)
  const initRetryRef = useRef<number | null>(null)
  const bpInitStartedRef = useRef(false)
  const wallMapRef = useRef<Map<string, string>>(new Map())
  const roomMapRef = useRef<Map<string, string>>(new Map())
  const activeToolRef = useRef(activeTool)

  const [scriptsReady, setScriptsReady] = useState(false)
  const [bpReady, setBpReady] = useState(false)
  const [bpLoadError, setBpLoadError] = useState<string | null>(null)

  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

  useEffect(() => {
    let cancelled = false

    ensureBp3dScripts()
      .then(() => {
        if (!cancelled) setScriptsReady(true)
      })
      .catch((error) => {
        console.error('Failed to load Blueprint3D scripts.', error)
        if (!cancelled) setBpLoadError('Failed to load Blueprint3D scripts. Please reload the page.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = getBp3dWindow()
    w.__BP3D_EMBED_MODE__ = true
    w.__BP3D_AUTO_INIT__ = false

    return () => {
      delete w.__BP3D_EMBED_MODE__
      delete w.__BP3D_AUTO_INIT__

      if (bpRef.current) {
        try {
          if (bpRef.current.model?.floorplan) {
            bpRef.current.model.floorplan.clearAllCallbacks?.()
          }
          if (bpRef.current.model?.scene) {
            bpRef.current.model.scene.itemLoadedCallbacks?.clear?.()
            bpRef.current.model.scene.itemRemovedCallbacks?.clear?.()
          }
          if (bpRef.current.three) {
            bpRef.current.three.itemSelectedCallbacks?.clear?.()
            bpRef.current.three.itemUnselectedCallbacks?.clear?.()
            bpRef.current.three.wallClicked?.clear?.()
            bpRef.current.three.wallUnselected?.clear?.()
            bpRef.current.three.floorClicked?.clear?.()
            bpRef.current.three.nothingClicked?.clear?.()
          }
        } catch (e) {
          console.warn('Error cleaning up BP3D:', e)
        }
        bpRef.current = null
      }

      bpInitStartedRef.current = false
      disposeBp3dGlobals(w)

      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (historyCommitRef.current) {
        window.clearTimeout(historyCommitRef.current)
        historyCommitRef.current = null
      }
      if (initRetryRef.current) {
        window.clearTimeout(initRetryRef.current)
        initRetryRef.current = null
      }
    }
  }, [])

  const scheduleSyncFromBp3d = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      syncFromBp3d()
    }, SCENE_SYNC_DEBOUNCE_MS)
  }

  const scheduleHistorySaveFromBp3d = () => {
    if (historyCommitRef.current) window.clearTimeout(historyCommitRef.current)
    historyCommitRef.current = window.setTimeout(() => {
      useFloorplanStore.getState().saveHistory()
      historyCommitRef.current = null
    }, HISTORY_SAVE_DEBOUNCE_MS)
  }

  const syncFromBp3d = () => {
    if (!bpRef.current) return
    if (syncRef.current === 'store') return
    syncRef.current = 'bp3d'

    const bp = bpRef.current
    const prev = useFloorplanStore.getState()
    const prevActiveWalls = filterByLevel(prev.walls, prev.activeLevelId)
    const prevActiveRooms = filterByLevel(prev.rooms, prev.activeLevelId)
    const prevActiveFurniture = filterByLevel(prev.furniture, prev.activeLevelId)
    const nextWalls = [] as typeof walls
    const nextRooms = [] as typeof rooms
    const nextFurniture = [] as typeof furniture

    wallMapRef.current = new Map()
    roomMapRef.current = new Map()

    // Walls
    const bpWalls = bp.model.floorplan.getWalls()
    const WALL_TOL = 0.05
    bpWalls.forEach((w: any) => {
      const start = { x: cmToM(w.getStartX()), y: cmToM(w.getStartY()) }
      const end = { x: cmToM(w.getEndX()), y: cmToM(w.getEndY()) }
      let matchedId: string | null = null
      let matchedPrev = null as any
      let best = Infinity
      prevActiveWalls.forEach(pw => {
        const d1 = dist(start, pw.start) + dist(end, pw.end)
        const d2 = dist(start, pw.end) + dist(end, pw.start)
        const d = Math.min(d1, d2)
        if (d < best) {
          best = d
          matchedId = pw.id
          matchedPrev = pw
        }
      })
      if (best > WALL_TOL) {
        matchedId = null
        matchedPrev = null
      }

      const textureUrl = w.frontTexture?.url
      const id = matchedId || genId()
      // Always map BP wall id → store id so selections can resolve reliably
      if (w?.id) wallMapRef.current.set(w.id, id)

      nextWalls.push({
        id,
        start,
        end,
        thickness: cmToM(w.thickness || 15),
        height: cmToM(w.height || 250),
        levelId: matchedPrev?.levelId || prev.activeLevelId,
        textureDataUrl: textureUrl || matchedPrev?.textureDataUrl,
        textureTileWidthM: matchedPrev?.textureTileWidthM,
        textureTileHeightM: matchedPrev?.textureTileHeightM,
        color: matchedPrev?.color,
      })
    })

    // Rooms
    const bpRooms = bp.model.floorplan.getRooms()
    const ROOM_TOL = 0.5
    bpRooms.forEach((r: any, idx: number) => {
      const pts = (r.corners || []).map((c: any) => ({ x: cmToM(c.x), y: cmToM(c.y) }))
      if (pts.length < 3) return
      const center = polygonCenter(pts)
      const area = Math.abs(polygonArea(pts))

      let matchedId: string | null = null
      let matchedPrev = null as any
      let best = Infinity
      prevActiveRooms.forEach(pr => {
        const c = pr.center || polygonCenter(pr.points)
        const d = dist(center, c)
        const da = Math.abs(Math.abs(polygonArea(pr.points)) - area)
        const score = d + da
        if (score < best) {
          best = score
          matchedId = pr.id
          matchedPrev = pr
        }
      })
      if (best > ROOM_TOL) {
        matchedId = null
        matchedPrev = null
      }

      const tex = r.getTexture ? r.getTexture() : null
      const id = matchedId || genId()
      // Always map BP room uuid → store id so selections can resolve reliably
      if (r.getUuid) roomMapRef.current.set(r.getUuid(), id)

      nextRooms.push({
        id,
        name: matchedPrev?.name || `Room ${idx + 1}`,
        levelId: matchedPrev?.levelId || prev.activeLevelId,
        points: pts,
        color: matchedPrev?.color || '#ddd8d0',
        center,
        textureDataUrl: tex?.url || matchedPrev?.textureDataUrl,
        textureTileWidthM: matchedPrev?.textureTileWidthM,
        textureTileHeightM: matchedPrev?.textureTileHeightM,
      })
    })

    // Furniture
    const bpItems = bp.model.scene.getItems()
    bpItems.forEach((it: any) => {
      const meta = it.metadata || {}
      const existingId = meta.storeId
      const typeFromName = inferOpeningType(meta.itemName, meta.modelUrl)
      const prevItem = existingId ? prevActiveFurniture.find(f => f.id === existingId) : null
      const resolvedType = prevItem?.type || typeFromName || (meta.modelUrl ? 'imported' : 'furniture')
      const shouldPersistModelUrl = resolvedType !== 'door' && resolvedType !== 'window'
      const id = existingId || genId()
      if (!meta.storeId) meta.storeId = id

      nextFurniture.push({
        id,
        type: resolvedType,
        levelId: prevItem?.levelId || prev.activeLevelId,
        position: {
          x: cmToM(it.position.x),
          y: cmToM(it.position.y),
          z: cmToM(it.position.z),
        },
        rotation: { x: 0, y: it.rotation.y || 0, z: 0 },
        dimensions: {
          width: cmToM(it.getWidth()),
          height: cmToM(it.getHeight()),
          depth: cmToM(it.getDepth()),
        },
        modelUrl: shouldPersistModelUrl ? (meta.modelUrl || prevItem?.modelUrl) : undefined,
        mtlUrl: shouldPersistModelUrl ? (meta.mtlUrl || prevItem?.mtlUrl) : undefined,
        furnAiId: meta.furnAiId || prevItem?.furnAiId,
        label: meta.itemName || prevItem?.label,
        color: prevItem?.color,
      })
    })

    const sceneChanged =
      !sameWallList(prevActiveWalls, nextWalls) ||
      !sameRoomList(prevActiveRooms, nextRooms) ||
      !sameFurnitureList(prevActiveFurniture, nextFurniture)

    if (sceneChanged) {
      replaceScene({ walls: nextWalls, rooms: nextRooms, furniture: nextFurniture })
      scheduleHistorySaveFromBp3d()
    }

    requestAnimationFrame(() => {
      syncRef.current = null
    })
  }

  useEffect(() => {
    syncFromBp3dRef.current = syncFromBp3d
  })

  const applyStoreToBp3d = () => {
    if (!bpRef.current) return
    if (syncRef.current === 'bp3d') return
    syncRef.current = 'store'

    const bp = bpRef.current
    const store = useFloorplanStore.getState()
    const levelWalls = filterByLevel(store.walls, store.activeLevelId)
    const levelRooms = filterByLevel(store.rooms, store.activeLevelId)
    const levelFurniture = filterByLevel(store.furniture, store.activeLevelId)

    // Configure global wall thickness/height (cm)
    try {
      const BP3D = (window as any).BP3D
      if (BP3D?.Core?.Configuration) {
        const avgThickness = levelWalls.length > 0
          ? levelWalls.reduce((a, w) => a + (w.thickness || 0.15), 0) / levelWalls.length
          : 0.15
        BP3D.Core.Configuration.setValue(BP3D.Core.configWallThickness, mToCm(avgThickness))
        BP3D.Core.Configuration.setValue(BP3D.Core.configWallHeight, mToCm(2.5))
      }
    } catch {
      // ignore
    }

    // Build floorplan from store walls
    const corners: Record<string, { x: number; y: number }> = {}
    const cornerIdByKey = new Map<string, string>()
    let cornerIdx = 0

    const getCornerId = (p: { x: number; y: number }) => {
      const key = `${p.x.toFixed(3)}|${p.y.toFixed(3)}`
      let id = cornerIdByKey.get(key)
      if (!id) {
        id = `c_${cornerIdx++}`
        cornerIdByKey.set(key, id)
        corners[id] = { x: mToCm(p.x), y: mToCm(p.y) }
      }
      return id
    }

    const fpWalls = levelWalls.map(w => {
      const c1 = getCornerId(w.start)
      const c2 = getCornerId(w.end)
      return {
        corner1: c1,
        corner2: c2,
        frontTexture: w.textureDataUrl ? { url: w.textureDataUrl, stretch: true, scale: 0 } : undefined,
        backTexture: w.textureDataUrl ? { url: w.textureDataUrl, stretch: true, scale: 0 } : undefined,
      }
    })

    const floorplan = {
      corners,
      walls: fpWalls,
      wallTextures: [],
      floorTextures: {},
      newFloorTextures: {},
    }

    bp.model.loadSerialized(JSON.stringify({ floorplan, items: [] }))

    // Build BP wall/room → store id maps so selection works in 2D floorplanner
    wallMapRef.current = new Map()
    roomMapRef.current = new Map()

    const bpWalls = bp.model.floorplan.getWalls()
    bpWalls.forEach((bw: any) => {
      const id = mapWallToStoreId(bw, levelWalls)
      if (id && bw?.id) {
        wallMapRef.current.set(bw.id, id)
      }
    })

    const bpRoomsForMap = bp.model.floorplan.getRooms()
    bpRoomsForMap.forEach((br: any) => {
      const pts = (br?.corners || []).map((c: any) => ({ x: cmToM(c.x), y: cmToM(c.y) }))
      if (pts.length < 3) return
      const center = polygonCenter(pts)
      let bestId: string | null = null
      let bestDist = Infinity
      levelRooms.forEach(rm => {
        const c = rm.center || polygonCenter(rm.points)
        const d = dist(center, c)
        if (d < bestDist) {
          bestDist = d
          bestId = rm.id
        }
      })
      if (bestId && br?.getUuid) {
        roomMapRef.current.set(br.getUuid(), bestId)
      }
    })

    // Apply wall textures (best-effort)
    bpWalls.forEach((bw: any) => {
      const start = { x: cmToM(bw.getStartX()), y: cmToM(bw.getStartY()) }
      const end = { x: cmToM(bw.getEndX()), y: cmToM(bw.getEndY()) }
      const match = levelWalls.find(w => {
        const d1 = dist(start, w.start) + dist(end, w.end)
        const d2 = dist(start, w.end) + dist(end, w.start)
        return Math.min(d1, d2) < 0.05
      })
      if (match?.textureDataUrl) {
        bw.frontTexture = { url: match.textureDataUrl, stretch: true, scale: 0 }
        bw.backTexture = { url: match.textureDataUrl, stretch: true, scale: 0 }
      }
    })

    // Add items from store
    const scene = bp.model.scene
    const THREE = (window as any).THREE
    if (scene && THREE) {
      levelFurniture.forEach(f => {
        const rawUrl = f.modelUrl || (f.type === 'door' ? DEFAULT_DOOR_MODEL : f.type === 'window' ? DEFAULT_WINDOW_MODEL : '')
        const modelUrl = normalizeModelUrl(rawUrl)
        if (!modelUrl) return

        const meta: any = {
          itemName: f.label || f.type || 'Item',
          resizable: true,
          modelUrl,
          itemType: 1,
          storeId: f.id,
          furnAiId: f.furnAiId,
          mtlUrl: f.mtlUrl,
          __targetDims: {
            w: mToCm(f.dimensions.width || 1),
            h: mToCm(f.dimensions.height || 1),
            d: mToCm(f.dimensions.depth || 1),
          },
        }

        const pos = new THREE.Vector3(mToCm(f.position.x), mToCm(f.position.y || 0), mToCm(f.position.z))
        const rot = f.rotation?.y || 0
        scene.addItem(1, modelUrl, meta, pos, rot, null, false)
      })
    }

    // Apply floor textures by proximity
    const bpRooms = bp.model.floorplan.getRooms()
    bpRooms.forEach((r: any) => {
      const pts = (r.corners || []).map((c: any) => ({ x: cmToM(c.x), y: cmToM(c.y) }))
      if (pts.length < 3) return
      const center = polygonCenter(pts)
      let best: any = null
      let bestDist = Infinity
      levelRooms.forEach(sr => {
        const c = sr.center || polygonCenter(sr.points)
        const d = dist(center, c)
        if (d < bestDist) {
          bestDist = d
          best = sr
        }
      })
      if (best?.textureDataUrl && r.setTexture) {
        r.setTexture(best.textureDataUrl, true, 300)
      }
    })

    requestAnimationFrame(() => {
      syncRef.current = null
    })
  }

  useEffect(() => {
    const bind = (bp: any) => {
      if (!bp) return
      bpRef.current = bp
      setBpReady(true)

      try {
        const THREE = (window as any).THREE
        if (THREE && bp?.three?.scene) {
          bp.three.scene.background = new THREE.Color(0x0b0f14)
        }
      } catch {
        // ignore
      }

      // Wire callbacks
      bp.model.floorplan.fireOnNewWall(scheduleSyncFromBp3d)
      bp.model.floorplan.fireOnNewCorner(scheduleSyncFromBp3d)
      bp.model.floorplan.fireOnRedraw(scheduleSyncFromBp3d)
      bp.model.floorplan.fireOnUpdatedRooms(scheduleSyncFromBp3d)

      const patchItem = (item: any) => {
        if (!item || item.__storePatched) return
        item.__storePatched = true

        const originalClickReleased = item.clickReleased?.bind(item)
        item.clickReleased = () => {
          if (originalClickReleased) originalClickReleased()
          scheduleSyncFromBp3d()
        }

        const originalResize = item.resize?.bind(item)
        if (originalResize) {
          item.resize = (h: number, w: number, d: number) => {
            originalResize(h, w, d)
            scheduleSyncFromBp3d()
          }
        }
      }

      bp.model.scene.itemLoadedCallbacks.add((item: any) => {
        if (!item) return
        if (!item.metadata) item.metadata = {}
        if (!item.metadata.storeId) item.metadata.storeId = genId()
        patchItem(item)

        const target = item.metadata?.__targetDims
        if (target && item.resize) {
          item.resize(target.h, target.w, target.d)
        }
        scheduleSyncFromBp3d()
      })

      bp.model.scene.itemRemovedCallbacks.add(() => scheduleSyncFromBp3d())

      // Selection sync
      bp.three.itemSelectedCallbacks.add((item: any) => {
        const id = item?.metadata?.storeId
        if (id) {
          selectObject(id)
          const tool = activeToolRef.current
          if (tool === 'delete') {
            deleteObject(id)
            setActiveTool('select')
            return
          }
          if (tool === 'label') {
            const current = item?.metadata?.itemName || item?.metadata?.label || ''
            const next = window.prompt('Enter label for this item:', current)
            if (next !== null) {
              updateFurniture(id, { label: next })
              if (item?.metadata) item.metadata.itemName = next
              scheduleSyncFromBp3d()
            }
            setActiveTool('select')
            return
          }
        }
      })
      bp.three.itemUnselectedCallbacks.add(() => {
        if (useFloorplanStore.getState().activeTool === 'ruler') return
        selectObject(null)
      })
      bp.three.nothingClicked?.add?.(() => {
        // Avoid clearing 2D selections from the floorplanner
        const state = useFloorplanStore.getState()
        if (state.mode === '2d' || state.activeTool === 'ruler') return
        selectObject(null)
      })

      bp.three.wallClicked.add((wall: any) => {
        const mapped = wallMapRef.current.get(wall.id)
        if (mapped) {
          selectObject(mapped)
          return
        }

        let start: { x: number; y: number } | null = null
        let end: { x: number; y: number } | null = null

        if (wall?.getStartX && wall?.getEndX) {
          start = { x: cmToM(wall.getStartX()), y: cmToM(wall.getStartY()) }
          end = { x: cmToM(wall.getEndX()), y: cmToM(wall.getEndY()) }
        } else if (wall?.getStart && wall?.getEnd) {
          const s = wall.getStart()
          const e = wall.getEnd()
          if (s && e) {
            start = { x: cmToM(s.x), y: cmToM(s.y) }
            end = { x: cmToM(e.x), y: cmToM(e.y) }
          }
        } else if (wall?.wall?.getStartX && wall?.wall?.getEndX) {
          start = { x: cmToM(wall.wall.getStartX()), y: cmToM(wall.wall.getStartY()) }
          end = { x: cmToM(wall.wall.getEndX()), y: cmToM(wall.wall.getEndY()) }
        }
        if (!start || !end) return

        if (useFloorplanStore.getState().walls.length === 0) {
          syncFromBp3d()
        }

        const storeState = useFloorplanStore.getState()
        const storeWalls = filterByLevel(storeState.walls, storeState.activeLevelId)
        let bestId: string | null = null
        let best = Infinity
        storeWalls.forEach(w => {
          const d1 = dist(start, w.start) + dist(end, w.end)
          const d2 = dist(start, w.end) + dist(end, w.start)
          const d = Math.min(d1, d2)
          if (d < best) {
            best = d
            bestId = w.id
          }
        })

        if (bestId) {
          selectObject(bestId)
          return
        }

        if (storeWalls.length > 0) {
          selectObject(storeWalls[0].id)
        }
      })

      bp.three.wallHovered?.add?.((wall: any) => {
        if (useFloorplanStore.getState().activeTool !== 'ruler') return
        const mapped = wallMapRef.current.get(wall.id)
        if (mapped) {
          selectObject(mapped)
          return
        }

        let start: { x: number; y: number } | null = null
        let end: { x: number; y: number } | null = null

        if (wall?.getStartX && wall?.getEndX) {
          start = { x: cmToM(wall.getStartX()), y: cmToM(wall.getStartY()) }
          end = { x: cmToM(wall.getEndX()), y: cmToM(wall.getEndY()) }
        } else if (wall?.getStart && wall?.getEnd) {
          const s = wall.getStart()
          const e = wall.getEnd()
          if (s && e) {
            start = { x: cmToM(s.x), y: cmToM(s.y) }
            end = { x: cmToM(e.x), y: cmToM(e.y) }
          }
        } else if (wall?.wall?.getStartX && wall?.wall?.getEndX) {
          start = { x: cmToM(wall.wall.getStartX()), y: cmToM(wall.wall.getStartY()) }
          end = { x: cmToM(wall.wall.getEndX()), y: cmToM(wall.wall.getEndY()) }
        }

        if (!start || !end) return

        const storeState = useFloorplanStore.getState()
        const storeWalls = filterByLevel(storeState.walls, storeState.activeLevelId)
        let bestId: string | null = null
        let best = Infinity
        storeWalls.forEach(w => {
          const d1 = dist(start, w.start) + dist(end, w.end)
          const d2 = dist(start, w.end) + dist(end, w.start)
          const d = Math.min(d1, d2)
          if (d < best) {
            best = d
            bestId = w.id
          }
        })

        if (bestId) {
          selectObject(bestId)
        } else if (storeWalls.length > 0) {
          selectObject(storeWalls[0].id)
        }
      })

      bp.three.wallMouseOver?.add?.((wall: any) => {
        if (useFloorplanStore.getState().activeTool !== 'ruler') return
        const mapped = wallMapRef.current.get(wall.id)
        if (mapped) {
          selectObject(mapped)
          return
        }

        let start: { x: number; y: number } | null = null
        let end: { x: number; y: number } | null = null

        if (wall?.getStartX && wall?.getEndX) {
          start = { x: cmToM(wall.getStartX()), y: cmToM(wall.getStartY()) }
          end = { x: cmToM(wall.getEndX()), y: cmToM(wall.getEndY()) }
        } else if (wall?.getStart && wall?.getEnd) {
          const s = wall.getStart()
          const e = wall.getEnd()
          if (s && e) {
            start = { x: cmToM(s.x), y: cmToM(s.y) }
            end = { x: cmToM(e.x), y: cmToM(e.y) }
          }
        } else if (wall?.wall?.getStartX && wall?.wall?.getEndX) {
          start = { x: cmToM(wall.wall.getStartX()), y: cmToM(wall.wall.getStartY()) }
          end = { x: cmToM(wall.wall.getEndX()), y: cmToM(wall.wall.getEndY()) }
        }

        if (!start || !end) return

        const storeState = useFloorplanStore.getState()
        const storeWalls = filterByLevel(storeState.walls, storeState.activeLevelId)
        let bestId: string | null = null
        let best = Infinity
        storeWalls.forEach(w => {
          const d1 = dist(start, w.start) + dist(end, w.end)
          const d2 = dist(start, w.end) + dist(end, w.start)
          const d = Math.min(d1, d2)
          if (d < best) {
            best = d
            bestId = w.id
          }
        })

        if (bestId) {
          selectObject(bestId)
        } else if (storeWalls.length > 0) {
          selectObject(storeWalls[0].id)
        }
      })

      // Prevent wall unselection in ruler mode
      bp.three.wallUnselected?.add?.(() => {
        if (useFloorplanStore.getState().activeTool === 'ruler') return
        selectObject(null)
      })

      bp.three.floorClicked.add((room: any) => {
        const rid = room?.getUuid ? room.getUuid() : null
        const mapped = rid ? roomMapRef.current.get(rid) : null
        if (mapped) {
          selectObject(mapped)
          return
        }
        const pts = (room?.corners || []).map((c: any) => ({ x: cmToM(c.x), y: cmToM(c.y) }))
        if (pts.length < 3) return
        const center = polygonCenter(pts)
        const storeState = useFloorplanStore.getState()
        const storeRooms = filterByLevel(storeState.rooms, storeState.activeLevelId)
        let bestId: string | null = null
        let bestDist = Infinity
        storeRooms.forEach(rm => {
          const c = rm.center || polygonCenter(rm.points)
          const d = dist(center, c)
          if (d < bestDist) {
            bestDist = d
            bestId = rm.id
          }
        })
        if (bestId) selectObject(bestId)
      })

      applyStoreToBp3d()
    }

    ;(window as any).__BP3D_READY__ = bind

    return () => {
      if ((window as any).__BP3D_READY__) delete (window as any).__BP3D_READY__
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize BP3D once scripts are ready
  useEffect(() => {
    if (!scriptsReady) return

    let cancelled = false
    let attempts = 0

    const tryInit = () => {
      if (cancelled || bpInitStartedRef.current) return

      const w = getBp3dWindow()
      const init = w.__BP3D_INIT__
      const ctor = w.BP3D?.Blueprint3d
      const $ = w.$
      const jquery = w.jQuery
      const floorplannerCanvas = document.getElementById('floorplanner-canvas')
      const viewer = document.getElementById('viewer')

      if (!floorplannerCanvas || !viewer) {
        attempts += 1
        if (attempts <= 100) {
          initRetryRef.current = window.setTimeout(tryInit, 50)
        }
        return
      }

      if (!$ && !jquery) {
        attempts += 1
        if (attempts > 200) {
          console.error('jQuery failed to load after 20 seconds', {
            hasInit: typeof init === 'function',
            hasConstructor: typeof ctor === 'function',
            has$: !!$,
            hasJQuery: !!jquery,
          })
          return
        }
        initRetryRef.current = window.setTimeout(tryInit, 100)
        return
      }

      if (typeof init !== 'function' || typeof ctor !== 'function') {
        attempts += 1
        if (attempts > 200) {
          console.error('Blueprint3D bootstrap timed out.', {
            hasInit: typeof init === 'function',
            ctorType: typeof ctor,
            has$: !!$,
            hasJQuery: !!jquery,
          })
          return
        }
        initRetryRef.current = window.setTimeout(tryInit, 100)
        return
      }

      try {
        bpInitStartedRef.current = true
        disposeBp3dGlobals(w)

        const bp = init(
          {
            floorplannerElement: 'floorplanner-canvas',
            threeElement: '#viewer',
            threeCanvasElement: 'three-canvas',
            textureDir: 'models/textures/',
            widget: false,
          },
          { loadSample: false }
        )
        
        if (bp?.model?.loadSerialized) {
          bp.model.loadSerialized(EMPTY_SERIALIZED)
        }
      } catch (error) {
        bpInitStartedRef.current = false
        attempts += 1
        console.error('Blueprint3D init failed, retrying...', error)
        if (attempts > 200) {
          const message = 'Blueprint3D failed to initialize after multiple attempts. Reload the page to retry.'
          setBpLoadError(message)
          return
        }
        initRetryRef.current = window.setTimeout(tryInit, 100)
      }
    }

    // Add a small delay to ensure scripts are fully executed
    initRetryRef.current = window.setTimeout(tryInit, 500)

    return () => {
      cancelled = true
      if (initRetryRef.current) {
        window.clearTimeout(initRetryRef.current)
        initRetryRef.current = null
      }
    }
  }, [scriptsReady])

  // Sync store -> BP3D when external updates occur
  useEffect(() => {
    if (!bpReady) return
    if (syncRef.current === 'bp3d') return

    applyStoreToBp3d()

    // Imported SVG updates originate outside Blueprint3D. When the user is already
    // in 3D mode, re-center once after the new floorplan is applied so the viewer
    // doesn't stay focused on the previous empty scene.
    if (mode === '3d') {
      requestAnimationFrame(() => {
        bpRef.current?.three?.updateWindowSize?.()
        bpRef.current?.three?.centerCamera?.()
      })
    }
  }, [bpReady, mode, walls, rooms, furniture, activeLevelId])

  // Keep BP3D selection in sync with store selection
  useEffect(() => {
    if (!bpReady) return
    const bp = bpRef.current
    const controller = bp?.three?.getController?.()
    if (!controller) return
    const items = bp?.model?.scene?.getItems?.() || []
    const item = items.find((it: any) => it?.metadata?.storeId === selectedId) || null
    controller.setSelectedObject(item)
  }, [bpReady, selectedId])

  // 2D floorplanner click → store selection (walls/rooms) for calibration + edit tools
  useEffect(() => {
    if (!bpReady) return
    const bp = bpRef.current
    const fp = bp?.floorplanner
    const $ = (window as any).$
    if (!fp || !$) return
    const $canvas = fp.canvasElement || $('#floorplanner-canvas')
    if (!$canvas || !$canvas.length) return

    const ensureStoreSync = () => {
      const s = useFloorplanStore.getState()
      if (filterByLevel(s.walls, s.activeLevelId).length === 0 && bpRef.current?.model?.floorplan?.getWalls?.()?.length) {
        syncFromBp3dRef.current()
      }
    }

    const handleClick = (e: MouseEvent) => {
      ensureStoreSync()
      const store = useFloorplanStore.getState()
      if (store.mode !== '2d') return
      const tool = store.activeTool
      if (tool === 'wall' || tool === 'floor' || tool === 'delete') return

      const offset = $canvas.offset()
      if (!offset) return
      const mouseXcm = (e.clientX - offset.left) * fp.cmPerPixel + fp.originX * fp.cmPerPixel
      const mouseYcm = (e.clientY - offset.top) * fp.cmPerPixel + fp.originY * fp.cmPerPixel

      // Prefer active wall if available (floorplanner hover state)
      const fpWall = fp.activeWall || fp.floorplan?.overlappedWall?.(mouseXcm, mouseYcm)
      if (fpWall) {
        const storeWalls = filterByLevel(store.walls, store.activeLevelId)
        const mapped = wallMapRef.current.get(fpWall.id)
        const id = mapped || mapWallToStoreId(fpWall, storeWalls)
        if (id) {
          selectObject(id)
          return
        }
      }

      // Fallback: nearest wall by distance to segment
      const point = { x: cmToM(mouseXcm), y: cmToM(mouseYcm) }
      let nearestWallId: string | null = null
      let nearestWallDist = Infinity
      filterByLevel(store.walls, store.activeLevelId).forEach(w => {
        const d = distPointToSegment(point, w.start, w.end)
        if (d < nearestWallDist) {
          nearestWallDist = d
          nearestWallId = w.id
        }
      })
      if (nearestWallId && nearestWallDist < 0.2) {
        selectObject(nearestWallId)
        return
      }

      // Rooms (point-in-polygon)
      const room = filterByLevel(store.rooms, store.activeLevelId).find(r => pointInPolygon(point, r.points))
      if (room) {
        selectObject(room.id)
        return
      }

      selectObject(null)
    }

    const handleHover = (e: MouseEvent) => {
      ensureStoreSync()
      const store = useFloorplanStore.getState()
      if (store.mode !== '2d') return
      if (store.activeTool !== 'ruler') return

      let pickedWallId: string | null = null

      // Use floorplanner hover wall when available
      const wall = fp.activeWall
      if (wall) {
        const mapped = wallMapRef.current.get(wall.id)
        pickedWallId = mapped || mapWallToStoreId(wall, filterByLevel(store.walls, store.activeLevelId))
      }

      // Fallback: nearest wall to cursor (for some imported template cases)
      if (!pickedWallId) {
        const offset = $canvas.offset()
        if (offset) {
          const mouseXcm = (e.clientX - offset.left) * fp.cmPerPixel + fp.originX * fp.cmPerPixel
          const mouseYcm = (e.clientY - offset.top) * fp.cmPerPixel + fp.originY * fp.cmPerPixel
          const point = { x: cmToM(mouseXcm), y: cmToM(mouseYcm) }

          let nearestWallId: string | null = null
          let nearestWallDist = Infinity
          filterByLevel(store.walls, store.activeLevelId).forEach(w => {
            const d = distPointToSegment(point, w.start, w.end)
            if (d < nearestWallDist) {
              nearestWallDist = d
              nearestWallId = w.id
            }
          })

          if (nearestWallId && nearestWallDist < 0.3) {
            pickedWallId = nearestWallId
          }
        }
      }

      if (pickedWallId && store.selectedId !== pickedWallId) {
        selectObject(pickedWallId)
      }
    }

    $canvas.on('mouseup.storeSelect', handleClick)
    $canvas.on('mousemove.storeSelect', handleHover)
    return () => {
      $canvas.off('mouseup.storeSelect', handleClick)
      $canvas.off('mousemove.storeSelect', handleHover)
    }
  }, [bpReady, selectObject])

  // Map mode/tool to BP3D UI
  useEffect(() => {
    if (!bpReady) return
    const $ = (window as any).$
    const BP3D = (window as any).BP3D
    const fp = bpRef.current?.floorplanner
    const controller = bpRef.current?.three?.getController?.()

    if ($) {
      if (mode === '2d' || glbPreviewSource === 'none') {
        $('#floorplan_tab').click()
      } else {
        $('#design_tab').click()
        requestAnimationFrame(() => {
          bpRef.current?.three?.updateWindowSize?.()
          bpRef.current?.three?.centerCamera?.()
        })
      }
    }

    if (mode === '2d' && fp && BP3D?.Floorplanner?.floorplannerModes) {
      if (activeTool === 'wall') fp.setMode(BP3D.Floorplanner.floorplannerModes.DRAW)
      else if (activeTool === 'delete') fp.setMode(BP3D.Floorplanner.floorplannerModes.DELETE)
      else fp.setMode(BP3D.Floorplanner.floorplannerModes.MOVE)
    }

    // Handle 3D design mode tools
    if (mode === '3d' && controller) {
      // For 3D mode, we need to manage controller state based on activeTool
      // Note: Blueprint3D controller handles basic interactions automatically,
      // but we can influence behavior through tool state
      if (activeTool === 'rotate' && controller.rotatePressed) {
        // Enable rotation mode
        controller.rotatePressed()
      } else if (activeTool === 'move') {
        // Default move/drag behavior is handled automatically by controller
        // when items are selected
      } else if (activeTool === 'resize') {
        // Resize is typically handled by item-specific drag handles
        // when items are selected
      } else if (activeTool === 'label') {
        // Label tool might need custom implementation
        // Could show/hide label editing UI
      } else if (activeTool === 'ruler') {
        // Ruler tool might need custom implementation
        // Could enable measurement mode
      } else if (activeTool === 'select') {
        // Default selection mode
      }
    }
  }, [bpReady, mode, activeTool, glbPreviewSource])

  const zoomEditor = (direction: 'in' | 'out') => {
    const bp = bpRef.current
    if (!bp) return

    if (mode === '3d') {
      const controls = bp?.three?.controls
      if (!controls) return

      if (direction === 'in') controls.dollyIn?.(1.15)
      else controls.dollyOut?.(1.15)
      controls.update?.()
      return
    }

    const fp = bp?.floorplanner
    const canvasEl = fp?.canvasElement?.get?.(0) || document.getElementById('floorplanner-canvas')
    if (!fp || !canvasEl) return

    const rect = canvasEl.getBoundingClientRect()
    fp.mousewheel?.({
      deltaY: direction === 'in' ? -120 : 120,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      preventDefault() { },
      stopPropagation() { },
    })
  }

  return (
    <div className="flex-1 h-full w-full overflow-hidden bg-transparent">
      <link href="/css/bootstrap.css" rel="stylesheet" />
      <link href="/css/room-designer-embed.css" rel="stylesheet" />

      {glbPreviewSource !== 'none' && mode === '3d' && (
        <Suspense fallback={null}>
          <GLBOverlay />
        </Suspense>
      )}
      <div className="bp3d-root h-full">
        {bpLoadError ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
            <div className="max-w-lg rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-white shadow-2xl backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">Floorplan viewer failed to load</h3>
              <p className="mt-3 text-sm leading-6 text-rose-100">{bpLoadError}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Reload
                </button>
                <span className="text-xs text-rose-100 sm:text-sm">If the issue persists, refresh the page or reopen the editor.</span>
              </div>
            </div>
          </div>
        ) : null}
        <div className="container-fluid h-full">
          <div className="row main-row h-full">
            <div style={{ display: 'none' }}>
              <ul className="nav nav-sidebar">
                <li id="floorplan_tab"><a href="#">Edit Floorplan<span className="glyphicon glyphicon-chevron-right pull-right"></span></a></li>
                <li id="design_tab"><a href="#">Design<span className="glyphicon glyphicon-chevron-right pull-right"></span></a></li>
                <li id="items_tab"><a href="#">Add Items<span className="glyphicon glyphicon-chevron-right pull-right"></span></a></li>
              </ul>

              <div id="context-menu">
                <div style={{ margin: '0 20px' }}>
                  <span id="context-menu-name" className="lead"></span>
                  <br /><br />
                  <button className="btn btn-block btn-danger" id="context-menu-delete">
                    <span className="glyphicon glyphicon-trash"></span>
                    Delete Item
                  </button>
                  <br />
                  <div className="panel panel-default">
                    <div className="panel-heading">Adjust Size</div>
                    <div className="panel-body" style={{ color: '#333333' }}>
                      <div className="form form-horizontal" style={{ fontSize: '1.1em' }}>
                        <div className="form-group">
                          <label className="col-sm-5 control-label">Width</label>
                          <div className="col-sm-6">
                            <input type="number" className="form-control" id="item-width" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="col-sm-5 control-label">Depth</label>
                          <div className="col-sm-6">
                            <input type="number" className="form-control" id="item-depth" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="col-sm-5 control-label">Height</label>
                          <div className="col-sm-6">
                            <input type="number" className="form-control" id="item-height" />
                          </div>
                        </div>
                      </div>
                      <small><span className="text-muted">Measurements in inches.</span></small>
                    </div>
                  </div>
                  <label><input type="checkbox" id="fixed" /> Lock in place</label>
                  <br /><br />
                </div>
              </div>

              <div id="floorTexturesDiv" style={{ display: 'none', padding: '0 20px' }}>
                <div className="panel panel-default">
                  <div className="panel-heading">Adjust Floor</div>
                  <div className="panel-body" style={{ color: '#333333' }}>
                    <div className="col-sm-6" style={{ padding: '3px' }}>
                      <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/light_fine_wood.jpg" data-texture-stretch="false" data-texture-scale="300">
                        <img alt="Thumbnail light fine wood" src="rooms/thumbnails/thumbnail_light_fine_wood.jpg" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div id="wallTextures" style={{ display: 'none', padding: '0 20px' }}>
                <div className="panel panel-default">
                  <div className="panel-heading">Adjust Wall</div>
                  <div className="panel-body" style={{ color: '#333333' }}>
                    <div className="col-sm-6" style={{ padding: '3px' }}>
                      <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/marbletiles.jpg" data-texture-stretch="false" data-texture-scale="300">
                        <img alt="Thumbnail marbletiles" src="rooms/thumbnails/thumbnail_marbletiles.jpg" />
                      </a>
                    </div>
                    <div className="col-sm-6" style={{ padding: '3px' }}>
                      <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/wallmap_yellow.png" data-texture-stretch="true" data-texture-scale="">
                        <img alt="Thumbnail wallmap yellow" src="rooms/thumbnails/thumbnail_wallmap_yellow.png" />
                      </a>
                    </div>
                    <div className="col-sm-6" style={{ padding: '3px' }}>
                      <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/light_brick.jpg" data-texture-stretch="false" data-texture-scale="100">
                        <img alt="Thumbnail light brick" src="rooms/thumbnails/thumbnail_light_brick.jpg" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xs-12 main">
              <div className="absolute right-4 top-4 z-20 flex flex-col gap-2 rounded-[22px] border border-white/10 bg-slate-950/60 p-2 shadow-[0_18px_40px_rgba(2,6,23,0.32)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => zoomEditor('in')}
                  className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.05] text-lg font-semibold text-white transition hover:bg-white/[0.1]"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => zoomEditor('out')}
                  className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.05] text-lg font-semibold text-white transition hover:bg-white/[0.1]"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  -
                </button>
              </div>

              <div id="viewer">
                <div id="camera-controls">
                  <a href="#" className="btn btn-default bottom" id="zoom-out"><span className="glyphicon glyphicon-zoom-out"></span></a>
                  <a href="#" className="btn btn-default bottom" id="reset-view"><span className="glyphicon glyphicon glyphicon-home"></span></a>
                  <a href="#" className="btn btn-default bottom" id="zoom-in"><span className="glyphicon glyphicon-zoom-in"></span></a>
                  <span>&nbsp;</span>
                  <a className="btn btn-default bottom" href="#" id="move-left"><span className="glyphicon glyphicon-arrow-left"></span></a>
                  <span className="btn-group-vertical">
                    <a className="btn btn-default" href="#" id="move-up"><span className="glyphicon glyphicon-arrow-up"></span></a>
                    <a className="btn btn-default" href="#" id="move-down"><span className="glyphicon glyphicon-arrow-down"></span></a>
                  </span>
                  <a className="btn btn-default bottom" href="#" id="move-right"><span className="glyphicon glyphicon-arrow-right"></span></a>
                </div>

                <div id="loading-modal">
                  <h1>Loading...</h1>
                </div>
              </div>

              <div id="floorplanner">
                <canvas id="floorplanner-canvas"></canvas>
                <div id="floorplanner-controls">
                  <button id="move" className="btn btn-sm btn-default">
                    <span className="glyphicon glyphicon-move"></span>
                    Move Walls
                  </button>
                  <button id="draw" className="btn btn-sm btn-default">
                    <span className="glyphicon glyphicon-pencil"></span>
                    Draw Walls
                  </button>
                  <button id="delete" className="btn btn-sm btn-default">
                    <span className="glyphicon glyphicon-remove"></span>
                    Delete Walls
                  </button>
                  <span className="pull-right">
                    <button className="btn btn-primary btn-sm" id="update-floorplan">Done &raquo;</button>
                  </span>
                </div>
                <div id="draw-walls-hint">Press the &quot;Esc&quot; key to stop drawing walls</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
