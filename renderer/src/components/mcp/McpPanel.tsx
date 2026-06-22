import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Power, PowerOff, Shield, RefreshCw,
  Loader2, ChevronDown, ChevronRight, Trash2, Wrench, X, AlertCircle,
} from 'lucide-react'
import type { McpServerStatus, McpServerConfig, McpTool } from '../../types/electron'

export default function McpPanel() {
  const [servers, setServers] = useState<McpServerStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const [toolsByServer, setToolsByServer] = useState<Record<string, McpTool[]>>({})

  // Form state
  const [newName, setNewName] = useState('')
  const [newTransport, setNewTransport] = useState<'sse' | 'stdio'>('sse')
  const [newUrl, setNewUrl] = useState('')
  const [newCommand, setNewCommand] = useState('')
  const [newArgs, setNewArgs] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; toolCount: number } | null>(null)

  const refreshList = useCallback(async () => {
    try {
      const list = await window.cipher.mcpListServers()
      setServers(list)
    } catch {
      setServers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + subscribe to status updates
  useEffect(() => {
    refreshList()
    const unsubscribe = window.cipher.onMcpServerStatus((snapshot) => {
      setServers(snapshot)
    })
    return unsubscribe
  }, [refreshList])

  const connectedCount = servers.filter(s => s.status === 'connected').length

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    if (newTransport === 'sse' && !newUrl.trim()) return
    if (newTransport === 'stdio' && !newCommand.trim()) return

    const config: McpServerConfig = {
      name: newName.trim(),
      transport: newTransport,
      url: newUrl.trim() || undefined,
      command: newCommand.trim() || undefined,
      args: newArgs.trim() ? newArgs.trim().split(/\s+/) : [],
      autoStart: true,
    }

    await window.cipher.mcpAddServer(config)
    setNewName('')
    setNewUrl('')
    setNewCommand('')
    setNewArgs('')
    setTestResult(null)
    setShowAddForm(false)
    refreshList()
    // Auto-connect after adding
    setTimeout(() => {
      window.cipher.mcpListServers().then(list => {
        const added = list.find(s => s.name === config.name)
        if (added) window.cipher.mcpConnect(added.id)
      })
    }, 200)
  }

  const handleTestServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newTransport === 'sse' && !newUrl.trim()) return
    if (newTransport === 'stdio' && !newCommand.trim()) return

    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.cipher.mcpTestServer({
        name: newName.trim() || 'Test',
        transport: newTransport,
        url: newUrl.trim() || undefined,
        command: newCommand.trim() || undefined,
        args: newArgs.trim() ? newArgs.trim().split(/\s+/) : [],
      })
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, error: 'Error al probar el servidor', toolCount: 0 })
    } finally {
      setTesting(false)
    }
  }

  const handleToggle = async (id: string, currentStatus: string) => {
    if (currentStatus === 'connected' || currentStatus === 'connecting') {
      await window.cipher.mcpDisconnect(id)
    } else {
      await window.cipher.mcpConnect(id)
    }
    refreshList()
  }

  const handleRemove = async (id: string) => {
    await window.cipher.mcpRemoveServer(id)
    refreshList()
  }

  const handleExpand = async (id: string) => {
    if (expandedServer === id) {
      setExpandedServer(null)
      return
    }
    setExpandedServer(id)
    const server = servers.find(s => s.id === id)
    if (server?.status === 'connected' && !toolsByServer[id]) {
      try {
        const tools = await window.cipher.mcpListTools(id)
        setToolsByServer(prev => ({ ...prev, [id]: tools }))
      } catch {
        setToolsByServer(prev => ({ ...prev, [id]: [] }))
      }
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--cipher-bg)] text-[13px]">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-4 py-2 flex-shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cipher-text-muted)]">
          Servidores ({connectedCount}/{servers.length} conectados)
        </span>
        <button
          onClick={refreshList}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--cipher-text-muted)] hover:text-white transition-colors"
          title="Actualizar lista"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Connection status card */}
        <div className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-[var(--cipher-accent)] font-medium">
            <Shield size={14} />
            <span>Model Context Protocol</span>
          </div>
          <p className="text-[12px] text-[var(--cipher-text-muted)] leading-relaxed">
            Conecta herramientas externas (sistemas de archivos, bases de datos, APIs) al Agente Autónomo mediante servidores MCP Stdio y SSE.
          </p>
        </div>

        {/* Server list */}
        {servers.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-[var(--cipher-border)] py-8 text-center text-[12px] text-[var(--cipher-text-muted)]">
            No hay servidores MCP configurados.
          </div>
        ) : (
          servers.map(server => {
            const isExpanded = expandedServer === server.id
            const tools = toolsByServer[server.id] || []
            return (
              <div
                key={server.id}
                className="rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)]/40 transition-colors hover:border-[var(--cipher-border-soft)]"
              >
                <div className="flex items-center justify-between p-3">
                  <button
                    onClick={() => server.status === 'connected' && handleExpand(server.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    disabled={server.status !== 'connected'}
                  >
                    {server.status === 'connected' ? (
                      isExpanded ? <ChevronDown size={13} className="text-[var(--cipher-text-muted)]" /> : <ChevronRight size={13} className="text-[var(--cipher-text-muted)]" />
                    ) : (
                      <span className="w-[13px]" />
                    )}
                    <StatusDot status={server.status} />
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--cipher-text)] truncate">{server.name}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--cipher-text-muted)] truncate">
                        {server.transport === 'stdio' ? (server.command || 'stdio') : (server.url || 'sse')} · {server.transport.toUpperCase()}
                        {server.status === 'connected' && ` · ${server.toolCount} tools`}
                        {server.status === 'error' && server.error && ` · ${server.error}`}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(server.id, server.status)}
                      disabled={server.status === 'connecting'}
                      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-all disabled:opacity-50 ${
                        server.status === 'connected'
                          ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10'
                          : 'border-[var(--cipher-border)] bg-[var(--cipher-surface)] text-[var(--cipher-text-muted)] hover:text-white'
                      }`}
                      title={server.status === 'connected' ? 'Desconectar' : 'Conectar'}
                    >
                      {server.status === 'connecting'
                        ? <Loader2 size={12} className="animate-spin" />
                        : server.status === 'connected' ? <PowerOff size={12} /> : <Power size={12} />}
                    </button>
                    <button
                      onClick={() => handleRemove(server.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cipher-text-muted)] hover:text-red-400 transition-colors"
                      title="Eliminar servidor"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Tools explorer */}
                {isExpanded && server.status === 'connected' && (
                  <div className="border-t border-[var(--cipher-border)] px-3 py-2 space-y-1">
                    <div className="flex items-center gap-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--cipher-text-muted)]">
                      <Wrench size={11} />
                      Herramientas ({tools.length})
                    </div>
                    {tools.length === 0 ? (
                      <div className="text-[11px] text-[var(--cipher-text-muted)] italic py-1">Este servidor no expone herramientas.</div>
                    ) : (
                      tools.map(tool => (
                        <div key={tool.name} className="rounded-md px-2 py-1.5 hover:bg-[var(--cipher-surface-alt)] transition-colors">
                          <div className="font-mono text-[11px] font-medium text-[var(--cipher-text)]">{tool.name}</div>
                          {tool.description && (
                            <div className="mt-0.5 text-[11px] text-[var(--cipher-text-muted)] leading-snug">{tool.description}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Add server button / form */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--cipher-border)] py-2.5 text-[12px] text-[var(--cipher-text-muted)] hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)] transition-all"
          >
            <Plus size={13} />
            Conectar Servidor MCP
          </button>
        ) : (
          <form onSubmit={handleAddServer} className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--cipher-border)] pb-2 mb-1">
              <span className="font-semibold text-[12px] text-[var(--cipher-text)]">Nuevo Servidor MCP</span>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setTestResult(null) }}
                className="text-[var(--cipher-text-muted)] hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--cipher-text-muted)]">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="ej. File System Server"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="h-8 w-full rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2.5 outline-none focus:border-[var(--cipher-accent)] text-[12px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--cipher-text-muted)]">Tipo de transporte</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTransport('sse')}
                    className={`flex-1 h-8 rounded border text-[11px] transition-all ${
                      newTransport === 'sse'
                        ? 'border-[var(--cipher-accent)] bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)]'
                        : 'border-[var(--cipher-border)] bg-[var(--cipher-bg)] text-[var(--cipher-text-muted)] hover:text-white'
                    }`}
                  >
                    SSE (HTTP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTransport('stdio')}
                    className={`flex-1 h-8 rounded border text-[11px] transition-all ${
                      newTransport === 'stdio'
                        ? 'border-[var(--cipher-accent)] bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)]'
                        : 'border-[var(--cipher-border)] bg-[var(--cipher-bg)] text-[var(--cipher-text-muted)] hover:text-white'
                    }`}
                  >
                    Stdio (comando local)
                  </button>
                </div>
              </div>

              {newTransport === 'sse' ? (
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--cipher-text-muted)]">URL del servidor (endpoint /mcp)</label>
                  <input
                    type="text"
                    required
                    placeholder="http://localhost:8011"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    className="h-8 w-full rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2.5 outline-none focus:border-[var(--cipher-accent)] text-[12px]"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[var(--cipher-text-muted)]">Comando</label>
                    <input
                      type="text"
                      required
                      placeholder="npx -y @modelcontextprotocol/server-filesystem"
                      value={newCommand}
                      onChange={e => setNewCommand(e.target.value)}
                      className="h-8 w-full rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2.5 outline-none focus:border-[var(--cipher-accent)] text-[12px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[var(--cipher-text-muted)]">Argumentos (separados por espacio)</label>
                    <input
                      type="text"
                      placeholder="/ruta/al/directorio"
                      value={newArgs}
                      onChange={e => setNewArgs(e.target.value)}
                      className="h-8 w-full rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2.5 outline-none focus:border-[var(--cipher-accent)] text-[12px]"
                    />
                  </div>
                </>
              )}
            </div>

            {testResult && (
              <div className={`flex items-start gap-2 rounded-lg p-2 text-[11px] ${
                testResult.ok
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {testResult.ok
                  ? <Shield size={12} className="mt-0.5 flex-shrink-0" />
                  : <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />}
                <span>
                  {testResult.ok
                    ? `Conexión exitosa — ${testResult.toolCount} herramienta${testResult.toolCount !== 1 ? 's' : ''} detectada${testResult.toolCount !== 1 ? 's' : ''}.`
                    : `Error: ${testResult.error}`}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestServer}
                disabled={testing}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[12px] text-[var(--cipher-text-muted)] transition-all hover:text-white disabled:opacity-50"
              >
                {testing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Probar
              </button>
              <button
                type="submit"
                className="flex h-8 flex-[2] items-center justify-center rounded bg-[var(--cipher-accent)] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Registrar Servidor
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Status indicator ───────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'connected' ? 'bg-green-400' :
    status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
    status === 'error' ? 'bg-red-400' :
    'bg-gray-500'
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
}
