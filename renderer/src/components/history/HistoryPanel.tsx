import { Clock, RotateCcw, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getLanguage } from '../../utils/fileUtils'
import FileIcon from '../shared/FileIcon'

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export default function HistoryPanel() {
  const {
    changeHistory,
    activeTabPath,
    tabs,
    addTab,
    setActiveTab,
    clearAllHistory,
    clearFileHistory,
  } = useStore()

  const sorted = [...changeHistory].sort((a, b) => b.savedAt - a.savedAt)

  const restoreSnapshot = (filePath: string, content: string) => {
    const entry = sorted.find(item => item.filePath === filePath)
    if (entry && !tabs.some(tab => tab.path === filePath)) {
      addTab({
        path: filePath,
        name: entry.fileName,
        language: getLanguage(entry.fileName),
        modified: false,
      })
    }
    setActiveTab(filePath)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cipher-restore-snapshot', {
        detail: { path: filePath, content },
      }))
    }, 50)
  }

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-[#7f8bb0]">
          <Clock size={22} strokeWidth={1.7} />
        </div>
        <p className="text-[13px] leading-6 text-[#7e8bae]">
          Todavia no hay cambios guardados para restaurar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <span className="text-[12px] text-[#7e8bae]">{sorted.length} snapshots</span>
        <button
          onClick={clearAllHistory}
          className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:bg-[var(--cipher-status-err)]/12 hover:text-[var(--cipher-status-err)]"
          title="Limpiar historial"
        >
          <Trash2 size={13} />
          Limpiar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {sorted.map((entry) => {
          const isActive = entry.filePath === activeTabPath
          return (
            <div
              key={entry.id}
              className={`mb-2 rounded-lg border px-3 py-3 transition-all ${
                isActive
                  ? 'border-[var(--cipher-violet)]/28 bg-[var(--cipher-violet)]/8'
                  : 'border-white/[0.06] bg-white/[0.025] hover:border-white/[0.1] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <FileIcon fileName={entry.fileName} size={16} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#dce4ff]">{entry.fileName}</p>
                  <p className="mt-1 text-[11px] text-[#6f7a9d]">{formatTime(entry.savedAt)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => restoreSnapshot(entry.filePath, entry.snapshot)}
                  className="flex h-8 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--cipher-violet)]/16 px-3 text-[12px] text-[var(--cipher-violet-text)] transition-all hover:bg-[var(--cipher-violet)]/24 hover:text-white"
                >
                  <RotateCcw size={13} />
                  Restaurar
                </button>
                <button
                  onClick={() => clearFileHistory(entry.filePath)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] transition-all hover:bg-[var(--cipher-status-err)]/12 hover:text-[var(--cipher-status-err)]"
                  title="Limpiar historial de este archivo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
