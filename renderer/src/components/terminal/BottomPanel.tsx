import { useEffect, useMemo, useState } from 'react'
import {
  Bug,
  Check,
  ChevronRight,
  CircleAlert,
  Cloud,
  Copy,
  ExternalLink,
  Filter,
  GitBranch,
  Globe2,
  ListChecks,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  SplitSquareHorizontal,
  Terminal as TerminalIcon,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import TerminalPanel from './TerminalPanel'
import { useStore } from '../../store/useStore'
import type { CloudStatus, PortInfo } from '../../types/electron'

type BottomPanelTab = 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'cloud'

interface Problem {
  severity: 'error' | 'warning' | 'info'
  line: number
  message: string
}

const tabs: { id: BottomPanelTab; label: string; icon: LucideIcon }[] = [
  { id: 'problems', label: 'Problems', icon: CircleAlert },
  { id: 'output', label: 'Output', icon: ListChecks },
  { id: 'debug', label: 'Debug Console', icon: Bug },
  { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
  { id: 'ports', label: 'Ports', icon: RadioTower },
  { id: 'cloud', label: 'Cloud', icon: Cloud },
]

function analyzeContent(path: string | null, content: string): Problem[] {
  const problems: Problem[] = []
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    if (/<<<<<<<|=======|>>>>>>>/.test(line)) {
      problems.push({ severity: 'error', line: lineNumber, message: 'Marcador de conflicto Git encontrado.' })
    }
    if (/\b(TODO|FIXME)\b/i.test(line)) {
      problems.push({ severity: 'info', line: lineNumber, message: 'Tarea pendiente en el codigo.' })
    }
    if (/\bconsole\.log\s*\(/.test(line)) {
      problems.push({ severity: 'warning', line: lineNumber, message: 'console.log detectado; revisa si debe quedarse.' })
    }
    if (line.length > 140) {
      problems.push({ severity: 'warning', line: lineNumber, message: 'Linea demasiado larga para lectura comoda.' })
    }
  })

  if (path?.toLowerCase().endsWith('.json')) {
    try {
      JSON.parse(content)
    } catch (error) {
      problems.push({ severity: 'error', line: 1, message: `JSON invalido: ${(error as Error).message}` })
    }
  }

  return problems
}

function PanelToolButton({
  icon: Icon,
  title,
  onClick,
}: {
  icon: LucideIcon
  title: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[#a8adb8] transition-all hover:bg-white/[0.08] hover:text-white"
      title={title}
    >
      <Icon size={14} />
    </button>
  )
}

function ProblemsPanel({ activeTabPath, problems }: { activeTabPath: string | null; problems: Problem[] }) {
  const [filter, setFilter] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showErrors, setShowErrors] = useState(true)
  const [showWarnings, setShowWarnings] = useState(true)
  const [showInfos, setShowInfos] = useState(true)
  const activeFileName = activeTabPath?.split(/[\\/]/).pop() || 'Sin archivo activo'
  const filtered = problems.filter(problem => {
    if (problem.severity === 'error' && !showErrors) return false
    if (problem.severity === 'warning' && !showWarnings) return false
    if (problem.severity === 'info' && !showInfos) return false
    return !filter || problem.message.toLowerCase().includes(filter.toLowerCase())
  })

  return (
    <div className="flex h-full flex-col overflow-hidden text-[12px]">
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <span className="text-[var(--cipher-muted-blue)]">{activeFileName}</span>
        <div className="relative flex items-center gap-2">
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Filter (e.g. text, **/*.ts)"
            className="h-7 w-60 rounded-md border border-white/[0.08] bg-[#2a2a2a] px-2 text-[12px] text-[#dce4ff] outline-none placeholder-[#858b98] focus:border-[#62aaff]/70"
          />
          <PanelToolButton icon={Filter} title="Filtros" onClick={() => setMenuOpen(value => !value)} />
          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 w-56 rounded-md border border-white/[0.12] bg-[#1f1f1f] py-1 shadow-2xl">
              {[
                ['Show Errors', showErrors, setShowErrors],
                ['Show Warnings', showWarnings, setShowWarnings],
                ['Show Infos', showInfos, setShowInfos],
              ].map(([label, value, setter]) => (
                <button
                  key={label as string}
                  onClick={() => (setter as (v: boolean) => void)(!(value as boolean))}
                  className="flex h-8 w-full items-center gap-2 px-3 text-left text-[12px] text-[#d8dee9] hover:bg-[#2d2d2d]"
                >
                  {(value as boolean) ? <Check size={13} /> : <span className="w-[13px]" />}
                  {label as string}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-2 py-2 text-[#dce4ff]">No problems have been detected in the workspace.</div>
        ) : (
          filtered.map((problem, index) => (
            <div key={`${problem.line}-${index}`} className="flex items-start gap-3 rounded px-2 py-1.5 text-[#c5cef0] hover:bg-white/[0.05]">
              <CircleAlert
                size={14}
                className={
                  problem.severity === 'error' ? 'mt-0.5 text-[var(--cipher-status-err)]' :
                  problem.severity === 'warning' ? 'mt-0.5 text-[#ffcc66]' :
                  'mt-0.5 text-[#62aaff]'
                }
              />
              <span className="w-16 flex-shrink-0 text-[#7f8bb0]">Ln {problem.line}</span>
              <span className="min-w-0 flex-1">{problem.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function OutputPanel() {
  const tasks = ['TypeScript', 'Cipher', 'Terminal', 'Extension Host', 'Shared', 'Tasks']
  const [task, setTask] = useState('Cipher')
  const [filter, setFilter] = useState('')
  const messages = [
    '[Cipher] Renderer compilado con Vite.',
    '[Cipher] Usa la paleta para ejecutar pnpm build, lint o dev.',
    '[Cipher] Worktree, Open Changes y Split Editor Down estan conectados desde Terminal > More.',
  ].filter(message => !filter || message.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-10 items-center justify-end gap-2 border-b border-white/[0.06] px-3">
        <input
          value={filter}
          onChange={event => setFilter(event.target.value)}
          placeholder="Filter"
          className="h-7 w-64 rounded-md border border-white/[0.08] bg-[#2a2a2a] px-2 text-[12px] text-[#dce4ff] outline-none placeholder-[#858b98] focus:border-[#62aaff]/70"
        />
        <select value={task} onChange={event => setTask(event.target.value)} className="h-7 rounded-md border border-white/[0.08] bg-[#1f1f1f] px-2 text-[12px] text-[#dce4ff] outline-none">
          {tasks.map(item => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-6 text-[var(--cipher-text)]">
        <div className="mb-2 text-[var(--cipher-muted-blue)]">Output: {task}</div>
        {messages.map(message => <div key={message}>{message}</div>)}
      </div>
    </div>
  )
}

function DebugPanel() {
  const [debugInput, setDebugInput] = useState('')
  const [debugLog, setDebugLog] = useState<string[]>([
    'Debug Console lista. Los comandos se registran aqui hasta conectar un runtime de depuracion.',
  ])
  const runDebugCommand = () => {
    if (!debugInput.trim()) return
    const command = debugInput.trim()
    setDebugInput('')
    setDebugLog(log => [...log, `> ${command}`, 'Runtime de depuracion no conectado.'])
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-10 items-center justify-end gap-2 border-b border-white/[0.06] px-3">
        <input placeholder="Filter (e.g. text, !exclude)" className="h-7 w-72 rounded-md border border-white/[0.08] bg-[#2a2a2a] px-2 text-[12px] text-[#dce4ff] outline-none placeholder-[#858b98] focus:border-[#62aaff]/70" />
        <PanelToolButton icon={Search} title="Buscar en debug" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-6 text-[var(--cipher-text)]">
        {debugLog.map((entry, index) => <div key={index}>{entry}</div>)}
      </div>
      <div className="flex h-11 flex-shrink-0 items-center gap-2 border-t border-white/[0.07] px-3">
        <ChevronRight size={15} className="text-[#7f8bb0]" />
        <input
          value={debugInput}
          onChange={event => setDebugInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              runDebugCommand()
            }
          }}
          placeholder="Comando de debug..."
          className="h-8 min-w-0 flex-1 bg-transparent font-mono text-[12px] text-[#dce4ff] outline-none placeholder-[#596585]"
        />
        <PanelToolButton icon={Play} title="Ejecutar" onClick={runDebugCommand} />
      </div>
    </div>
  )
}

function PortsPanel() {
  const [ports, setPorts] = useState<PortInfo[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    window.cipher.portsList()
      .then(setPorts)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let mounted = true
    window.cipher.portsList()
      .then(result => {
        if (mounted) setPorts(result)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden text-[12px]">
      <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
        <span className="text-[var(--cipher-muted-blue)]">Local forwarded and detected ports</span>
        <PanelToolButton icon={RefreshCw} title="Refresh ports" onClick={refresh} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="text-[#7f8bb0]">Escaneando puertos locales...</div>
        ) : ports.length === 0 ? (
          <div className="rounded-md border border-white/[0.08] bg-[#151515] p-4 text-[var(--cipher-muted-blue)]">
            No hay servidores locales escuchando o no se pudo consultar el sistema.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-white/[0.08]">
            {ports.map(port => (
              <div key={port.port} className="grid grid-cols-[100px_1fr_90px_110px] items-center border-b border-white/[0.06] px-3 py-2 last:border-b-0 hover:bg-white/[0.04]">
                <span className="font-mono text-[#dce4ff]">:{port.port}</span>
                <span className="truncate text-[var(--cipher-text)]">{port.url}</span>
                <span className="text-[#7f8bb0]">PID {port.pid || '-'}</span>
                <span className="flex justify-end gap-1">
                  <button onClick={() => window.cipher.openExternal(port.url)} className="rounded p-1 text-[var(--cipher-muted-blue)] hover:bg-white/[0.08] hover:text-white" title="Open in browser"><ExternalLink size={14} /></button>
                  <button onClick={() => navigator.clipboard?.writeText(port.url)} className="rounded p-1 text-[var(--cipher-muted-blue)] hover:bg-white/[0.08] hover:text-white" title="Copy URL"><Copy size={14} /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CloudPanel() {
  const [status, setStatus] = useState<CloudStatus | null>(null)
  const [selected, setSelected] = useState<'azure' | 'gcp' | 'aws'>('gcp')
  const providers = [
    { id: 'azure' as const, label: 'Azure', command: 'az', docs: 'https://learn.microsoft.com/cli/azure/' },
    { id: 'gcp' as const, label: 'GCP', command: 'gcloud', docs: 'https://cloud.google.com/sdk/docs' },
    { id: 'aws' as const, label: 'AWS', command: 'aws', docs: 'https://docs.aws.amazon.com/cli/' },
  ]

  const refresh = () => {
    window.cipher.cloudStatus().then(setStatus)
  }
  useEffect(() => {
    refresh()
  }, [])

  const current = providers.find(provider => provider.id === selected) || providers[0]
  const currentStatus = status?.[current.id]

  return (
    <div className="flex h-full flex-col overflow-hidden text-[12px]">
      <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
        <span className="text-[var(--cipher-muted-blue)]">Cloud providers</span>
        <PanelToolButton icon={RefreshCw} title="Refresh cloud status" onClick={refresh} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] overflow-hidden">
        <div className="border-r border-white/[0.06] p-2">
          {providers.map(provider => {
            const providerStatus = status?.[provider.id]
            return (
              <button
                key={provider.id}
                onClick={() => setSelected(provider.id)}
                className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-all ${
                  selected === provider.id ? 'bg-white/[0.08] text-white' : 'text-[var(--cipher-text)] hover:bg-white/[0.05]'
                }`}
              >
                <span className="flex items-center gap-2"><Globe2 size={14} /> {provider.label}</span>
                <span className={providerStatus?.installed ? 'text-[#73d18c]' : 'text-[#7f8bb0]'}>
                  {providerStatus?.installed ? 'ready' : 'off'}
                </span>
              </button>
            )
          })}
        </div>
        <div className="overflow-y-auto p-4">
          <div className="mb-3 text-[13px] font-medium text-[#dce4ff]">{current.label}</div>
          <div className="rounded-md border border-white/[0.08] bg-[#151515] p-4">
            <div className="mb-2 text-[var(--cipher-text)]">CLI: <span className="font-mono">{current.command}</span></div>
            <div className={currentStatus?.installed ? 'text-[#73d18c]' : 'text-[#ffcc66]'}>
              {currentStatus?.installed ? currentStatus.version : 'CLI no detectada en PATH.'}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => window.cipher.openExternal(current.docs)} className="rounded-md border border-white/[0.08] px-3 py-2 text-[#dce4ff] hover:bg-white/[0.06]">
                Documentacion
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: `${current.command} --version` }))} className="rounded-md border border-white/[0.08] px-3 py-2 text-[#dce4ff] hover:bg-white/[0.06]">
                Probar en terminal
              </button>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-[#7f8bb0]">
            Este panel no crea una pestana por proveedor: usa un solo espacio Cloud y detecta herramientas instaladas. Asi puede crecer a GCP, AWS, Azure u otros sin romper la interfaz.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BottomPanel() {
  const {
    bottomPanel,
    setBottomPanel,
    setTerminalVisible,
    terminalVisible,
    activeTabPath,
    setEditorSplitDirection,
    setSidebarPanel,
  } = useStore()
  const [content, setContent] = useState('')

  useEffect(() => {
    let mounted = true
    if (!activeTabPath) return
    window.cipher.readFile(activeTabPath)
      .then(value => {
        if (mounted) setContent(value)
      })
      .catch(() => {
        if (mounted) setContent('')
      })
    return () => {
      mounted = false
    }
  }, [activeTabPath])

  const problems = useMemo(() => analyzeContent(activeTabPath, activeTabPath ? content : ''), [activeTabPath, content])

  return (
    <section
      className="cipher-terminal-enter flex h-80 flex-shrink-0 flex-col overflow-hidden border-t border-[var(--cipher-border)] bg-[var(--cipher-bg)]"
      style={{ display: terminalVisible ? 'flex' : 'none' }}
    >
      <header className="flex h-10 flex-shrink-0 items-center justify-between border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-2">
        <div className="flex h-full items-center gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = bottomPanel === tab.id
            const problemCount = tab.id === 'problems' && problems.length > 0 ? problems.length : null

            return (
              <button
                key={tab.id}
                onClick={() => setBottomPanel(tab.id)}
                className={`flex h-7 items-center gap-2 rounded-md px-3 text-[12px] transition-all ${
                  active
                    ? 'bg-[var(--cipher-accent-bg)] text-white'
                    : 'text-[var(--cipher-text)] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon size={13} />
                {tab.label}
                {problemCount !== null && (
                  <span className="rounded-full bg-[var(--cipher-status-err)]/18 px-1.5 py-0.5 text-[10px] text-[var(--cipher-status-err)]">
                    {problemCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <PanelToolButton icon={GitBranch} title="Open Changes" onClick={() => setSidebarPanel('git')} />
          <PanelToolButton icon={SplitSquareHorizontal} title="Split Editor Down" onClick={() => setEditorSplitDirection('down')} />
          <PanelToolButton icon={X} title="Cerrar panel" onClick={() => setTerminalVisible(false)} />
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="h-full w-full flex-col min-h-0" style={{ display: bottomPanel === 'terminal' ? 'flex' : 'none' }}>
          <TerminalPanel />
        </div>
        <div className="h-full w-full flex-col min-h-0" style={{ display: bottomPanel === 'problems' ? 'flex' : 'none' }}>
          <ProblemsPanel activeTabPath={activeTabPath} problems={problems} />
        </div>
        <div className="h-full w-full flex-col min-h-0" style={{ display: bottomPanel === 'output' ? 'flex' : 'none' }}>
          <OutputPanel />
        </div>
        <div className="h-full w-full flex-col min-h-0" style={{ display: bottomPanel === 'debug' ? 'flex' : 'none' }}>
          <DebugPanel />
        </div>
        <div className="h-full w-full flex-col min-h-0" style={{ display: bottomPanel === 'ports' ? 'flex' : 'none' }}>
          <PortsPanel />
        </div>
        <div className="h-full w-full flex-col min-h-0" style={{ display: bottomPanel === 'cloud' ? 'flex' : 'none' }}>
          <CloudPanel />
        </div>
      </div>
    </section>
  )
}
