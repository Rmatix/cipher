import { useStore } from '../../store/useStore'
import { AlertCircle, AlertTriangle, FileCode2, GitBranch, Terminal, Clock, Save } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

export default function StatusBar() {
  const {
    gitBranch,
    terminalVisible,
    setTerminalVisible,
    setBottomPanel,
    setSidebarPanel,
    tabs,
    activeTabPath,
    editorMarkers,
  } = useStore()

  const activeTab = tabs.find(t => t.path === activeTabPath)
  const errors   = editorMarkers.filter(m => m.severity === 8).length
  const warnings = editorMarkers.filter(m => m.severity === 4).length

  // ── Live clock ──────────────────────────────────────────────────
  const [time, setTime] = useState(() => {
    const now = new Date()
    return now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    }
    const id = setInterval(tick, 10_000) // update every 10s is enough for HH:MM
    return () => clearInterval(id)
  }, [])

  // ── Save flash indicator ─────────────────────────────────────────
  const [saveFlash, setSaveFlash] = useState(false)
  const handleSave = useCallback(() => {
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1400)
  }, [])

  useEffect(() => {
    window.addEventListener('cipher-save-active', handleSave)
    return () => window.removeEventListener('cipher-save-active', handleSave)
  }, [handleSave])

  const openDebugger = () => setSidebarPanel('debug')

  return (
    <div className="grid h-10 flex-shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-4 text-[12px]">
      {/* ── Left: branch, errors, warnings ── */}
      <div className="flex min-w-0 items-center gap-5">
        <span className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--cipher-text)] transition-all hover:text-white">
          <GitBranch size={13} />
          {gitBranch}
        </span>

        <button
          onClick={openDebugger}
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] transition-all ${
            errors > 0
              ? 'text-[var(--cipher-status-err)] hover:bg-[var(--cipher-status-err)]/10'
              : 'text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]'
          }`}
        >
          <AlertCircle size={12} />
          {errors}
        </button>

        <button
          onClick={openDebugger}
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] transition-all ${
            warnings > 0
              ? 'text-[var(--cipher-status-warn)] hover:bg-[var(--cipher-status-warn)]/10'
              : 'text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]'
          }`}
        >
          <AlertTriangle size={12} />
          {warnings}
        </button>

        {/* Save flash indicator */}
        {saveFlash && (
          <span className="save-flash flex items-center gap-1 text-[var(--cipher-status-ok)] text-[11px]">
            <Save size={11} />
            Guardado
          </span>
        )}
      </div>

      {/* ── Center: active file ── */}
      <div className="flex min-w-0 items-center gap-2 px-6 text-[var(--cipher-text-muted)]">
        <FileCode2 size={13} className="flex-shrink-0" />
        <span className="max-w-[340px] truncate">{activeTab?.name || 'Sin archivo abierto'}</span>
      </div>

      {/* ── Right: terminal, lang, encoding, clock ── */}
      <div className="flex min-w-0 items-center justify-end gap-5">
        <button
          onClick={() => {
            setBottomPanel('terminal')
            setTerminalVisible(!terminalVisible)
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-all ${
            terminalVisible ? 'bg-[var(--cipher-accent-bg)] text-white' : 'text-[var(--cipher-text)] hover:text-white'
          }`}
        >
          <Terminal size={13} />
          Terminal
        </button>
        <span className="text-[12px] text-[var(--cipher-text)]">{activeTab?.language || 'Texto'}</span>
        <span className="text-[12px] text-[var(--cipher-text)]">UTF-8</span>

        {/* Live clock */}
        <span className="flex items-center gap-1 text-[12px] text-[var(--cipher-text-muted)]">
          <Clock size={11} />
          {time}
        </span>
      </div>
    </div>
  )
}
