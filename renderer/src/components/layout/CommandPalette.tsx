import {
  Bot, Braces, Bug, Cloud, Code2, Command, FilePlus2,
  Folder, FolderOpen, GitBranch, GitPullRequest,
  ListChecks, PackageCheck, Play, RadioTower,
  Save, Search, Settings, Sparkles, Terminal, Workflow, X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useState, useMemo, useEffect, useRef } from 'react'

interface Props {
  onClose: () => void
}

export default function CommandPalette({ onClose }: Props) {
  const { setCurrentFolder, setSidebarPanel, terminalVisible, setTerminalVisible, setBottomPanel, setEditorSplitDirection } = useStore()

  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const openFolder = async () => {
    const folder = await window.cipher.openFolder()
    if (!folder) return
    setCurrentFolder(folder)
    setSidebarPanel('files')
    onClose()
  }

  const runTerminalCommand = (command: string) => {
    setBottomPanel('terminal')
    setTerminalVisible(true)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: command }))
    }, 250)
    onClose()
  }

  const openBottomPanel = (panel: 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'cloud') => {
    setBottomPanel(panel)
    setTerminalVisible(true)
    onClose()
  }

  const commands = [
    { label: 'Abrir carpeta',          hint: 'Seleccionar proyecto',                  icon: FolderOpen,    action: openFolder },
    { label: 'Buscar en proyecto',      hint: 'Abrir panel de búsqueda',               icon: Search,        action: () => { setSidebarPanel('search');    onClose() } },
    { label: 'Explorador',             hint: 'Mostrar archivos del proyecto',          icon: Folder,        action: () => { setSidebarPanel('files');     onClose() } },
    { label: 'Control de versiones',   hint: 'Abrir panel Git',                       icon: GitBranch,     action: () => { setSidebarPanel('git');       onClose() } },
    { label: 'Agente IA',              hint: 'Abrir asistente de IA',                 icon: Bot,           action: () => { setSidebarPanel('ai');        onClose() } },
    { label: 'Workflows',              hint: 'Automatización de tareas',              icon: Workflow,      action: () => { setSidebarPanel('workflows'); onClose() } },
    { label: 'Configuración',          hint: 'Keys, modelos y servicios',             icon: Settings,      action: () => { setSidebarPanel('settings');  onClose() } },
    { label: 'Guardar archivo',        hint: 'Ctrl+S',                                icon: Save,          action: () => { window.dispatchEvent(new Event('cipher-save-active'));   onClose() } },
    { label: 'Formatear archivo',      hint: 'Ctrl+Shift+F',                          icon: Code2,         action: () => { window.dispatchEvent(new Event('cipher-format-active')); onClose() } },
    { label: 'Terminal integrada',     hint: terminalVisible ? 'Ocultar terminal' : 'Mostrar terminal', icon: Terminal, action: () => { setBottomPanel('terminal'); setTerminalVisible(!terminalVisible); onClose() } },
    { label: 'Nuevo archivo',          hint: 'Crear desde el explorador',             icon: FilePlus2,     action: () => { window.dispatchEvent(new Event('cipher-new-file')); onClose() } },
    { label: 'Problems',              hint: 'Ver problemas del archivo activo',        icon: Bug,           action: () => openBottomPanel('problems') },
    { label: 'Output',                hint: 'Salida de tareas y extensiones',          icon: ListChecks,    action: () => openBottomPanel('output') },
    { label: 'Debug Console',         hint: 'Consola de depuración',                  icon: Command,       action: () => openBottomPanel('debug') },
    { label: 'Puertos',               hint: 'Ver puertos locales activos',            icon: RadioTower,    action: () => openBottomPanel('ports') },
    { label: 'Cloud',                 hint: 'Azure, GCP y AWS',                       icon: Cloud,         action: () => openBottomPanel('cloud') },
    { label: 'Instalar dependencias', hint: 'pnpm install',                           icon: PackageCheck,  action: () => runTerminalCommand('pnpm install') },
    { label: 'Iniciar desarrollo',    hint: 'pnpm dev',                               icon: Play,          action: () => runTerminalCommand('pnpm dev') },
    { label: 'Compilar proyecto',     hint: 'pnpm build',                             icon: Braces,        action: () => runTerminalCommand('pnpm build') },
    { label: 'Revisar lint',          hint: 'pnpm lint',                              icon: Bug,           action: () => runTerminalCommand('pnpm lint') },
    { label: 'Ejecutar tests',        hint: 'pnpm test',                              icon: Play,          action: () => runTerminalCommand('pnpm test') },
    { label: 'Git pull',              hint: 'Actualizar rama actual',                 icon: GitPullRequest, action: () => runTerminalCommand('git pull') },
    { label: 'Git status',            hint: 'Ver cambios locales',                   icon: GitBranch,     action: () => runTerminalCommand('git status --short --branch') },
    { label: 'Git log',               hint: 'Historial de commits',                  icon: GitBranch,     action: () => runTerminalCommand('git log --oneline -10') },
    { label: 'Git stash',             hint: 'Guardar cambios temporalmente',         icon: GitBranch,     action: () => runTerminalCommand('git stash') },
    { label: 'Split Editor',          hint: 'Dividir editor hacia abajo',            icon: Code2,         action: () => { setEditorSplitDirection('down'); onClose() } },
    { label: 'Claude Code',           hint: 'Abrir claude en terminal',              icon: Sparkles,      action: () => runTerminalCommand('claude') },
    { label: 'Codex CLI',             hint: 'Abrir codex en terminal',               icon: Sparkles,      action: () => runTerminalCommand('codex') },
  ]

  // Filter by query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
    )
  }, [query, terminalVisible])

  // Reset cursor when results change
  useEffect(() => { setCursor(0) }, [filtered.length])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor(c => Math.min(c + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor(c => Math.max(c - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        filtered[cursor]?.action()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, cursor, onClose])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 pt-20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="cipher-pop-enter w-[680px] overflow-hidden rounded-2xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--cipher-border)] px-5 py-4">
          <Search size={16} className="shrink-0 text-[var(--cipher-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar comando..."
            className="flex-1 bg-transparent text-[14px] text-[var(--cipher-text)] outline-none placeholder:text-[var(--cipher-text-muted)]"
          />
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--cipher-text-muted)]">
            <kbd className="rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-1.5 py-0.5">↑↓</kbd>
            <span>navegar</span>
            <kbd className="rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-1.5 py-0.5">↵</kbd>
            <span>ejecutar</span>
          </div>
          <button onClick={onClose} className="ml-2 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] hover:bg-[var(--cipher-surface-alt)] hover:text-[var(--cipher-text)]">
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[var(--cipher-text-muted)]">
              Sin resultados para «{query}»
            </div>
          ) : (
            filtered.map(({ label, hint, icon: Icon, action }, idx) => (
              <button
                key={label}
                onClick={action}
                onMouseEnter={() => setCursor(idx)}
                className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-all ${
                  cursor === idx
                    ? 'bg-[var(--cipher-accent-bg)]'
                    : 'hover:bg-[var(--cipher-surface-alt)]'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                  cursor === idx
                    ? 'bg-[var(--cipher-accent)] text-white'
                    : 'bg-[var(--cipher-surface-alt)] text-[var(--cipher-accent)]'
                }`}>
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <span className="flex flex-1 flex-col min-w-0">
                  <span className="text-[13px] font-medium text-[var(--cipher-text)] truncate">{label}</span>
                  <span className="text-[11px] text-[var(--cipher-text-muted)] truncate">{hint}</span>
                </span>
                {cursor === idx && (
                  <kbd className="shrink-0 rounded border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2 py-0.5 text-[10px] text-[var(--cipher-text-muted)]">
                    ↵
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-[var(--cipher-border)] px-5 py-2 text-[11px] text-[var(--cipher-text-muted)]">
          {filtered.length} comando{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
