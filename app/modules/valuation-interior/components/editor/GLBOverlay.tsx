'use client'

import { useEffect, useState } from 'react'
import { ThreeGlbViewer } from '@/components/ValuationResults/ThreeGlbViewer'
import { useFloorplanStore } from '@/modules/valuation-interior/store/floorplanStore'

const TEST_GLB_URL = '/test/floorplan-20260331_134956_970900.glb'

function stageErrorMessage(status: number, fallback: string) {
  if (status === 401 || status === 403) {
    return 'Login expired. Sign in again to preview the generated GLB.'
  }
  if (status === 404) {
    return 'Generated GLB is not ready yet. Generate it once from the GLB export action, then preview it here.'
  }
  return fallback
}

export function GLBOverlay() {
  const glbPreviewSource = useFloorplanStore(s => s.glbPreviewSource)
  const currentRunId = useFloorplanStore(s => s.currentRunId)
  const runStatus = useFloorplanStore(s => s.runStatus)
  const token = useFloorplanStore(s => s.token)

  const [assetUrl, setAssetUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (glbPreviewSource === 'none') {
      setAssetUrl(null)
      setError(null)
      setLoading(false)
      return
    }

    if (glbPreviewSource === 'test') {
      setAssetUrl(TEST_GLB_URL)
      setError(null)
      setLoading(false)
      return
    }

    if (!currentRunId) {
      setAssetUrl(null)
      setError('No processed floorplan is available yet.')
      setLoading(false)
      return
    }

    if (runStatus === 'processing') {
      setAssetUrl(null)
      setLoading(true)
      setError(null)
      return
    }

    let active = true
    let objectUrl: string | null = null

    const loadGeneratedGlb = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/runs/${currentRunId}/download/glb?t=${Date.now()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!response.ok) {
          const fallback = (await response.text().catch(() => 'Failed to load generated GLB.')) || 'Failed to load generated GLB.'
          throw new Error(stageErrorMessage(response.status, fallback))
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!active) {
          URL.revokeObjectURL(objectUrl)
          return
        }

        setAssetUrl(objectUrl)
      } catch (err) {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Failed to load generated GLB.'
        setAssetUrl(null)
        setError(message)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadGeneratedGlb()

    return () => {
      active = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [currentRunId, glbPreviewSource, token, runStatus])

  const previewLabel = glbPreviewSource === 'generated' ? 'Generated GLB' : 'Test GLB'
  const previewHint =
    glbPreviewSource === 'generated'
      ? 'Generated floorplan mesh rendered with the same staged viewer as the reference asset.'
      : 'Reference test asset for checking camera feel, materials, and mesh readability.'

  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-[28px] bg-slate-950/92">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,6,23,0.94))]" />
      <ThreeGlbViewer
        url={assetUrl}
        background="#020617"
        badgeLabel={previewLabel}
        title="Unified GLB preview stage"
        hint={previewHint}
        loading={loading}
        error={error}
        showGrid
        autoRotate={false}
      />
    </div>
  )
}
