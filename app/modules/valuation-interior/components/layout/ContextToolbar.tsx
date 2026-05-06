'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { AppWindow, Box, DoorOpen, Sofa, Type, VenetianMask, Wallpaper, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFloorplanStore, type FurnItem, type Room, type TextLabel, type Vector2, type Wall } from '@/modules/valuation-interior/store/floorplanStore'

const CM_PER_M = 100
const mToCm = (value: number) => value * CM_PER_M
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

type FloorplannerLike = {
    convertX: (value: number) => number
    convertY: (value: number) => number
    cmPerPixel: number
    originX: number
    originY: number
}

type FloorplannerContext = {
    canvasRect: {
        left: number
        top: number
        right: number
        bottom: number
        width: number
        height: number
    }
    floorplanner: FloorplannerLike
}

type OverlayFootprint = {
    x: number
    y: number
    width: number
    height: number
    rotation: number
}

type OverlayLabel = {
    x: number
    y: number
}

type OverlayLayout = {
    canvasRect: FloorplannerContext['canvasRect'] | null
    furniture: Record<string, OverlayFootprint>
    labels: Record<string, OverlayLabel>
    anchor: { x: number; y: number } | null
}

type DragState =
    | { kind: 'furniture'; id: string }
    | { kind: 'label'; id: string }
    | null

type SelectedObject =
    | { kind: 'wall'; object: Wall }
    | { kind: 'room'; object: Room }
    | { kind: 'furniture'; object: FurnItem }
    | { kind: 'label'; object: TextLabel }
    | null

const getFloorplannerContext = (): FloorplannerContext | null => {
    if (typeof window === 'undefined') return null

    const bpWindow = window as Window & {
        __BP3D_INSTANCE__?: {
            floorplanner?: FloorplannerLike
        }
    }

    const floorplanner = bpWindow.__BP3D_INSTANCE__?.floorplanner
    const canvas = document.getElementById('floorplanner-canvas')

    if (!floorplanner || !(canvas instanceof HTMLCanvasElement)) {
        return null
    }

    const rect = canvas.getBoundingClientRect()
    return {
        floorplanner,
        canvasRect: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
        },
    }
}

const worldToScreen = (ctx: FloorplannerContext, point: Vector2) => ({
    x: ctx.canvasRect.left + ctx.floorplanner.convertX(mToCm(point.x)),
    y: ctx.canvasRect.top + ctx.floorplanner.convertY(mToCm(point.y)),
})

const screenToWorld = (ctx: FloorplannerContext, clientX: number, clientY: number): Vector2 => ({
    x: (((clientX - ctx.canvasRect.left) * ctx.floorplanner.cmPerPixel) + (ctx.floorplanner.originX * ctx.floorplanner.cmPerPixel)) / CM_PER_M,
    y: (((clientY - ctx.canvasRect.top) * ctx.floorplanner.cmPerPixel) + (ctx.floorplanner.originY * ctx.floorplanner.cmPerPixel)) / CM_PER_M,
})

const formatMeters = (value: number, digits = 2) => value.toFixed(digits)

const inputClassName = 'h-9 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.08]'
const smallButtonClassName = 'inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-semibold text-white transition hover:bg-white/[0.09]'

function DockAction({
    label,
    onClick,
    danger = false,
}: {
    label: string
    onClick: () => void
    danger?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition',
                danger
                    ? 'border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/16'
                    : 'border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.09]'
            )}
        >
            {label}
        </button>
    )
}

function DockField({
    label,
    children,
}: {
    label: string
    children: ReactNode
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
            {children}
        </div>
    )
}

function WallDockContent({
    wall,
    onApply,
    onCalibrate,
    onJoin,
    onDuplicate,
    onDelete,
}: {
    wall: Wall
    onApply: (payload: { label: string; thickness: number; height: number }) => void
    onCalibrate: () => void
    onJoin: () => void
    onDuplicate: () => void
    onDelete: () => void
}) {
    const [draft, setDraft] = useState({
        label: wall.label || '',
        thickness: formatMeters(wall.thickness || 0.15),
        height: formatMeters(wall.height || 2.5),
    })

    const commit = () => {
        const thickness = parseFloat(draft.thickness)
        const height = parseFloat(draft.height)
        onApply({
            label: draft.label,
            thickness: Number.isFinite(thickness) ? thickness : wall.thickness,
            height: Number.isFinite(height) ? height : wall.height,
        })
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DockField label="Label">
                    <input
                        value={draft.label}
                        onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        placeholder="Wall name"
                        className={inputClassName}
                    />
                </DockField>
                <DockField label="Thickness (m)">
                    <input
                        value={draft.thickness}
                        onChange={(event) => setDraft((prev) => ({ ...prev, thickness: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        className={inputClassName}
                        inputMode="decimal"
                    />
                </DockField>
                <DockField label="Height (m)">
                    <input
                        value={draft.height}
                        onChange={(event) => setDraft((prev) => ({ ...prev, height: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        className={inputClassName}
                        inputMode="decimal"
                    />
                </DockField>
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={commit} className={smallButtonClassName}>Apply</button>
                <DockAction label="Use For Calibration" onClick={onCalibrate} />
                <DockAction label="Join" onClick={onJoin} />
                <DockAction label="Duplicate" onClick={onDuplicate} />
                <DockAction label="Delete" onClick={onDelete} danger />
            </div>
        </>
    )
}

function RoomDockContent({
    room,
    onApply,
    onDuplicate,
    onDelete,
}: {
    room: Room
    onApply: (payload: { name: string; color: string }) => void
    onDuplicate: () => void
    onDelete: () => void
}) {
    const [draft, setDraft] = useState({
        name: room.name || '',
        color: room.color || '#ddd8d0',
    })

    const commit = () => onApply(draft)

    return (
        <>
            <div className="grid grid-cols-[1fr_auto] gap-3">
                <DockField label="Room Name">
                    <input
                        value={draft.name}
                        onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        placeholder="Room name"
                        className={inputClassName}
                    />
                </DockField>
                <DockField label="Color">
                    <input
                        type="color"
                        value={draft.color}
                        onChange={(event) => setDraft((prev) => ({ ...prev, color: event.target.value }))}
                        onBlur={commit}
                        className="h-9 w-14 rounded-xl border border-white/10 bg-white/[0.05] p-1"
                    />
                </DockField>
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={commit} className={smallButtonClassName}>Apply</button>
                <DockAction label="Duplicate" onClick={onDuplicate} />
                <DockAction label="Delete" onClick={onDelete} danger />
            </div>
        </>
    )
}

function FurnitureDockContent({
    item,
    onApply,
    onRotate,
    onSwap,
    onDuplicate,
    onDelete,
}: {
    item: FurnItem
    onApply: (payload: { label: string; width: number; depth: number; height: number }) => void
    onRotate: () => void
    onSwap: (() => void) | null
    onDuplicate: () => void
    onDelete: () => void
}) {
    const [draft, setDraft] = useState({
        label: item.label || '',
        width: formatMeters(item.dimensions.width || 1),
        depth: formatMeters(item.dimensions.depth || 1),
        height: formatMeters(item.dimensions.height || 1),
    })

    const commit = () => {
        const width = parseFloat(draft.width)
        const depth = parseFloat(draft.depth)
        const height = parseFloat(draft.height)

        onApply({
            label: draft.label,
            width: Number.isFinite(width) ? width : item.dimensions.width,
            depth: Number.isFinite(depth) ? depth : item.dimensions.depth,
            height: Number.isFinite(height) ? height : item.dimensions.height,
        })
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <DockField label="Label">
                    <input
                        value={draft.label}
                        onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        placeholder="Item label"
                        className={inputClassName}
                    />
                </DockField>
                <DockField label="Width (m)">
                    <input
                        value={draft.width}
                        onChange={(event) => setDraft((prev) => ({ ...prev, width: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        className={inputClassName}
                        inputMode="decimal"
                    />
                </DockField>
                <DockField label="Depth (m)">
                    <input
                        value={draft.depth}
                        onChange={(event) => setDraft((prev) => ({ ...prev, depth: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        className={inputClassName}
                        inputMode="decimal"
                    />
                </DockField>
                <DockField label="Height (m)">
                    <input
                        value={draft.height}
                        onChange={(event) => setDraft((prev) => ({ ...prev, height: event.target.value }))}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                        className={inputClassName}
                        inputMode="decimal"
                    />
                </DockField>
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={commit} className={smallButtonClassName}>Apply</button>
                <DockAction label="Rotate 90°" onClick={onRotate} />
                {onSwap && (
                    <DockAction
                        label={`Swap To ${item.type === 'door' ? 'Window' : 'Door'}`}
                        onClick={onSwap}
                    />
                )}
                <DockAction label="Duplicate" onClick={onDuplicate} />
                <DockAction label="Delete" onClick={onDelete} danger />
            </div>
        </>
    )
}

function LabelDockContent({
    label,
    onApply,
    onDuplicate,
    onDelete,
}: {
    label: TextLabel
    onApply: (nextText: string) => void
    onDuplicate: () => void
    onDelete: () => void
}) {
    const [draft, setDraft] = useState(label.text || '')

    const commit = () => onApply(draft)

    return (
        <>
            <DockField label="Label Text">
                <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
                    placeholder="OCR label"
                    className={inputClassName}
                />
            </DockField>

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={commit} className={smallButtonClassName}>Apply</button>
                <DockAction label="Duplicate" onClick={onDuplicate} />
                <DockAction label="Delete" onClick={onDelete} danger />
            </div>
        </>
    )
}

export function ContextToolbar() {
    const mode = useFloorplanStore(s => s.mode)
    const activeTool = useFloorplanStore(s => s.activeTool)
    const selectedId = useFloorplanStore(s => s.selectedId)
    const walls = useFloorplanStore(s => s.walls)
    const rooms = useFloorplanStore(s => s.rooms)
    const furniture = useFloorplanStore(s => s.furniture)
    const labels = useFloorplanStore(s => s.labels)
    const selectObject = useFloorplanStore(s => s.selectObject)
    const startInteraction = useFloorplanStore(s => s.startInteraction)
    const updateInteraction = useFloorplanStore(s => s.updateInteraction)
    const endInteraction = useFloorplanStore(s => s.endInteraction)
    const deleteObject = useFloorplanStore(s => s.deleteObject)
    const updateWall = useFloorplanStore(s => s.updateWall)
    const updateRoom = useFloorplanStore(s => s.updateRoom)
    const updateFurniture = useFloorplanStore(s => s.updateFurniture)
    const updateTextLabel = useFloorplanStore(s => s.updateTextLabel)
    const copyObject = useFloorplanStore(s => s.copyObject)
    const pasteObject = useFloorplanStore(s => s.pasteObject)
    const saveHistory = useFloorplanStore(s => s.saveHistory)
    const setJoinMode = useFloorplanStore(s => s.setJoinMode)
    const setActiveTool = useFloorplanStore(s => s.setActiveTool)

    const selectedWall = useMemo(() => walls.find(wall => wall.id === selectedId) || null, [walls, selectedId])
    const selectedRoom = useMemo(() => rooms.find(room => room.id === selectedId) || null, [rooms, selectedId])
    const selectedFurniture = useMemo(() => furniture.find(item => item.id === selectedId) || null, [furniture, selectedId])
    const selectedLabel = useMemo(() => labels.find(label => label.id === selectedId) || null, [labels, selectedId])

    const selectedObject = useMemo<SelectedObject>(() => {
        if (selectedWall) return { kind: 'wall', object: selectedWall }
        if (selectedRoom) return { kind: 'room', object: selectedRoom }
        if (selectedFurniture) return { kind: 'furniture', object: selectedFurniture }
        if (selectedLabel) return { kind: 'label', object: selectedLabel }
        return null
    }, [selectedFurniture, selectedLabel, selectedRoom, selectedWall])

    const [layout, setLayout] = useState<OverlayLayout>({
        canvasRect: null,
        furniture: {},
        labels: {},
        anchor: null,
    })
    const layoutSignatureRef = useRef('')
    const dragRef = useRef<DragState>(null)

    useEffect(() => {
        if (mode !== '2d') return

        let rafId = 0

        const tick = () => {
            const ctx = getFloorplannerContext()
            if (!ctx) {
                rafId = window.requestAnimationFrame(tick)
                return
            }

            const nextFurniture: Record<string, OverlayFootprint> = {}
            furniture.forEach(item => {
                const center = worldToScreen(ctx, { x: item.position.x, y: item.position.z })
                const left = worldToScreen(ctx, { x: item.position.x - (item.dimensions.width / 2), y: item.position.z })
                const right = worldToScreen(ctx, { x: item.position.x + (item.dimensions.width / 2), y: item.position.z })
                const top = worldToScreen(ctx, { x: item.position.x, y: item.position.z - (item.dimensions.depth / 2) })
                const bottom = worldToScreen(ctx, { x: item.position.x, y: item.position.z + (item.dimensions.depth / 2) })

                nextFurniture[item.id] = {
                    x: center.x,
                    y: center.y,
                    width: Math.max(18, Math.abs(right.x - left.x)),
                    height: Math.max(12, Math.abs(bottom.y - top.y)),
                    rotation: (-item.rotation.y * 180) / Math.PI,
                }
            })

            const nextLabels: Record<string, OverlayLabel> = {}
            labels.forEach(label => {
                nextLabels[label.id] = worldToScreen(ctx, label.position)
            })

            let nextAnchor: { x: number; y: number } | null = null

            if (selectedWall) {
                const midpoint = {
                    x: (selectedWall.start.x + selectedWall.end.x) / 2,
                    y: (selectedWall.start.y + selectedWall.end.y) / 2,
                }
                const screen = worldToScreen(ctx, midpoint)
                nextAnchor = { x: screen.x, y: screen.y - 26 }
            } else if (selectedRoom) {
                const screen = worldToScreen(ctx, selectedRoom.center)
                nextAnchor = { x: screen.x, y: screen.y - 36 }
            } else if (selectedFurniture) {
                const footprint = nextFurniture[selectedFurniture.id]
                if (footprint) {
                    nextAnchor = { x: footprint.x, y: footprint.y - (footprint.height / 2) - 18 }
                }
            } else if (selectedLabel) {
                const point = nextLabels[selectedLabel.id]
                if (point) {
                    nextAnchor = { x: point.x, y: point.y - 18 }
                }
            }

            const nextLayout: OverlayLayout = {
                canvasRect: ctx.canvasRect,
                furniture: nextFurniture,
                labels: nextLabels,
                anchor: nextAnchor,
            }

            const signature = JSON.stringify(nextLayout)
            if (signature !== layoutSignatureRef.current) {
                layoutSignatureRef.current = signature
                setLayout(nextLayout)
            }

            rafId = window.requestAnimationFrame(tick)
        }

        rafId = window.requestAnimationFrame(tick)
        return () => window.cancelAnimationFrame(rafId)
    }, [furniture, labels, mode, selectedFurniture, selectedLabel, selectedRoom, selectedWall])

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (!dragRef.current || mode !== '2d') return

            const ctx = getFloorplannerContext()
            if (!ctx) return

            const point = screenToWorld(ctx, event.clientX, event.clientY)

            if (dragRef.current.kind === 'furniture') {
                updateInteraction(point, { shiftKey: event.shiftKey })
            } else {
                updateTextLabel(dragRef.current.id, { position: point })
            }
        }

        const handlePointerUp = () => {
            if (!dragRef.current) return
            if (dragRef.current.kind === 'furniture') {
                endInteraction()
            } else {
                saveHistory()
            }
            dragRef.current = null
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
        }
    }, [endInteraction, mode, saveHistory, updateInteraction, updateTextLabel])

    const overlayInteractive = mode === '2d' && !['wall', 'floor', 'delete', 'ruler'].includes(activeTool)
    const canDragObjects = overlayInteractive && ['select', 'move', 'none'].includes(activeTool)

    const duplicateSelected = () => {
        if (!selectedObject) return
        copyObject()
        pasteObject()
    }

    const deleteSelected = () => {
        if (!selectedId) return
        deleteObject(selectedId)
    }

    const rotateSelectedFurniture = () => {
        if (!selectedFurniture) return
        updateFurniture(selectedFurniture.id, {
            rotation: {
                x: selectedFurniture.rotation.x || 0,
                y: (selectedFurniture.rotation.y || 0) + Math.PI / 2,
                z: selectedFurniture.rotation.z || 0,
            },
        })
        saveHistory()
    }

    const swapOpeningType = () => {
        if (!selectedFurniture || (selectedFurniture.type !== 'door' && selectedFurniture.type !== 'window')) return
        const nextType = selectedFurniture.type === 'door' ? 'window' : 'door'

        updateFurniture(selectedFurniture.id, {
            type: nextType,
            position: {
                x: selectedFurniture.position.x,
                y: nextType === 'window' ? 1.0 : 0,
                z: selectedFurniture.position.z,
            },
            dimensions: {
                width: nextType === 'window' ? 1.2 : 0.9,
                height: nextType === 'window' ? 1.2 : 2.1,
                depth: selectedFurniture.dimensions.depth || 0.15,
            },
        })
        saveHistory()
    }

    const handleFurniturePointerDown = (event: React.PointerEvent<HTMLButtonElement>, itemId: string) => {
        event.preventDefault()
        event.stopPropagation()
        selectObject(itemId)

        if (!canDragObjects || event.button !== 0) return

        const ctx = getFloorplannerContext()
        if (!ctx) return

        dragRef.current = { kind: 'furniture', id: itemId }
        startInteraction('dragging', itemId, screenToWorld(ctx, event.clientX, event.clientY))
    }

    const handleLabelPointerDown = (event: React.PointerEvent<HTMLButtonElement>, labelId: string) => {
        event.preventDefault()
        event.stopPropagation()
        selectObject(labelId)

        if (!canDragObjects || event.button !== 0) return

        dragRef.current = { kind: 'label', id: labelId }
    }

    const dockWidth = selectedObject?.kind === 'wall' ? 380 : selectedObject?.kind === 'label' ? 300 : 340
    const dockPosition = useMemo(() => {
        if (!layout.anchor || !layout.canvasRect) return null
        const halfWidth = dockWidth / 2
        return {
            left: clamp(layout.anchor.x, layout.canvasRect.left + halfWidth + 12, layout.canvasRect.right - halfWidth - 12),
            top: clamp(layout.anchor.y, layout.canvasRect.top + 76, layout.canvasRect.bottom - 20),
        }
    }, [dockWidth, layout.anchor, layout.canvasRect])

    const selectedTitle = useMemo(() => {
        if (!selectedObject) return ''
        if (selectedObject.kind === 'wall') return selectedObject.object.label || 'Wall'
        if (selectedObject.kind === 'room') return selectedObject.object.name || 'Room'
        if (selectedObject.kind === 'label') return selectedObject.object.text || 'Label'
        return selectedObject.object.label || selectedObject.object.type || 'Furniture'
    }, [selectedObject])

    const selectedMeta = useMemo(() => {
        if (!selectedObject) return null

        if (selectedObject.kind === 'wall') {
            return {
                icon: Wallpaper,
                eyebrow: 'Wall',
                accent: 'border-cyan-400/25 bg-cyan-400/12 text-cyan-50',
            }
        }

        if (selectedObject.kind === 'room') {
            return {
                icon: Box,
                eyebrow: 'Room',
                accent: 'border-emerald-400/25 bg-emerald-400/12 text-emerald-50',
            }
        }

        if (selectedObject.kind === 'label') {
            return {
                icon: Type,
                eyebrow: 'Label',
                accent: 'border-amber-400/25 bg-amber-400/12 text-amber-50',
            }
        }

        if (selectedObject.object.type === 'door') {
            return {
                icon: DoorOpen,
                eyebrow: 'Door',
                accent: 'border-orange-400/25 bg-orange-400/12 text-orange-50',
            }
        }

        if (selectedObject.object.type === 'window') {
            return {
                icon: AppWindow,
                eyebrow: 'Window',
                accent: 'border-sky-400/25 bg-sky-400/12 text-sky-50',
            }
        }

        return {
            icon: selectedObject.object.type === 'imported' ? VenetianMask : Sofa,
            eyebrow: selectedObject.object.type === 'imported' ? 'Imported Model' : 'Furniture',
            accent: 'border-violet-400/25 bg-violet-400/12 text-violet-50',
        }
    }, [selectedObject])

    if (mode !== '2d' || !layout.canvasRect) return null

    return (
        <div className="pointer-events-none fixed inset-0 z-50">
            {furniture.map((item, index) => {
                const footprint = layout.furniture[item.id]
                if (!footprint) return null

                const isOpening = item.type === 'door' || item.type === 'window'
                const isSelected = selectedId === item.id
                const label = item.label || (item.type === 'imported' ? 'Model' : item.type)

                return (
                    <button
                        key={`${item.id}-${index}`}
                        type="button"
                        aria-label={`Select ${label}`}
                        onPointerDown={(event) => handleFurniturePointerDown(event, item.id)}
                        className={cn(
                            'pointer-events-auto absolute flex items-center justify-center rounded-xl border text-white shadow-[0_12px_30px_rgba(2,6,23,0.35)] backdrop-blur-sm transition',
                            overlayInteractive ? 'cursor-move' : 'pointer-events-none',
                            isOpening
                                ? item.type === 'door'
                                    ? 'bg-orange-400/14 border-orange-300/35'
                                    : 'bg-sky-400/14 border-sky-300/35'
                                : item.type === 'imported'
                                    ? 'bg-cyan-400/14 border-cyan-300/30'
                                    : 'bg-white/[0.08] border-white/15',
                            isSelected && 'ring-2 ring-cyan-300/60 ring-offset-2 ring-offset-slate-950/80'
                        )}
                        style={{
                            left: footprint.x,
                            top: footprint.y,
                            width: footprint.width,
                            height: footprint.height,
                            transform: `translate(-50%, -50%) rotate(${footprint.rotation}deg)`,
                        }}
                    >
                        <span className="rounded-full border border-black/10 bg-slate-950/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80 shadow">
                            {item.type === 'door' ? 'Door' : item.type === 'window' ? 'Window' : label.slice(0, 14)}
                        </span>
                    </button>
                )
            })}

            {labels.map(label => {
                const point = layout.labels[label.id]
                if (!point) return null
                const isSelected = selectedId === label.id

                return (
                    <button
                        key={label.id}
                        type="button"
                        aria-label={`Select label ${label.text}`}
                        onPointerDown={(event) => handleLabelPointerDown(event, label.id)}
                        className={cn(
                            'pointer-events-auto absolute max-w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_12px_30px_rgba(2,6,23,0.35)] backdrop-blur-sm transition',
                            overlayInteractive ? 'cursor-move' : 'pointer-events-none',
                            isSelected
                                ? 'border-amber-300/50 bg-amber-400/18 text-amber-50 ring-2 ring-amber-300/40'
                                : 'border-white/15 bg-slate-950/78 text-white/80 hover:bg-slate-950/88'
                        )}
                        style={{ left: point.x, top: point.y }}
                    >
                        {label.text}
                    </button>
                )
            })}

            {selectedObject && dockPosition && selectedMeta && (
                <div
                    className="absolute pointer-events-auto"
                    style={{
                        left: dockPosition.left,
                        top: dockPosition.top,
                        width: dockWidth,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="relative rounded-[24px] border border-white/10 bg-slate-950/90 p-4 shadow-[0_28px_80px_rgba(2,6,23,0.52)] backdrop-blur-2xl">
                        <div className="absolute left-1/2 top-full h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/10 bg-slate-950/90" />

                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border', selectedMeta.accent)}>
                                        <selectedMeta.icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{selectedMeta.eyebrow}</p>
                                        <p className="truncate text-sm font-semibold text-white">{selectedTitle}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => selectObject(null)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                                aria-label="Close object dock"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            {selectedObject.kind === 'wall' && (
                                <WallDockContent
                                    key={selectedObject.object.id}
                                    wall={selectedObject.object}
                                    onApply={(payload) => {
                                        updateWall(selectedObject.object.id, {
                                            label: payload.label.trim() || undefined,
                                            thickness: clamp(payload.thickness, 0.05, 2),
                                            height: clamp(payload.height, 1.8, 6),
                                        })
                                        saveHistory()
                                    }}
                                    onCalibrate={() => setActiveTool('ruler')}
                                    onJoin={() => setJoinMode(true)}
                                    onDuplicate={duplicateSelected}
                                    onDelete={deleteSelected}
                                />
                            )}

                            {selectedObject.kind === 'room' && (
                                <RoomDockContent
                                    key={selectedObject.object.id}
                                    room={selectedObject.object}
                                    onApply={(payload) => {
                                        updateRoom(selectedObject.object.id, {
                                            name: payload.name.trim() || selectedObject.object.name,
                                            color: payload.color || selectedObject.object.color,
                                        })
                                        saveHistory()
                                    }}
                                    onDuplicate={duplicateSelected}
                                    onDelete={deleteSelected}
                                />
                            )}

                            {selectedObject.kind === 'furniture' && (
                                <FurnitureDockContent
                                    key={selectedObject.object.id}
                                    item={selectedObject.object}
                                    onApply={(payload) => {
                                        updateFurniture(selectedObject.object.id, {
                                            label: payload.label.trim() || undefined,
                                            dimensions: {
                                                width: clamp(payload.width, 0.1, 25),
                                                depth: clamp(payload.depth, 0.05, 25),
                                                height: clamp(payload.height, 0.1, 12),
                                            },
                                        })
                                        saveHistory()
                                    }}
                                    onRotate={rotateSelectedFurniture}
                                    onSwap={(selectedObject.object.type === 'door' || selectedObject.object.type === 'window') ? swapOpeningType : null}
                                    onDuplicate={duplicateSelected}
                                    onDelete={deleteSelected}
                                />
                            )}

                            {selectedObject.kind === 'label' && (
                                <LabelDockContent
                                    key={selectedObject.object.id}
                                    label={selectedObject.object}
                                    onApply={(nextText) => {
                                        updateTextLabel(selectedObject.object.id, { text: nextText.trim() || selectedObject.object.text })
                                        saveHistory()
                                    }}
                                    onDuplicate={duplicateSelected}
                                    onDelete={deleteSelected}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
