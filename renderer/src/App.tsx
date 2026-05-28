import Titlebar from './components/layout/Titlebar'
import Sidebar from './components/layout/Sidebar'
import Panel from './components/layout/Panel'
import EditorArea from './components/editor/EditorArea'
import StatusBar from './components/layout/StatusBar'
import SplashScreen from './components/layout/SplashScreen'
import CommandPalette from './components/layout/CommandPalette'
import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'


export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { sidebarPanel, setSidebarPanel, terminalVisible, setTerminalVisible, setBottomPanel } = useStore()

  useEffect(() => {
    const openPalette = () => setCommandPaletteOpen(true)
    const toggleExplorer = () => setSidebarPanel(sidebarPanel === 'files' ? null : 'files')
    const toggleTerminal = () => {
      setBottomPanel('terminal')
      setTerminalVisible(!terminalVisible)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        window.dispatchEvent(new Event('cipher-toggle-explorer'))
      }
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault()
        window.dispatchEvent(new Event('cipher-toggle-terminal'))
      }
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        window.dispatchEvent(new Event('cipher-save-active'))
      }
    }

    window.addEventListener('cipher-command-palette', openPalette)
    window.addEventListener('cipher-toggle-explorer', toggleExplorer)
    window.addEventListener('cipher-toggle-terminal', toggleTerminal)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('cipher-command-palette', openPalette)
      window.removeEventListener('cipher-toggle-explorer', toggleExplorer)
      window.removeEventListener('cipher-toggle-terminal', toggleTerminal)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setSidebarPanel, setTerminalVisible, setBottomPanel, sidebarPanel, terminalVisible])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#080a12]">
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      {splashDone && (
        <>
          <Titlebar />
          <div className="flex flex-1 overflow-hidden min-h-0">
            <Sidebar />
            <Panel />
            <EditorArea />
          </div>
          <StatusBar />
          {commandPaletteOpen && <CommandPalette onClose={() => setCommandPaletteOpen(false)} />}
        </>
      )}
    </div>
  )
}
