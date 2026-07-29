import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, Database, Table2, KeyRound, Link2, Hash, RefreshCw, Plus } from 'lucide-react'

export interface DBColumn {
  name: string
  type: string
  pk?: boolean
  notnull?: boolean
  dflt_value?: string | null
}
export interface DBTable {
  table: string
  columns: DBColumn[]
  fks?: { from: string; table: string; to: string }[]
  indexes?: { name: string; unique: boolean }[]
}

interface SchemaTreeProps {
  schema: DBTable[]
  onTableSelect: (table: string) => void
  selectedTable: string | null
  connName: string
  onRefresh: () => void
  onCreateTableClick?: () => void
  loading: boolean
}

export default function SchemaTree({
  schema, onTableSelect, selectedTable, connName, onRefresh, onCreateTableClick, loading
}: SchemaTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = useCallback((table: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(table)) next.delete(table)
      else next.add(table)
      return next
    })
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--cipher-border)] px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database size={14} className="flex-shrink-0 text-[#60cdff]" />
          <span className="truncate text-[12px] font-semibold text-[var(--cipher-text)]">{connName}</span>
        </div>
        <div className="flex items-center gap-1">
          {onCreateTableClick && (
            <button
              onClick={onCreateTableClick}
              className="flex items-center gap-1 rounded bg-[var(--cipher-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--cipher-accent)] hover:bg-[var(--cipher-accent)]/20 transition-all"
              title="Crear nueva tabla"
            >
              <Plus size={11} /> Tabla
            </button>
          )}
          <button
            onClick={onRefresh}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--cipher-text-muted)] transition-all hover:text-[var(--cipher-text)]"
            title="Refrescar esquema"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto py-1">
        {schema.length === 0 && (
          <div className="px-3 py-4 text-center text-[12px] text-[var(--cipher-text-muted)]">
            {loading ? 'Cargando esquema…' : 'Sin tablas en este esquema'}
          </div>
        )}

        {schema.map(({ table, columns, fks }) => {
          const isExpanded = expanded.has(table)
          const isSelected = selectedTable === table

          return (
            <div key={table}>
              {/* Table row */}
              <div
                className={`flex cursor-pointer items-center gap-1.5 px-2 py-1.5 text-[12px] transition-colors ${
                  isSelected
                    ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)]'
                    : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.04] hover:text-[var(--cipher-text)]'
                }`}
                onClick={() => {
                  onTableSelect(table)
                  if (!isExpanded) toggle(table)
                }}
              >
                <button
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center"
                  onClick={e => { e.stopPropagation(); toggle(table) }}
                >
                  {isExpanded
                    ? <ChevronDown size={11} />
                    : <ChevronRight size={11} />
                  }
                </button>
                <Table2 size={13} className={isSelected ? 'text-[var(--cipher-accent)]' : 'text-[#60cdff]/70'} />
                <span className="truncate font-medium">{table}</span>
                <span className="ml-auto flex-shrink-0 text-[10px] text-[var(--cipher-text-muted)]/60">{columns.length}</span>
              </div>

              {/* Columns */}
              {isExpanded && (
                <div className="ml-7 border-l border-[var(--cipher-border)] pl-2">
                  {columns.map(col => (
                    <div
                      key={col.name}
                      className="flex items-center gap-1.5 py-1 text-[11px] text-[var(--cipher-text-muted)]"
                    >
                      {col.pk
                        ? <KeyRound size={10} className="flex-shrink-0 text-[var(--cipher-status-warn)]" />
                        : col.type.toLowerCase().includes('int') || col.type.toLowerCase().includes('num')
                          ? <Hash size={10} className="flex-shrink-0 text-[#80d8ff]/70" />
                          : <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-[var(--cipher-border)]" />
                      }
                      <span className="truncate">{col.name}</span>
                      <span className="ml-auto flex-shrink-0 text-[9px] text-[var(--cipher-text-muted)]/50 uppercase">{col.type.split('(')[0]}</span>
                    </div>
                  ))}

                  {/* FK references */}
                  {fks && fks.length > 0 && (
                    <div className="mt-0.5 border-t border-[var(--cipher-border)] pt-0.5">
                      {fks.map((fk, i) => (
                        <div key={i} className="flex items-center gap-1.5 py-0.5 text-[10px] text-[#a78bfa]/70">
                          <Link2 size={9} className="flex-shrink-0" />
                          <span className="truncate">{fk.from} → {fk.table}.{fk.to}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
