import {
  Bot,
  Braces,
  Bug,
  Cloud,
  Code2,
  Command,
  FilePlus2,
  Folder,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  ListChecks,
  PackageCheck,
  Play,
  RadioTower,
  Save,
  Search,
  Settings,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'

interface Props {
  onClose: () => void
}

export default function CommandPalette({ onClose }: Props) {
  const { setCurrentFolder, setSidebarPanel, terminalVisible, setTerminalVisible, setBottomPanel, setEditorSplitDirection } = useStore()

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
    { label: 'Abrir carpeta', hint: 'Seleccionar proyecto', icon: FolderOpen, action: openFolder },
    { label: 'Buscar en proyecto', hint: 'Abrir panel de busqueda', icon: Search, action: () => { setSidebarPanel('search'); onClose() } },
    { label: 'Explorador', hint: 'Mostrar archivos del proyecto', icon: Folder, action: () => { setSidebarPanel('files'); onClose() } },
    { label: 'Control de versiones', hint: 'Abrir Git', icon: GitBranch, action: () => { setSidebarPanel('git'); onClose() } },
    { label: 'Agente IA', hint: 'Abrir asistente', icon: Bot, action: () => { setSidebarPanel('ai'); onClose() } },
    { label: 'Configuracion', hint: 'Keys, modelos y servicios locales', icon: Settings, action: () => { setSidebarPanel('settings'); onClose() } },
    { label: 'Guardar archivo', hint: 'Ctrl+S', icon: Save, action: () => { window.dispatchEvent(new Event('cipher-save-active')); onClose() } },
    { label: 'Formatear archivo', hint: 'Formato del editor', icon: Code2, action: () => { window.dispatchEvent(new Event('cipher-format-active')); onClose() } },
    { label: 'Problems', hint: 'Ver problemas del archivo activo', icon: Bug, action: () => openBottomPanel('problems') },
    { label: 'Output', hint: 'Ver salida de tareas y extensiones', icon: ListChecks, action: () => openBottomPanel('output') },
    { label: 'Debug Console', hint: 'Abrir consola de depuracion', icon: Command, action: () => openBottomPanel('debug') },
    { label: 'Ports', hint: 'Ver puertos locales', icon: RadioTower, action: () => openBottomPanel('ports') },
    { label: 'Cloud', hint: 'Azure, GCP y AWS en un solo panel', icon: Cloud, action: () => openBottomPanel('cloud') },
    { label: 'Terminal integrada', hint: terminalVisible ? 'Ocultar terminal' : 'Mostrar terminal', icon: Terminal, action: () => { setBottomPanel('terminal'); setTerminalVisible(!terminalVisible); onClose() } },
    { label: 'Nuevo archivo', hint: 'Crear desde el explorador', icon: FilePlus2, action: () => { window.dispatchEvent(new Event('cipher-new-file')); onClose() } },
    { label: 'Instalar dependencias', hint: 'pnpm install', icon: PackageCheck, action: () => runTerminalCommand('pnpm install') },
    { label: 'Iniciar desarrollo', hint: 'pnpm dev', icon: Play, action: () => runTerminalCommand('pnpm dev') },
    { label: 'Compilar proyecto', hint: 'pnpm build', icon: Braces, action: () => runTerminalCommand('pnpm build') },
    { label: 'Revisar lint', hint: 'pnpm lint', icon: Bug, action: () => runTerminalCommand('pnpm lint') },
    { label: 'Git pull', hint: 'Actualizar rama actual', icon: GitPullRequest, action: () => runTerminalCommand('git pull') },
    { label: 'Git status', hint: 'Ver cambios locales', icon: Command, action: () => runTerminalCommand('git status --short --branch') },
    { label: 'Worktree', hint: 'git worktree list', icon: GitBranch, action: () => runTerminalCommand('git worktree list') },
    { label: 'Open Changes', hint: 'Abrir panel Git', icon: GitBranch, action: () => { setSidebarPanel('git'); onClose() } },
    { label: 'Split Editor Down', hint: 'Dividir editor hacia abajo', icon: Code2, action: () => { setEditorSplitDirection('down'); onClose() } },
    { label: 'Claude Code', hint: 'claude', icon: Sparkles, action: () => runTerminalCommand('claude') },
    { label: 'Codex CLI', hint: 'codex', icon: Sparkles, action: () => runTerminalCommand('codex') },
  ]

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 pt-24 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="cipher-pop-enter w-[700px] overflow-hidden rounded-2xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--cipher-border)] px-6 py-5">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--cipher-text-muted)]">Paleta de comandos</p>
            <p className="mt-1.5 text-[13px] text-[var(--cipher-text-muted)]">Acciones principales de Cipher</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--cipher-text-muted)] transition-all hover:bg-[var(--cipher-surface-alt)] hover:text-[var(--cipher-text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {commands.map(({ label, hint, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex h-14 w-full items-center gap-4 rounded-xl px-4 text-left transition-all hover:bg-[var(--cipher-accent-bg)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cipher-surface-alt)] text-[var(--cipher-accent)]">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[14px] font-medium text-[var(--cipher-text)]">{label}</span>
                <span className="text-[12px] text-[var(--cipher-text-muted)]">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
