'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuidv4 } from 'uuid'

// --- Types ---

export interface Vector2 {
    x: number
    y: number
}

export const DEFAULT_LEVEL_ID = 'level-ground'
export const DEFAULT_LEVEL_ELEVATION_STEP = 3.2

export type CameraMode = 'orbit' | 'fpv'
export type DeferredTaskType = 'detect_rooms' | 'detect_walls' | 'detect_doors' | 'detect_windows' | 'detect_furniture' | 'gen_3d'
export type LocalDraftStatus = 'idle' | 'saving' | 'saved' | 'restored' | 'error'

export interface FloorLevel {
    id: string
    name: string
    elevation: number
    referenceImage: string | null
    referenceImageDimensions: { width: number; height: number } | null
}

export interface DeferredTask {
    id: string
    runId: string
    type: DeferredTaskType
    createdAt: string
    payload?: {
        formats?: string[]
    }
}

export type Wall = {
    id: string
    start: Vector2
    end: Vector2
    thickness: number
    height: number
    levelId?: string
    label?: string
    color?: string // Added
    textureDataUrl?: string
    textureTileWidthM?: number
    textureTileHeightM?: number
    // PBR map data URLs (extracted from ZIP for browser 3D preview)
    pbrNormalUrl?: string
    pbrRoughnessUrl?: string
    pbrAoUrl?: string
    pbrMetalnessUrl?: string
}

export type FurnItem = {
    id: string
    type: string
    levelId?: string
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    dimensions: { width: number; height: number; depth: number }
    modelUrl?: string
    mtlUrl?: string
    furnAiId?: string // Link strictly to manifest AI items
    label?: string
    color?: string // Added
}

export type Room = {
    id: string
    name: string
    levelId?: string
    points: Vector2[] // Polygon vertices
    color: string
    center: Vector2 // For label positioning
    textureDataUrl?: string
    textureTileWidthM?: number
    textureTileHeightM?: number
    // PBR map data URLs (extracted from ZIP for browser 3D preview)
    pbrNormalUrl?: string
    pbrRoughnessUrl?: string
    pbrAoUrl?: string
    pbrMetalnessUrl?: string
}

export type TextLabel = {
    id: string
    text: string
    levelId?: string
    position: Vector2
}

type HistorySnapshot = {
    walls: Wall[]
    furniture: FurnItem[]
    rooms: Room[]
    labels: TextLabel[]
}

type ClipboardPayload =
    | { type: 'wall'; data: Wall }
    | { type: 'furniture'; data: FurnItem }
    | { type: 'room'; data: Room }
    | { type: 'label'; data: TextLabel }

type MutableHistoryState = FloorplanState & {
    history?: HistorySnapshot[]
    historyIndex?: number
    clipboard?: ClipboardPayload
}

const createHistorySnapshot = (state: Pick<FloorplanState, 'walls' | 'furniture' | 'rooms' | 'labels'>): HistorySnapshot => ({
    walls: JSON.parse(JSON.stringify(state.walls)),
    furniture: JSON.parse(JSON.stringify(state.furniture)),
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    labels: JSON.parse(JSON.stringify(state.labels)),
})

const pushHistorySnapshot = (state: MutableHistoryState) => {
    const snapshot = createHistorySnapshot(state)
    const history = state.history || []
    const historyIndex = state.historyIndex ?? history.length - 1
    const nextHistory = [...history.slice(0, historyIndex + 1), snapshot].slice(-20)
    state.history = nextHistory
    state.historyIndex = nextHistory.length - 1
}

const LOCAL_DRAFT_STORAGE_KEY = 'strukt:editor-draft:v1'
const DEFERRED_TASK_STORAGE_KEY = 'strukt:editor-deferred:v1'

const createDefaultLevel = (index = 0): FloorLevel => ({
    id: index === 0 ? DEFAULT_LEVEL_ID : `level-${index + 1}`,
    name: index === 0 ? 'Ground Floor' : `Floor ${index + 1}`,
    elevation: index * DEFAULT_LEVEL_ELEVATION_STEP,
    referenceImage: null,
    referenceImageDimensions: null,
})

const normalizeLevelId = (levelId?: string | null) => levelId || DEFAULT_LEVEL_ID

const getLevelById = (levels: FloorLevel[], levelId?: string | null) => {
    const normalizedId = normalizeLevelId(levelId)
    return levels.find((level) => level.id === normalizedId) || levels[0] || createDefaultLevel()
}

const canPersistUploadedImage = (source: string | null) => {
    if (!source) return true
    if (source.startsWith('blob:')) return false
    return source.length <= 2_000_000
}

type LocalDraftPayload = {
    version: 1
    savedAt: number
    mode: '2d' | '3d'
    cameraMode: CameraMode
    activeTool: FloorplanState['activeTool']
    walls: Wall[]
    furniture: FurnItem[]
    rooms: Room[]
    labels: TextLabel[]
    levels: FloorLevel[]
    activeLevelId: string
    currentRunId: string | null
    runStatus: FloorplanState['runStatus']
    uploadedImage: string | null
    imageDimensions: { width: number; height: number } | null
    calibrationFactor: number
    isCalibrated: boolean
    showBackground: boolean
    glbPreviewSource: FloorplanState['glbPreviewSource']
    exportScale: number
}

const readDeferredTasks = (): DeferredTask[] => {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(DEFERRED_TASK_STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const persistDeferredTasks = (tasks: DeferredTask[]) => {
    if (typeof window === 'undefined') return
    try {
        if (tasks.length === 0) {
            window.localStorage.removeItem(DEFERRED_TASK_STORAGE_KEY)
            return
        }
        window.localStorage.setItem(DEFERRED_TASK_STORAGE_KEY, JSON.stringify(tasks))
    } catch (error) {
        console.error('Failed to persist deferred tasks', error)
    }
}

const buildLocalDraft = (state: FloorplanState): LocalDraftPayload => ({
    version: 1,
    savedAt: Date.now(),
    mode: state.mode,
    cameraMode: state.cameraMode,
    activeTool: state.activeTool,
    walls: JSON.parse(JSON.stringify(state.walls)),
    furniture: JSON.parse(JSON.stringify(state.furniture)),
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    labels: JSON.parse(JSON.stringify(state.labels)),
    levels: state.levels.map((level) => ({
        ...JSON.parse(JSON.stringify(level)),
        referenceImage: canPersistUploadedImage(level.referenceImage) ? level.referenceImage : null,
    })),
    activeLevelId: state.activeLevelId,
    currentRunId: state.currentRunId,
    runStatus: state.runStatus,
    uploadedImage: canPersistUploadedImage(state.uploadedImage) ? state.uploadedImage : null,
    imageDimensions: state.imageDimensions ? { ...state.imageDimensions } : null,
    calibrationFactor: state.calibrationFactor,
    isCalibrated: state.isCalibrated,
    showBackground: state.showBackground,
    glbPreviewSource: state.glbPreviewSource,
    exportScale: state.exportScale,
})

const readLocalDraft = (): LocalDraftPayload | null => {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(LOCAL_DRAFT_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || parsed.version !== 1) return null
        return parsed
    } catch {
        return null
    }
}

const clearLocalDraftStorage = () => {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY)
    } catch {
        // ignore
    }
}

const filterEntitiesForLevel = <T extends { levelId?: string }>(entities: T[], levelId: string) => (
    entities.filter((entity) => normalizeLevelId(entity.levelId) === normalizeLevelId(levelId))
)

const filterEntitiesOutsideLevel = <T extends { levelId?: string }>(entities: T[], levelId: string) => (
    entities.filter((entity) => normalizeLevelId(entity.levelId) !== normalizeLevelId(levelId))
)

export interface FloorplanState {
    mode: '2d' | '3d'
    cameraMode: CameraMode
    activeTool: 'select' | 'move' | 'resize' | 'rotate' | 'delete' | 'label' | 'wall' | 'ruler' | 'furniture' | 'floor' | 'none'
    lightingPreset: 'day' | 'night' | 'studio' | 'sunset'
    drawing: boolean
    activeWallId: string | null
    levels: FloorLevel[]
    activeLevelId: string
    walls: Wall[]
    furniture: FurnItem[]
    rooms: Room[]
    labels: TextLabel[]
    pendingDrop: { type: string; x: number; y: number } | null // x,y are NDC [-1, 1]

    currentRunId: string | null
    runStatus: 'idle' | 'processing' | 'completed' | 'failed'
    selectedId: string | null

    // Calibration & 3D Workflow
    uploadedImage: string | null
    imageDimensions: { width: number; height: number } | null
    imageWorldWidth?: number
    imageWorldHeight?: number
    calibrationFactor: number // Meters per Pixel
    isCalibrated: boolean
    isGenerating3D: boolean
    isRendering: boolean
    showBackground: boolean // New state for background visibility
    glbPreviewSource: 'none' | 'test' | 'generated'
    showProcessingModal: boolean // New state for popup
    showQueueModal: boolean
    projectsModalOpen: boolean // Global state for Projects Modal
    mobileSidebarOpen: boolean
    mobileRightSidebarOpen: boolean
    tutorialStep: 'none' | 'upload' | 'process' | 'calibration' | 'correction' | 'rooms' | 'floor_review'
    tutorialMinimized: boolean
    referenceMinimized: boolean
    lastQueuedTask: 'none' | 'detect_rooms' | 'detect_walls' | 'detect_doors' | 'detect_windows' | 'detect_furniture' | 'gen_3d'
    renders: string[]
    fitViewTrigger: number
    exportScale: number // Ratio to send to backend for 3D generation
    pendingFile: File | null

    interaction: {
        type: 'none' | 'drawing' | 'dragging' | 'resizing' | 'pending_draw' | 'drawing_floor'
        targetId: string | null
        subType?: 'start' | 'end' | 'thickness' | 'resize-width' | 'resize-depth' | 'resize-uniform'
        lastPoint: Vector2 | null
    }

    // UI Feedback
    toast: { message: string; type: 'error' | 'info' | 'success' } | null

    // Auth
    token: string | null
    user: { email: string; name: string; picture: string } | null
    rememberMe: boolean
    setToken: (token: string | null) => void
    setUser: (user: any) => void
    setRememberMe: (remember: boolean) => void
    workersOnline: number
    deferredTasks: DeferredTask[]
    localDraftStatus: LocalDraftStatus
    lastLocalSaveAt: number | null

    // Actions
    setMode: (mode: '2d' | '3d') => void
    setCameraMode: (mode: CameraMode) => void
    setActiveTool: (tool: FloorplanState['activeTool']) => void
    setLightingPreset: (preset: FloorplanState['lightingPreset']) => void
    setUploadedImage: (url: string | null, width?: number, height?: number) => void
    addLevel: () => void
    removeLevel: (levelId: string) => void
    setActiveLevel: (levelId: string) => void
    setCalibrationFactor: (factor: number) => void
    setRunId: (runId: string | null) => void
    setRunStatus: (status: 'idle' | 'processing' | 'completed' | 'failed') => void
    setWorkersOnline: (count: number) => void
    setShowProcessingModal: (show: boolean) => void
    setShowQueueModal: (show: boolean) => void
    setProjectsModalOpen: (show: boolean) => void
    setMobileSidebarOpen: (show: boolean) => void
    setMobileRightSidebarOpen: (show: boolean) => void
    setTutorialStep: (step: FloorplanState['tutorialStep']) => void
    setTutorialMinimized: (minimized: boolean) => void
    setReferenceMinimized: (minimized: boolean) => void
    completeTutorial: () => void
    setLastQueuedTask: (task: 'none' | 'detect_rooms' | 'detect_walls' | 'detect_doors' | 'detect_windows' | 'detect_furniture' | 'gen_3d') => void
    triggerDetectRooms: () => Promise<void>
    triggerDetectWalls: () => Promise<void>
    triggerDetectDoors: () => Promise<void>
    triggerDetectWindows: () => Promise<void>
    triggerDetectFurniture: () => Promise<void>
    generateFloors: () => Promise<void>
    selectObject: (id: string | null) => void
    deleteObject: (id: string) => void

    // Unified Interaction Actions
    startInteraction: (type: 'drawing' | 'dragging' | 'resizing' | 'drawing_floor', targetId: string | null, point: Vector2, subType?: 'start' | 'end' | 'thickness' | 'resize-width' | 'resize-depth' | 'resize-uniform') => void
    updateInteraction: (point: Vector2, options?: { shiftKey: boolean }) => void
    endInteraction: () => void

    calibrate: (wallId: string, realLength: number) => void
    syncSVGAndEnter3D: () => Promise<void>
    triggerBlenderGeneration: (formats?: string[]) => Promise<void>
    triggerRender: () => Promise<void>
    toggleBackground: () => void
    setGlbPreviewSource: (source: FloorplanState['glbPreviewSource']) => void

    updateFurniture: (id: string, updates: Partial<FurnItem>) => void
    updateLabel: (id: string, label: string) => void
    updateTextLabel: (id: string, updates: Partial<TextLabel>) => void
    updateWall: (id: string, updates: Partial<Wall>) => void
    updateRoom: (id: string, updates: Partial<Room>) => void

    // Bulk replace (used by Room Designer bridge)
    replaceScene: (payload: { walls: Wall[]; rooms: Room[]; furniture: FurnItem[]; labels?: TextLabel[] }) => void

    addFurniture: (type: string, position: Vector2) => void
    addImportedFurniture: (payload: { id: string; label?: string; relPath: string }) => void
    importFurnAiModel: (payload: { id: string, type: string, position: Vector2, modelUrl: string, furnAiId: string, label: string }) => void
    updateFurniturePosition: (id: string, position: { x?: number; y?: number; z?: number }) => void
    importFromSVG: (svgText: string) => void
    exportToSVG: () => string
    handleDrop: (type: string, x: number, y: number) => void
    // Undo/Redo/Clipboard
    undo: () => void
    redo: () => void
    copyObject: () => void
    pasteObject: () => void
    saveHistory: () => void
    consumeDrop: () => void
    addRender: (url: string) => void
    logAnalyticsEvent: (action: string) => void
    showToast: (message: string, type?: 'error' | 'info' | 'success') => void
    cornerSnapMode: boolean
    setCornerSnapMode: (active: boolean) => void
    snapCorners: { wallId: string; type: 'start' | 'end' }[]
    addSnapCorner: (corner: { wallId: string; type: 'start' | 'end' }) => void
    enqueueDeferredTask: (task: Omit<DeferredTask, 'id' | 'createdAt'>) => void
    flushDeferredTasks: () => Promise<void>
    saveLocalDraft: () => void
    restoreLocalDraft: () => boolean

    // Join Mode Interactions
    joinMode: boolean
    joinSourceId: string | null
    joinTargetId: string | null
    joinPreviewWalls: Wall[] | null

    setJoinMode: (active: boolean) => void
    setJoinTargetId: (id: string | null, point?: { x: number, y: number }) => void
    applyJoin: () => void
    setPendingFile: (file: File | null) => void
    resetFloorplan: () => void
}

// --- Store ---

export const useFloorplanStore = create<FloorplanState>()(
    immer((set, get): FloorplanState => ({
        mode: '2d', // Start in 2D to allow immediate editing
        cameraMode: 'orbit',
        activeTool: 'wall', // Default to drawing walls
        lightingPreset: 'day', // Default lighting
        drawing: false,
        activeWallId: null as string | null,
        levels: [createDefaultLevel()],
        activeLevelId: DEFAULT_LEVEL_ID,
        walls: [] as Wall[],
        furniture: [] as FurnItem[],
        rooms: [] as Room[],
        labels: [] as TextLabel[],
        pendingDrop: null as FloorplanState['pendingDrop'],
        currentRunId: null as string | null,
        runStatus: 'idle',
        selectedId: null as string | null,
        uploadedImage: null,
        imageDimensions: null,
        calibrationFactor: 0.01, // Default 1px = 1cm
        isCalibrated: false,
        isGenerating3D: false,
        isRendering: false,
        showBackground: true, // Default visible
        glbPreviewSource: 'none',
        showProcessingModal: false, // Default
        showQueueModal: false, // Default
        projectsModalOpen: false, // Global state for Projects Modal
        mobileSidebarOpen: false,
        mobileRightSidebarOpen: false,
        tutorialStep: 'none',
        tutorialMinimized: false,
        referenceMinimized: false,
        renders: [],
        interaction: {
            type: 'none',
            targetId: null,
            lastPoint: null
        },
        fitViewTrigger: 0,
        exportScale: 1,
        pendingFile: null,
        logAnalyticsEvent: (action: string) => {
            const state = useFloorplanStore.getState()
            if (!state.token && !state.user) return
            fetch('/api/admin/log-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}),
                },
                body: JSON.stringify({ action, job_id: state.currentRunId })
            }).catch((e) => console.error('Analytics error:', e))
        },
        toast: null,
        cornerSnapMode: false,
        snapCorners: [],

        joinMode: false,
        joinSourceId: null,
        joinTargetId: null,
        joinPreviewWalls: null,

        token: typeof window !== 'undefined' ? localStorage.getItem('google_token') || null : null,
        user: null,
        rememberMe: true,
        workersOnline: 0,
        deferredTasks: readDeferredTasks(),
        localDraftStatus: 'idle',
        lastLocalSaveAt: null,

        setToken: (token) => set((state) => {
            state.token = token
            if (typeof window !== 'undefined') {
                if (token) localStorage.setItem('google_token', token)
                else localStorage.removeItem('google_token')
            }
        }),
        setUser: (user) => set((state) => { state.user = user }),
        setRememberMe: (remember) => set((state) => { state.rememberMe = remember }),

        setMode: (mode) => set((state) => {
            state.mode = mode
            if (mode === '2d') {
                state.glbPreviewSource = 'none'
                state.cameraMode = 'orbit'
            }
        }),
        setCameraMode: (cameraMode) => set((state) => { state.cameraMode = cameraMode }),
        setActiveTool: (tool) => set((state) => { state.activeTool = tool }),
        setLightingPreset: (preset) => set((state) => { state.lightingPreset = preset }),
        setUploadedImage: (url, width, height) => set((state) => {
            state.uploadedImage = url
            if (width && height) {
                state.imageDimensions = { width, height }
            } else if (url === null) {
                state.imageDimensions = null
            }

            const activeLevel = getLevelById(state.levels, state.activeLevelId)
            if (activeLevel) {
                activeLevel.referenceImage = url
                activeLevel.referenceImageDimensions = width && height
                    ? { width, height }
                    : (url === null ? null : activeLevel.referenceImageDimensions)
            }

            if (url && state.tutorialStep === 'upload') {
                state.tutorialStep = 'process'
                state.tutorialMinimized = false
            }
        }),
        addLevel: () => set((state) => {
            const nextIndex = state.levels.length
            const lastElevation = state.levels[state.levels.length - 1]?.elevation ?? 0
            const level = createDefaultLevel(nextIndex)
            level.id = `level-${Date.now()}-${nextIndex + 1}`
            level.name = `Floor ${nextIndex + 1}`
            level.elevation = lastElevation + DEFAULT_LEVEL_ELEVATION_STEP
            state.levels.push(level)
            state.activeLevelId = level.id
            state.uploadedImage = level.referenceImage
            state.imageDimensions = level.referenceImageDimensions
            state.selectedId = null
        }),
        removeLevel: (levelId) => set((state) => {
            if (state.levels.length <= 1) return
            const normalizedLevelId = normalizeLevelId(levelId)
            state.levels = state.levels.filter((level) => level.id !== normalizedLevelId)
            state.walls = filterEntitiesOutsideLevel(state.walls, normalizedLevelId)
            state.furniture = filterEntitiesOutsideLevel(state.furniture, normalizedLevelId)
            state.rooms = filterEntitiesOutsideLevel(state.rooms, normalizedLevelId)
            state.labels = filterEntitiesOutsideLevel(state.labels, normalizedLevelId)
            const fallbackLevel = state.levels[0] || createDefaultLevel()
            if (state.activeLevelId === normalizedLevelId) {
                state.activeLevelId = fallbackLevel.id
                state.uploadedImage = fallbackLevel.referenceImage
                state.imageDimensions = fallbackLevel.referenceImageDimensions
                state.selectedId = null
            }
        }),
        setActiveLevel: (levelId) => set((state) => {
            const level = getLevelById(state.levels, levelId)
            state.activeLevelId = level.id
            state.uploadedImage = level.referenceImage
            state.imageDimensions = level.referenceImageDimensions
            state.selectedId = null
        }),
        setCalibrationFactor: (factor) => set((state) => {
            state.calibrationFactor = factor
            state.isCalibrated = true
            if (state.tutorialStep === 'calibration') {
                state.tutorialStep = 'correction'
                state.tutorialMinimized = false
                state.activeTool = 'select'
            }
            get().logAnalyticsEvent('ruler_calibrate')
        }),
        setRunId: (runId) => set((state) => { state.currentRunId = runId }),
        setRunStatus: (status) => set((state) => { state.runStatus = status }),
        setWorkersOnline: (workersOnline) => set((state) => { state.workersOnline = workersOnline }),
        setShowProcessingModal: (show) => set((state) => { state.showProcessingModal = show }),
        setShowQueueModal: (show) => set((state) => { state.showQueueModal = show }),
        setProjectsModalOpen: (show) => set((state) => { state.projectsModalOpen = show }),
        setMobileSidebarOpen: (show) => set((state) => { state.mobileSidebarOpen = show }),
        setMobileRightSidebarOpen: (show) => set((state) => { state.mobileRightSidebarOpen = show }),

        // Tutorial State
        lastQueuedTask: 'none',
        setTutorialStep: (step) => set((state) => {
            state.tutorialStep = step
            state.tutorialMinimized = false
        }),
        setTutorialMinimized: (minimized) => set((state) => { state.tutorialMinimized = minimized }),
        setReferenceMinimized: (minimized) => set((state) => { state.referenceMinimized = minimized }),
        completeTutorial: () => set((state) => { state.tutorialStep = 'none' }),
        setLastQueuedTask: (task) => set((state) => { state.lastQueuedTask = task }),

        triggerDetectRooms: async () => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId) return
            if (!state.isCalibrated) return
            if (state.workersOnline < 1) {
                state.enqueueDeferredTask({ runId: state.currentRunId, type: 'detect_rooms' })
                state.showToast('Workers are offline. Room detection is saved locally and will queue automatically.', 'info')
                return
            }

            set((s) => {
                s.lastQueuedTask = 'detect_rooms'
                s.runStatus = 'processing'
            })

            state.setShowProcessingModal(true)

            const headers: Record<string, string> = {}
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`

            // 1) Upload the latest edited SVG from the 2D editor (source of truth)
            try {
                const svgText = state.exportToSVG()
                const putHeaders: Record<string, string> = {
                    ...headers,
                    'Content-Type': 'image/svg+xml'
                }
                const putRes = await fetch(`/api/runs/${state.currentRunId}/svg`, {
                    method: 'PUT',
                    headers: putHeaders,
                    body: svgText
                })
                if (!putRes.ok) {
                    throw new Error(await putRes.text())
                }
            } catch (e) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw e
            }

            const res = await fetch(`/api/runs/${state.currentRunId}/detect-rooms`, {
                method: 'POST',
                headers
            })
            if (!res.ok) {
                const errText = await res.text()
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                if (res.status === 429) {
                    try {
                        const errData = JSON.parse(errText)
                        state.showToast(errData.detail || 'Token limit reached. Upgrade to Pro.', 'error')
                    } catch {
                        state.showToast('Token limit reached. Upgrade to Pro for more.', 'error')
                    }
                    return
                }
                throw new Error(errText)
            }
            get().logAnalyticsEvent('detect_rooms')
        },


        triggerDetectWalls: async () => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId) return
            if (!state.isCalibrated) return
            if (state.workersOnline < 1) {
                state.enqueueDeferredTask({ runId: state.currentRunId, type: 'detect_walls' })
                state.showToast('Workers are offline. Wall detection is saved locally and will queue automatically.', 'info')
                return
            }

            set((s) => {
                s.lastQueuedTask = 'detect_walls'
                s.runStatus = 'processing'
            })

            state.setShowProcessingModal(true)

            const headers: Record<string, string> = {}
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`

            // 1) Upload the latest edited SVG from the 2D editor (source of truth)
            try {
                const svgText = state.exportToSVG()
                const putHeaders: Record<string, string> = {
                    ...headers,
                    'Content-Type': 'image/svg+xml'
                }
                const putRes = await fetch(`/api/runs/${state.currentRunId}/svg`, {
                    method: 'PUT',
                    headers: putHeaders,
                    body: svgText
                })
                if (!putRes.ok) {
                    throw new Error(await putRes.text())
                }
            } catch (e) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw e
            }

            const res = await fetch(`/api/runs/${state.currentRunId}/detect-walls`, {
                method: 'POST',
                headers
            })
            if (!res.ok) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw new Error(await res.text())
            }
        },

        triggerDetectDoors: async () => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId) return
            if (!state.isCalibrated) return
            if (state.workersOnline < 1) {
                state.enqueueDeferredTask({ runId: state.currentRunId, type: 'detect_doors' })
                state.showToast('Workers are offline. Door detection is saved locally and will queue automatically.', 'info')
                return
            }

            set((s) => {
                s.lastQueuedTask = 'detect_doors'
                s.runStatus = 'processing'
            })

            state.setShowProcessingModal(true)

            const headers: Record<string, string> = {}
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`

            // 1) Upload the latest edited SVG from the 2D editor (source of truth)
            try {
                const svgText = state.exportToSVG()
                const putHeaders: Record<string, string> = {
                    ...headers,
                    'Content-Type': 'image/svg+xml'
                }
                const putRes = await fetch(`/api/runs/${state.currentRunId}/svg`, {
                    method: 'PUT',
                    headers: putHeaders,
                    body: svgText
                })
                if (!putRes.ok) {
                    throw new Error(await putRes.text())
                }
            } catch (e) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw e
            }

            const res = await fetch(`/api/runs/${state.currentRunId}/detect-doors`, {
                method: 'POST',
                headers
            })
            if (!res.ok) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw new Error(await res.text())
            }
        },

        triggerDetectWindows: async () => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId) return
            if (!state.isCalibrated) return
            if (state.workersOnline < 1) {
                state.enqueueDeferredTask({ runId: state.currentRunId, type: 'detect_windows' })
                state.showToast('Workers are offline. Window detection is saved locally and will queue automatically.', 'info')
                return
            }

            set((s) => {
                s.lastQueuedTask = 'detect_windows'
                s.runStatus = 'processing'
            })

            state.setShowProcessingModal(true)

            const headers: Record<string, string> = {}
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`

            // 1) Upload the latest edited SVG from the 2D editor (source of truth)
            try {
                const svgText = state.exportToSVG()
                const putHeaders: Record<string, string> = {
                    ...headers,
                    'Content-Type': 'image/svg+xml'
                }
                const putRes = await fetch(`/api/runs/${state.currentRunId}/svg`, {
                    method: 'PUT',
                    headers: putHeaders,
                    body: svgText
                })
                if (!putRes.ok) {
                    throw new Error(await putRes.text())
                }
            } catch (e) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw e
            }

            const res = await fetch(`/api/runs/${state.currentRunId}/detect-windows`, {
                method: 'POST',
                headers
            })
            if (!res.ok) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw new Error(await res.text())
            }
        },

        triggerDetectFurniture: async () => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId) return
            if (!state.isCalibrated) return
            if (state.workersOnline < 1) {
                state.enqueueDeferredTask({ runId: state.currentRunId, type: 'detect_furniture' })
                state.showToast('Workers are offline. Furniture detection is saved locally and will queue automatically.', 'info')
                return
            }

            set((s) => {
                s.lastQueuedTask = 'detect_furniture'
                s.runStatus = 'processing'
            })

            state.setShowProcessingModal(true)

            const headers: Record<string, string> = {}
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`

            // 1) Upload the latest edited SVG from the 2D editor (source of truth)
            try {
                const svgText = state.exportToSVG()
                const putHeaders: Record<string, string> = {
                    ...headers,
                    'Content-Type': 'image/svg+xml'
                }
                const putRes = await fetch(`/api/runs/${state.currentRunId}/svg`, {
                    method: 'PUT',
                    headers: putHeaders,
                    body: svgText
                })
                if (!putRes.ok) {
                    throw new Error(await putRes.text())
                }
            } catch (e) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw e
            }

            const res = await fetch(`/api/runs/${state.currentRunId}/detect-furniture`, {
                method: 'POST',
                headers
            })
            if (!res.ok) {
                set((s) => {
                    s.runStatus = 'failed'
                    s.lastQueuedTask = 'none'
                })
                state.setShowProcessingModal(false)
                throw new Error(await res.text())
            }
        },

        selectObject: (id) => set((state) => { state.selectedId = id }),

        deleteObject: (id) => set((state) => {
            state.walls = state.walls.filter((w: Wall) => w.id !== id)
            state.furniture = state.furniture.filter((f: FurnItem) => f.id !== id)
            state.rooms = state.rooms.filter((r: Room) => r.id !== id)
            state.labels = state.labels.filter((l: TextLabel) => l.id !== id)
            if (state.selectedId === id) state.selectedId = null
            pushHistorySnapshot(state as MutableHistoryState)
        }),

        startInteraction: (type, targetId, point, subType) => set((state) => {
            state.interaction = { type, targetId, subType, lastPoint: point }

            if (type === 'drawing') {
                const id = uuidv4()
                const snap = 0.1
                const safeX = isNaN(point.x) ? 0 : Math.min(Math.max(point.x, -50), 50)
                const safeY = isNaN(point.y) ? 0 : Math.min(Math.max(point.y, -50), 50)
                let sp = { x: Math.round(safeX / snap) * snap, y: Math.round(safeY / snap) * snap }

                const ENDPOINT_SNAP = 0.25
                for (const other of state.walls) {
                    for (const ep of [other.start, other.end]) {
                        if (Math.abs(sp.x - ep.x) < ENDPOINT_SNAP && Math.abs(sp.y - ep.y) < ENDPOINT_SNAP) {
                            sp = { x: ep.x, y: ep.y }
                            break
                        }
                    }
                }

                state.walls.push({
                    id,
                    start: sp,
                    end: sp,
                    levelId: state.activeLevelId,
                    thickness: 0.15,
                    height: 2.5
                })
                state.interaction.targetId = id
            } else if (type === 'drawing_floor') {
                const id = uuidv4()
                const snap = 0.1
                const safeX = isNaN(point.x) ? 0 : Math.min(Math.max(point.x, -50), 50)
                const safeY = isNaN(point.y) ? 0 : Math.min(Math.max(point.y, -50), 50)
                const sp = { x: Math.round(safeX / snap) * snap, y: Math.round(safeY / snap) * snap }

                // Create a degenerate rectangle (all points at start)
                state.rooms.push({
                    id,
                    name: 'New Room',
                    levelId: state.activeLevelId,
                    color: '#fbbf24', // Default amber
                    points: [
                        { ...sp }, { ...sp }, { ...sp }, { ...sp }
                    ],
                    center: { ...sp }
                })
                state.interaction.targetId = id
            }
        }),

        updateInteraction: (point, options) => set((state) => {
            const { type, targetId, subType, lastPoint } = state.interaction
            if (type === 'none' || !lastPoint) return

            const snap = 0.1
            const safeX = isNaN(point.x) ? 0 : Math.min(Math.max(point.x, -50), 50)
            const safeY = isNaN(point.y) ? 0 : Math.min(Math.max(point.y, -50), 50)
            const sp = { x: Math.round(safeX / snap) * snap, y: Math.round(safeY / snap) * snap }
            const lp = { x: Math.round(lastPoint.x / snap) * snap, y: Math.round(lastPoint.y / snap) * snap }

            const delta = { x: sp.x - lp.x, y: sp.y - lp.y }

            if (type === 'drawing' && targetId) {
                const wall = state.walls.find(w => w.id === targetId)
                if (wall) {
                    wall.end = sp
                    const ENDPOINT_SNAP = 0.25
                    let snappedToEndpoint = false

                    for (const other of state.walls) {
                        if (other.id === wall.id) continue
                        for (const ep of [other.start, other.end]) {
                            const edx = Math.abs(wall.end.x - ep.x)
                            const edy = Math.abs(wall.end.y - ep.y)
                            if (edx < ENDPOINT_SNAP && edy < ENDPOINT_SNAP) {
                                wall.end = { x: ep.x, y: ep.y }
                                snappedToEndpoint = true
                                break
                            }
                        }
                        if (snappedToEndpoint) break
                    }

                    if (!snappedToEndpoint) {
                        const dx = Math.abs(wall.end.x - wall.start.x)
                        const dy = Math.abs(wall.end.y - wall.start.y)
                        const SNAP_TOLERANCE = 0.5

                        if (options?.shiftKey) {
                            if (dx > dy) wall.end.y = wall.start.y
                            else wall.end.x = wall.start.x
                        } else {
                            if (dy < SNAP_TOLERANCE && dx > dy) {
                                wall.end.y = wall.start.y
                            } else if (dx < SNAP_TOLERANCE && dy > dx) {
                                wall.end.x = wall.start.x
                            }
                        }
                    }
                }
            } else if (type === 'drawing_floor' && targetId) {
                const room = state.rooms.find(r => r.id === targetId)
                if (room) {
                    // Update P2 (Top-Right) and P3 (Bottom-Left) based on Start (P0) and Current Mouse (P2's X, P3's Y)
                    // Actually, let's treat sp as the diagonal opposite corner
                    // P0 = Start (Fixed)
                    // P1 = { x: sp.x, y: lp.y } -> No, we need origin. 
                    // To do this correctly without extra state, we assume P0 is the anchor.
                    // But P0 changes if we just update points.
                    // We need to know which point is the anchor. 
                    // For simplicity: Point 0 is always the anchor established in startInteraction.
                    // But here we don't have P0 stored separately? 
                    // Actually, P0 in the array IS the anchor if we only update indices 1, 2, 3.

                    const p0 = room.points[0]
                    const p2 = sp

                    // P1 = { x: p2.x, y: p0.y }
                    // P2 = p2
                    // P3 = { x: p0.x, y: p2.y }

                    // Room Points order: P0 -> P1 -> P2 -> P3 (Clockwise or CCW)
                    room.points[1] = { x: p2.x, y: p0.y }
                    room.points[2] = { ...p2 }
                    room.points[3] = { x: p0.x, y: p2.y }

                    // Update Center
                    room.center.x = (p0.x + p2.x) / 2
                    room.center.y = (p0.y + p2.y) / 2
                }
            } else if (type === 'dragging' && targetId) {
                const wall = state.walls.find(w => w.id === targetId)
                const furn = state.furniture.find(f => f.id === targetId)
                if (wall && (delta.x !== 0 || delta.y !== 0)) {
                    wall.start.x += delta.x; wall.start.y += delta.y
                    wall.end.x += delta.x; wall.end.y += delta.y
                } else if (furn && (delta.x !== 0 || delta.y !== 0)) {
                    furn.position.x += delta.x
                    furn.position.z += delta.y

                    // --- LEGO SNAPPING FOR DOORS & WINDOWS ---
                    if ((furn.type === 'door' || furn.type === 'window') && !options?.shiftKey) {
                        let bestWall: typeof state.walls[number] | null = null;
                        let minDist = 0.3; // Snap threshold: 0.3 meters (reduced to allow easier detaching)
                        let snapX = furn.position.x;
                        let snapZ = furn.position.z;
                        let snapAngle = furn.rotation.y;

                        for (const w of state.walls) {
                            const dx = w.end.x - w.start.x;
                            const dy = w.end.y - w.start.y;
                            const lengthSquared = dx * dx + dy * dy;

                            if (lengthSquared === 0) continue;

                            // Project point onto line segment
                            let t = ((furn.position.x - w.start.x) * dx + (furn.position.z - w.start.y) * dy) / lengthSquared;
                            t = Math.max(0, Math.min(1, t)); // Clamp to segment bounds

                            const cx = w.start.x + t * dx;
                            const cy = w.start.y + t * dy;

                            const distSquared = (furn.position.x - cx) ** 2 + (furn.position.z - cy) ** 2;
                            const dist = Math.sqrt(distSquared);

                            if (dist < minDist) {
                                minDist = dist;
                                bestWall = w;
                                snapX = cx;
                                snapZ = cy;
                                snapAngle = Math.atan2(dy, dx);
                            }
                        }

                        if (bestWall) {
                            // Magnetic Snap!
                            furn.position.x = snapX;
                            furn.position.z = snapZ;
                            // Match WallManager's rotation mapping (negative angle around Y)
                            furn.rotation.y = -snapAngle;

                            // Dynamically fit thickness to wall depth
                            furn.dimensions.depth = bestWall.thickness;
                        } else {
                            // If it detaches, reset depth to a standard so it doesn't look like a huge block
                            if (furn.dimensions.depth !== 0.15) {
                                furn.dimensions.depth = 0.15;
                                furn.rotation.y = 0; // Reset rotation so they lay flat when unattached
                            }
                        }
                    }
                } else {
                    const room = state.rooms.find(r => r.id === targetId)
                    if (room && (delta.x !== 0 || delta.y !== 0)) {
                        // Move all points
                        room.points.forEach(p => {
                            p.x += delta.x
                            p.y += delta.y
                        })
                        // Move center
                        room.center.x += delta.x
                        room.center.y += delta.y
                    }
                }
            } else if (type === 'resizing' && targetId) {
                const wall = state.walls.find(w => w.id === targetId)
                const room = state.rooms.find(r => r.id === targetId)
                const furn = state.furniture.find(f => f.id === targetId)

                if (room && lastPoint) {
                    // Simple uniform scale based on distance from center
                    const dx = point.x - room.center.x
                    const dy = point.y - room.center.y
                    const distCurrent = Math.sqrt(dx * dx + dy * dy)

                    const ldx = lastPoint.x - room.center.x
                    const ldy = lastPoint.y - room.center.y
                    const distLast = Math.max(0.1, Math.sqrt(ldx * ldx + ldy * ldy)) // Avoid div by zero

                    const scale = distCurrent / distLast

                    // Apply scale to all points relative to center
                    if (Math.abs(scale - 1) > 0.001) {
                        room.points.forEach(p => {
                            p.x = room.center.x + (p.x - room.center.x) * scale
                            p.y = room.center.y + (p.y - room.center.y) * scale
                        })
                    }
                }
                else if (wall && subType) {
                    if (subType === 'start') {
                        wall.start = sp
                        // Straighten Logic: Orthogonal Snapping
                        const dx = Math.abs(wall.start.x - wall.end.x)
                        const dy = Math.abs(wall.start.y - wall.end.y)
                        const SNAP_TOLERANCE = 0.5

                        if (options?.shiftKey) {
                            if (dx > dy) wall.start.y = wall.end.y // Snap to horizontal
                            else wall.start.x = wall.end.x // Snap to vertical
                        } else {
                            if (dy < SNAP_TOLERANCE && dx > dy) wall.start.y = wall.end.y
                            else if (dx < SNAP_TOLERANCE && dy > dx) wall.start.x = wall.end.x
                        }
                    } else if (subType === 'end') {
                        wall.end = sp
                        // Straighten Logic: Orthogonal Snapping
                        const dx = Math.abs(wall.end.x - wall.start.x)
                        const dy = Math.abs(wall.end.y - wall.start.y)
                        const SNAP_TOLERANCE = 0.5

                        if (options?.shiftKey) {
                            if (dx > dy) wall.end.y = wall.start.y
                            else wall.end.x = wall.start.x
                        } else {
                            if (dy < SNAP_TOLERANCE && dx > dy) wall.end.y = wall.start.y
                            else if (dx < SNAP_TOLERANCE && dy > dx) wall.end.x = wall.start.x
                        }
                    } else if (subType === 'thickness') {
                        const dx = wall.end.x - wall.start.x
                        const dy = wall.end.y - wall.start.y
                        const len = Math.max(Math.sqrt(dx * dx + dy * dy), 0.0001)
                        const nx = -dy / len
                        const ny = dx / len
                        const moveX = sp.x - lp.x
                        const moveY = sp.y - lp.y
                        const delta = moveX * nx + moveY * ny
                        const next = Math.min(2, Math.max(0.05, wall.thickness + delta * 2))
                        wall.thickness = next
                    }
                } else if (furn && subType) {
                    // Handle furniture resizing
                    const dx = point.x - furn.position.x
                    const dy = point.y - furn.position.z

                    // Rotate point into local space
                    const cos = Math.cos(-furn.rotation.y)
                    const sin = Math.sin(-furn.rotation.y)
                    const localX = dx * cos - dy * sin
                    const localZ = dx * sin + dy * cos

                    if (subType === 'resize-uniform' || options?.shiftKey) {
                        // Uniform scale: scale both width and depth proportionally
                        const dist = Math.sqrt(localX * localX + localZ * localZ)
                        const oldDiag = Math.sqrt(
                            (furn.dimensions.width / 2) ** 2 + (furn.dimensions.depth / 2) ** 2
                        ) || 0.5
                        const ratio = dist / oldDiag
                        furn.dimensions.width = Math.max(0.2, furn.dimensions.width * ratio)
                        furn.dimensions.depth = Math.max(0.2, furn.dimensions.depth * ratio)
                        furn.dimensions.height = Math.max(0.2, furn.dimensions.height * ratio)
                    } else if (subType === 'resize-width') {
                        furn.dimensions.width = Math.max(0.2, Math.abs(localX) * 2)
                    } else if (subType === 'resize-depth') {
                        furn.dimensions.depth = Math.max(0.2, Math.abs(localZ) * 2)
                    }
                }
            }

            if (delta.x !== 0 || delta.y !== 0 || type === 'drawing' || type === 'resizing' || type === 'drawing_floor') {
                state.interaction.lastPoint = point
            }
        }),

        endInteraction: () => set((state) => {
            const hadMeaningfulAction = state.interaction.type !== 'none'
            // Clean up degenerate (zero-length) walls from accidental clicks
            if (state.interaction.type === 'drawing' && state.interaction.targetId) {
                const wall = state.walls.find(w => w.id === state.interaction.targetId)
                if (wall) {
                    const dx = wall.end.x - wall.start.x
                    const dy = wall.end.y - wall.start.y
                    const len = Math.sqrt(dx * dx + dy * dy)
                    if (len < 0.05) {
                        // Remove zero-length wall
                        state.walls = state.walls.filter(w => w.id !== state.interaction.targetId)
                    }
                }
            }
            state.interaction = { type: 'none', targetId: null, lastPoint: null }
            if (hadMeaningfulAction) {
                pushHistorySnapshot(state as MutableHistoryState)
            }
        }),

        setCornerSnapMode: (active) => set((state) => {
            state.cornerSnapMode = active
            if (!active) state.snapCorners = []
        }),

        addSnapCorner: (corner) => set((state) => {
            if (state.snapCorners.find(c => c.wallId === corner.wallId)) return;
            state.snapCorners.push(corner);

            if (state.snapCorners.length === 2) {
                const c1 = state.snapCorners[0];
                const c2 = state.snapCorners[1];
                const w1 = state.walls.find(w => w.id === c1.wallId);
                const w2 = state.walls.find(w => w.id === c2.wallId);

                if (w1 && w2) {
                    const x1 = w1.start.x, y1 = w1.start.y, x2 = w1.end.x, y2 = w1.end.y;
                    const x3 = w2.start.x, y3 = w2.start.y, x4 = w2.end.x, y4 = w2.end.y;
                    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

                    if (Math.abs(denom) > 0.0001) {
                        const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
                        const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

                        if (c1.type === 'start') { w1.start.x = px; w1.start.y = py; }
                        else { w1.end.x = px; w1.end.y = py; }

                        if (c2.type === 'start') { w2.start.x = px; w2.start.y = py; }
                        else { w2.end.x = px; w2.end.y = py; }
                    }
                }

                state.snapCorners = [];
                state.cornerSnapMode = false;
            }
        }),

        enqueueDeferredTask: (task) => set((state) => {
            const existingIndex = state.deferredTasks.findIndex((queued) => queued.runId === task.runId)
            const existing = existingIndex >= 0 ? state.deferredTasks[existingIndex] : null
            const nextTask: DeferredTask = {
                id: existing?.id || uuidv4(),
                runId: task.runId,
                type: task.type,
                createdAt: existing?.createdAt || new Date().toISOString(),
                payload: task.payload,
            }

            if (existing?.type === 'gen_3d' && task.type === 'gen_3d') {
                nextTask.payload = {
                    formats: Array.from(new Set([
                        ...(existing.payload?.formats || []),
                        ...(task.payload?.formats || []),
                    ])),
                }
            }

            if (existingIndex >= 0) {
                state.deferredTasks[existingIndex] = nextTask
            } else {
                state.deferredTasks.push(nextTask)
            }

            persistDeferredTasks(state.deferredTasks)
        }),

        flushDeferredTasks: async () => {
            const state = get()
            if (state.workersOnline < 1) return
            if (state.deferredTasks.length === 0) return
            if (state.runStatus === 'processing') return

            const [nextTask] = [...state.deferredTasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            if (!nextTask) return

            const removeTask = () => set((draft) => {
                draft.deferredTasks = draft.deferredTasks.filter((queued) => queued.id !== nextTask.id)
                persistDeferredTasks(draft.deferredTasks)
            })

            const headers: Record<string, string> = {}
            if (state.token) {
                headers.Authorization = `Bearer ${state.token}`
            }

            const syncCurrentRunSvg = async () => {
                if (nextTask.runId !== get().currentRunId) return
                const svgText = get().exportToSVG()
                const putHeaders: Record<string, string> = {
                    ...headers,
                    'Content-Type': 'image/svg+xml',
                }
                const putRes = await fetch(`/api/runs/${nextTask.runId}/svg`, {
                    method: 'PUT',
                    headers: putHeaders,
                    body: svgText,
                })
                if (!putRes.ok) {
                    throw new Error(await putRes.text())
                }
            }

            try {
                let response: Response

                switch (nextTask.type) {
                    case 'detect_rooms':
                        await syncCurrentRunSvg()
                        response = await fetch(`/api/runs/${nextTask.runId}/detect-rooms`, {
                            method: 'POST',
                            headers,
                        })
                        break
                    case 'detect_walls':
                        await syncCurrentRunSvg()
                        response = await fetch(`/api/runs/${nextTask.runId}/detect-walls`, {
                            method: 'POST',
                            headers,
                        })
                        break
                    case 'detect_doors':
                        await syncCurrentRunSvg()
                        response = await fetch(`/api/runs/${nextTask.runId}/detect-doors`, {
                            method: 'POST',
                            headers,
                        })
                        break
                    case 'detect_windows':
                        await syncCurrentRunSvg()
                        response = await fetch(`/api/runs/${nextTask.runId}/detect-windows`, {
                            method: 'POST',
                            headers,
                        })
                        break
                    case 'detect_furniture':
                        await syncCurrentRunSvg()
                        response = await fetch(`/api/runs/${nextTask.runId}/detect-furniture`, {
                            method: 'POST',
                            headers,
                        })
                        break
                    case 'gen_3d':
                        if (nextTask.runId === get().currentRunId) {
                            await get().syncSVGAndEnter3D()
                        }
                        response = await fetch(`/api/runs/${nextTask.runId}/generate-3d`, {
                            method: 'POST',
                            headers: {
                                ...headers,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                scale: get().exportScale || get().calibrationFactor,
                                formats: nextTask.payload?.formats || ['glb'],
                            }),
                        })
                        break
                    default:
                        return
                }

                if (!response.ok) {
                    const message = await response.text().catch(() => 'Failed to queue deferred task.')
                    if ([401, 403, 404, 429].includes(response.status)) {
                        removeTask()
                    }
                    throw new Error(message)
                }

                removeTask()

                if (nextTask.runId === get().currentRunId) {
                    set((draft) => {
                        draft.lastQueuedTask = nextTask.type
                        draft.runStatus = 'processing'
                        if (nextTask.type === 'gen_3d') {
                            draft.isGenerating3D = false
                        }
                    })
                    get().setShowProcessingModal(true)
                }
            } catch (error) {
                console.error('Failed to flush deferred task', error)
                const message = error instanceof Error ? error.message : 'Failed to queue deferred task.'
                get().showToast(message, 'error')
            }
        },

        saveLocalDraft: () => {
            const state = get()
            const draft = buildLocalDraft(state)
            set((snapshot) => {
                snapshot.localDraftStatus = 'saving'
            })

            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(draft))
                }
                set((snapshot) => {
                    snapshot.localDraftStatus = 'saved'
                    snapshot.lastLocalSaveAt = draft.savedAt
                })
            } catch (error) {
                console.error('Failed to save local draft', error)
                set((snapshot) => {
                    snapshot.localDraftStatus = 'error'
                })
            }
        },

        restoreLocalDraft: () => {
            const state = get()
            const isEditorEmpty =
                state.walls.length === 0 &&
                state.furniture.length === 0 &&
                state.rooms.length === 0 &&
                state.labels.length === 0 &&
                !state.currentRunId &&
                !state.uploadedImage

            if (!isEditorEmpty) return false

            const draft = readLocalDraft()
            if (!draft) return false

            set((snapshot) => {
                const nextLevels = Array.isArray(draft.levels) && draft.levels.length > 0
                    ? draft.levels.map((level, index) => ({
                        ...createDefaultLevel(index),
                        ...level,
                    }))
                    : [createDefaultLevel()]
                const activeLevel = getLevelById(nextLevels, draft.activeLevelId)

                snapshot.levels = nextLevels
                snapshot.activeLevelId = activeLevel.id
                snapshot.mode = draft.mode || '2d'
                snapshot.cameraMode = draft.cameraMode || 'orbit'
                snapshot.activeTool = draft.activeTool || 'select'
                snapshot.walls = (draft.walls || []).map((wall) => ({ ...wall, levelId: normalizeLevelId(wall.levelId || activeLevel.id) }))
                snapshot.furniture = (draft.furniture || []).map((item) => ({ ...item, levelId: normalizeLevelId(item.levelId || activeLevel.id) }))
                snapshot.rooms = (draft.rooms || []).map((room) => ({ ...room, levelId: normalizeLevelId(room.levelId || activeLevel.id) }))
                snapshot.labels = (draft.labels || []).map((label) => ({ ...label, levelId: normalizeLevelId(label.levelId || activeLevel.id) }))
                snapshot.currentRunId = draft.currentRunId || null
                snapshot.runStatus = draft.runStatus || 'idle'
                snapshot.uploadedImage = activeLevel.referenceImage ?? draft.uploadedImage ?? null
                snapshot.imageDimensions = activeLevel.referenceImageDimensions ?? draft.imageDimensions ?? null
                snapshot.calibrationFactor = draft.calibrationFactor || 0.01
                snapshot.isCalibrated = !!draft.isCalibrated
                snapshot.showBackground = draft.showBackground ?? true
                snapshot.glbPreviewSource = draft.glbPreviewSource || 'none'
                snapshot.exportScale = draft.exportScale || draft.calibrationFactor || 1
                snapshot.localDraftStatus = 'restored'
                snapshot.lastLocalSaveAt = draft.savedAt || Date.now()
            })

            return true
        },

        setJoinMode: (active) => set((state) => {
            if (active) {
                // Only activate if a wall is selected
                if (state.selectedId && state.walls.some(w => w.id === state.selectedId)) {
                    state.joinMode = true
                    state.joinSourceId = state.selectedId
                    state.joinTargetId = null
                    state.joinPreviewWalls = null
                    state.toast = { message: "Join Mode Active: Click target wall", type: "info" }
                } else {
                    state.toast = { message: "Select a wall first before holding J", type: "info" }
                }
            } else {
                if (state.joinMode && !state.joinTargetId) {
                    state.toast = { message: "Join Mode Cancelled", type: "info" }
                }
                state.joinMode = false
                state.joinSourceId = null
                state.joinTargetId = null
                state.joinPreviewWalls = null
            }
        }),

        setJoinTargetId: (id) => set((state) => {
            if (!state.joinMode || !state.joinSourceId || id === state.joinSourceId) return
            state.joinTargetId = id

            const w1 = state.walls.find(w => w.id === state.joinSourceId)
            const targetWall = state.walls.find(w => w.id === id)
            const targetFurniture = state.furniture.find(f => f.id === id)

            if (!w1 || (!targetWall && !targetFurniture)) {
                state.toast = { message: "Join target not found", type: "error" }
                return
            }

            state.toast = { message: "Calculating Smart Join...", type: "info" }

            const x1 = w1.start.x, y1 = w1.start.y, x2 = w1.end.x, y2 = w1.end.y;
            let px: number, py: number;

            // -- OBJECT SNAP LOGIC (DOOR/WINDOW) --
            if (targetFurniture) {
                // Snap to center of the furniture
                px = targetFurniture.position.x;
                py = targetFurniture.position.z;

                // Move strictly the closer endpoint of the active wall
                const dStart = Math.hypot(x1 - px, y1 - py);
                const dEnd = Math.hypot(x2 - px, y2 - py);

                const pW1 = { ...w1 };
                if (dStart < dEnd) pW1.start = { x: px, y: py };
                else pW1.end = { x: px, y: py };

                state.joinPreviewWalls = [pW1];
                state.toast = { message: `Preview ready: Joining to ${targetFurniture.type}. Press ENTER to connect!`, type: "info" }
                return;
            }

            // -- WALL TO WALL SNAP LOGIC --
            const w2 = targetWall!;
            const x3 = w2.start.x, y3 = w2.start.y, x4 = w2.end.x, y4 = w2.end.y;

            // Calculate mathematical line intersection of infinite lines
            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

            if (Math.abs(denom) < 0.0001) {
                // Walls are exactly parallel. Project W1's closer endpoint cleanly perpendicular onto W2's line.
                const pointDists = [
                    { type: 'start', p: w1.start, d: Math.min(Math.hypot(x1 - x3, y1 - y3), Math.hypot(x1 - x4, y1 - y4)) },
                    { type: 'end', p: w1.end, d: Math.min(Math.hypot(x2 - x3, y2 - y3), Math.hypot(x2 - x4, y2 - y4)) }
                ].sort((a, b) => a.d - b.d);

                const w1p = pointDists[0].p;
                const w1Type = pointDists[0].type;

                const w2Dx = x4 - x3;
                const w2Dy = y4 - y3;
                const w2LenSq = w2Dx * w2Dx + w2Dy * w2Dy;
                let t = 0;
                if (w2LenSq > 0.0001) {
                    t = ((w1p.x - x3) * w2Dx + (w1p.y - y3) * w2Dy) / w2LenSq;
                }
                px = x3 + t * w2Dx;
                py = y3 + t * w2Dy;

                const pW1 = { ...w1 };
                if (w1Type === 'start') pW1.start = { x: px, y: py };
                else pW1.end = { x: px, y: py };

                state.joinPreviewWalls = [pW1];
                state.toast = { message: "Preview ready: Parallel Projection. Press ENTER to connect!", type: "info" }
                return;
            }

            // Standard mathematical intersection (guarantees NO rotation)
            px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
            py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

            // Check if intersection point lies on the physical segment of W2 (T-Junction check)
            const w2Dx = x4 - x3;
            const w2Dy = y4 - y3;
            const w2LenSq = w2Dx * w2Dx + w2Dy * w2Dy;

            let t = -1;
            if (w2LenSq > 0.0001) {
                t = ((px - x3) * w2Dx + (py - y3) * w2Dy) / w2LenSq;
            }

            // Determine which endpoint of W1 to stretch
            const w1MoveDist = [
                { type: 'start', d: Math.hypot(x1 - px, y1 - py) },
                { type: 'end', d: Math.hypot(x2 - px, y2 - py) }
            ].sort((a, b) => a.d - b.d)[0];

            const pW1 = { ...w1 };
            if (w1MoveDist.type === 'start') pW1.start = { x: px, y: py };
            else pW1.end = { x: px, y: py };

            if (t >= -0.05 && t <= 1.05) {
                // T-Junction: Intersection hits the middle of W2.
                // Apply ONLY to W1. W2 remains perfectly untouched.
                state.joinPreviewWalls = [pW1];
                state.toast = { message: "Preview ready: T-Junction Join. Press ENTER to connect!", type: "info" }
            } else {
                // L-Corner: Intersection is out in empty space.
                // Stretch both W1 and W2 mathematically to meet at the virtual corner.
                const w2MoveDist = [
                    { type: 'start', d: Math.hypot(x3 - px, y3 - py) },
                    { type: 'end', d: Math.hypot(x4 - px, y4 - py) }
                ].sort((a, b) => a.d - b.d)[0];

                const pW2 = { ...w2 };
                if (w2MoveDist.type === 'start') pW2.start = { x: px, y: py };
                else pW2.end = { x: px, y: py };

                state.joinPreviewWalls = [pW1, pW2];
                state.toast = { message: "Preview ready: L-Corner Join. Press ENTER to connect!", type: "info" }
            }
        }),

        applyJoin: () => set((state) => {
            if (state.joinMode && state.joinPreviewWalls && state.joinPreviewWalls.length > 0 && state.joinTargetId) {
                // Dynamically apply properties of all modified walls in the preview
                state.joinPreviewWalls.forEach(previewWall => {
                    const idx = state.walls.findIndex(w => w.id === previewWall.id);
                    if (idx > -1) {
                        state.walls[idx].start = { ...previewWall.start };
                        state.walls[idx].end = { ...previewWall.end };
                    }
                });

                state.toast = { message: "Object joined successfully!", type: "success" }

            } else if (state.joinMode && state.joinTargetId) {
                state.toast = { message: "Failed to apply join. No preview generated.", type: "error" }
            }

            // Reset everything
            state.joinMode = false
            state.joinSourceId = null
            state.joinTargetId = null
            state.joinPreviewWalls = null
        }),

        calibrate: (wallId, realLength) => set((state) => {
            const wall = state.walls.find(w => w.id === wallId)
            if (!wall) return

            const dx = wall.end.x - wall.start.x
            const dy = wall.end.y - wall.start.y
            const currentLen = Math.sqrt(dx * dx + dy * dy)

            if (currentLen > 0) {
                const prevMetersPerPixel = state.calibrationFactor
                const ratio = realLength / currentLen

                // Rescale EVERYTHING proportionately to maintain the exact visual aspect ratio
                state.walls.forEach(w => {
                    w.start.x *= ratio; w.start.y *= ratio
                    w.end.x *= ratio; w.end.y *= ratio

                    // Scale thickness proportionately with the plan
                    w.thickness = (Number(w.thickness) > 0 ? Number(w.thickness) : 0.15) * ratio
                    // Do not clamp thickness here so we don't accidentally get 'fat' handles on tiny floorplans
                    w.height = 2.5 // Standard wall height
                })

                state.furniture.forEach(f => {
                    // Position scales linearly in the X/Z plane
                    f.position.x *= ratio
                    f.position.z *= ratio

                    // Scale footprint dimensions perfectly
                    f.dimensions.width *= ratio
                    f.dimensions.depth *= ratio

                    // --- RE-STANDARDIZE DIMENSIONS AFTER SCALING ---
                    // If a door/window was previously standard, or if the new scaled size
                    // falls within a "Standard" range, snap it back to standard metrics.
                    // This prevents "Wide Doors" after calibration.
                    if (f.type === 'door') {
                        if (f.dimensions.width > 0.54 && f.dimensions.width < 1.26) {
                            f.dimensions.width = 0.9;
                        }
                        f.dimensions.height = 2.1
                    } else if (f.type === 'window') {
                        if (f.dimensions.width > 0.72 && f.dimensions.width < 1.68) {
                            f.dimensions.width = 1.2;
                        }
                        f.dimensions.height = 1.2
                        f.position.y = 1.0 // Window sill height
                    } else {
                        // For fully generic 3D objects, scale the height too
                        f.position.y *= ratio
                        f.dimensions.height *= ratio
                    }
                })

                state.rooms.forEach(r => {
                    r.points.forEach(p => { p.x *= ratio; p.y *= ratio })
                    r.center.x *= ratio
                    r.center.y *= ratio
                })

                state.labels.forEach(l => {
                    l.position.x *= ratio
                    l.position.y *= ratio
                })

                // Keep calibrationFactor as meters-per-pixel so background image and SVG remain in sync.
                // Since we scaled geometry by `ratio`, meters-per-pixel scales by the same ratio.
                let metersPerPixel = (prevMetersPerPixel > 0 ? prevMetersPerPixel : 0.01) * ratio
                // Guard against broken calibration values (0/NaN/Infinity) which can blow up SVG scaling.
                if (!isFinite(metersPerPixel) || metersPerPixel <= 0) metersPerPixel = 0.01
                metersPerPixel = Math.min(Math.max(metersPerPixel, 1e-5), 0.5)
                state.calibrationFactor = metersPerPixel
                state.exportScale = metersPerPixel // Backend expects meters-per-pixel
                state.isCalibrated = true


                // Trigger auto-fit to fix "Microscope" view
                state.fitViewTrigger = (state.fitViewTrigger || 0) + 1

                // Advance tutorial
                if (state.tutorialStep === 'calibration') {
                    state.tutorialStep = 'correction'
                }
            }
        }),

        importFurnAiModel: (payload) => {
            set((state) => {
                state.furniture.push({
                    id: payload.id,
                    type: payload.type || 'imported',
                    levelId: state.activeLevelId,
                    furnAiId: payload.furnAiId,
                    position: { x: payload.position.x, y: 0, z: payload.position.y },
                    rotation: { x: 0, y: 0, z: 0 },
                    // Default fallback size for generic AI generated objects 1m x 1m.
                    dimensions: { width: 1, height: 1.5, depth: 1 },
                    modelUrl: payload.modelUrl,
                    label: payload.label
                })
                state.saveHistory()
            })
        },

        updateLabel: (id, label) => {
            set((state) => {
                const wall = state.walls.find(w => w.id === id)
                if (wall) wall.label = label
                const item = state.furniture.find(f => f.id === id)
                if (item) item.label = label
                const textLabel = state.labels.find(l => l.id === id)
                if (textLabel) textLabel.text = label
            })
        },

        updateTextLabel: (id, updates) => set((state) => {
            const label = state.labels.find((entry) => entry.id === id)
            if (label) {
                Object.assign(label, updates)
            }
        }),

        syncSVGAndEnter3D: async () => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId || !state.isCalibrated) return

            try {
                // Export current state to SVG to ensure backend has latest edits
                const currentSVG = state.exportToSVG()

                // PUT SVG to backend (syncs state but does NOT run Blender)
                const headers: Record<string, string> = { 'Content-Type': 'image/svg+xml' }
                if (state.token) headers['Authorization'] = `Bearer ${state.token}`

                await fetch(`/api/runs/${state.currentRunId}/svg`, {
                    method: 'PUT',
                    headers,
                    body: currentSVG
                })

                // Persist calibration/scale
                await fetch(`/api/runs/${state.currentRunId}/meta`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {})
                    },
                    body: JSON.stringify({
                        scale: state.exportScale || state.calibrationFactor
                    })
                })
            } catch (e) {
                console.error("SVG Sync Error:", e)
            }
        },

        triggerBlenderGeneration: async (formats?: string[]) => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId || !state.isCalibrated) return
            state.logAnalyticsEvent('furn3d_gen')
            if (state.workersOnline < 1) {
                state.showToast('3D generation is unavailable until the FloorplanToBlender worker is online.', 'error')
                return
            }

            set((s) => { s.isGenerating3D = true })

            try {
                // Ensure SVG is synced first before generating
                await state.syncSVGAndEnter3D()

                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (state.token) headers['Authorization'] = `Bearer ${state.token}`

                // Explicitly request a Blender Generation job
                const res = await fetch(`/api/runs/${state.currentRunId}/generate-3d`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        scale: state.exportScale || state.calibrationFactor,
                        formats: formats || ['glb']  // Default to GLB if no formats specified
                    })
                })

                if (res.ok) {
                    set((s) => {
                        s.runStatus = 'processing'
                        s.lastQueuedTask = 'gen_3d'
                        s.glbPreviewSource = 'none'
                    })
                } else {
                    const errText = await res.text()
                    if (res.status === 429) {
                        try {
                            const errData = JSON.parse(errText)
                            state.showToast(errData.detail || 'Token limit reached. Upgrade to Pro.', 'error')
                        } catch {
                            state.showToast('Token limit reached. Upgrade to Pro for more.', 'error')
                        }
                    } else {
                        console.error("Blender Gen Trigger Failed:", errText)
                        state.showToast('3D generation failed. Please try again.', 'error')
                    }
                }
            } catch (e) {
                console.error("Blender Gen Trigger Error:", e)
            } finally {
                set((s) => { s.isGenerating3D = false })
            }
        },
        toggleBackground: () => {
            set((state) => {
                state.showBackground = !state.showBackground
            })
        },
        setGlbPreviewSource: (source) => {
            set((state) => {
                state.glbPreviewSource = source
            })
        },
        triggerRender: async () => {
            const state = useFloorplanStore.getState()
            if (!state.currentRunId || state.isRendering) return

            set((s) => { s.isRendering = true; s.renders = [] })

            try {
                // Trigger render on server - it will stream images back
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (state.token) headers['Authorization'] = `Bearer ${state.token}`

                const res = await fetch(`/api/runs/${state.currentRunId}/render`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ lighting: state.lightingPreset })
                })

                if (res.ok) {
                    // Poll for renders or use EventSource for streaming
                    const data = await res.json()
                    if (data.renders) {
                        for (const url of data.renders) {
                            state.addRender(url)
                            await new Promise(r => setTimeout(r, 500)) // Delay between reveals
                        }
                    }
                }
            } catch (e) {
                console.error("Render Error:", e)
            } finally {
                set((s) => { s.isRendering = false })
            }
        },

        addRender: (url) => set((state) => {
            state.renders.push(url)
        }),

        addFurniture: (type, position) => set((state) => {
            state.furniture.push({
                id: uuidv4(),
                type,
                levelId: state.activeLevelId,
                position: { x: position.x, y: type === 'window' ? 1.0 : 0, z: position.y },
                rotation: { x: 0, y: 0, z: 0 },
                dimensions: type === 'door'
                    ? { width: 0.9, height: 2.1, depth: 0.15 }
                    : type === 'window'
                        ? { width: 1.2, height: 1.2, depth: 0.15 } // Standard window size
                        : { width: 1, height: 1, depth: 1 },
            })
        }),

        addImportedFurniture: ({ id, label, relPath }) => set((state) => {
            const existing = state.furniture.find(f => f.id === id)
            if (existing) {
                existing.type = existing.type || 'imported'
                existing.modelUrl = relPath
                if (label) existing.label = label
                existing.levelId = existing.levelId || state.activeLevelId
                return
            }

            state.furniture.push({
                id,
                type: 'imported',
                levelId: state.activeLevelId,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                dimensions: { width: 1, height: 1, depth: 1 },
                modelUrl: relPath,
                label,
            })
            state.selectedId = id
        }),

        updateWall: (id, updates) => set((state) => {
            const wall = state.walls.find(w => w.id === id)
            if (wall) {
                Object.assign(wall, updates)
            }
        }),

        updateFurniturePosition: (id, position) => set((state) => {
            const item = state.furniture.find((f: FurnItem) => f.id === id)
            if (!item) return
            if (typeof position.x === 'number') item.position.x = position.x
            if (typeof position.y === 'number') item.position.y = position.y
            if (typeof position.z === 'number') item.position.z = position.z
        }),

        updateFurniture: (id, updates) => set((state) => {
            const item = state.furniture.find((f: FurnItem) => f.id === id)
            if (item) {
                // If position/rotation/dimensions are passed partially, we need to merge them carefully
                if (updates.position) Object.assign(item.position, updates.position)
                if (updates.rotation) Object.assign(item.rotation, updates.rotation)
                if (updates.dimensions) Object.assign(item.dimensions, updates.dimensions)

                // For other top-level keys
                const { position, rotation, dimensions, ...rest } = updates
                Object.assign(item, rest)
            }
        }),


        updateRoom: (id, updates) => set((state) => {
            const room = state.rooms.find(r => r.id === id)
            if (room) {
                Object.assign(room, updates)
            }
        }),

        replaceScene: (payload) => set((state) => {
            const activeLevelId = state.activeLevelId
            const nextWalls = payload.walls.map((wall) => ({ ...wall, levelId: normalizeLevelId(wall.levelId || activeLevelId) }))
            const nextRooms = payload.rooms.map((room) => ({ ...room, levelId: normalizeLevelId(room.levelId || activeLevelId) }))
            const nextFurniture = payload.furniture.map((item) => ({ ...item, levelId: normalizeLevelId(item.levelId || activeLevelId) }))
            const nextLabels = (payload.labels || []).map((label) => ({ ...label, levelId: normalizeLevelId(label.levelId || activeLevelId) }))

            state.walls = [...filterEntitiesOutsideLevel(state.walls, activeLevelId), ...nextWalls]
            state.rooms = [...filterEntitiesOutsideLevel(state.rooms, activeLevelId), ...nextRooms]
            state.furniture = [...filterEntitiesOutsideLevel(state.furniture, activeLevelId), ...nextFurniture]
            if (payload.labels) {
                state.labels = [...filterEntitiesOutsideLevel(state.labels, activeLevelId), ...nextLabels]
            }
        }),

        importFromSVG: (svgText) => set((state) => {
            const parser = new DOMParser()
            const doc = parser.parseFromString(svgText, "image/svg+xml")
            const importTargetLevelId = state.activeLevelId
            const getElementLevelId = (el: Element) => normalizeLevelId(el.getAttribute('data-level-id') || importTargetLevelId)

            const walls: Wall[] = []
            const furniture: FurnItem[] = []
            const labels: TextLabel[] = []

            let pxToM = Number(state.calibrationFactor)
            if (!isFinite(pxToM) || pxToM <= 0) pxToM = 0.01
            pxToM = Math.min(Math.max(pxToM, 1e-5), 0.5)

            // 1. Get raw bounds to center it
            let offsetX = 0
            let offsetY = 0
            // Prefer viewBox centering (authoritative pixel coordinate frame that matches the reference image).
            // Using rect bounds can introduce bias (e.g., walls don't fill the full image height).
            const svgEl = doc.querySelector('svg')
            const vb = svgEl?.getAttribute('viewBox')
            let usedViewBox = false
            if (vb) {
                const parts = vb.split(/[\s,]+/).map(p => parseFloat(p)).filter(n => !isNaN(n))
                if (parts.length === 4) {
                    const [x, y, w, h] = parts
                    offsetX = x + w / 2
                    offsetY = y + h / 2
                    usedViewBox = true
                }
            }

            if (!usedViewBox) {
                const allRects = Array.from(doc.querySelectorAll('rect'))
                if (allRects.length > 0) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                    allRects.forEach(r => {
                        const x = parseFloat(r.getAttribute('x') || '0')
                        const y = parseFloat(r.getAttribute('y') || '0')
                        const w = parseFloat(r.getAttribute('width') || '0')
                        const h = parseFloat(r.getAttribute('height') || '0')
                        minX = Math.min(minX, x); minY = Math.min(minY, y)
                        maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h)
                    })

                    offsetX = (minX + maxX) / 2
                    offsetY = (minY + maxY) / 2
                }
            }

            // 2. Parse Walls
            const wallGroup = doc.getElementById('wall')
            if (wallGroup) {
                wallGroup.querySelectorAll('rect').forEach(r => {
                    const x = (parseFloat(r.getAttribute('x') || '0') - offsetX) * pxToM
                    const y = (parseFloat(r.getAttribute('y') || '0') - offsetY) * pxToM
                    const w = parseFloat(r.getAttribute('width') || '0') * pxToM
                    const h = parseFloat(r.getAttribute('height') || '0') * pxToM

                    // Skip degenerate rects that produce zero-length walls
                    if (w < 1e-4 && h < 1e-4) return

                    // We represent vertical/horizontal walls as start/end vectors.
                    // Use the SMALLER dimension as thickness (the thin side of the rect).
                    if (w > h) {
                        const id = r.getAttribute('id') || uuidv4()
                        const existing = state.walls.find(w => w.id === id)
                        const levelId = getElementLevelId(r)
                        // Horizontal wall - width is length, height is thickness
                        const thickness = Math.max(0.05, Math.min(h, 2.0)) || 0.15
                        walls.push({
                            id,
                            levelId,
                            start: { x, y: y + h / 2 },
                            end: { x: x + w, y: y + h / 2 },
                            thickness,
                            height: 2.5,
                            ...(existing ? {
                                textureDataUrl: existing.textureDataUrl,
                                textureTileWidthM: existing.textureTileWidthM,
                                textureTileHeightM: existing.textureTileHeightM,
                            } : {})
                        })
                    } else {
                        const id = r.getAttribute('id') || uuidv4()
                        const existing = state.walls.find(w => w.id === id)
                        const levelId = getElementLevelId(r)
                        // Vertical wall - height is length, width is thickness
                        const thickness = Math.max(0.05, Math.min(w, 2.0)) || 0.15
                        walls.push({
                            id,
                            levelId,
                            start: { x: x + w / 2, y },
                            end: { x: x + w / 2, y: y + h },
                            thickness,
                            height: 2.5,
                            ...(existing ? {
                                textureDataUrl: existing.textureDataUrl,
                                textureTileWidthM: existing.textureTileWidthM,
                                textureTileHeightM: existing.textureTileHeightM,
                            } : {})
                        })
                    }
                })
            }

            // 3b. Parse imported model placemarks (written by backend upload)
            const importedGroup = doc.getElementById('imported-models')
            if (importedGroup) {
                // NEW FORMAT: direct <rect> elements with data-rel-path
                importedGroup.querySelectorAll('rect').forEach(r => {
                    const relPath = r.getAttribute('data-rel-path') || ''
                    const name = r.getAttribute('data-name') || ''
                    if (!relPath) return

                    const x = parseFloat(r.getAttribute('x') || 'NaN')
                    const y = parseFloat(r.getAttribute('y') || 'NaN')
                    const w = parseFloat(r.getAttribute('width') || '0') * pxToM
                    const h = parseFloat(r.getAttribute('height') || '0') * pxToM
                    if (isNaN(x) || isNaN(y)) return

                    const cx = x + parseFloat(r.getAttribute('width') || '0') / 2
                    const cy = y + parseFloat(r.getAttribute('height') || '0') / 2

                    const rawId = (r.getAttribute('id') || '').replace(/^imported_/, '')
                    const id = rawId || uuidv4()

                    const savedRotation = r.getAttribute('data-rotation')
                    let rotY = 0
                    if (savedRotation !== null) {
                        rotY = parseFloat(savedRotation)
                        if (!isFinite(rotY)) rotY = 0
                    }

                    furniture.push({
                        id,
                        type: 'imported',
                        levelId: getElementLevelId(r),
                        position: { x: (cx - offsetX) * pxToM, y: 0, z: (cy - offsetY) * pxToM },
                        rotation: { x: 0, y: rotY, z: 0 },
                        dimensions: { width: Math.max(w, 0.5), height: 1.5, depth: Math.max(h, 0.5) },
                        modelUrl: relPath,
                        label: name,
                    })
                })

                // LEGACY FORMAT: <g> wrappers with <circle> center points
                importedGroup.querySelectorAll('g').forEach(g => {
                    const importId = g.getAttribute('data-import-id') || g.getAttribute('id') || ''
                    const relPath = g.getAttribute('data-rel-path') || ''
                    const name = g.getAttribute('data-name') || ''

                    // Prefer circle center
                    let cx: number | null = null
                    let cy: number | null = null
                    const circle = g.querySelector('circle')
                    if (circle) {
                        const cxs = circle.getAttribute('cx')
                        const cys = circle.getAttribute('cy')
                        const cxf = parseFloat(cxs || 'NaN')
                        const cyf = parseFloat(cys || 'NaN')
                        if (!isNaN(cxf) && !isNaN(cyf)) {
                            cx = cxf
                            cy = cyf
                        }
                    }

                    // Fallback to text x/y
                    if (cx === null || cy === null) {
                        const text = g.querySelector('text')
                        if (text) {
                            const tx = parseFloat(text.getAttribute('x') || 'NaN')
                            const ty = parseFloat(text.getAttribute('y') || 'NaN')
                            if (!isNaN(tx) && !isNaN(ty)) {
                                cx = tx
                                cy = ty
                            }
                        }
                    }

                    if (cx === null || cy === null) return

                    const id = String(importId).replace(/^imported_/, '') || uuidv4()
                    // Skip if already parsed from rect format above
                    if (furniture.some(f => f.id === id)) return

                    furniture.push({
                        id,
                        type: 'imported',
                        levelId: getElementLevelId(g),
                        position: { x: (cx - offsetX) * pxToM, y: 0, z: (cy - offsetY) * pxToM },
                        rotation: { x: 0, y: 0, z: 0 },
                        dimensions: { width: 1, height: 1, depth: 1 },
                        modelUrl: relPath,
                        label: name,
                    })
                })
            }

            // 3. Parse Doors/Windows as simple furniture placeholders for now
            const openings = ['door', 'window']
            openings.forEach(type => {
                const group = doc.getElementById(type)
                if (group) {
                    group.querySelectorAll('rect').forEach(r => {
                        const x = (parseFloat(r.getAttribute('x') || '0') - offsetX) * pxToM
                        const y = (parseFloat(r.getAttribute('y') || '0') - offsetY) * pxToM
                        const w = parseFloat(r.getAttribute('width') || '0') * pxToM
                        const hOriginal = parseFloat(r.getAttribute('height') || '0') * pxToM
                        const h = hOriginal

                        // Check for preserved rotation attribute (written by exportToSVG)
                        const savedRotation = r.getAttribute('data-rotation')
                        let objRotationY: number

                        if (savedRotation !== null) {
                            // Rotation was explicitly saved — use it directly
                            objRotationY = parseFloat(savedRotation)
                            if (!isFinite(objRotationY)) objRotationY = 0
                        } else {
                            // Infer from rect dimensions (initial import from backend SVG)
                            objRotationY = (w > h) ? 0 : Math.PI / 2
                        }

                        const isHorizontal = Math.abs(objRotationY) < 0.1

                        // --- STANDARDIZE DIMENSIONS (matches Blender backend) ---
                        let openingWidth = isHorizontal ? w : h;
                        const thickness = 0.15 // Standardize door/window depth to match standard wall thickness

                        if (type === 'door') {
                            if (openingWidth > 0.54 && openingWidth < 1.26) {
                                openingWidth = 0.9;
                            }
                        } else if (type === 'window') {
                            if (openingWidth > 0.72 && openingWidth < 1.68) {
                                openingWidth = 1.2;
                            }
                        }

                        furniture.push({
                            id: r.getAttribute('id') || uuidv4(),
                            type: type as any,
                            levelId: getElementLevelId(r),
                            position: { x: x + w / 2, y: type === 'window' ? 1.0 : 0, z: y + hOriginal / 2 },
                            rotation: { x: 0, y: objRotationY, z: 0 },
                            dimensions: { width: openingWidth, height: type === 'window' ? 1.2 : 2.1, depth: thickness }
                        })
                    })
                }
            })

            // 4. Parse Room Polygons
            const rooms: { id: string; name: string; levelId?: string; points: { x: number; y: number }[]; color: string; center: { x: number; y: number } }[] = []
            const roomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']
            let colorIndex = 0

            const parseTransform = (transform: string | null | undefined) => {
                const t = (transform || '').trim()
                if (!t) return { tx: 0, ty: 0 }

                // translate(x [y])
                const mTranslate = t.match(/translate\(\s*([+-]?[\d.]+)(?:[\s,]+([+-]?[\d.]+))?\s*\)/i)
                if (mTranslate) {
                    const tx = parseFloat(mTranslate[1])
                    const ty = parseFloat(mTranslate[2] ?? '0')
                    return { tx: isNaN(tx) ? 0 : tx, ty: isNaN(ty) ? 0 : ty }
                }

                // matrix(a b c d e f) => translation is (e, f)
                const mMatrix = t.match(/matrix\(\s*([+-]?[\d.]+)[\s,]+([+-]?[\d.]+)[\s,]+([+-]?[\d.]+)[\s,]+([+-]?[\d.]+)[\s,]+([+-]?[\d.]+)[\s,]+([+-]?[\d.]+)\s*\)/i)
                if (mMatrix) {
                    const tx = parseFloat(mMatrix[5])
                    const ty = parseFloat(mMatrix[6])
                    return { tx: isNaN(tx) ? 0 : tx, ty: isNaN(ty) ? 0 : ty }
                }

                return { tx: 0, ty: 0 }
            }

            const getSvgXY = (el: Element) => {
                const xAttr = el.getAttribute('x')
                const yAttr = el.getAttribute('y')
                let x = parseFloat(xAttr || '0')
                let y = parseFloat(yAttr || '0')

                // If x/y are missing or 0, many OCR pipelines use transform instead
                const tr = parseTransform(el.getAttribute('transform'))
                const hasExplicitXY = xAttr !== null || yAttr !== null
                if (!hasExplicitXY) {
                    x = tr.tx
                    y = tr.ty
                } else {
                    x += tr.tx
                    y += tr.ty
                }
                return { x, y }
            }

            const parsePointsAttr = (pointsAttr: string) => {
                const pts: { x: number; y: number }[] = []
                const parts = (pointsAttr || '').trim().split(/[\s]+/).filter(Boolean)
                for (const part of parts) {
                    const xy = part.split(',')
                    if (xy.length < 2) continue
                    const px = parseFloat(xy[0])
                    const py = parseFloat(xy[1])
                    if (!isNaN(px) && !isNaN(py)) pts.push({ x: px, y: py })
                }
                return pts
            }

            const addRoomFromSvgPolygon = (polyEl: Element) => {
                const pointsAttr = polyEl.getAttribute('points') || ''
                const rawPts = parsePointsAttr(pointsAttr)
                if (rawPts.length < 3) return

                // Apply simple translation transforms from the polygon itself and its immediate parent (common for grouped rooms)
                const selfTr = parseTransform(polyEl.getAttribute('transform'))
                const parentTr = parseTransform((polyEl.parentElement as any)?.getAttribute?.('transform'))
                const tx = selfTr.tx + parentTr.tx
                const ty = selfTr.ty + parentTr.ty

                const pts = rawPts.map(p => ({
                    x: ((p.x + tx) - offsetX) * pxToM,
                    y: ((p.y + ty) - offsetY) * pxToM,
                }))
                const xs = pts.map(p => p.x)
                const ys = pts.map(p => p.y)
                const minX = Math.min(...xs)
                const maxX = Math.max(...xs)
                const minY = Math.min(...ys)
                const maxY = Math.max(...ys)

                const id = polyEl.getAttribute('id') || uuidv4()
                const name = polyEl.getAttribute('data-name') || polyEl.getAttribute('data-label') || polyEl.getAttribute('id') || `Room ${rooms.length + 1}`
                const existing = state.rooms.find(r => r.id === id)
                rooms.push({
                    id,
                    name,
                    levelId: getElementLevelId(polyEl),
                    points: pts,
                    color: roomColors[colorIndex % roomColors.length],
                    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
                    ...(existing ? {
                        textureDataUrl: existing.textureDataUrl,
                        textureTileWidthM: existing.textureTileWidthM,
                        textureTileHeightM: existing.textureTileHeightM,
                    } : {})
                })
                colorIndex++
            }

            // Try different group names for rooms
            const roomGroupNames = ['room', 'rooms', 'floor', 'floors', 'space', 'spaces']
            let roomGroup: Element | null = null
            for (const name of roomGroupNames) {
                roomGroup = doc.getElementById(name)
                if (roomGroup) break
            }

            // Prefer backend geometric rooms if present
            const roomsGeomGroup = doc.getElementById('rooms-geometry')
            const geomPolygons = roomsGeomGroup ? roomsGeomGroup.querySelectorAll('polygon') : null
            if (roomsGeomGroup && geomPolygons) {
                geomPolygons.forEach(p => addRoomFromSvgPolygon(p))
            }

            const hasBackendGeomRooms = rooms.length > 0

            if (roomGroup && !hasBackendGeomRooms) {
                // Look for rect elements as room bounds
                roomGroup.querySelectorAll('rect').forEach(r => {
                    const x = (parseFloat(r.getAttribute('x') || '0') - offsetX) * pxToM
                    const y = (parseFloat(r.getAttribute('y') || '0') - offsetY) * pxToM
                    const w = parseFloat(r.getAttribute('width') || '0') * pxToM
                    const h = parseFloat(r.getAttribute('height') || '0') * pxToM

                    const label = r.getAttribute('data-label') || r.getAttribute('id') || `Room ${rooms.length + 1}`
                    const id = r.getAttribute('id') || uuidv4()
                    const existing = state.rooms.find(r => r.id === id)

                    rooms.push({
                        id,
                        name: label,
                        levelId: getElementLevelId(r),
                        points: [
                            { x, y },
                            { x: x + w, y },
                            { x: x + w, y: y + h },
                            { x, y: y + h }
                        ],
                        color: roomColors[colorIndex % roomColors.length],
                        center: { x: x + w / 2, y: y + h / 2 },
                        ...(existing ? {
                            textureDataUrl: existing.textureDataUrl,
                            textureTileWidthM: existing.textureTileWidthM,
                            textureTileHeightM: existing.textureTileHeightM,
                        } : {})
                    })
                    colorIndex++
                })

                // Also accept polygon rooms if present (legacy pipeline)
                roomGroup.querySelectorAll('polygon').forEach(p => addRoomFromSvgPolygon(p))
            }

            // Also look for text elements as room labels
            // If room polygons exist, try to assign OCR text as room names via proximity.
            // Otherwise, push to standalone labels array.
            doc.querySelectorAll('text').forEach(textEl => {
                const textContent = textEl.textContent?.trim() || ''
                // Skip dimension numbers (just digits/decimal)
                if (!textContent || textContent.match(/^[\d.]+\s*(m|cm|ft|'|")?$/)) return

                const { x: rawX, y: rawY } = getSvgXY(textEl)
                const textX = (rawX - offsetX) * pxToM
                const textY = (rawY - offsetY) * pxToM

                // Check if this looks like a room name (has letters)
                if (textContent.match(/[a-zA-Z]/)) {
                    // If we have room polygons, try to match this label to the nearest room
                    // and update its name (rooms from geometry often have generic names)
                    let matched = false
                    if (rooms.length > 0) {
                        let bestRoom: typeof rooms[0] | null = null
                        let bestDist = Infinity
                        for (const r of rooms) {
                            const dx = r.center.x - textX
                            const dy = r.center.y - textY
                            const dist = Math.sqrt(dx * dx + dy * dy)
                            if (dist < bestDist) {
                                bestDist = dist
                                bestRoom = r
                            }
                        }
                        // Match if label is within 3m of room center
                        if (bestRoom && bestDist < 3.0) {
                            // Only override generic names (Room 1, geo_room_0, etc.)
                            if (!bestRoom.name || bestRoom.name.startsWith('Room ') || bestRoom.name.startsWith('geo_room')) {
                                bestRoom.name = textContent
                            }
                            matched = true
                        }
                    }

                    if (!matched) {
                        labels.push({
                            id: uuidv4(),
                            text: textContent,
                            levelId: getElementLevelId(textEl),
                            position: { x: textX, y: textY }
                        })
                    }
                }
            })

            const polygonArea = (pts: { x: number; y: number }[]) => {
                if (pts.length < 3) return 0
                let a = 0
                for (let i = 0; i < pts.length; i++) {
                    const j = (i + 1) % pts.length
                    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
                }
                return a / 2
            }

            const roomAreaAbs = (r: { points: { x: number; y: number }[] }) => Math.abs(polygonArea(r.points))

            const minRoomArea = 0.5
            const filteredRooms = rooms.filter(r => roomAreaAbs(r) >= minRoomArea)

            filteredRooms.sort((a, b) => roomAreaAbs(b) - roomAreaAbs(a))
            const deduped: typeof filteredRooms = []
            const centerEps = 0.35
            const areaRatioEps = 0.12
            for (const r of filteredRooms) {
                const a = roomAreaAbs(r)
                const isDup = deduped.some(d => {
                    const dx = d.center.x - r.center.x
                    const dy = d.center.y - r.center.y
                    const dist2 = dx * dx + dy * dy
                    if (dist2 > centerEps * centerEps) return false
                    const da = roomAreaAbs(d)
                    const ratio = Math.abs(da - a) / Math.max(da, a, 1e-6)
                    return ratio < areaRatioEps
                })
                if (!isDup) deduped.push(r)
            }

            for (let i = 0; i < deduped.length; i++) {
                if (!deduped[i].name || deduped[i].name.startsWith('Room ')) {
                    deduped[i].name = `Room ${i + 1}`
                }
            }

            rooms.length = 0
            rooms.push(...deduped)

            // Create a single master floor — only when no per-room polygons exist
            if (walls.length > 0 && !hasBackendGeomRooms) {
                let floorMinX = Infinity, floorMinY = Infinity
                let floorMaxX = -Infinity, floorMaxY = -Infinity

                // Include wall endpoints + half-thickness so the floor covers the full wall body
                walls.forEach(w => {
                    const halfT = (w.thickness || 0.15) / 2
                    floorMinX = Math.min(floorMinX, w.start.x - halfT, w.end.x - halfT)
                    floorMaxX = Math.max(floorMaxX, w.start.x + halfT, w.end.x + halfT)
                    floorMinY = Math.min(floorMinY, w.start.y - halfT, w.end.y - halfT)
                    floorMaxY = Math.max(floorMaxY, w.start.y + halfT, w.end.y + halfT)
                })

                // Also include furniture positions so the floor covers everything
                furniture.forEach(f => {
                    if (f.position) {
                        floorMinX = Math.min(floorMinX, f.position.x - 0.5)
                        floorMaxX = Math.max(floorMaxX, f.position.x + 0.5)
                        floorMinY = Math.min(floorMinY, f.position.z - 0.5)
                        floorMaxY = Math.max(floorMaxY, f.position.z + 0.5)
                    }
                })

                // Check if any existing room already covers most of the plan (avoid duplicates)
                const planArea = (floorMaxX - floorMinX) * (floorMaxY - floorMinY)
                const hasLargeFloor = rooms.some(r => roomAreaAbs(r) > planArea * 0.5)

                if (!hasLargeFloor && planArea > 0) {
                    // Guaranteed min 0.5m padding + 10% proportional padding
                    const planW = floorMaxX - floorMinX
                    const planH = floorMaxY - floorMinY
                    const padX = Math.max(0.5, planW * 0.1)
                    const padY = Math.max(0.5, planH * 0.1)
                    rooms.push({
                        id: uuidv4(),
                        name: 'Floor',
                        levelId: importTargetLevelId,
                        points: [
                            { x: floorMinX - padX, y: floorMinY - padY },
                            { x: floorMaxX + padX, y: floorMinY - padY },
                            { x: floorMaxX + padX, y: floorMaxY + padY },
                            { x: floorMinX - padX, y: floorMaxY + padY }
                        ],
                        color: '#E8E8E8',
                        center: { x: (floorMinX + floorMaxX) / 2, y: (floorMinY + floorMaxY) / 2 }
                    })
                }
            }

            // Auto-fit camera only on FIRST import (not on every poll re-import)
            if (filterEntitiesForLevel(state.walls, importTargetLevelId).length === 0 && walls.length > 0) {
                state.fitViewTrigger = (state.fitViewTrigger || 0) + 1
            }

            state.walls = walls

            const SNAP_THRESHOLD = 0.5
            for (const furn of furniture) {
                if (furn.type !== 'door' && furn.type !== 'window') continue
                let bestDist = SNAP_THRESHOLD
                let bestPoint: { x: number; z: number } | null = null
                let bestAngle = 0
                let bestThickness = 0.15

                for (const wall of walls) {
                    if (normalizeLevelId(wall.levelId) !== normalizeLevelId(furn.levelId)) continue
                    const wx = wall.end.x - wall.start.x
                    const wy = wall.end.y - wall.start.y
                    const lenSq = wx * wx + wy * wy
                    if (lenSq < 0.001) continue

                    let t = ((furn.position.x - wall.start.x) * wx + (furn.position.z - wall.start.y) * wy) / lenSq
                    t = Math.max(0, Math.min(1, t))

                    const cx = wall.start.x + t * wx
                    const cz = wall.start.y + t * wy
                    const dx = furn.position.x - cx
                    const dz = furn.position.z - cz
                    const dist = Math.sqrt(dx * dx + dz * dz)

                    if (dist < bestDist) {
                        bestDist = dist
                        bestPoint = { x: cx, z: cz }
                        bestAngle = Math.atan2(wy, wx)
                        bestThickness = wall.thickness || 0.15
                    }
                }

                if (bestPoint) {
                    furn.position.x = bestPoint.x
                    furn.position.z = bestPoint.z
                    furn.rotation.y = bestAngle
                    furn.dimensions.depth = bestThickness
                }
            }

            const importedLevelIds = new Set<string>([
                ...walls.map((wall) => normalizeLevelId(wall.levelId)),
                ...furniture.map((item) => normalizeLevelId(item.levelId)),
                ...rooms.map((room) => normalizeLevelId(room.levelId)),
                ...labels.map((label) => normalizeLevelId(label.levelId)),
            ])
            if (importedLevelIds.size === 0) {
                importedLevelIds.add(importTargetLevelId)
            }

            state.walls = [
                ...state.walls.filter((wall) => !importedLevelIds.has(normalizeLevelId(wall.levelId))),
                ...walls,
            ]
            state.furniture = [
                ...state.furniture.filter((item) => !importedLevelIds.has(normalizeLevelId(item.levelId))),
                ...furniture,
            ]
            state.labels = [
                ...state.labels.filter((label) => !importedLevelIds.has(normalizeLevelId(label.levelId))),
                ...labels,
            ]
            state.rooms = [
                ...state.rooms.filter((room) => !importedLevelIds.has(normalizeLevelId(room.levelId))),
                ...rooms,
            ]

            pushHistorySnapshot(state as MutableHistoryState)

            if (!state.isCalibrated && (state.tutorialStep === 'none' || state.tutorialStep === 'process')) {
                if (state.tutorialStep === 'process' || (walls.length === 0 && rooms.length === 0)) {
                    state.tutorialStep = 'calibration'
                    state.tutorialMinimized = false
                    state.activeTool = 'none'
                }
            }
        }),

        exportToSVG: () => {
            const state = useFloorplanStore.getState()
            const calibrationFactor = state.calibrationFactor
            const activeLevelId = state.activeLevelId
            const walls = filterEntitiesForLevel(state.walls, activeLevelId)
            const furniture = filterEntitiesForLevel(state.furniture, activeLevelId)
            const rooms = filterEntitiesForLevel(state.rooms, activeLevelId)
            const labels = filterEntitiesForLevel(state.labels, activeLevelId)
            // Inverse calibration: Metrics stored in meters. SVG usually in pixels or relative units.
            // importFromSVG used: val_m = (val_px - offset) * pxToM
            // So: val_px = (val_m / pxToM) + offset
            // We'll normalize offset to 0 for simplicity, or keep existing bounds?
            // Safer to just export everything relative to 0,0 or finding bounds.

            // 1. Find Bounds (include wall thickness so rects don't clip the viewBox)
            let minX = Infinity, minY = Infinity
            walls.forEach(w => {
                const halfT = (w.thickness || 0.15) / 2
                minX = Math.min(minX, w.start.x - halfT, w.end.x - halfT)
                minY = Math.min(minY, w.start.y - halfT, w.end.y - halfT)
            })
            furniture.forEach(f => {
                minX = Math.min(minX, f.position.x - f.dimensions.width / 2)
                minY = Math.min(minY, f.position.z - f.dimensions.depth / 2)
            })
            rooms.forEach(r => {
                r.points.forEach(p => {
                    minX = Math.min(minX, p.x)
                    minY = Math.min(minY, p.y)
                })
            })
            labels.forEach(label => {
                minX = Math.min(minX, label.position.x)
                minY = Math.min(minY, label.position.y)
            })
            // If empty, default 0
            if (minX === Infinity) { minX = 0; minY = 0 }

            const padding = 50 // px padding
            let mpp = Number(calibrationFactor)
            if (!isFinite(mpp) || mpp <= 0) mpp = 0.01
            mpp = Math.min(Math.max(mpp, 1e-5), 0.5)
            const pxPerMeter = 1 / mpp

            // Collect all textures from walls and rooms to build <defs>
            const patternDefs = new Set<string>()

            // Calculate SVG Dimensions (include wall thickness)
            let maxX = -Infinity, maxY = -Infinity
            walls.forEach(w => {
                const halfT = (w.thickness || 0.15) / 2
                maxX = Math.max(maxX, w.start.x + halfT, w.end.x + halfT)
                maxY = Math.max(maxY, w.start.y + halfT, w.end.y + halfT)
                // Collect wall textures
                if (w.textureDataUrl && w.textureTileWidthM && w.textureTileHeightM) {
                    const tw = w.textureTileWidthM * pxPerMeter
                    const th = w.textureTileHeightM * pxPerMeter
                    patternDefs.add(
                        `<pattern id="tex_${w.id}" patternUnits="userSpaceOnUse" x="0" y="0" width="${tw}" height="${th}"><image href="${w.textureDataUrl}" x="0" y="0" width="${tw}" height="${th}" preserveAspectRatio="none" /></pattern>`
                    )
                }
            })
            furniture.forEach(f => {
                maxX = Math.max(maxX, f.position.x + f.dimensions.width / 2)
                maxY = Math.max(maxY, f.position.z + f.dimensions.depth / 2)
            })
            rooms.forEach(r => {
                r.points.forEach(p => {
                    maxX = Math.max(maxX, p.x)
                    maxY = Math.max(maxY, p.y)
                })
                // Collect room textures
                if (r.textureDataUrl && r.textureTileWidthM && r.textureTileHeightM) {
                    const tw = r.textureTileWidthM * pxPerMeter
                    const th = r.textureTileHeightM * pxPerMeter
                    patternDefs.add(
                        `<pattern id="tex_${r.id}" patternUnits="userSpaceOnUse" x="0" y="0" width="${tw}" height="${th}"><image href="${r.textureDataUrl}" x="0" y="0" width="${tw}" height="${th}" preserveAspectRatio="none" /></pattern>`
                    )
                }
            })
            labels.forEach(label => {
                maxX = Math.max(maxX, label.position.x)
                maxY = Math.max(maxY, label.position.y)
            })
            if (maxX === -Infinity) { maxX = 10; maxY = 10 }

            let width: number, height: number;
            let toPxX: (val: number) => number;
            let toPxY: (val: number) => number;

            if (state.imageDimensions) {
                width = state.imageDimensions.width;
                height = state.imageDimensions.height;
                const centerX = width / 2;
                const centerY = height / 2;
                toPxX = (val: number) => (val * pxPerMeter) + centerX;
                toPxY = (val: number) => (val * pxPerMeter) + centerY;
            } else {
                width = (maxX - minX) * pxPerMeter + padding * 2;
                height = (maxY - minY) * pxPerMeter + padding * 2;
                toPxX = (val: number) => (val - minX) * pxPerMeter + padding;
                toPxY = (val: number) => (val - minY) * pxPerMeter + padding;
            }

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`

            // Insert collected definitions
            if (patternDefs.size > 0) {
                svg += `  <defs>\n`
                patternDefs.forEach(def => {
                    svg += `    ${def}\n`
                })
                svg += `  </defs>\n`
            }

            // A. Base/Background (Optional, backend adds it usually, but let's be clean)
            // Backend master.py adds base. We only need the items.
            // Actually, master.py expects walls/doors/windows to generate base.
            // We should just output the groups.

            // B. Walls
            svg += `  <g id="wall">\n`
            walls.forEach(w => {
                // Determine Rect from Line
                // Horizontal vs Vertical
                const dx = w.end.x - w.start.x
                const dy = w.end.y - w.start.y
                let rx, ry, rw, rh

                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal
                    rx = Math.min(w.start.x, w.end.x)
                    ry = w.start.y - w.thickness / 2
                    rw = Math.abs(dx)
                    rh = w.thickness
                } else {
                    // Vertical
                    rx = w.start.x - w.thickness / 2
                    ry = Math.min(w.start.y, w.end.y)
                    rw = w.thickness
                    rh = Math.abs(dy)
                }

                // Check for texture fill
                const fillStyle = w.textureDataUrl ? `url(#tex_${w.id})` : "#222222"

                svg += `    <rect id="${w.id}" x="${toPxX(rx)}" y="${toPxY(ry)}" width="${rw * pxPerMeter}" height="${rh * pxPerMeter}" fill="${fillStyle}" />\n`
            })
            svg += `  </g>\n`

            // C. Doors / Windows — preserve rotation by swapping width/depth for rotated items
            const exportOpening = (d: FurnItem) => {
                const isRotated = Math.abs(d.rotation.y) > 0.1 // ~6 degrees threshold
                // For rotated (vertical) openings: swap width/depth in SVG so the rect matches the 2D layout
                const svgW = isRotated ? d.dimensions.depth : d.dimensions.width
                const svgH = isRotated ? d.dimensions.width : d.dimensions.depth
                const rx = d.position.x - svgW / 2
                const rz = d.position.z - svgH / 2
                const rotAttr = ` data-rotation="${d.rotation.y.toFixed(4)}"`
                return { rx, rz, svgW, svgH, rotAttr }
            }

            const doors = furniture.filter(f => f.type === 'door')
            if (doors.length > 0) {
                svg += `  <g id="door">\n`
                doors.forEach(d => {
                    const { rx, rz, svgW, svgH, rotAttr } = exportOpening(d)
                    svg += `    <rect id="${d.id}" x="${toPxX(rx)}" y="${toPxY(rz)}" width="${svgW * pxPerMeter}" height="${svgH * pxPerMeter}" fill="#8B4513"${rotAttr} />\n`
                })
                svg += `  </g>\n`
            }

            const windows = furniture.filter(f => f.type === 'window')
            if (windows.length > 0) {
                svg += `  <g id="window">\n`
                windows.forEach(d => {
                    const { rx, rz, svgW, svgH, rotAttr } = exportOpening(d)
                    svg += `    <rect id="${d.id}" x="${toPxX(rx)}" y="${toPxY(rz)}" width="${svgW * pxPerMeter}" height="${svgH * pxPerMeter}" fill="#0000FF"${rotAttr} />\n`
                })
                svg += `  </g>\n`
            }

            // D. Imported model placemarks (for mapping in backend/Blender)
            const imported = furniture.filter(f => f.type === 'imported' && f.modelUrl)
            if (imported.length > 0) {
                svg += `  <g id="imported-models" opacity="0.95">\n`
                imported.forEach(it => {
                    const isRotated = Math.abs(it.rotation.y) > 0.1
                    const svgW = isRotated ? it.dimensions.depth : it.dimensions.width
                    const svgH = isRotated ? it.dimensions.width : it.dimensions.depth
                    const rx = it.position.x - svgW / 2
                    const rz = it.position.z - svgH / 2
                    const rotAttr = ` data-rotation="${it.rotation.y.toFixed(4)}"`
                    const safeRel = String(it.modelUrl || '').replace(/"/g, '')
                    const safeName = String(it.label || '').replace(/"/g, '')
                    
                    svg += `    <rect id="imported_${it.id}" x="${toPxX(rx)}" y="${toPxY(rz)}" width="${svgW * pxPerMeter}" height="${svgH * pxPerMeter}" fill="#00ffff" data-rel-path="${safeRel}" data-name="${safeName}"${rotAttr} />\n`
                })
                svg += `  </g>\n`
            }

            // E. Rooms (export so backend can target floors by id for texturize)
            if (rooms.length > 0) {
                svg += `  <g id="rooms-geometry" opacity="0.35">\n`
                rooms.forEach(r => {
                    const pts = r.points
                        .map(p => `${toPxX(p.x)},${toPxY(p.y)}`)
                        .join(' ')
                    const safeName = String(r.name || '').replace(/"/g, '')
                    svg += `    <polygon id="${r.id}" points="${pts}" fill="${r.color || '#e2e8f0'}" stroke="none" data-name="${safeName}" />\n`
                })
                svg += `  </g>\n`
            }

            if (labels.length > 0) {
                svg += `  <g id="labels">\n`
                labels.forEach(label => {
                    const safeText = String(label.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    svg += `    <text id="${label.id}" x="${toPxX(label.position.x)}" y="${toPxY(label.position.y)}" fill="#ffffff" font-size="14">${safeText}</text>\n`
                })
                svg += `  </g>\n`
            }

            svg += `</svg>`
            return svg
        },

        generateFloors: async () => {
            set((state) => {
                // simple base floor generation: bounding box + padding
                const levelWalls = filterEntitiesForLevel(state.walls, state.activeLevelId)
                if (levelWalls.length === 0) return

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                levelWalls.forEach(w => {
                    minX = Math.min(minX, w.start.x, w.end.x)
                    minY = Math.min(minY, w.start.y, w.end.y)
                    maxX = Math.max(maxX, w.start.x, w.end.x)
                    maxY = Math.max(maxY, w.start.y, w.end.y)
                })

                // Add 20% padding
                const width = maxX - minX
                const height = maxY - minY
                const padX = width * 0.2
                const padY = height * 0.2

                // Define a single large rectangular room
                const baseRoom: Room = {
                    id: uuidv4(),
                    name: 'Base Floor',
                    levelId: state.activeLevelId,
                    points: [
                        { x: minX - padX, y: minY - padY },
                        { x: maxX + padX, y: minY - padY },
                        { x: maxX + padX, y: maxY + padY },
                        { x: minX - padX, y: maxY + padY }
                    ],
                    color: '#e2e8f0', // Neutral floor color
                    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
                }

                state.rooms = [...filterEntitiesOutsideLevel(state.rooms, state.activeLevelId), baseRoom]
                if (state.tutorialStep === 'correction') {
                    state.tutorialStep = 'floor_review'
                }
            })
        },

        handleDrop: (type: string, x: number, y: number) => set((state) => {
            state.pendingDrop = { type, x, y }
        }),

        // Undo/Redo/Clipboard implementations
        saveHistory: () => set((state) => {
            // For simplicity, we only store last 20 states
            pushHistorySnapshot(state as MutableHistoryState)
        }),

        undo: () => set((state) => {
            const history = (state as MutableHistoryState).history || []
            const idx = (state as MutableHistoryState).historyIndex ?? history.length - 1
            if (idx > 0) {
                const prev = history[idx - 1]
                state.walls = JSON.parse(JSON.stringify(prev.walls))
                state.furniture = JSON.parse(JSON.stringify(prev.furniture))
                state.rooms = JSON.parse(JSON.stringify(prev.rooms))
                state.labels = JSON.parse(JSON.stringify(prev.labels))
                    ; (state as MutableHistoryState).historyIndex = idx - 1
            }
        }),

        redo: () => set((state) => {
            const history = (state as MutableHistoryState).history || []
            const idx = (state as MutableHistoryState).historyIndex ?? history.length - 1
            if (idx < history.length - 1) {
                const next = history[idx + 1]
                state.walls = JSON.parse(JSON.stringify(next.walls))
                state.furniture = JSON.parse(JSON.stringify(next.furniture))
                state.rooms = JSON.parse(JSON.stringify(next.rooms))
                state.labels = JSON.parse(JSON.stringify(next.labels))
                    ; (state as MutableHistoryState).historyIndex = idx + 1
            }
        }),

        copyObject: () => set((state) => {
            if (!state.selectedId) return
            const wall = state.walls.find(w => w.id === state.selectedId)
            if (wall) {
                ; (state as MutableHistoryState).clipboard = { type: 'wall', data: JSON.parse(JSON.stringify(wall)) }
                return
            }
            const furn = state.furniture.find(f => f.id === state.selectedId)
            if (furn) {
                ; (state as MutableHistoryState).clipboard = { type: 'furniture', data: JSON.parse(JSON.stringify(furn)) }
                return
            }
            const room = state.rooms.find(r => r.id === state.selectedId)
            if (room) {
                ; (state as MutableHistoryState).clipboard = { type: 'room', data: JSON.parse(JSON.stringify(room)) }
                return
            }
            const label = state.labels.find(entry => entry.id === state.selectedId)
            if (label) {
                ; (state as MutableHistoryState).clipboard = { type: 'label', data: JSON.parse(JSON.stringify(label)) }
            }
        }),

        pasteObject: () => set((state) => {
            const clipboard = (state as MutableHistoryState).clipboard
            if (!clipboard) return
            if (clipboard.type === 'wall') {
                const newWall = { ...clipboard.data, id: uuidv4(), levelId: state.activeLevelId }
                newWall.start = { x: newWall.start.x + 0.5, y: newWall.start.y + 0.5 }
                newWall.end = { x: newWall.end.x + 0.5, y: newWall.end.y + 0.5 }
                state.walls.push(newWall)
                state.selectedId = newWall.id
            } else if (clipboard.type === 'furniture') {
                const newFurn = { ...clipboard.data, id: uuidv4(), levelId: state.activeLevelId }
                newFurn.position = { ...newFurn.position, x: newFurn.position.x + 0.5, z: newFurn.position.z + 0.5 }
                state.furniture.push(newFurn)
                state.selectedId = newFurn.id
            } else if (clipboard.type === 'room') {
                const newRoom = { ...clipboard.data, id: uuidv4(), levelId: state.activeLevelId }
                newRoom.points = newRoom.points.map(point => ({ x: point.x + 0.5, y: point.y + 0.5 }))
                newRoom.center = { x: newRoom.center.x + 0.5, y: newRoom.center.y + 0.5 }
                state.rooms.push(newRoom)
                state.selectedId = newRoom.id
            } else if (clipboard.type === 'label') {
                const newLabel = {
                    ...clipboard.data,
                    id: uuidv4(),
                    levelId: state.activeLevelId,
                    position: {
                        x: clipboard.data.position.x + 0.5,
                        y: clipboard.data.position.y + 0.5,
                    },
                }
                state.labels.push(newLabel)
                state.selectedId = newLabel.id
            }
            pushHistorySnapshot(state as MutableHistoryState)
        }),

        consumeDrop: () => set((state) => {
            state.pendingDrop = null
        }),

        showToast: (message: string, type: 'error' | 'info' | 'success' = 'info') => {
            set((state) => {
                state.toast = { message, type }
            })
            // Auto dismiss
            setTimeout(() => {
                set((state) => {
                    if (state.toast?.message === message) {
                        state.toast = null
                    }
                })
            }, 3000)
        },

        setPendingFile: (file: File | null) => set((state) => {
            state.pendingFile = file
        }),

        resetFloorplan: () => set((state) => {
            const defaultLevel = createDefaultLevel()
            state.walls = []
            state.furniture = []
            state.rooms = []
            state.labels = []
            state.levels = [defaultLevel]
            state.activeLevelId = defaultLevel.id
            state.uploadedImage = null
            state.imageDimensions = null
            state.calibrationFactor = 0.01 // Default 1px = 1cm
            state.isCalibrated = false
            state.mode = '2d'
            state.cameraMode = 'orbit'
            state.activeTool = 'wall'
            state.selectedId = null
            state.currentRunId = null
            state.runStatus = 'idle'
            state.isGenerating3D = false
            state.isRendering = false
            state.showBackground = true
            state.glbPreviewSource = 'none'
            state.showProcessingModal = false
            state.showQueueModal = false
            state.tutorialStep = 'none'
            state.lastQueuedTask = 'none'
            state.localDraftStatus = 'idle'
            state.lastLocalSaveAt = null
            ;(state as any).history = []
            ;(state as any).historyIndex = -1
            clearLocalDraftStorage()
        })

    }))
)
