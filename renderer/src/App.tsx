import Titlebar from './components/layout/Titlebar'
import Sidebar from './components/layout/Sidebar'
import Panel from './components/layout/Panel'
import EditorArea from './components/editor/EditorArea'
import StatusBar from './components/layout/StatusBar'
import SplashScreen from './components/layout/SplashScreen'
import CommandPalette from './components/layout/CommandPalette'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore'
import { getLanguage } from './utils/fileUtils'

function parseKeyBinding(keyStr: string) {
  const parts = keyStr.toLowerCase().split('+')
  return {
    ctrl:  parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt:   parts.includes('alt'),
    key:   parts[parts.length - 1],
  }
}

function matchesEvent(e: KeyboardEvent, keyStr: string): boolean {
  const { ctrl, shift, alt, key } = parseKeyBinding(keyStr)
  return (
    e.ctrlKey  === ctrl  &&
    e.shiftKey === shift &&
    e.altKey   === alt   &&
    e.key.toLowerCase() === key
  )
}

// ── Slide-up entrance animation ──────────────────────────
function AppEntrance({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(32px)',
        transition: 'opacity 420ms cubic-bezier(0.16,1,0.3,1), transform 420ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {children}
    </div>
  )
}

// ── Main App Component ───────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(() => localStorage.getItem('cipher-skip-splash') === 'true')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isWindows] = useState(() => navigator.userAgent.toLowerCase().includes('win'))
  const finishSplash = useCallback(() => setSplashDone(true), [])

  useEffect(() => {
    const checkMaximized = async () => {
      if (!window.cipher?.isMaximized) return
      try {
        setIsMaximized(await window.cipher.isMaximized())
      } catch {
        setIsMaximized(false)
      }
    }
    checkMaximized()
    // Listen to real maximize/unmaximize events for reliable UI updates
    const unsubscribe = window.cipher?.onMaximizedChange?.((maximized) => {
      setIsMaximized(maximized)
    }) || (() => {})
    window.addEventListener('resize', checkMaximized)
    return () => {
      window.removeEventListener('resize', checkMaximized)
      unsubscribe()
    }
  }, [])

  const {
    sidebarPanel, setSidebarPanel,
    terminalVisible, setTerminalVisible, bottomPanel, setBottomPanel,
    focusMode, toggleFocusMode,
    keyBindings,
    setCurrentFolder, addTab, setActiveTab
  } = useStore()

  const openPathData = useCallback((data: { folderPath: string; filePath: string | null }) => {
    if (!data) return
    setCurrentFolder(data.folderPath)
    setSidebarPanel('files')
    if (data.filePath) {
      const fileName = data.filePath.split('\\').pop()?.split('/').pop() || 'Archivo'
      addTab({
        path: data.filePath,
        name: fileName,
        language: getLanguage(fileName),
        modified: false
      })
      setActiveTab(data.filePath)
    }
  }, [setCurrentFolder, setSidebarPanel, addTab, setActiveTab])

  // Startup path checking, profile query, and second-instance events
  const { setAppProfile, setCipherProduct } = useStore()

  useEffect(() => {
    // Query installer registry profile
    window.cipher?.getAppProfile?.().then((profile) => {
      if (profile) setAppProfile(profile)
    })

    // Query specific cipher product variant (lite, dev, studio)
    window.cipher?.getCipherProduct?.().then((product) => {
      if (product) setCipherProduct(product)
    })

    window.cipher?.getStartupPath?.().then((data) => {
      if (data) {
        // Delay slightly to let layout/editor mount
        setTimeout(() => openPathData(data), 250)
      }
    })

    if (window.cipher?.onOpenPathRequest) {
      const unsubscribe = window.cipher.onOpenPathRequest((data) => {
        openPathData(data)
      })
      return unsubscribe
    }
  }, [openPathData, setAppProfile, setCipherProduct])

  const stateRef = useRef({ sidebarPanel, terminalVisible, bottomPanel, focusMode })
  useEffect(() => {
    stateRef.current = { sidebarPanel, terminalVisible, bottomPanel, focusMode }
  }, [sidebarPanel, terminalVisible, bottomPanel, focusMode])

  // Escape to exit focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current.focusMode) toggleFocusMode()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFocusMode])

  // Dynamic keybinding system
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      for (const kb of keyBindings) {
        if (!matchesEvent(e, kb.currentKey)) continue
        e.preventDefault()
        const { sidebarPanel, terminalVisible, bottomPanel } = stateRef.current
        switch (kb.action) {
          case 'cipher-save-active':         window.dispatchEvent(new Event('cipher-save-active')); break
          case 'cipher-format-active':       window.dispatchEvent(new Event('cipher-format-active')); break
          case 'cipher-command-palette':     setCommandPaletteOpen(true); break
          case 'cipher-panel-files':         setSidebarPanel(sidebarPanel === 'files'  ? null : 'files');  break
          case 'cipher-panel-ai':            setSidebarPanel(sidebarPanel === 'ai'     ? null : 'ai');     break
          case 'cipher-panel-debug':         setSidebarPanel(sidebarPanel === 'debug'  ? null : 'debug');  break
          case 'cipher-panel-memory':        setSidebarPanel(sidebarPanel === 'memory' ? null : 'memory'); break
          case 'cipher-toggle-terminal':
            if (!terminalVisible) {
              setBottomPanel('terminal')
              setTerminalVisible(true)
            } else if (bottomPanel !== 'terminal') {
              setBottomPanel('terminal')
            } else {
              setTerminalVisible(false)
            }
            break
          case 'cipher-toggle-focus':        toggleFocusMode(); break
          case 'cipher-toggle-ai-completion': window.dispatchEvent(new Event('cipher-toggle-ai-completion')); break
        }
        break
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [keyBindings, setSidebarPanel, setTerminalVisible, setBottomPanel, toggleFocusMode])

  // Legacy events
  useEffect(() => {
    const openPalette    = () => setCommandPaletteOpen(true)
    const toggleExplorer = () => setSidebarPanel(stateRef.current.sidebarPanel === 'files' ? null : 'files')
    const toggleTerminal = () => {
      const { terminalVisible, bottomPanel } = stateRef.current
      if (!terminalVisible) {
        setBottomPanel('terminal')
        setTerminalVisible(true)
      } else if (bottomPanel !== 'terminal') {
        setBottomPanel('terminal')
      } else {
        setTerminalVisible(false)
      }
    }
    window.addEventListener('cipher-command-palette', openPalette)
    window.addEventListener('cipher-toggle-explorer', toggleExplorer)
    window.addEventListener('cipher-toggle-terminal', toggleTerminal)
    return () => {
      window.removeEventListener('cipher-command-palette', openPalette)
      window.removeEventListener('cipher-toggle-explorer', toggleExplorer)
      window.removeEventListener('cipher-toggle-terminal', toggleTerminal)
    }
  }, [setSidebarPanel, setTerminalVisible, setBottomPanel])

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--cipher-bg)] text-[var(--cipher-text)]"
      style={{
        // Inset content when the window is floating (restored) so the rounded
        // border has breathing room; fill everything when maximized.
        padding: (!isMaximized && isWindows) ? '8px' : '0px',
        borderRadius: isMaximized ? '0px' : '12px',
        border: isMaximized ? 'none' : '1px solid rgba(255, 255, 255, 0.085)',
      }}
    >
      <AppEntrance>
        {/* Elementos que se ocultan en focus mode */}
        {!focusMode && <Titlebar />}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {!focusMode && <Sidebar />}
          {!focusMode && <Panel />}
          <EditorArea />
        </div>
        {!focusMode && <StatusBar />}
        
        {commandPaletteOpen && <CommandPalette onClose={() => setCommandPaletteOpen(false)} />}
        {focusMode && <FocusModeHint />}
      </AppEntrance>
      {!splashDone && <SplashScreen onDone={finishSplash} />}
    </div>
  )
}

// ── Focus mode hint ───────────────────────────────────────
function FocusModeHint() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="cipher-fade-up flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-[var(--cipher-surface)]/90 px-4 py-2.5 text-[12px] text-[var(--cipher-muted-blue)] shadow-2xl backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--cipher-violet)]" />
        Modo enfoque activo
        <kbd className="rounded border border-white/[0.1] bg-white/[0.06] px-2 py-0.5 text-[11px]">Esc</kbd>
        para salir
      </div>
    </div>
  )
}
