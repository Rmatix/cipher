import { useState } from 'react'
import { Database, X, ChevronDown } from 'lucide-react'

interface ConnectionModalProps {
  onConnect: (params: ConnectionParams) => Promise<void>
  onClose: () => void
  isConnecting: boolean
  error: string | null
}

export interface ConnectionParams {
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mssql'
  filePath?: string
  host?: string
  port?: number
  database?: string
  user?: string
  password?: string
}

const DB_TYPES = [
  { value: 'sqlite',     label: 'SQLite',      icon: '🗃️', desc: 'Archivo local .db / .sqlite' },
  { value: 'postgresql', label: 'PostgreSQL',   icon: '🐘', desc: 'Servidor PostgreSQL' },
  { value: 'mysql',      label: 'MySQL/MariaDB',icon: '🐬', desc: 'Servidor MySQL o MariaDB' },
  { value: 'mssql',      label: 'SQL Server',   icon: '🏢', desc: 'Microsoft SQL Server' },
] as const

export default function ConnectionModal({ onConnect, onClose, isConnecting, error }: ConnectionModalProps) {
  const [type, setType] = useState<ConnectionParams['type']>('sqlite')
  const [filePath, setFilePath] = useState('')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('')
  const [database, setDatabase] = useState('')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  const currentType = DB_TYPES.find(t => t.value === type)!

  const handleBrowse = async () => {
    // Open file dialog via IPC
    const result = await (window as any).cipher.openFolder?.()
    if (result) setFilePath(result)
  }

  const handleConnect = async () => {
    const params: ConnectionParams = type === 'sqlite'
      ? { type, filePath }
      : { type, host, port: port ? parseInt(port) : undefined, database, user, password }
    await onConnect(params)
  }

  const inputCls = 'w-full rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 py-2 text-[13px] text-[var(--cipher-text)] outline-none transition-all focus:border-[var(--cipher-accent)] focus:ring-1 focus:ring-[var(--cipher-accent)]/20 placeholder:text-[var(--cipher-text-muted)]/60'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cipher-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#60cdff]/10">
              <Database size={18} className="text-[#60cdff]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--cipher-text)]">Nueva Conexión</h2>
              <p className="text-[11px] text-[var(--cipher-text-muted)]">Conectar a una base de datos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-[var(--cipher-text)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Type selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">
              Tipo de Base de Datos
            </label>
            <div className="relative">
              <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="flex w-full items-center gap-3 rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 py-2.5 text-left transition-all hover:border-[var(--cipher-accent)]/50"
              >
                <span className="text-[16px]">{currentType.icon}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[var(--cipher-text)]">{currentType.label}</div>
                  <div className="text-[11px] text-[var(--cipher-text-muted)]">{currentType.desc}</div>
                </div>
                <ChevronDown size={14} className={`text-[var(--cipher-text-muted)] transition-transform ${showTypeMenu ? 'rotate-180' : ''}`} />
              </button>

              {showTypeMenu && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] shadow-xl">
                  {DB_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setType(t.value as any); setShowTypeMenu(false) }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all first:rounded-t-xl last:rounded-b-xl ${
                        type === t.value ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)]' : 'hover:bg-white/[0.04] text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]'
                      }`}
                    >
                      <span className="text-[16px]">{t.icon}</span>
                      <div>
                        <div className="text-[13px] font-medium">{t.label}</div>
                        <div className="text-[11px] opacity-60">{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SQLite fields */}
          {type === 'sqlite' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">
                Archivo de Base de Datos
              </label>
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="/ruta/al/archivo.db"
                  value={filePath}
                  onChange={e => setFilePath(e.target.value)}
                />
                <button
                  onClick={handleBrowse}
                  className="rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 py-2 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)]/50 hover:text-[var(--cipher-text)]"
                >
                  Buscar
                </button>
              </div>
            </div>
          )}

          {/* Network DB fields */}
          {type !== 'sqlite' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">Host</label>
                  <input className={inputCls} placeholder="localhost" value={host} onChange={e => setHost(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">Puerto</label>
                  <input
                    className={inputCls}
                    placeholder={type === 'postgresql' ? '5432' : type === 'mssql' ? '1433' : '3306'}
                    value={port}
                    onChange={e => setPort(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">Base de Datos</label>
                <input className={inputCls} placeholder="mi_base_de_datos" value={database} onChange={e => setDatabase(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">Usuario</label>
                  <input className={inputCls} placeholder="postgres" value={user} onChange={e => setUser(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">Contraseña</label>
                  <input className={inputCls} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--cipher-border)] py-2.5 text-[13px] text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.04]"
            >
              Cancelar
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting || (type === 'sqlite' ? !filePath.trim() : !database.trim())}
              className="flex-1 rounded-xl bg-[#60cdff] py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-[#60cdff]/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConnecting ? 'Conectando…' : 'Conectar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
