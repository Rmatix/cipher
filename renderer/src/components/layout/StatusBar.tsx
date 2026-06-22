import { useStore } from '../../store/useStore'
import { AlertCircle, AlertTriangle, FileCode2, GitBranch, Terminal } from 'lucide-react'

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

  const openDebugger = () => setSidebarPanel('debug')

  return (
    <div className="grid h-10 flex-shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-4 text-[12px]">
      <div className="flex min-w-0 items-center gap-5">
        <span className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--cipher-text)] transition-all hover:text-white">
          <GitBranch size={13} />
          {gitBranch}
        </span>

        {/* Errors */}
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

        {/* Warnings */}
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
      </div>

      <div className="flex min-w-0 items-center gap-2 px-6 text-[var(--cipher-text-muted)]">
        <FileCode2 size={13} className="flex-shrink-0" />
        <span className="max-w-[340px] truncate">{activeTab?.name || 'Sin archivo abierto'}</span>
      </div>

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
      </div>
    </div>
  )
}
