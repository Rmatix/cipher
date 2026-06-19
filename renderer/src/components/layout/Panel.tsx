import { useEffect, useState, useRef } from 'react'
import { useStore } from '../../store/useStore'
import FileExplorer from '../sidebar/FileExplorer'
import SearchPanel from '../sidebar/SearchPanel'
import GitPanel from '../sidebar/GitPanel'
import AIPanel from '../ai/AIPanel'
import MemoryPanel from '../memory/MemoryPanel'
import AIDebugger from '../debug/AIDebugger'
import HistoryPanel from '../history/HistoryPanel'
import NotesPanel from '../notes/NotesPanel'
import WorkflowsPanel from '../workflows/WorkflowsPanel'
import SettingsPanel from '../settings/SettingsPanel'
import DatabasePanel from '../database/DatabasePanel'
import McpPanel from '../mcp/McpPanel'

export default function Panel() {
  const { sidebarPanel } = useStore()
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('cipher-panel-width')
    return saved ? parseInt(saved, 10) : 384
  })

  // Database panel gets more space
  const panelWidth = sidebarPanel === 'database' ? Math.max(width, 700) : width

  const isResizing = useRef(false)
  const widthRef = useRef(width)

  useEffect(() => {
    widthRef.current = width
  }, [width])

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      // The Sidebar is 64px (w-16) wide, so panel width is clientX - 64px
      const newWidth = Math.max(260, Math.min(600, e.clientX - 64))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        localStorage.setItem('cipher-panel-width', String(widthRef.current))
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const titles: Record<string, string> = {
    files:    'EXPLORADOR',
    search:   'BUSCAR',
    git:      'CONTROL DE VERSIONES',
    ai:       'AGENTE IA',
    memory:   'MEMORIA DEL PROYECTO',
    debug:    'DEBUGGER IA',
    history:  'HISTORIAL DE CAMBIOS',
    notes:    'NOTAS',
    workflows:'WORKFLOWS (BETA)',
    database: 'SQL VIEWER',
    settings: 'CONFIGURACION',
    mcp:      'INFRAESTRUCTURA MCP',
  }

  return (
    <div 
      className="cipher-panel-enter relative flex flex-shrink-0 flex-col overflow-hidden border-r border-[var(--cipher-border)] bg-[var(--cipher-surface)]"
      style={{ 
        width: sidebarPanel ? `${panelWidth}px` : '0px',
        display: sidebarPanel ? 'flex' : 'none'
      }}
    >
      <div className="flex-shrink-0 border-b border-[var(--cipher-border)] px-6 py-5 text-[12px] font-semibold tracking-[0.22em] text-[var(--cipher-text-muted)]">
        {sidebarPanel ? (titles[sidebarPanel] ?? sidebarPanel.toUpperCase()) : ''}
      </div>
      <div className="flex-1 overflow-hidden min-h-0 relative">
        <div style={{ display: sidebarPanel === 'files' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <FileExplorer />
        </div>
        <div style={{ display: sidebarPanel === 'search' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <SearchPanel />
        </div>
        <div style={{ display: sidebarPanel === 'git' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <GitPanel />
        </div>
        <div style={{ display: sidebarPanel === 'ai' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <AIPanel />
        </div>
        <div style={{ display: sidebarPanel === 'mcp' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <McpPanel />
        </div>
        <div style={{ display: sidebarPanel === 'memory' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <MemoryPanel />
        </div>
        <div style={{ display: sidebarPanel === 'debug' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <AIDebugger />
        </div>
        <div style={{ display: sidebarPanel === 'history' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <HistoryPanel />
        </div>
        <div style={{ display: sidebarPanel === 'notes' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <NotesPanel />
        </div>
        <div style={{ display: sidebarPanel === 'workflows' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <WorkflowsPanel />
        </div>
        <div style={{ display: sidebarPanel === 'database' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <DatabasePanel />
        </div>
        <div style={{ display: sidebarPanel === 'settings' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <SettingsPanel />
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startResize}
        className="absolute bottom-0 right-0 top-0 z-50 w-[4px] cursor-col-resize transition-colors hover:bg-[var(--cipher-accent-soft)]"
      />
    </div>
  )
}
