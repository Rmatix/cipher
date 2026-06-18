import { useState, useCallback } from 'react'
import {
  Database, Plus, Power, PowerOff, History,
  LayoutPanelLeft, Rows, AlertCircle,
  ChevronDown
} from 'lucide-react'
import SchemaTree, { type DBTable } from './SchemaTree'
import QueryEditor from './QueryEditor'
import ResultsTable from './ResultsTable'
import QueryHistory, { type HistoryEntry } from './QueryHistory'
import ConnectionModal, { type ConnectionParams } from './ConnectionModal'

interface Connection {
  connId: string
  name: string
  type: string
}

type ViewMode = 'split-h' | 'split-v' | 'editor' | 'results'

const VIEW_MODES: { id: ViewMode; label: string; icon: typeof LayoutPanelLeft }[] = [
  { id: 'split-h',  label: 'Horizontal',  icon: Rows     },
  { id: 'split-v',  label: 'Vertical',    icon: LayoutPanelLeft },
  { id: 'editor',   label: 'Solo editor', icon: LayoutPanelLeft },
  { id: 'results',  label: 'Solo tabla',  icon: Rows     },
]

export default function DatabasePanel() {
  // ── Connections ────────────────────────────────────────
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeConn, setActiveConn] = useState<Connection | null>(null)

  // ── Schema ─────────────────────────────────────────────
  const [schema, setSchema] = useState<DBTable[]>([])
  const [schemaLoading, setSchemaLoading] = useState(false)

  // ── Query ──────────────────────────────────────────────
  const [sql, setSql] = useState('')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  // ── Results ────────────────────────────────────────────
  const [resultColumns, setResultColumns] = useState<string[]>([])
  const [resultRows, setResultRows] = useState<Record<string, unknown>[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  // ── History ────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // ── Modal ──────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  // ── View mode ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('split-h')
  const [showViewMenu, setShowViewMenu] = useState(false)

  // ── Handlers ───────────────────────────────────────────
  const loadSchema = useCallback(async (connId: string) => {
    setSchemaLoading(true)
    try {
      const res = await (window as any).cipher.dbSchema({ connId })
      if (res.ok) setSchema(res.schema)
      else setQueryError(res.error)
    } finally {
      setSchemaLoading(false)
    }
  }, [])

  const handleConnect = useCallback(async (params: ConnectionParams) => {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await (window as any).cipher.dbConnect(params)
      if (res.ok) {
        const conn: Connection = { connId: res.connId, name: res.name, type: params.type }
        setConnections(prev => [...prev, conn])
        setActiveConn(conn)
        setShowModal(false)
        await loadSchema(res.connId)
      } else {
        setConnectError(res.error)
      }
    } finally {
      setConnecting(false)
    }
  }, [loadSchema])

  const handleDisconnect = useCallback(async (conn: Connection) => {
    await (window as any).cipher.dbDisconnect({ connId: conn.connId })
    setConnections(prev => prev.filter(c => c.connId !== conn.connId))
    if (activeConn?.connId === conn.connId) {
      const remaining = connections.filter(c => c.connId !== conn.connId)
      const next = remaining[remaining.length - 1] || null
      setActiveConn(next)
      if (next) await loadSchema(next.connId)
      else { setSchema([]); setResultColumns([]); setResultRows([]) }
    }
  }, [activeConn, connections, loadSchema])

  const handleTableSelect = useCallback(async (table: string) => {
    if (!activeConn) return
    setSelectedTable(table)
    const querySql = `SELECT * FROM "${table}" LIMIT 500`
    setSql(querySql)
    await runQuery(querySql, table)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConn])

  const runQuery = useCallback(async (querySql: string, forTable?: string | null) => {
    if (!activeConn) return
    setRunning(true)
    setQueryError(null)
    try {
      const res = await (window as any).cipher.dbQuery({ connId: activeConn.connId, sql: querySql })
      const ok = res.ok
      setHistory(prev => [...prev.slice(-49), {
        sql: querySql,
        elapsed: res.elapsed,
        ok,
        timestamp: Date.now()
      }])
      if (ok) {
        setResultColumns(res.columns || [])
        setResultRows(res.rows || [])
        setElapsed(res.elapsed)
        setSelectedTable(forTable ?? null)
      } else {
        setQueryError(res.error)
        setResultColumns([])
        setResultRows([])
        setElapsed(res.elapsed ?? null)
      }
    } finally {
      setRunning(false)
    }
  }, [activeConn])

  const refreshTable = useCallback(async (table: string) => {
    await runQuery(`SELECT * FROM "${table}" LIMIT 500`, table)
  }, [runQuery])

  // ── Layout helpers ─────────────────────────────────────
  const schemaPanel = (
    <div className="flex h-full flex-col border-r border-[var(--cipher-border)] bg-[var(--cipher-surface)]">
      {/* Connection bar */}
      <div className="border-b border-[var(--cipher-border)] px-2 py-1.5">
        {connections.length === 0 ? (
          <div className="text-center text-[11px] text-[var(--cipher-text-muted)]">Sin conexiones</div>
        ) : (
          <div className="flex flex-col gap-1">
            {connections.map(conn => (
              <div
                key={conn.connId}
                onClick={() => { setActiveConn(conn); loadSchema(conn.connId) }}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] transition-all ${
                  activeConn?.connId === conn.connId
                    ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)]'
                    : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.04]'
                }`}
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                <span className="flex-1 truncate">{conn.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDisconnect(conn) }}
                  className="text-[var(--cipher-text-muted)] transition-colors hover:text-red-400"
                  title="Desconectar"
                >
                  <PowerOff size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schema tree */}
      <div className="flex-1 overflow-hidden">
        {activeConn ? (
          <SchemaTree
            schema={schema}
            onTableSelect={handleTableSelect}
            selectedTable={selectedTable}
            connName={activeConn.name}
            onRefresh={() => loadSchema(activeConn.connId)}
            loading={schemaLoading}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
            <Database size={32} className="text-[var(--cipher-text-muted)]/30" />
            <p className="text-[11px] text-[var(--cipher-text-muted)]">
              Conecta a una base de datos para ver el esquema
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const editorPanel = (
    <div className="flex h-full flex-col overflow-hidden">
      <QueryEditor
        value={sql}
        onChange={setSql}
        onRun={(q) => runQuery(q, selectedTable)}
        running={running}
        elapsed={elapsed}
      />
      {queryError && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={13} />
            <span>{queryError}</span>
          </div>
        </div>
      )}
    </div>
  )

  const resultsPanel = (
    <ResultsTable
      columns={resultColumns}
      rows={resultRows}
      tableName={selectedTable}
      connId={activeConn?.connId ?? null}
      onRefreshTable={refreshTable}
    />
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--cipher-bg)]">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-4 py-2">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[#60cdff]" />
          <span className="text-[13px] font-semibold text-[var(--cipher-text)]">SQL Viewer</span>
        </div>

        <div className="ml-2 h-5 w-px bg-[var(--cipher-border)]" />

        <button
          onClick={() => { setShowModal(true); setConnectError(null) }}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-2.5 py-1 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:border-[#60cdff]/40 hover:text-[#60cdff]"
        >
          <Plus size={12} />
          Nueva Conexión
        </button>

        {connections.length > 0 && (
          <button
            onClick={() => activeConn && handleDisconnect(activeConn)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--cipher-border)] px-2.5 py-1 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:border-red-500/30 hover:text-red-400"
          >
            <Power size={12} />
            Desconectar
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* View mode selector */}
          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--cipher-border)] px-2.5 py-1 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:text-[var(--cipher-text)]"
            >
              <Rows size={12} />
              Vista
              <ChevronDown size={10} className={showViewMenu ? 'rotate-180' : ''} />
            </button>
            {showViewMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] shadow-xl">
                {VIEW_MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setViewMode(m.id); setShowViewMenu(false) }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] first:rounded-t-xl last:rounded-b-xl transition-colors ${
                      viewMode === m.id ? 'text-[var(--cipher-text)] bg-[var(--cipher-accent-bg)]' : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.04] hover:text-[var(--cipher-text)]'
                    }`}
                  >
                    <m.icon size={11} />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] transition-all ${
              showHistory
                ? 'border-[var(--cipher-accent)]/40 bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)]'
                : 'border-[var(--cipher-border)] text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]'
            }`}
          >
            <History size={12} />
            Historial
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Schema sidebar — fixed 220px */}
        <div className="w-[220px] flex-shrink-0">
          {schemaPanel}
        </div>

        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {viewMode === 'split-h' && (
            <>
              <div className="h-[40%] min-h-0 border-b border-[var(--cipher-border)]">
                {editorPanel}
              </div>
              <div className="flex-1 overflow-hidden">
                {resultsPanel}
              </div>
            </>
          )}

          {viewMode === 'split-v' && (
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/2 border-r border-[var(--cipher-border)]">
                {editorPanel}
              </div>
              <div className="flex-1">
                {resultsPanel}
              </div>
            </div>
          )}

          {viewMode === 'editor' && (
            <div className="flex-1 overflow-hidden">
              {editorPanel}
            </div>
          )}

          {viewMode === 'results' && (
            <div className="flex-1 overflow-hidden">
              {resultsPanel}
            </div>
          )}
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="w-[260px] flex-shrink-0 border-l border-[var(--cipher-border)] bg-[var(--cipher-surface)]">
            <QueryHistory
              entries={history}
              onSelect={q => { setSql(q); setShowHistory(false) }}
              onClear={() => setHistory([])}
            />
          </div>
        )}
      </div>

      {/* Connection modal */}
      {showModal && (
        <ConnectionModal
          onConnect={handleConnect}
          onClose={() => setShowModal(false)}
          isConnecting={connecting}
          error={connectError}
        />
      )}
    </div>
  )
}
