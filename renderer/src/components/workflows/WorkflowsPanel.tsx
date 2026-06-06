import { Play, Workflow, Code2 } from 'lucide-react'
import { useState } from 'react'
import { useStore, SUPPORTED_LANGUAGES } from '../../store/useStore'
import { getLanguage, isSupportedLanguage } from '../../utils/fileUtils'

type WorkflowItem = {
  id: string
  title: string
  description: string
  command: string
}

const PRESET_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'lint-fix',
    title: 'Linter/Corrector',
    description: 'Ejecuta lint para detectar o corregir problemas comunes.',
    command: 'pnpm lint',
  },
  {
    id: 'generate-tests',
    title: 'Generar Tests',
    description: 'Dispara la generación de tests desde el asistente IA.',
    command: 'Genera tests unitarios para el archivo activo',
  },
  {
    id: 'document-functions',
    title: 'Documentar funciones',
    description: 'Pide documentación automática de funciones del archivo activo.',
    command: 'Documenta funciones del archivo activo con comentarios claros',
  },
]

export default function WorkflowsPanel() {
  const {
    activeTabPath,
    tabs,
    runBuildCommand,
    runLintCommand,
    setBottomPanel,
    setTerminalVisible,
    setSidebarPanel,
  } = useStore()
  const [logs, setLogs] = useState<string[]>([])

  const activeTab = tabs.find(t => t.path === activeTabPath)
  const activeFileName = activeTab ? activeTab.name : null
  const activeLang = activeFileName ? (getLanguage(activeFileName) as typeof SUPPORTED_LANGUAGES[number]) : null
  const hasSupportedLang = activeFileName ? isSupportedLanguage(activeFileName) : false

  const runWorkflow = (item: WorkflowItem) => {
    const stamp = new Date().toLocaleTimeString('es')
    setLogs(prev => [`[${stamp}] Ejecutando "${item.title}"`, ...prev].slice(0, 40))

    if (item.id === 'lint-fix') {
      setBottomPanel('terminal')
      setTerminalVisible(true)
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: item.command }))
      }, 150)
      return
    }

    setSidebarPanel('ai')
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cipher-ai-query', { detail: { text: item.command, mode: 'dev' } }))
    }, 120)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--cipher-border)] px-4 py-3">
        <Workflow size={15} className="text-[var(--cipher-accent)]" />
        <span className="text-[12px] text-[var(--cipher-text-muted)]">Workflows experimentales (BETA)</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {hasSupportedLang && activeLang && (
          <div className="mb-4 space-y-2.5 border-b border-[var(--cipher-border)] pb-4">
            <div className="flex items-center gap-2 px-1 pb-1">
              <Code2 size={13} className="text-[var(--cipher-accent)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cipher-text)]">
                Acciones para {activeLang.toUpperCase()} ({activeFileName})
              </span>
            </div>

            {/* Build command card */}
            <div className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-3">
              <div className="text-[13px] font-medium text-[var(--cipher-text)]">Compilar / Construir</div>
              <p className="mt-1 text-[12px] text-[var(--cipher-text-muted)]">
                {activeLang === 'python' && 'Ejecuta scripts/build-python.sh para empaquetar/validar.'}
                {activeLang === 'cpp' && 'Compila el código C++ ejecutando scripts/build-cpp.sh.'}
                {activeLang === 'rust' && 'Ejecuta scripts/build-rust.sh (cargo build) en el proyecto.'}
              </p>
              <div className="flex">
                <button
                  onClick={() => {
                    const stamp = new Date().toLocaleTimeString('es')
                    setLogs(prev => [`[${stamp}] Compilando (${activeLang.toUpperCase()})...`, ...prev].slice(0, 40))
                    setBottomPanel('terminal')
                    setTerminalVisible(true)
                    setTimeout(() => {
                      runBuildCommand(activeLang)
                    }, 150)
                  }}
                  className="mt-3 flex h-8 items-center gap-2 rounded-lg bg-[var(--cipher-accent-bg)] px-3 text-[12px] text-[var(--cipher-text)] transition-all hover:bg-[var(--cipher-accent-soft)]"
                >
                  <Play size={12} />
                  {activeLang === 'rust' ? 'Cargo Build' : 'Ejecutar Compilación'}
                </button>
                {activeLang === 'rust' && (
                  <button
                    onClick={() => {
                      const stamp = new Date().toLocaleTimeString('es')
                      setLogs(prev => [`[${stamp}] Ejecutando Cargo Check...`, ...prev].slice(0, 40))
                      setBottomPanel('terminal')
                      setTerminalVisible(true)
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: 'cargo check' }))
                      }, 150)
                    }}
                    className="mt-3 ml-2 flex h-8 items-center gap-2 rounded-lg bg-[var(--cipher-accent-bg)] px-3 text-[12px] text-[var(--cipher-text)] transition-all hover:bg-[var(--cipher-accent-soft)]"
                  >
                    <Play size={12} />
                    Cargo Check
                  </button>
                )}
              </div>
            </div>

            {/* Lint command card */}
            <div className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-3">
              <div className="text-[13px] font-medium text-[var(--cipher-text)]">Analizar Linter (Lint)</div>
              <p className="mt-1 text-[12px] text-[var(--cipher-text-muted)]">
                {activeLang === 'python' && 'Ejecuta flake8 para comprobar el cumplimiento de estilo.'}
                {activeLang === 'cpp' && 'Corre cppcheck para analizar estáticamente errores de C++.'}
                {activeLang === 'rust' && 'Ejecuta cargo clippy para verificar advertencias y errores de Rust.'}
              </p>
              <button
                onClick={() => {
                  const stamp = new Date().toLocaleTimeString('es')
                  setLogs(prev => [`[${stamp}] Ejecutando linter (${activeLang.toUpperCase()})...`, ...prev].slice(0, 40))
                  setBottomPanel('terminal')
                  setTerminalVisible(true)
                  setTimeout(() => {
                    runLintCommand(activeLang)
                  }, 150)
                }}
                className="mt-3 flex h-8 items-center gap-2 rounded-lg bg-[var(--cipher-accent-bg)] px-3 text-[12px] text-[var(--cipher-text)] transition-all hover:bg-[var(--cipher-accent-soft)]"
              >
                <Play size={12} />
                Ejecutar Linter
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {PRESET_WORKFLOWS.map(item => (
            <div key={item.id} className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-3">
              <div className="text-[13px] font-medium text-[var(--cipher-text)]">{item.title}</div>
              <p className="mt-1 text-[12px] text-[var(--cipher-text-muted)]">{item.description}</p>
              <button
                onClick={() => runWorkflow(item)}
                className="mt-3 flex h-8 items-center gap-2 rounded-lg bg-[var(--cipher-accent-bg)] px-3 text-[12px] text-[var(--cipher-text)] transition-all hover:bg-[var(--cipher-accent-soft)]"
              >
                <Play size={12} />
                Ejecutar
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--cipher-text-muted)]">Logs</div>
          {logs.length === 0 ? (
            <div className="text-[12px] text-[var(--cipher-text-muted)]">Sin ejecuciones todavía.</div>
          ) : (
            <div className="space-y-1 text-[12px] text-[var(--cipher-text)]">
              {logs.map((line, idx) => <div key={`${line}-${idx}`}>{line}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

