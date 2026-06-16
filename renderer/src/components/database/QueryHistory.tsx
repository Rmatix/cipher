import { Clock, Play, X } from 'lucide-react'

export interface HistoryEntry {
  sql: string
  elapsed?: number
  ok: boolean
  timestamp: number
}

interface QueryHistoryProps {
  entries: HistoryEntry[]
  onSelect: (sql: string) => void
  onClear: () => void
}

export default function QueryHistory({ entries, onSelect, onClear }: QueryHistoryProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--cipher-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-[var(--cipher-text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--cipher-text)]">Historial</span>
        </div>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-[var(--cipher-text-muted)] transition-colors hover:text-red-400"
          >
            <X size={10} /> Limpiar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 && (
          <div className="px-3 py-4 text-center text-[11px] text-[var(--cipher-text-muted)]">
            Aún no hay consultas ejecutadas
          </div>
        )}
        {[...entries].reverse().map((entry, i) => (
          <div
            key={i}
            onClick={() => onSelect(entry.sql)}
            className="group cursor-pointer border-b border-[var(--cipher-border)]/50 px-3 py-2 transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${entry.ok ? 'bg-green-500' : 'bg-red-500'}`} />
              <pre className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-[var(--cipher-text-muted)] group-hover:text-[var(--cipher-text)]">
                {entry.sql.replace(/\s+/g, ' ').trim()}
              </pre>
              <div className="flex flex-shrink-0 items-center gap-2 text-[10px] text-[var(--cipher-text-muted)]">
                {entry.elapsed != null && <span>{entry.elapsed}ms</span>}
                <Play size={9} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--cipher-accent)]" />
              </div>
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--cipher-text-muted)]/50">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
