// @ts-nocheck
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { FloatingUpgradeCard } from '@/components/layout/FloatingUpgradeCard'
import { PremiumModal } from '@/components/layout/PremiumModal'
import { FurnAIProcessingModal } from '@/components/layout/FurnAIProcessingModal'
import { FurnAIQueueModal } from '@/components/layout/FurnAIQueueModal'
import { GlobalToast } from '@/components/layout/GlobalToast'
import { WelcomeScreen } from '@/components/layout/WelcomeScreen'
import { FloatingToolbar } from '@/components/layout/FloatingToolbar'
import { ContextToolbar } from '@/components/layout/ContextToolbar'
import { ReferenceOverlay } from '@/components/editor/ReferenceOverlay'
import { TutorialOverlay } from '@/components/editor/TutorialOverlay'
import { EditorWalkthroughModal } from '@/components/layout/EditorWalkthroughModal'
import { ProcessingStatusDock } from '@/components/layout/ProcessingStatusDock'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useFloorplanStore } from '@/store/floorplanStore'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Box,
  CircleHelp,
  FolderOpen,
  LayoutGrid,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react'

// Blueprint3D Room Designer - imported dynamically to avoid SSR issues
const RoomDesignerEmbedded = dynamic(
  () => import('@/components/editor/RoomDesignerEmbedded').then((mod) => mod.RoomDesignerEmbedded),
  { ssr: false, loading: () => <div className="flex items-center justify-center w-full h-full bg-slate-900">Loading 3D Editor...</div> }
)
const Scene = dynamic(
  () => import('@/components/editor/Scene').then((mod) => mod.Scene),
  { ssr: false }
)
const RenderGallery = dynamic(
  () => import('@/components/editor/RenderGallery').then((mod) => mod.RenderGallery),
  { ssr: false }
)

interface AppProps {
  template?: string
}

type DockSide = 'left' | 'right'

function App({ template: _template }: AppProps) {
  void _template
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const templateQuery = searchParams.get('template')
  const currentView = useMemo(() => {
    if (pathname === '/editor' || templateQuery) return 'editor'
    return null
  }, [pathname, templateQuery])

  const isEditorFlow = currentView === 'editor'

  useKeyboardShortcuts()
  const showProcessingModal = useFloorplanStore(s => s.showProcessingModal)
  const showQueueModal = useFloorplanStore(s => s.showQueueModal)
  const setShowQueueModal = useFloorplanStore(s => s.setShowQueueModal)
  const projectsModalOpen = useFloorplanStore(s => s.projectsModalOpen)
  const setProjectsModalOpen = useFloorplanStore(s => s.setProjectsModalOpen)
  const resetFloorplan = useFloorplanStore(s => s.resetFloorplan)
  const setUploadedImage = useFloorplanStore(s => s.setUploadedImage)
  const setCalibrationFactor = useFloorplanStore(s => s.setCalibrationFactor)
  const setMode = useFloorplanStore(s => s.setMode)
  const mode = useFloorplanStore(s => s.mode)
  const glbPreviewSource = useFloorplanStore(s => s.glbPreviewSource)
  const mobileSidebarOpen = useFloorplanStore(s => s.mobileSidebarOpen)
  const mobileRightSidebarOpen = useFloorplanStore(s => s.mobileRightSidebarOpen)
  const setMobileSidebarOpen = useFloorplanStore(s => s.setMobileSidebarOpen)
  const setMobileRightSidebarOpen = useFloorplanStore(s => s.setMobileRightSidebarOpen)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showUpgradeCard, setShowUpgradeCard] = useState(true)
  const [showWelcome, setShowWelcome] = useState(!isEditorFlow)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [leftDockExpanded, setLeftDockExpanded] = useState(false)
  const [rightDockExpanded, setRightDockExpanded] = useState(false)
  const showLiveScenePreview = mode === '3d' && glbPreviewSource === 'none'
  const dockTimersRef = useRef<Record<DockSide, number | null>>({
    left: null,
    right: null,
  })

  useEffect(() => {
    if (isEditorFlow) {
      setShowWelcome(false)
    }
  }, [isEditorFlow])

  useEffect(() => {
    if (!templateQuery || templateQuery === 'blank') {
      if (templateQuery === 'blank') {
        resetFloorplan()
        setMode('2d')
      }
      return
    }

    let canceled = false

    import('@/lib/templateService').then(({ loadTemplateDetail }) => {
      if (canceled) return
      loadTemplateDetail(templateQuery).then((detail) => {
        if (!canceled && detail?.thumbnail) {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            setUploadedImage(detail.thumbnail, img.naturalWidth, img.naturalHeight)
            setCalibrationFactor(0.05)
            setMode('2d')
          }
          img.onerror = (err) => {
            console.warn('Could not load template background image:', err)
          }
          img.src = detail.thumbnail
        }
      })
    }).catch((err) => {
      console.warn('Could not load template details:', err)
    })

    return () => {
      canceled = true
    }
  }, [templateQuery, resetFloorplan, setUploadedImage, setCalibrationFactor, setMode])

  useEffect(() => {
    if (!isEditorFlow) {
      setMobileSidebarOpen(false)
      setMobileRightSidebarOpen(false)
    }
  }, [isEditorFlow, setMobileRightSidebarOpen, setMobileSidebarOpen])

  const clearDockTimer = (side: DockSide) => {
    const timer = dockTimersRef.current[side]
    if (timer) {
      window.clearTimeout(timer)
      dockTimersRef.current[side] = null
    }
  }

  const setDockOpenState = (side: DockSide, open: boolean) => {
    if (side === 'left') {
      setLeftDockExpanded(open)
    } else {
      setRightDockExpanded(open)
    }
  }

  const openDock = (side: DockSide) => {
    clearDockTimer(side)
    const otherSide: DockSide = side === 'left' ? 'right' : 'left'
    clearDockTimer(otherSide)
    setDockOpenState(otherSide, false)
    setDockOpenState(side, true)
  }

  const toggleDock = (side: DockSide) => {
    const isOpen = side === 'left' ? leftDockExpanded : rightDockExpanded
    if (isOpen) {
      clearDockTimer(side)
      setDockOpenState(side, false)
      return
    }
    openDock(side)
  }

  const scheduleDockClose = (side: DockSide, delay = 5000) => {
    clearDockTimer(side)
    dockTimersRef.current[side] = window.setTimeout(() => {
      setDockOpenState(side, false)
      dockTimersRef.current[side] = null
    }, delay)
  }

  const collapseDocks = () => {
    clearDockTimer('left')
    clearDockTimer('right')
    setLeftDockExpanded(false)
    setRightDockExpanded(false)
  }

  useEffect(() => {
    return () => {
      clearDockTimer('left')
      clearDockTimer('right')
    }
  }, [])

  const leftRailItems = [
    {
      key: 'tools',
      label: 'Tools',
      icon: PanelLeftOpen,
      action: () => toggleDock('left'),
      active: leftDockExpanded,
    },
    {
      key: 'draw',
      label: 'Draw And Edit',
      icon: Plus,
      action: () => openDock('left'),
      active: false,
    },
    {
      key: 'rooms',
      label: 'Floorplan Tools',
      icon: LayoutGrid,
      action: () => openDock('left'),
      active: false,
    },
    {
      key: 'assets',
      label: 'Assets And Furn AI',
      icon: Sparkles,
      action: () => openDock('left'),
      active: false,
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      action: () => {
        collapseDocks()
        setProjectsModalOpen(true)
      },
      active: projectsModalOpen,
    },
  ]

  const rightRailItems = [
    {
      key: 'inspect',
      label: 'Inspect',
      icon: PanelRightOpen,
      action: () => toggleDock('right'),
      active: rightDockExpanded,
    },
    {
      key: 'selection',
      label: 'Selection',
      icon: SlidersHorizontal,
      action: () => openDock('right'),
      active: false,
    },
    {
      key: 'preview',
      label: '3D Preview',
      icon: Box,
      action: () => openDock('right'),
      active: false,
    },
    {
      key: 'segment',
      label: 'Segmentation',
      icon: Wand2,
      action: () => openDock('right'),
      active: false,
    },
  ]

  const editorShell = (
    <>
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      <EditorWalkthroughModal open={showWalkthrough} onClose={() => setShowWalkthrough(false)} />
      <GlobalToast />
      <Topbar />
      <div className="relative flex flex-1 overflow-hidden">
        <button
          type="button"
          aria-label="Close editor panels"
          className={cn(
            "absolute inset-0 z-30 bg-slate-950/55 opacity-0 backdrop-blur-sm transition xl:hidden",
            (mobileSidebarOpen || mobileRightSidebarOpen) ? "pointer-events-auto opacity-100" : "pointer-events-none"
          )}
          onClick={() => {
            setMobileSidebarOpen(false)
            setMobileRightSidebarOpen(false)
          }}
        />

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-30">
          <div
            className="pointer-events-auto absolute left-4 top-24 hidden xl:block"
            onMouseEnter={() => openDock('left')}
            onMouseLeave={() => scheduleDockClose('left')}
          >
            <div className={cn(
              "flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-slate-950/84 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl transition",
              leftDockExpanded && "border-cyan-400/20 bg-slate-950/92"
            )}>
              {leftRailItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.key} className="group relative">
                    <button
                      type="button"
                      title={item.label}
                      aria-label={item.label}
                      aria-pressed={item.active}
                      onClick={item.action}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border text-slate-300 transition",
                        item.active
                          ? "border-cyan-400/25 bg-cyan-400/12 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                          : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                    <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900/95 px-2.5 py-1.5 text-xs font-medium text-slate-100 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                      {item.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div
            className="pointer-events-auto absolute right-4 top-24 hidden xl:block"
            onMouseEnter={() => openDock('right')}
            onMouseLeave={() => scheduleDockClose('right')}
          >
            <div className={cn(
              "flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-slate-950/84 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl transition",
              rightDockExpanded && "border-cyan-400/20 bg-slate-950/92"
            )}>
              {rightRailItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.key} className="group relative">
                    <button
                      type="button"
                      title={item.label}
                      aria-label={item.label}
                      aria-pressed={item.active}
                      onClick={item.action}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border text-slate-300 transition",
                        item.active
                          ? "border-cyan-400/25 bg-cyan-400/12 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                          : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                    <div className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900/95 px-2.5 py-1.5 text-xs font-medium text-slate-100 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                      {item.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <Sidebar
          onLogout={() => {
            collapseDocks()
            setProjectsModalOpen(false)
            setShowWelcome(true)
          }}
          desktopExpanded={leftDockExpanded}
          onDesktopHoverStart={() => openDock('left')}
          onDesktopHoverEnd={() => scheduleDockClose('left')}
        />

        <div className="relative flex-1 min-w-0 overflow-hidden px-3 pb-3 pt-3 xl:px-4 xl:pb-4 xl:pt-4">
          <div className="relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.92),rgba(2,6,23,0.98)_65%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(2,6,23,0.75))] shadow-[0_35px_120px_rgba(2,6,23,0.55)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-slate-950/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-slate-950/60 to-transparent" />

            <div
              className="relative h-full overflow-hidden"
              tabIndex={-1}
              onPointerDownCapture={collapseDocks}
              onFocusCapture={collapseDocks}
            >
              <button
                type="button"
                onClick={() => setShowWalkthrough(true)}
                className="absolute left-5 bottom-5 z-30 inline-flex items-center gap-3 rounded-[22px] border border-white/10 bg-slate-950/78 px-3 py-2.5 text-left text-slate-100 shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-xl transition hover:bg-slate-950/88"
                aria-label="Open editor walkthrough"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <Image src="/logo.png" alt="Strukt AI walkthrough" width={20} height={20} className="h-5 w-5 object-contain" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/80">Walkthrough</p>
                  <p className="text-sm font-semibold text-white">Editor guide</p>
                </div>
                <CircleHelp className="h-4 w-4 text-slate-400" />
              </button>

              <ProcessingStatusDock />

              {!showLiveScenePreview ? (
                <div className="h-full w-full">
                  <RoomDesignerEmbedded />
                </div>
              ) : (
                <div className="absolute inset-0 z-20">
                  <Scene embedOverlays={false} />
                </div>
              )}
              <ReferenceOverlay />
              <TutorialOverlay />
              <FloatingToolbar />
              <ContextToolbar />

              {showUpgradeCard && (
                <FloatingUpgradeCard
                  className="bottom-5 left-5 right-auto"
                  onUpgrade={() => setShowPremiumModal(true)}
                  onClose={() => setShowUpgradeCard(false)}
                />
              )}
            </div>
          </div>
        </div>

        <RightSidebar
          desktopExpanded={rightDockExpanded}
          onDesktopHoverStart={() => openDock('right')}
          onDesktopHoverEnd={() => scheduleDockClose('right')}
        />
      </div>
      <RenderGallery />

      <FurnAIProcessingModal isOpen={showProcessingModal} />
      <FurnAIQueueModal isOpen={showQueueModal} onClose={() => setShowQueueModal(false)} />
    </>
  )


  if (isEditorFlow) {
    return (
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.75),rgba(2,6,23,1)_58%)] text-foreground">
        {editorShell}
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.75),rgba(2,6,23,1)_58%)] text-foreground">
      {/* Welcome Screen */}
      {showWelcome && (
        <WelcomeScreen onStart={() => setShowWelcome(false)} />
      )}

      {/* Editor - always rendered after welcome */}
      {!showWelcome && (
        <>
          {editorShell}
        </>
      )}
    </div>
  )
}

export default App
