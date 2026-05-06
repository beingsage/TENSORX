'use client'

import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFloorplanStore } from '@/modules/valuation-interior/store/floorplanStore'

type FurnAIAssetManifest = {
    version?: number
    run_id?: string
    updated_at?: string
    items?: Record<
        string,
        {
            item_id?: string
            category?: string
            job_id?: string
            glb?: string
            pose_px?: { x_px: number; y_px: number } | null
            updated_at?: string
        }
    >
}

// AssetInstance removed since items are now handled by ImportedModelsManager via the unified Store

export function FurnAIAssetsManager() {
    const mode = useFloorplanStore(s => s.mode)
    const currentRunId = useFloorplanStore(s => s.currentRunId)
    const token = useFloorplanStore(s => s.token)
    const pxToM = useFloorplanStore(s => s.calibrationFactor)
    const furniture = useFloorplanStore(s => s.furniture)
    const importFurnAiModel = useFloorplanStore(s => s.importFurnAiModel)

    const [manifest, setManifest] = useState<FurnAIAssetManifest | null>(null)
    const [offsetPx, setOffsetPx] = useState<{ x: number; y: number } | null>(null)

    useEffect(() => {
        const runId = currentRunId
        if (!runId || mode !== '3d') {
            setManifest(null)
            setOffsetPx(null)
            return
        }

        let cancelled = false
            ; (async () => {
                try {
                    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

                    const [mRes, svgRes] = await Promise.all([
                        fetch(`/api/runs/${runId}/furniture/assets`, { headers }),
                        fetch(`/api/runs/${runId}/svg`, { headers }),
                    ])

                    if (!mRes.ok) throw new Error(`manifest ${mRes.status}`)
                    if (!svgRes.ok) throw new Error(`svg ${svgRes.status}`)

                    const mJson = await mRes.json()
                    const m = (mJson?.manifest || null) as FurnAIAssetManifest | null

                    const svgText = await svgRes.text()
                    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
                    const svgEl = doc.querySelector('svg')
                    const vb = svgEl?.getAttribute('viewBox')
                    let ox = 0
                    let oy = 0
                    if (vb) {
                        const parts = vb
                            .split(/[\s,]+/)
                            .map(p => parseFloat(p))
                            .filter(n => !isNaN(n))
                        if (parts.length === 4) {
                            ox = parts[0] + parts[2] / 2
                            oy = parts[1] + parts[3] / 2
                        }
                    }

                    if (cancelled) return
                    setManifest(m)
                    setOffsetPx({ x: ox, y: oy })

                    // Automatically inject missing models into the Store
                    const items = m?.items || {}
                    for (const [key, it] of Object.entries(items)) {
                        const rel = (it?.glb || '').trim()
                        if (!rel) continue

                        const pose = it?.pose_px
                        if (!pose) continue
                        
                        // Check if this AI item was already injected into our store
                        const alreadyExists = useFloorplanStore.getState().furniture.some(f => f.furnAiId === key)
                        if (alreadyExists) continue

                        // Add to store
                        importFurnAiModel({
                            id: `furn_ai_${key.substring(0, 8)}`,
                            furnAiId: key,
                            type: it?.category || 'imported',
                            modelUrl: rel, // Let ImportedModelsManager handle the fetching
                            position: {
                                x: (pose.x_px - ox) * pxToM,
                                y: (pose.y_px - oy) * pxToM
                            },
                            label: `AI ${it?.category || 'Model'}`
                        })
                    }

                } catch (e) {
                    console.error('[FurnAIAssetsManager] Failed to load assets', e)
                    if (!cancelled) {
                        setManifest(null)
                        setOffsetPx(null)
                    }
                }
            })()

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentRunId, mode, pxToM, token, importFurnAiModel, furniture])

    // Headless syncer, rendering handled by ImportedModelsManager + FurnitureManager
    return null
}
