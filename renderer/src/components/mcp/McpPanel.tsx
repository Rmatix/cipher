import { useState } from 'react'
import { Plus, Power, PowerOff, Shield, RefreshCw } from 'lucide-react'

interface McpServer {
  id: string
  name: string
  url: string
  status: 'connected' | 'disconnected'
  type: 'stdio' | 'sse'
}

export default function McpPanel() {
  const [servers, setServers] = useState<McpServer[]>([
    { id: 'fs-server', name: 'File System Server', url: 'localhost:8011', status: 'connected', type: 'sse' },
    { id: 'db-server', name: 'SQL Database Server', url: 'localhost:8012', status: 'connected', type: 'sse' },
    { id: 'term-server', name: 'Terminal Execution Server', url: 'localhost:8013', status: 'connected', type: 'sse' }
  ])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newType, setNewType] = useState<'stdio' | 'sse'>('sse')

  const toggleConnection = (id: string) => {
    setServers(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'connected' ? 'disconnected' : 'connected' }
      }
      return s
    }))
  }

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newUrl.trim()) return
    const newServer: McpServer = {
      id: `mcp-${Date.now()}`,
      name: newName.trim(),
      url: newUrl.trim(),
      status: 'connected',
      type: newType
    }
    setServers(prev => [...prev, newServer])
    setNewName('')
    setNewUrl('')
    setShowAddForm(false)
  }

  const handleRefreshAll = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--cipher-bg)] text-[13px]">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-4 py-2 flex-shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cipher-text-muted)]">
          Servidores Conectados ({servers.filter(s => s.status === 'connected').length})
        </span>
        <button
          onClick={handleRefreshAll}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--cipher-text-muted)] hover:text-white transition-colors"
          title="Sincronizar servidores"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection status card */}
        <div className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-green-400 font-medium">
            <Shield size={14} />
            <span>Protocolo Seguro de Contexto</span>
          </div>
          <p className="text-[12px] text-[var(--cipher-text-muted)] leading-relaxed">
            MCP conecta herramientas locales directamente a la sesión del Agente Autónomo con permisos restringidos del Sandbox.
          </p>
        </div>

        {/* Server list */}
        <div className="space-y-2">
          {servers.map(server => (
            <div
              key={server.id}
              className="flex items-center justify-between rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)]/40 p-3 hover:border-[var(--cipher-border-soft)] transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${server.status === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="font-medium text-[var(--cipher-text)] truncate">{server.name}</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--cipher-text-muted)] truncate">{server.url} · {server.type.toUpperCase()}</div>
              </div>

              <button
                onClick={() => toggleConnection(server.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                  server.status === 'connected'
                    ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10'
                    : 'border-[var(--cipher-border)] bg-[var(--cipher-surface)] text-[var(--cipher-text-muted)] hover:text-white'
                }`}
                title={server.status === 'connected' ? 'Desconectar' : 'Conectar'}
              >
                {server.status === 'connected' ? <PowerOff size={13} /> : <Power size={13} />}
              </button>
            </div>
          ))}
        </div>

        {/* Add server button */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--cipher-border)] py-2 text-[12px] text-[var(--cipher-text-muted)] hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)] transition-all"
          >
            <Plus size={13} />
            Conectar Servidor
          </button>
        ) : (
          <form onSubmit={handleAddServer} className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--cipher-border)] pb-2 mb-1">
              <span className="font-semibold text-[12px] text-[var(--cipher-text)]">Nuevo Servidor MCP</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[11px] text-[var(--cipher-text-muted)] hover:text-white"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] text-[var(--cipher-text-muted)]">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Git Server"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="h-8 w-full rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2.5 outline-none focus:border-[var(--cipher-accent)] text-[12px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--cipher-text-muted)]">URL / Comando</label>
                <input
                  type="text"
                  required
                  placeholder="localhost:8080 o npx -y server"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="h-8 w-full rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2.5 outline-none focus:border-[var(--cipher-accent)] text-[12px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[var(--cipher-text-muted)]">Tipo</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="h-8 w-full rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2 outline-none focus:border-[var(--cipher-accent)] text-[12px]"
                >
                  <option value="sse">SSE (HTTP endpoint)</option>
                  <option value="stdio">Stdio (Comando local)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="h-8 w-full rounded bg-[var(--cipher-accent)] text-[12px] font-medium text-white hover:opacity-90 transition-opacity"
            >
              Registrar Servidor
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
