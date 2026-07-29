import {
  Play, Workflow, Code2, Plus, Trash2, Terminal, Bot,
  GitBranch, Box, Search, ChevronRight,
  CheckCircle2, XCircle, Loader2, Clock, Pencil, X,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { useStore, SUPPORTED_LANGUAGES } from '../../store/useStore'
import { getLanguage, isSupportedLanguage } from '../../utils/fileUtils'

// ── Types ──────────────────────────────────────────────────────────────────

type WorkflowType = 'terminal' | 'ai'
type WorkflowCategory = 'proyecto' | 'git' | 'ia' | 'docker' | 'custom'
type LogStatus = 'running' | 'ok' | 'error' | 'info'

interface WorkflowItem {
  id: string
  title: string
  description: string
  command: string
  type: WorkflowType
  category: WorkflowCategory
  builtIn?: boolean
}

interface LogEntry {
  id: number
  message: string
  status: LogStatus
  time: string
}

// ── Preset workflows ────────────────────────────────────────────────────────

const PRESET_WORKFLOWS: WorkflowItem[] = [
  // Proyecto
  { id: 'install-deps',    title: 'Instalar dependencias', description: 'Ejecuta pnpm install para instalar/actualizar deps.', command: 'pnpm install', type: 'terminal', category: 'proyecto', builtIn: true },
  { id: 'dev-server',      title: 'Iniciar servidor dev',  description: 'Arranca el servidor de desarrollo.',                   command: 'pnpm dev',     type: 'terminal', category: 'proyecto', builtIn: true },
  { id: 'build-project',   title: 'Compilar proyecto',     description: 'Construye el bundle de producción.',                  command: 'pnpm build',   type: 'terminal', category: 'proyecto', builtIn: true },
  { id: 'lint-fix',        title: 'Linter',                description: 'Detecta y corrige problemas de estilo.',              command: 'pnpm lint',    type: 'terminal', category: 'proyecto', builtIn: true },
  { id: 'test-run',        title: 'Ejecutar tests',        description: 'Corre la suite de tests del proyecto.',               command: 'pnpm test',    type: 'terminal', category: 'proyecto', builtIn: true },
  // Git
  { id: 'git-status',      title: 'Git Status',            description: 'Muestra el estado del repositorio.',               command: 'git status --short --branch', type: 'terminal', category: 'git', builtIn: true },
  { id: 'git-pull',        title: 'Git Pull',              description: 'Trae los últimos cambios del remoto.',              command: 'git pull',                    type: 'terminal', category: 'git', builtIn: true },
  { id: 'git-log',         title: 'Git Log',               description: 'Historial de los últimos 10 commits.',             command: 'git log --oneline -10',       type: 'terminal', category: 'git', builtIn: true },
  { id: 'git-stash',       title: 'Git Stash',             description: 'Guarda cambios temporalmente.',                    command: 'git stash',                   type: 'terminal', category: 'git', builtIn: true },
  // IA
  { id: 'gen-tests',       title: 'Generar Tests',         description: 'Pide al agente IA que genere tests unitarios.',    command: 'Genera tests unitarios para el archivo activo',                     type: 'ai', category: 'ia', builtIn: true },
  { id: 'doc-functions',   title: 'Documentar funciones',  description: 'Documenta automáticamente el archivo activo.',     command: 'Documenta las funciones del archivo activo con comentarios claros', type: 'ai', category: 'ia', builtIn: true },
  { id: 'review-code',     title: 'Revisar código',        description: 'El agente analiza el código y sugiere mejoras.',   command: 'Revisa el código del archivo activo y sugiere mejoras de calidad, rendimiento y seguridad', type: 'ai', category: 'ia', builtIn: true },
  { id: 'explain-code',    title: 'Explicar código',       description: 'El agente explica qué hace el archivo activo.',   command: 'Explica en detalle qué hace el código del archivo activo',           type: 'ai', category: 'ia', builtIn: true },
  { id: 'fix-errors',      title: 'Corregir errores',      description: 'El agente analiza y corrige los errores del IA.', command: 'Analiza los errores del debugger y corrígelos en el archivo activo', type: 'ai', category: 'ia', builtIn: true },
  // Docker
  { id: 'docker-build',    title: 'Docker Build',          description: 'Construye la imagen Docker del proyecto.',         command: 'docker build -t app .',       type: 'terminal', category: 'docker', builtIn: true },
  { id: 'docker-up',       title: 'Docker Compose Up',     description: 'Levanta los contenedores del proyecto.',           command: 'docker compose up -d',        type: 'terminal', category: 'docker', builtIn: true },
  { id: 'docker-down',     title: 'Docker Compose Down',   description: 'Detiene y elimina los contenedores.',              command: 'docker compose down',         type: 'terminal', category: 'docker', builtIn: true },
  { id: 'docker-logs',     title: 'Docker Logs',           description: 'Muestra logs de los contenedores activos.',        command: 'docker compose logs --tail=50 -f', type: 'terminal', category: 'docker', builtIn: true },
]

const CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  proyecto: 'Proyecto',
  git:      'Git',
  ia:       'Agente IA',
  docker:   'Docker',
  custom:   'Mis Workflows',
}

const CATEGORY_ICONS: Record<WorkflowCategory, React.FC<{ size: number; className?: string }>> = {
  proyecto: Code2,
  git:      GitBranch,
  ia:       Bot,
  docker:   Box,
  custom:   Workflow,
}

// ── Custom workflow storage ─────────────────────────────────────────────────

const STORAGE_KEY = 'cipher-custom-workflows'

function loadCustomWorkflows(): WorkflowItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomWorkflows(items: WorkflowItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

// ── Workflow Editor Modal ───────────────────────────────────────────────────

interface EditorProps {
  initial?: Partial<WorkflowItem>
  onSave: (w: WorkflowItem) => void
  onClose: () => void
}

function WorkflowEditor({ initial, onSave, onClose }: EditorProps) {
  const [title,       setTitle]       = useState(initial?.title       ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [command,     setCommand]     = useState(initial?.command     ?? '')
  const [type,        setType]        = useState<WorkflowType>(initial?.type ?? 'terminal')

  const handleSave = () => {
    if (!title.trim() || !command.trim()) return
    onSave({
      id:          initial?.id ?? `custom-${Date.now()}`,
      title:       title.trim(),
      description: description.trim(),
      command:     command.trim(),
      type,
      category:    'custom',
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[var(--z-backdrop)] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="cipher-pop-enter fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--cipher-text)]">
            {initial?.id ? 'Editar workflow' : 'Nuevo workflow'}
          </h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] hover:bg-white/[0.08] hover:text-white">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--cipher-text-muted)]">Nombre *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Deploy a producción"
              className="cipher-input-glow w-full rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 py-2 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder:text-[var(--cipher-text-muted)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--cipher-text-muted)]">Descripción</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="¿Qué hace este workflow?"
              className="cipher-input-glow w-full rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 py-2 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder:text-[var(--cipher-text-muted)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--cipher-text-muted)]">Tipo *</label>
            <div className="flex gap-2">
              {(['terminal', 'ai'] as WorkflowType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-all ${
                    type === t
                      ? 'border-[var(--cipher-accent-soft)] bg-[var(--cipher-accent-bg)] text-[var(--cipher-accent)]'
                      : 'border-[var(--cipher-border)] text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]'
                  }`}
                >
                  {t === 'terminal' ? <Terminal size={13} /> : <Bot size={13} />}
                  {t === 'terminal' ? 'Terminal' : 'Agente IA'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--cipher-text-muted)]">
              {type === 'terminal' ? 'Comando *' : 'Prompt para el agente *'}
            </label>
            <textarea
              value={command}
              onChange={e => setCommand(e.target.value)}
              rows={3}
              placeholder={type === 'terminal' ? 'Ej: npm run deploy' : 'Ej: Refactoriza el código del archivo activo...'}
              className="cipher-input-glow w-full resize-none rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 py-2 text-[13px] text-[var(--cipher-text)] font-mono outline-none transition-all placeholder:text-[var(--cipher-text-muted)] placeholder:font-sans"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-[var(--cipher-border)] px-4 py-2 text-[13px] text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !command.trim()}
            className="rounded-lg bg-[var(--cipher-accent)] px-4 py-2 text-[13px] font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </>
  )
}

// ── Log status helpers ──────────────────────────────────────────────────────

function LogLine({ entry }: { entry: LogEntry }) {
  const colors: Record<LogStatus, string> = {
    running: 'text-[var(--cipher-text-muted)]',
    ok:      'text-[var(--cipher-status-ok)]',
    error:   'text-[var(--cipher-status-err)]',
    info:    'text-[var(--cipher-accent)]',
  }
  const icons: Record<LogStatus, React.ReactNode> = {
    running: <Loader2 size={11} className="animate-spin shrink-0" />,
    ok:      <CheckCircle2 size={11} className="shrink-0" />,
    error:   <XCircle size={11} className="shrink-0" />,
    info:    <Clock size={11} className="shrink-0" />,
  }
  return (
    <div className={`flex items-start gap-1.5 text-[11px] font-mono ${colors[entry.status]}`}>
      {icons[entry.status]}
      <span className="opacity-50 shrink-0">{entry.time}</span>
      <span className="break-all">{entry.message}</span>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function WorkflowsPanel() {
  const {
    activeTabPath, tabs,
    runBuildCommand, runLintCommand,
    setBottomPanel, setTerminalVisible, setSidebarPanel,
  } = useStore()

  const activeTab      = tabs.find(t => t.path === activeTabPath)
  const activeFileName = activeTab?.name ?? null
  const activeLang     = activeFileName ? (getLanguage(activeFileName) as typeof SUPPORTED_LANGUAGES[number]) : null
  const hasSupportedLang = activeFileName ? isSupportedLanguage(activeFileName) : false

  // Custom workflows state
  const [customWorkflows, setCustomWorkflows] = useState<WorkflowItem[]>(() => loadCustomWorkflows())
  const [search,          setSearch]          = useState('')
  const [activeCategory,  setActiveCategory]  = useState<WorkflowCategory | 'all'>('all')
  const [logs,            setLogs]            = useState<LogEntry[]>([])
  const [runningId,       setRunningId]       = useState<string | null>(null)
  const [showEditor,      setShowEditor]      = useState(false)
  const [editTarget,      setEditTarget]      = useState<WorkflowItem | undefined>()
  let logId = 0

  const addLog = useCallback((message: string, status: LogStatus) => {
    const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs(prev => [{ id: logId++, message, status, time }, ...prev].slice(0, 60))
  }, [])

  // All workflows merged
  const allWorkflows = useMemo(
    () => [...PRESET_WORKFLOWS, ...customWorkflows],
    [customWorkflows]
  )

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allWorkflows.filter(w => {
      const matchCat = activeCategory === 'all' || w.category === activeCategory
      const matchQ   = !q || w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [allWorkflows, activeCategory, search])

  // Grouped
  const grouped = useMemo(() => {
    const map = new Map<WorkflowCategory, WorkflowItem[]>()
    for (const w of filtered) {
      if (!map.has(w.category)) map.set(w.category, [])
      map.get(w.category)!.push(w)
    }
    return map
  }, [filtered])

  const runWorkflow = useCallback((item: WorkflowItem) => {
    setRunningId(item.id)
    addLog(`Ejecutando "${item.title}"...`, 'running')

    if (item.type === 'terminal') {
      setBottomPanel('terminal')
      setTerminalVisible(true)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: item.command }))
        addLog(`Comando enviado: ${item.command}`, 'ok')
        setRunningId(null)
      }, 180)
    } else {
      setSidebarPanel('ai')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cipher-ai-query', { detail: { text: item.command, mode: 'dev' } }))
        addLog(`Prompt enviado al agente IA`, 'ok')
        setRunningId(null)
      }, 150)
    }
  }, [addLog, setBottomPanel, setTerminalVisible, setSidebarPanel])

  const handleSaveCustom = (w: WorkflowItem) => {
    setCustomWorkflows(prev => {
      const exists = prev.find(x => x.id === w.id)
      const next   = exists ? prev.map(x => x.id === w.id ? w : x) : [...prev, w]
      saveCustomWorkflows(next)
      return next
    })
    setShowEditor(false)
    setEditTarget(undefined)
    addLog(`Workflow "${w.title}" guardado`, 'info')
  }

  const handleDelete = (id: string) => {
    setCustomWorkflows(prev => {
      const next = prev.filter(x => x.id !== id)
      saveCustomWorkflows(next)
      return next
    })
    addLog('Workflow eliminado', 'info')
  }

  const categories: Array<WorkflowCategory | 'all'> = ['all', 'proyecto', 'git', 'ia', 'docker', 'custom']

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--cipher-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Workflow size={15} className="text-[var(--cipher-accent)]" />
          <span className="text-[12px] font-semibold text-[var(--cipher-text)]">Workflows</span>
          <span className="rounded-full bg-[var(--cipher-accent-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--cipher-accent)]">BETA</span>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowEditor(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--cipher-accent-bg)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--cipher-accent)] transition-all hover:bg-[var(--cipher-accent-soft)] hover:text-white"
        >
          <Plus size={12} /> Nuevo
        </button>
      </div>

      {/* ── Search ── */}
      <div className="border-b border-[var(--cipher-border)] px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 py-1.5">
          <Search size={12} className="text-[var(--cipher-text-muted)] shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar workflow..."
            className="w-full bg-transparent text-[12px] text-[var(--cipher-text)] outline-none placeholder:text-[var(--cipher-text-muted)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--cipher-border)] px-3 py-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeCategory === cat
                ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-accent)]'
                : 'text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]'
            }`}
          >
            {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* ── Workflow list ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
        {/* Language-specific actions when a supported file is active */}
        {hasSupportedLang && activeLang && activeCategory === 'all' && !search && (
          <div className="rounded-xl border border-[var(--cipher-accent-soft)] bg-[var(--cipher-accent-bg)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Code2 size={13} className="text-[var(--cipher-accent)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cipher-accent)]">
                Acciones para {activeLang.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  addLog(`Compilando ${activeLang}...`, 'running')
                  setBottomPanel('terminal'); setTerminalVisible(true)
                  setTimeout(() => { runBuildCommand(activeLang); addLog('Compilación lanzada', 'ok'); }, 150)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--cipher-accent-soft)] bg-[var(--cipher-bg)] px-3 py-1.5 text-[12px] text-[var(--cipher-text)] hover:bg-[var(--cipher-accent-soft)] hover:text-white transition-all"
              >
                <Play size={11} /> Compilar
              </button>
              <button
                onClick={() => {
                  addLog(`Linter ${activeLang}...`, 'running')
                  setBottomPanel('terminal'); setTerminalVisible(true)
                  setTimeout(() => { runLintCommand(activeLang); addLog('Linter ejecutado', 'ok'); }, 150)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--cipher-accent-soft)] bg-[var(--cipher-bg)] px-3 py-1.5 text-[12px] text-[var(--cipher-text)] hover:bg-[var(--cipher-accent-soft)] hover:text-white transition-all"
              >
                <Play size={11} /> Lint
              </button>
            </div>
          </div>
        )}

        {/* Grouped workflow cards */}
        {grouped.size === 0 && (
          <div className="py-8 text-center text-[13px] text-[var(--cipher-text-muted)]">
            No hay workflows para «{search}»
          </div>
        )}

        {Array.from(grouped.entries()).map(([category, items]) => {
          const CatIcon = CATEGORY_ICONS[category]
          return (
            <div key={category}>
              <div className="mb-2 flex items-center gap-1.5 px-0.5">
                <CatIcon size={12} className="text-[var(--cipher-accent)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cipher-text-muted)]">
                  {CATEGORY_LABELS[category]}
                </span>
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="card-glow-hover group rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[var(--cipher-text)] truncate">{item.title}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                            item.type === 'terminal'
                              ? 'bg-[var(--cipher-bg)] text-[var(--cipher-text-muted)]'
                              : 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-accent)]'
                          }`}>
                            {item.type === 'terminal' ? 'CMD' : 'IA'}
                          </span>
                        </div>
                        {item.description && (
                          <p className="mt-0.5 text-[12px] text-[var(--cipher-text-muted)] line-clamp-2">{item.description}</p>
                        )}
                        <code className="mt-1.5 block truncate rounded bg-[var(--cipher-bg)] px-2 py-1 text-[11px] text-[var(--cipher-text-muted)] font-mono">
                          {item.command.length > 60 ? item.command.slice(0, 57) + '...' : item.command}
                        </code>
                      </div>

                      {/* Action buttons */}
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          onClick={() => runWorkflow(item)}
                          disabled={runningId === item.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--cipher-accent-bg)] text-[var(--cipher-accent)] transition-all hover:bg-[var(--cipher-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          title="Ejecutar"
                        >
                          {runningId === item.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <ChevronRight size={13} />
                          }
                        </button>
                        {!item.builtIn && (
                          <>
                            <button
                              onClick={() => { setEditTarget(item); setShowEditor(true) }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-[var(--cipher-text)]"
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] transition-all hover:bg-[var(--cipher-status-err)]/10 hover:text-[var(--cipher-status-err)]"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Log panel ── */}
      <div className="border-t border-[var(--cipher-border)] bg-[var(--cipher-bg)] p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cipher-text-muted)]">
            Registro de ejecuciones
          </span>
          {logs.length > 0 && (
            <button onClick={() => setLogs([])} className="text-[10px] text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]">
              Limpiar
            </button>
          )}
        </div>
        <div className="max-h-28 space-y-1 overflow-y-auto">
          {logs.length === 0
            ? <p className="text-[11px] text-[var(--cipher-text-muted)]">Sin ejecuciones todavía.</p>
            : logs.map(entry => <LogLine key={entry.id} entry={entry} />)
          }
        </div>
      </div>

      {/* ── Editor Modal ── */}
      {showEditor && (
        <WorkflowEditor
          initial={editTarget}
          onSave={handleSaveCustom}
          onClose={() => { setShowEditor(false); setEditTarget(undefined) }}
        />
      )}
    </div>
  )
}
