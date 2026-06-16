import { useState, useCallback, useRef } from 'react'
import {
  ChevronUp, ChevronDown, Download, Plus, Trash2,
  Save, X, AlertCircle, CheckCircle2
} from 'lucide-react'

interface ResultsTableProps {
  columns: string[]
  rows: Record<string, unknown>[]
  tableName: string | null
  connId: string | null
  onRefreshTable: (table: string) => void
}

interface EditState {
  rowIdx: number
  col: string
  value: string
}

interface PendingRow {
  data: Record<string, string>
}

export default function ResultsTable({ columns, rows, tableName, connId, onRefreshTable }: ResultsTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [pendingEdits, setPendingEdits] = useState<Record<string, Record<string, unknown>>>({})
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [addingRow, setAddingRow] = useState<PendingRow | null>(null)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 100
  const inputRef = useRef<HTMLInputElement>(null)

  const showStatus = useCallback((ok: boolean, msg: string) => {
    setStatus({ ok, msg })
    setTimeout(() => setStatus(null), 3000)
  }, [])

  // ── Sorting ────────────────────────────────────────────
  const sortedRows = [...rows].sort((a, b) => {
    if (!sortCol) return 0
    const av = a[sortCol], bv = b[sortCol]
    if (av == null) return 1
    if (bv == null) return -1
    const res = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortAsc ? res : -res
  })

  const pageRows = sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE)

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
    setPage(0)
  }

  // ── Inline edit ────────────────────────────────────────
  const startEdit = (rowIdx: number, col: string, currentVal: unknown) => {
    setEditing({ rowIdx, col, value: currentVal == null ? '' : String(currentVal) })
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = () => {
    if (!editing) return
    const key = String(editing.rowIdx)
    setPendingEdits(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [editing.col]: editing.value }
    }))
    setEditing(null)
  }

  const cancelEdit = () => setEditing(null)

  // ── Save row edits ─────────────────────────────────────
  const saveRowEdits = async (rowIdx: number) => {
    const key = String(rowIdx)
    const changes = pendingEdits[key]
    if (!changes || !tableName || !connId) return

    const originalRow = rows[rowIdx]
    // Use first column as primary key for WHERE clause (best-effort)
    const rowKey: Record<string, unknown> = {}
    if (columns[0]) rowKey[columns[0]] = originalRow[columns[0]]

    const result = await (window as any).cipher.dbUpdateRow({ connId, table: tableName, rowKey, changes })
    if (result.ok) {
      setPendingEdits(prev => { const n = { ...prev }; delete n[key]; return n })
      showStatus(true, 'Fila actualizada correctamente')
      onRefreshTable(tableName)
    } else {
      showStatus(false, result.error)
    }
  }

  const discardRowEdits = (rowIdx: number) => {
    const key = String(rowIdx)
    setPendingEdits(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  // ── Delete rows ────────────────────────────────────────
  const deleteSelectedRows = async () => {
    if (!tableName || !connId || selectedRows.size === 0) return
    for (const rowIdx of selectedRows) {
      const row = rows[rowIdx]
      const rowKey: Record<string, unknown> = {}
      if (columns[0]) rowKey[columns[0]] = row[columns[0]]
      await (window as any).cipher.dbDeleteRow({ connId, table: tableName, rowKey })
    }
    setSelectedRows(new Set())
    showStatus(true, `${selectedRows.size} fila(s) eliminada(s)`)
    if (tableName) onRefreshTable(tableName)
  }

  // ── Add row ────────────────────────────────────────────
  const startAddRow = () => {
    const emptyRow: Record<string, string> = {}
    columns.forEach(c => emptyRow[c] = '')
    setAddingRow({ data: emptyRow })
  }

  const saveNewRow = async () => {
    if (!addingRow || !tableName || !connId) return
    const result = await (window as any).cipher.dbInsertRow({ connId, table: tableName, row: addingRow.data })
    if (result.ok) {
      setAddingRow(null)
      showStatus(true, 'Fila insertada correctamente')
      onRefreshTable(tableName)
    } else {
      showStatus(false, result.error)
    }
  }

  // ── Export CSV ─────────────────────────────────────────
  const exportCsv = () => {
    const header = columns.join(',')
    const body = rows.map(row => columns.map(c => JSON.stringify(row[c] ?? '')).join(',')).join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${tableName || 'query'}_export.csv`
    a.click()
  }

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-[var(--cipher-text-muted)]">
        Ejecuta una consulta SQL para ver resultados aquí
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-3 py-1.5">
        <span className="text-[11px] text-[var(--cipher-text-muted)]">
          {rows.length} filas {totalPages > 1 && `· Página ${page + 1}/${totalPages}`}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {tableName && connId && (
            <>
              <button
                onClick={startAddRow}
                className="flex items-center gap-1 rounded border border-[var(--cipher-border)] px-2 py-0.5 text-[11px] text-[var(--cipher-text-muted)] transition-all hover:border-green-500/50 hover:text-green-400"
              >
                <Plus size={10} /> Fila
              </button>
              {selectedRows.size > 0 && (
                <button
                  onClick={deleteSelectedRows}
                  className="flex items-center gap-1 rounded border border-red-500/30 px-2 py-0.5 text-[11px] text-red-400 transition-all hover:border-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={10} /> Eliminar ({selectedRows.size})
                </button>
              )}
            </>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 rounded border border-[var(--cipher-border)] px-2 py-0.5 text-[11px] text-[var(--cipher-text-muted)] transition-all hover:text-[var(--cipher-text)]"
          >
            <Download size={10} /> CSV
          </button>
        </div>

        {/* Status toast */}
        {status && (
          <div className={`flex items-center gap-1.5 text-[11px] ${status.ok ? 'text-green-400' : 'text-red-400'}`}>
            {status.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {status.msg}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 z-10 bg-[var(--cipher-surface)]">
            <tr>
              {tableName && connId && (
                <th className="w-6 border-b border-[var(--cipher-border)] px-2 py-2" />
              )}
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="cursor-pointer select-none border-b border-[var(--cipher-border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--cipher-text-muted)] transition-colors hover:text-[var(--cipher-text)]"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortCol === col && (
                      sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                    )}
                  </div>
                </th>
              ))}
              {tableName && connId && (
                <th className="w-20 border-b border-[var(--cipher-border)] px-2 py-2 text-center text-[11px] text-[var(--cipher-text-muted)]">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* New row input */}
            {addingRow && (
              <tr className="bg-green-500/5">
                {tableName && connId && <td className="px-2" />}
                {columns.map(col => (
                  <td key={col} className="border-b border-[var(--cipher-border)] px-1 py-0.5">
                    <input
                      type="text"
                      value={addingRow.data[col]}
                      onChange={e => setAddingRow(prev => prev ? {
                        data: { ...prev.data, [col]: e.target.value }
                      } : null)}
                      className="w-full rounded bg-green-500/10 px-2 py-1 text-[12px] text-[var(--cipher-text)] outline-none ring-1 ring-green-500/30 focus:ring-green-500"
                      placeholder={col}
                    />
                  </td>
                ))}
                <td className="border-b border-[var(--cipher-border)] px-2 py-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={saveNewRow} className="text-green-400 hover:text-green-300" title="Guardar">
                      <Save size={12} />
                    </button>
                    <button onClick={() => setAddingRow(null)} className="text-red-400 hover:text-red-300" title="Cancelar">
                      <X size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {pageRows.map((row, rowIdx) => {
              const absoluteIdx = page * PAGE_SIZE + rowIdx
              const hasPendingEdits = !!pendingEdits[String(absoluteIdx)]
              const isSelected = selectedRows.has(absoluteIdx)

              return (
                <tr
                  key={rowIdx}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-[var(--cipher-accent-bg)]'
                      : hasPendingEdits
                        ? 'bg-yellow-500/5'
                        : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Checkbox */}
                  {tableName && connId && (
                    <td className="border-b border-[var(--cipher-border)] px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          setSelectedRows(prev => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(absoluteIdx)
                            else next.delete(absoluteIdx)
                            return next
                          })
                        }}
                        className="h-3 w-3 cursor-pointer accent-[var(--cipher-accent)]"
                      />
                    </td>
                  )}

                  {columns.map(col => {
                    const val = pendingEdits[String(absoluteIdx)]?.[col] ?? row[col]
                    const isEditingThis = editing?.rowIdx === absoluteIdx && editing?.col === col
                    const isPendingThis = !!pendingEdits[String(absoluteIdx)]?.[col]

                    return (
                      <td
                        key={col}
                        onDoubleClick={() => tableName && connId && startEdit(absoluteIdx, col, val)}
                        className={`max-w-48 cursor-text border-b border-[var(--cipher-border)] px-3 py-1.5 ${
                          isPendingThis ? 'text-yellow-300' : 'text-[var(--cipher-text)]'
                        }`}
                      >
                        {isEditingThis ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editing!.value}
                            onChange={e => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={commitEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            className="w-full rounded bg-[var(--cipher-surface-alt)] px-1.5 py-0.5 text-[12px] text-[var(--cipher-text)] outline-none ring-1 ring-[var(--cipher-accent)]"
                          />
                        ) : (
                          <span className="block truncate text-[12px]">
                            {val == null
                              ? <span className="italic text-[var(--cipher-text-muted)]/50">NULL</span>
                              : String(val)
                            }
                          </span>
                        )}
                      </td>
                    )
                  })}

                  {/* Row actions */}
                  {tableName && connId && (
                    <td className="border-b border-[var(--cipher-border)] px-2 py-1.5 text-center">
                      {hasPendingEdits ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveRowEdits(absoluteIdx)}
                            className="text-green-400 transition-colors hover:text-green-300"
                            title="Guardar"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={() => discardRowEdits(absoluteIdx)}
                            className="text-red-400 transition-colors hover:text-red-300"
                            title="Descartar"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-[var(--cipher-border)] px-3 py-1.5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded px-2 py-0.5 text-[11px] text-[var(--cipher-text-muted)] transition-all hover:text-[var(--cipher-text)] disabled:opacity-30"
          >
            ← Anterior
          </button>
          <span className="text-[11px] text-[var(--cipher-text-muted)]">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded px-2 py-0.5 text-[11px] text-[var(--cipher-text-muted)] transition-all hover:text-[var(--cipher-text)] disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
