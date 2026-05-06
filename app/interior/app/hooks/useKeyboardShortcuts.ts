'use client'

import { useEffect } from 'react'
import { useFloorplanStore } from '@/store/floorplanStore'

export function useKeyboardShortcuts() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if user is typing in an input
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

            const store = useFloorplanStore.getState()
            // Skip shortcuts in 3D mode
            if (store.mode === '3d') return

            const ctrl = e.ctrlKey || e.metaKey

            // Ctrl combos
            if (ctrl) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault()
                        if (e.shiftKey) store.redo()
                        else store.undo()
                        return
                    case 'y':
                        e.preventDefault()
                        store.redo()
                        return
                    case 'd':
                        e.preventDefault()
                        store.copyObject()
                        store.pasteObject()
                        return
                }
                return
            }

            // Single key shortcuts
            switch (e.key.toLowerCase()) {
                case 'v':
                    store.setActiveTool('select')
                    break
                case 'm':
                    store.setActiveTool('move')
                    break
                case 'w':
                    store.setActiveTool('wall')
                    break
                case 'f':
                    store.setActiveTool('floor')
                    break
                case 'd':
                    store.addFurniture('door', { x: 0, y: 0 })
                    store.setActiveTool('select')
                    break
                case 'i':
                    store.addFurniture('window', { x: 0, y: 0 })
                    store.setActiveTool('select')
                    break
                case 'c':
                    store.setActiveTool(store.activeTool === 'ruler' ? 'select' : 'ruler')
                    break
                case 'l':
                    store.setActiveTool('label')
                    break
                case 'r':
                    if (store.selectedId) {
                        const furn = store.furniture.find(f => f.id === store.selectedId)
                        if (furn) {
                            const current = furn.rotation?.y || 0
                            store.updateFurniture(store.selectedId, {
                                rotation: { ...furn.rotation, y: current + Math.PI / 2 }
                            })
                        }
                    }
                    break
                case 's':
                    store.setActiveTool('resize')
                    break
                case 'j':
                    if (store.selectedId && store.walls.some(w => w.id === store.selectedId)) {
                        store.setJoinMode(true)
                    }
                    break
                case 'escape':
                    store.setActiveTool('select')
                    store.selectObject(null)
                    break
                case 'delete':
                case 'backspace':
                    if (store.selectedId) {
                        store.deleteObject(store.selectedId)
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])
}
