import { useEffect, useMemo, useState } from 'react'
import { Bug, ChevronRight, CircleAlert, Cloud, ListChecks, Play, RadioTower, Terminal as TerminalIcon, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import TerminalPanel from './TerminalPanel'
import { useStore } from '../../store/useStore'

type BottomPanelTab = 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'azure'

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
  { id: 'azure', label: 'Azure', icon: Cloud },
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

export default function BottomPanel() {
  const { bottomPanel, setBottomPanel, setTerminalVisible, activeTabPath } = useStore()
  const [content, setContent] = useState('')
  const [debugInput, setDebugInput] = useState('')
  const [debugLog, setDebugLog] = useState<string[]>([
    'Debug Console lista. Los comandos se registran aqui hasta conectar un runtime de depuracion.',
  ])

  useEffect(() => {
    let mounted = true
    if (!activeTabPath) {
      return
    }

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

  const analyzedContent = activeTabPath ? content : ''
  const problems = useMemo(() => analyzeContent(activeTabPath, analyzedContent), [activeTabPath, analyzedContent])
  const activeFileName = activeTabPath?.split(/[\\/]/).pop() || 'Sin archivo activo'

  const runDebugCommand = () => {
    if (!debugInput.trim()) return
    const command = debugInput.trim()
    setDebugInput('')
    setDebugLog(log => [...log, `> ${command}`, 'Runtime de depuracion no conectado.'])
  }

  return (
    <section className="cipher-terminal-enter flex h-80 flex-shrink-0 flex-col overflow-hidden border-t border-white/[0.07] bg-[#070912]">
      <header className="flex h-10 flex-shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0b0f19] px-3">
        <div className="flex h-full items-center gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = bottomPanel === tab.id
            const problemCount = tab.id === 'problems' && problems.length > 0 ? problems.length : null

            return (
              <button
                key={tab.id}
                onClick={() => setBottomPanel(tab.id)}
                className={`flex h-full items-center gap-2 border-b-2 px-3 text-[11px] font-medium uppercase tracking-[0.08em] transition-all ${
                  active
                    ? 'border-[#4fc3f7] text-[#dce4ff]'
                    : 'border-transparent text-[#7f8bb0] hover:text-white'
                }`}
              >
                <Icon size={13} />
                {tab.label}
                {problemCount !== null && (
                  <span className="rounded-full bg-[#ff6b6b]/18 px-1.5 py-0.5 text-[10px] text-[#ff9a9a]">
                    {problemCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setTerminalVisible(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7f8bb0] transition-all hover:bg-white/[0.06] hover:text-white"
          title="Cerrar panel"
        >
          <X size={15} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {bottomPanel === 'terminal' && <TerminalPanel />}

        {bottomPanel === 'problems' && (
          <div className="h-full overflow-y-auto p-3 text-[12px]">
            <div className="mb-3 flex items-center justify-between text-[#8d99bd]">
              <span>{activeFileName}</span>
              <span>{problems.length} problema{problems.length === 1 ? '' : 's'}</span>
            </div>
            {problems.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-[#6f7a9d]">
                No se detectaron problemas basicos en el archivo activo.
              </div>
            ) : (
              <div className="space-y-1">
                {problems.map((problem, index) => (
                  <div key={`${problem.line}-${index}`} className="flex items-start gap-3 rounded-lg px-2 py-2 text-[#c5cef0] hover:bg-white/[0.04]">
                    <CircleAlert
                      size={14}
                      className={
                        problem.severity === 'error' ? 'mt-0.5 text-[#ff6b6b]' :
                        problem.severity === 'warning' ? 'mt-0.5 text-[#ffcc66]' :
                        'mt-0.5 text-[#4fc3f7]'
                      }
                    />
                    <span className="w-16 flex-shrink-0 text-[#7f8bb0]">Ln {problem.line}</span>
                    <span className="min-w-0 flex-1">{problem.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {bottomPanel === 'output' && (
          <div className="h-full overflow-y-auto p-4 font-mono text-[12px] leading-6 text-[#b7c1de]">
            <div>[Cipher] Renderer compilado con Vite.</div>
            <div>[Cipher] Usa la paleta para ejecutar pnpm build, lint o dev.</div>
            <div>[Cipher] Los mensajes de tareas y extensiones se conectaran aqui en proximas versiones.</div>
          </div>
        )}

        {bottomPanel === 'debug' && (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-6 text-[#b7c1de]">
              {debugLog.map((entry, index) => (
                <div key={index}>{entry}</div>
              ))}
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
              <button
                onClick={runDebugCommand}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7f8bb0] transition-all hover:bg-white/[0.06] hover:text-white"
                title="Ejecutar"
              >
                <Play size={13} />
              </button>
            </div>
          </div>
        )}

        {bottomPanel === 'ports' && (
          <div className="h-full overflow-y-auto p-4 text-[12px] text-[#b7c1de]">
            <div className="mb-3 text-[#8d99bd]">Puertos reenviados y detectados</div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0b0f19] p-4 text-[#6f7a9d]">
              No hay puertos registrados todavia. La deteccion automatica de servidores locales se conectara a las tareas y terminales en una siguiente version.
            </div>
          </div>
        )}

        {bottomPanel === 'azure' && (
          <div className="h-full overflow-y-auto p-4 text-[12px] text-[#b7c1de]">
            <div className="mb-3 text-[#8d99bd]">Azure</div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0b0f19] p-4 text-[#6f7a9d]">
              Extension point preparado para cuentas, recursos y despliegues Azure. Aun no hay autenticacion conectada.
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
