import { useState } from 'react'
import { Database, X, ChevronDown } from 'lucide-react'

interface ConnectionModalProps {
  onConnect: (params: ConnectionParams) => Promise<void>
  onClose: () => void
  isConnecting: boolean
  error: string | null
}

export interface ConnectionParams {
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mssql' | 'docker'
  dockerEngine?: 'postgresql' | 'mysql' | 'mssql'
  containerName?: string
  filePath?: string
  host?: string
  port?: number
  database?: string
  user?: string
  password?: string
}

// ── SVG original logos instead of emojis ────────────────
const SqliteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#003B57]">
    <path d="M12 2C7.58 2 4 3.34 4 5V19C4 20.66 7.58 22 12 22C16.42 22 20 20.66 20 19V5C20 3.34 16.42 2 12 2Z" fill="#003B57" fillOpacity="0.1" />
    <path d="M12 2C7.58 2 4 3.34 4 5C4 6.66 7.58 8 12 8C16.42 8 20 6.66 20 5C20 3.34 16.42 2 12 2Z" stroke="#0f80cc" strokeWidth="1.8" />
    <path d="M4 5V12C4 13.66 7.58 15 12 15C16.42 15 20 13.66 20 12V5" stroke="#0f80cc" strokeWidth="1.8" />
    <path d="M4 12V19C4 20.66 7.58 22 12 22C16.42 22 20 20.66 20 19V12" stroke="#0f80cc" strokeWidth="1.8" />
    <path d="M8 5C8 5.55 9.79 6 12 6C14.21 6 16 5.55 16 5" stroke="#33a6ff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const PostgresqlIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#336791]">
    <path d="M8 4C6.5 4 4 5.5 4 8c0 4.5 4 7 7 8 0 0-1.5 2-1.5 3h3c0-1 1-3 1.5-3 .5 0 1.5 2 1.5 3h3c0-1-1.5-3-1.5-3 3-1 7-3.5 7-8 0-2.5-2.5-4-4-4H8Z" fill="#336791" fillOpacity="0.15" stroke="#336791" strokeWidth="1.8" />
    <path d="M8 8c0 .8-.5 1.5-1.5 1.5S5 8.8 5 8" stroke="#336791" strokeWidth="1.5" />
    <path d="M16 8c0 .8.5 1.5 1.5 1.5S19 8.8 19 8" stroke="#336791" strokeWidth="1.5" />
    <path d="M12 4v7" stroke="#336791" strokeWidth="1.5" />
  </svg>
)

const MysqlIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#00758F]">
    <path d="M4 14c2-5 6-8 11-8 2 0 4 .5 5 1.5C18 7.5 16 9 14 10c-3 1.5-5 4-6 7-.5 1.5-1 3.5-1 4.5C6 19.5 4.5 17 4 14Z" fill="#00758F" fillOpacity="0.15" stroke="#00758F" strokeWidth="1.8" />
    <circle cx="16" cy="8" r="1.5" fill="#F29111" stroke="none" />
    <path d="M9 16c2.5-.5 5-2 6-4.5" stroke="#00758F" strokeWidth="1.5" />
  </svg>
)

const MssqlIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#CC292B]">
    <path d="M12 3c-4.42 0-8 1.12-8 2.5S7.58 8 12 8s8-1.12 8-2.5S16.42 3 12 3Z" fill="#CC292B" fillOpacity="0.15" stroke="#CC292B" strokeWidth="1.8" />
    <path d="M4 5.5v4c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-4" stroke="#CC292B" strokeWidth="1.8" />
    <path d="M4 9.5v4c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-4" stroke="#CC292B" strokeWidth="1.8" />
    <path d="M4 13.5v4c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-4" stroke="#CC292B" strokeWidth="1.8" />
  </svg>
)

const DockerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#2496ED]">
    <rect x="5" y="7" width="3" height="2" rx="0.5" fill="#2496ED" fillOpacity="0.2" stroke="#2496ED" strokeWidth="1.2" />
    <rect x="9" y="7" width="3" height="2" rx="0.5" fill="#2496ED" fillOpacity="0.2" stroke="#2496ED" strokeWidth="1.2" />
    <rect x="13" y="7" width="3" height="2" rx="0.5" fill="#2496ED" fillOpacity="0.2" stroke="#2496ED" strokeWidth="1.2" />
    <rect x="7" y="4" width="3" height="2" rx="0.5" fill="#2496ED" fillOpacity="0.2" stroke="#2496ED" strokeWidth="1.2" />
    <rect x="11" y="4" width="3" height="2" rx="0.5" fill="#2496ED" fillOpacity="0.2" stroke="#2496ED" strokeWidth="1.2" />
    <rect x="9" y="10" width="3" height="2" rx="0.5" fill="#2496ED" fillOpacity="0.2" stroke="#2496ED" strokeWidth="1.2" />
    <path d="M2 13c0 4 3 6 7 6 5 0 9-3 11-7 .5-1 .5-2 0-2.5C19 9 18 9 17 9.5" stroke="#2496ED" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M2 13.5h18" stroke="#2496ED" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const DB_TYPES = [
  { value: 'sqlite',     label: 'SQLite',      icon: <SqliteIcon />, desc: 'Archivo local .db / .sqlite' },
  { value: 'postgresql', label: 'PostgreSQL',   icon: <PostgresqlIcon />, desc: 'Servidor PostgreSQL' },
  { value: 'mysql',      label: 'MySQL/MariaDB',icon: <MysqlIcon />, desc: 'Servidor MySQL o MariaDB' },
  { value: 'mssql',      label: 'SQL Server',   icon: <MssqlIcon />, desc: 'Microsoft SQL Server' },
  { value: 'docker',     label: 'Docker Container', icon: <DockerIcon />, desc: 'Base de datos en contenedor' },
] as const

export default function ConnectionModal({ onConnect, onClose, isConnecting, error }: ConnectionModalProps) {
  const [type, setType] = useState<ConnectionParams['type']>('sqlite')
  const [dockerEngine, setDockerEngine] = useState<'postgresql' | 'mysql' | 'mssql'>('postgresql')
  const [containerName, setContainerName] = useState('')
  const [filePath, setFilePath] = useState('')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('')
  const [database, setDatabase] = useState('')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [createNew, setCreateNew] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const currentType = DB_TYPES.find(t => t.value === type)!

  const handleBrowse = async () => {
    const result = await (window as any).cipher.openFolder?.()
    if (result) setFilePath(result)
  }

  const handleConnect = async () => {
    setLocalError(null)
    if (type === 'sqlite' && createNew) {
      try {
        const res = await (window as any).cipher.dbCreateSqlite({ filePath })
        if (!res || !res.ok) {
          setLocalError(res?.error || 'No se pudo crear la base de datos SQLite')
          return
        }
      } catch (err: any) {
        setLocalError(err.message || 'Error al intentar crear el archivo de base de datos')
        return
      }
    }
    const params: ConnectionParams = type === 'sqlite'
      ? { type, filePath }
      : type === 'docker'
      ? { type, dockerEngine, containerName, host, port: port ? parseInt(port) : undefined, database, user, password }
      : { type, host, port: port ? parseInt(port) : undefined, database, user, password }
    await onConnect(params)
  }

  const inputCls = 'w-full rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 py-2 text-[13px] text-[var(--cipher-text)] outline-none transition-all focus:border-[var(--cipher-accent)] focus:ring-1 focus:ring-[var(--cipher-accent)]/20 placeholder:text-[var(--cipher-text-muted)]/60'
  const displayError = localError || error

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
                <span className="flex items-center justify-center w-5 h-5">{currentType.icon}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[var(--cipher-text)]">{currentType.label}</div>
                  <div className="text-[11px] text-[var(--cipher-text-muted)]">{currentType.desc}</div>
                </div>
                <ChevronDown size={14} className={`text-[var(--cipher-text-muted)] transition-transform ${showTypeMenu ? 'rotate-180' : ''}`} />
              </button>

              {showTypeMenu && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] shadow-xl overflow-hidden">
                  {DB_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setType(t.value as any); setShowTypeMenu(false) }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all ${
                        type === t.value ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)]' : 'hover:bg-white/[0.04] text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]'
                      }`}
                    >
                      <span className="flex items-center justify-center w-5 h-5">{t.icon}</span>
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
            <div className="space-y-3">
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
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]">
                <input
                  type="checkbox"
                  checked={createNew}
                  onChange={e => setCreateNew(e.target.checked)}
                  className="accent-[var(--cipher-accent)] rounded"
                />
                <span>Crear nueva base de datos física (.db) si no existe</span>
              </label>
            </div>
          )}

          {/* Docker engine & container fields */}
          {type === 'docker' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">
                    Motor del Contenedor
                  </label>
                  <select
                    className="w-full rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 py-2 text-[13px] text-[var(--cipher-text)] outline-none"
                    value={dockerEngine}
                    onChange={e => setDockerEngine(e.target.value as any)}
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL/MariaDB</option>
                    <option value="mssql">SQL Server</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--cipher-text-muted)]">
                    Contenedor (Opcional)
                  </label>
                  <input
                    className={inputCls}
                    placeholder="ej. db_postgres"
                    value={containerName}
                    onChange={e => setContainerName(e.target.value)}
                  />
                </div>
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
                    placeholder={
                      type === 'postgresql' || (type === 'docker' && dockerEngine === 'postgresql')
                        ? '5432'
                        : type === 'mssql' || (type === 'docker' && dockerEngine === 'mssql')
                        ? '1433'
                        : '3306'
                    }
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
          {displayError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400 font-medium">
              ⚠️ {displayError}
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
