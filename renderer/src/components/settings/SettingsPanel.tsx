import { useRef, useState } from 'react'
import {
  Bot, Code2, Focus, Keyboard, KeyRound,
  MonitorCheck, Palette, RotateCcw, Save, Server,
  SlidersHorizontal, TestTube2, X,
} from 'lucide-react'
import { useStore, BUILT_IN_THEMES } from '../../store/useStore'

const PROVIDER_KEYS = [
  { id: 'openrouter', label: 'OpenRouter',    hint: 'Key por defecto para modelos OpenRouter'  },
  { id: 'nim',        label: 'NVIDIA NIM',    hint: 'Key por defecto para modelos NVIDIA NIM'  },
  { id: 'openai',     label: 'OpenAI',        hint: 'Key para GPT y Codex API'                 },
  { id: 'anthropic',  label: 'Anthropic',     hint: 'Key para Claude API'                      },
  { id: 'google',     label: 'Google Gemini', hint: 'Key de Google AI Studio'                  },
  { id: 'deepseek',   label: 'DeepSeek',      hint: 'Key para DeepSeek API'                    },
  { id: 'kimi',       label: 'Kimi',          hint: 'Key para Moonshot/Kimi'                   },
  { id: 'qwen',       label: 'Qwen',          hint: 'Key para DashScope/Qwen'                  },
]

const EDITOR_SETTINGS = [
  { id: 'formatOnSave', label: 'Formatear al guardar'             },
  { id: 'autoSave',     label: 'Autoguardado experimental'        },
  { id: 'wordWrap',     label: 'Ajuste de linea'                  },
  { id: 'minimap',      label: 'Minimapa'                         },
  { id: 'aiContext',    label: 'Enviar archivo activo como contexto IA' },
]

function providerKeyId(provider: string) {
  return `cipher-provider-api-key-${provider}`
}

function modelKeyId(provider: string, model: string) {
  return `cipher-model-api-key-${provider}:${model}`
}

// ── KeyBindingRow ────────────────────────────────────────

function KeyBindingRow({
  id, label, currentKey, defaultKey,
  onSave,
}: {
  id: string
  label: string
  currentKey: string
  defaultKey: string
  onSave: (id: string, key: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [captured, setCaptured] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startCapture = () => {
    setCaptured('')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    const parts: string[] = []
    if (e.ctrlKey)  parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey)   parts.push('Alt')

    const key = e.key
    // Ignore pure modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return

    // Display key nicely
    const displayKey = key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key
    parts.push(displayKey)
    setCaptured(parts.join('+'))
  }

  const confirm = () => {
    if (captured) onSave(id, captured)
    setEditing(false)
    setCaptured('')
  }

  const cancel = () => {
    setEditing(false)
    setCaptured('')
  }

  const isModified = currentKey !== defaultKey

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--cipher-border)] py-2.5">
      <span className={`text-[13px] ${isModified ? 'text-[var(--cipher-accent)]' : 'text-[var(--cipher-text)]'}`}>
        {label}
        {isModified && (
          <span className="ml-2 text-[11px] text-[#7c4dff]">modificado</span>
        )}
      </span>

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              ref={inputRef}
              onKeyDown={handleKeyDown}
              onBlur={cancel}
              readOnly
              value={captured || 'Presiona una tecla...'}
              className="h-8 w-44 rounded-lg border border-[#7c4dff] bg-[#0d0f1a] px-3 text-center text-[12px] text-[#c5b8ff] outline-none"
            />
            {captured && (
              <button
                onMouseDown={confirm}
                className="h-8 rounded-lg bg-[#7c4dff] px-3 text-[12px] text-white transition-all hover:bg-[#8b74ff]"
              >
                OK
              </button>
            )}
            <button
              onMouseDown={cancel}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] transition-all hover:text-white"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startCapture}
              className="flex h-8 min-w-24 items-center justify-center rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 font-mono text-[12px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:bg-[var(--cipher-accent-bg)]"
            >
              {currentKey}
            </button>
            {isModified && (
              <button
                onClick={() => onSave(id, defaultKey)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] transition-all hover:text-[#ffd93d]"
                title="Restaurar por defecto"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────

export default function SettingsPanel() {
  const { keyBindings, setKeyBinding, resetKeyBindings, toggleFocusMode, themeId, setTheme } = useStore()

  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      PROVIDER_KEYS.map(p => [p.id, localStorage.getItem(providerKeyId(p.id)) || ''])
    )
  )
  const [provider, setProvider] = useState('openrouter')
  const [modelName, setModelName] = useState('')
  const [modelKey, setModelKey] = useState('')
  const [editorSettings, setEditorSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      EDITOR_SETTINGS.map(s => [s.id, localStorage.getItem(`cipher-setting-${s.id}`) !== 'false'])
    )
  )
  const [status, setStatus] = useState<string | null>(null)

  const [ollamaUrlInput, setOllamaUrlInput] = useState(() => localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434')
  const [lmstudioUrlInput, setLmstudioUrlInput] = useState(() => localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234')

  const saveLocalUrl = (kind: 'ollama' | 'lmstudio', val: string) => {
    const formatted = val.trim().replace(/\/$/, '')
    localStorage.setItem(`cipher-${kind}-url`, formatted)
    setStatus(`URL de ${kind === 'ollama' ? 'Ollama / Nube' : 'LM Studio'} guardada.`)
    setTimeout(() => setStatus(null), 2000)
  }

  const saveProviderKey = (id: string) => {
    localStorage.setItem(providerKeyId(id), providerKeys[id] || '')
    setStatus(`${PROVIDER_KEYS.find(item => item.id === id)?.label} guardado.`)
    setTimeout(() => setStatus(null), 2000)
  }

  const saveModelKey = () => {
    if (!modelName.trim() || !modelKey.trim()) return
    localStorage.setItem(modelKeyId(provider, modelName.trim()), modelKey.trim())
    setModelName('')
    setModelKey('')
    setStatus('API key por modelo guardada.')
    setTimeout(() => setStatus(null), 2000)
  }

  const testLocal = async (kind: 'ollama' | 'lmstudio') => {
    const storedUrl = localStorage.getItem(`cipher-${kind}-url`)
    const defaultUrl = kind === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'
    const baseUrl = (storedUrl || defaultUrl).trim().replace(/\/$/, '')
    const url = kind === 'ollama' ? `${baseUrl}/api/tags` : `${baseUrl}/v1/models`
    const name = kind === 'ollama' ? 'Ollama' : 'LM Studio'
    setStatus(`Probando ${name} en ${baseUrl}...`)
    try {
      const res = await fetch(url)
      setStatus(res.ok ? `${name} respondio correctamente.` : `Respuesta HTTP ${res.status}.`)
    } catch {
      setStatus(`${name} no esta respondiendo en esa URL.`)
    }
    setTimeout(() => setStatus(null), 3000)
  }

  const saveEditorSettings = () => {
    Object.entries(editorSettings).forEach(([id, enabled]) => {
      localStorage.setItem(`cipher-setting-${id}`, String(enabled))
    })
    setStatus('Preferencias del editor guardadas.')
    setTimeout(() => setStatus(null), 2000)
  }

  const checkCli = async (tool: 'claude' | 'codex') => {
    const name = tool === 'claude' ? 'Claude Code' : 'Codex CLI'
    setStatus(`Comprobando ${name}...`)
    const result = await window.cipher.aiCliCheck(tool)
    setStatus(result.installed ? `${name} listo: ${result.version}` : result.error || 'No instalado.')
    setTimeout(() => setStatus(null), 4000)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="space-y-5">

        {/* ── Temas ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <SectionHeader icon={<Palette size={17} />} color="text-[#c084fc]" bg="bg-[#a855f7]/14"
            title="Tema" sub="Cambia el color base de toda la interfaz." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BUILT_IN_THEMES.map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTheme(theme.id)}
                className={`group flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-300 ${
                  themeId === theme.id
                    ? 'border-[var(--cipher-accent)] bg-[var(--cipher-accent-bg)] shadow-[0_8px_20px_-6px_rgba(122,92,255,0.3)]'
                    : 'border-[var(--cipher-border)] bg-[var(--cipher-surface)]/30 hover:border-white/[0.15] hover:bg-white/[0.04]'
                }`}
              >
                {/* Visual miniature preview */}
                <div
                  className="h-16 w-full p-1.5 flex gap-1 relative overflow-hidden transition-all duration-300 group-hover:opacity-95"
                  style={{ backgroundColor: theme.bg }}
                >
                  {/* Miniature Sidebar */}
                  <div
                    className="w-1/4 rounded-md border border-white/[0.03] flex flex-col gap-1 p-1"
                    style={{ backgroundColor: theme.surfaceAlt }}
                  >
                    <div className="h-1 w-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
                    <div className="h-0.5 w-full opacity-30 rounded-full" style={{ backgroundColor: theme.text }} />
                    <div className="h-0.5 w-2/3 opacity-30 rounded-full" style={{ backgroundColor: theme.text }} />
                  </div>
                  {/* Miniature Editor area */}
                  <div
                    className="flex-1 rounded-md border border-white/[0.03] p-1.5 flex flex-col justify-between"
                    style={{ backgroundColor: theme.surface }}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="h-0.5 w-1/2 opacity-40 rounded-full" style={{ backgroundColor: theme.text }} />
                      <div className="h-0.5 w-3/4 opacity-40 rounded-full" style={{ backgroundColor: theme.text }} />
                      <div className="h-0.5 w-1/3 opacity-20 rounded-full" style={{ backgroundColor: theme.text }} />
                    </div>
                    {/* Miniature terminal or status bar */}
                    <div className="flex justify-between items-center mt-1">
                      <div className="h-1 w-3 rounded-full" style={{ backgroundColor: theme.accentAlt }} />
                      <div className="h-1 w-1 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
                    </div>
                  </div>
                </div>
                {/* Theme Name & Badge */}
                <div className="p-3 flex items-center justify-between w-full border-t border-white/[0.04] bg-black/[0.1]">
                  <span className="font-medium text-[13px] text-[var(--cipher-text)] group-hover:text-white transition-colors truncate">
                    {theme.name}
                  </span>
                  {themeId === theme.id && (
                    <span className="h-2 w-2 rounded-full bg-[var(--cipher-accent)] shadow-[0_0_8px_var(--cipher-accent)]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── API keys por proveedor ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <SectionHeader icon={<KeyRound size={17} />} color="text-[var(--cipher-accent)]" bg="bg-[var(--cipher-accent-bg)]"
            title="API keys por proveedor" sub="Se usan como fallback para todos los modelos del proveedor." />
          <div className="space-y-3">
            {PROVIDER_KEYS.map(item => (
              <div key={item.id} className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--cipher-text)]">{item.label}</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={providerKeys[item.id] || ''}
                    onChange={e => setProviderKeys(k => ({ ...k, [item.id]: e.target.value }))}
                    placeholder={item.hint}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
                  />
                  <button onClick={() => saveProviderKey(item.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white">
                    <Save size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── API key por modelo ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <SectionHeader icon={<Server size={17} />} color="text-[#80d8ff]" bg="bg-[#4fc3f7]/12"
            title="API key por modelo" sub="Para modelos con key propia en OpenRouter o NVIDIA NIM." />
          <div className="grid grid-cols-2 gap-2">
            {PROVIDER_KEYS.map(item => (
              <button key={item.id} onClick={() => setProvider(item.id)}
                className={`h-10 rounded-xl border text-[13px] transition-all ${
                  provider === item.id
                    ? 'border-[var(--cipher-accent)] bg-[var(--cipher-accent-bg)] text-white'
                    : 'border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] hover:text-white'
                }`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <input value={modelName} onChange={e => setModelName(e.target.value)}
              placeholder="Nombre/ID del modelo"
              className="h-10 w-full rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]" />
            <input type="password" value={modelKey} onChange={e => setModelKey(e.target.value)}
              placeholder="API key de ese modelo"
              className="h-10 w-full rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]" />
            <button onClick={saveModelKey}
              className="h-10 w-full rounded-xl bg-[var(--cipher-accent)] text-[13px] font-medium text-white transition-all hover:opacity-80">
              Guardar API key de modelo
            </button>
          </div>
        </section>

        {/* ── Atajos de teclado ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <SectionHeader icon={<Keyboard size={17} />} color="text-[#ffc46b]" bg="bg-[#ffab40]/12"
              title="Atajos de teclado" sub="Haz click en un atajo para reasignarlo." />
            <button onClick={resetKeyBindings}
              title="Restaurar todos los atajos"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--cipher-border)] px-2.5 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:border-[#ffd93d]/30 hover:text-[#ffd93d]">
              <RotateCcw size={12} />
              Restaurar
            </button>
          </div>
          <div className="divide-y divide-[var(--cipher-border)]">
            {keyBindings.map(kb => (
              <KeyBindingRow
                key={kb.id}
                id={kb.id}
                label={kb.label}
                currentKey={kb.currentKey}
                defaultKey={kb.defaultKey}
                onSave={setKeyBinding}
              />
            ))}
          </div>
        </section>

        {/* ── Modo enfoque ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <SectionHeader icon={<Focus size={17} />} color="text-[var(--cipher-accent)]" bg="bg-[var(--cipher-accent-bg)]"
            title="Modo enfoque" sub="Oculta toda la UI y deja solo el editor." />
          <button onClick={toggleFocusMode}
            className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--cipher-accent-soft)] bg-[var(--cipher-accent-bg)] text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:opacity-80">
            <Focus size={14} />
            Activar modo enfoque
            <kbd className="ml-1 rounded border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-2 py-0.5 text-[11px]">Ctrl+K Z</kbd>
          </button>
        </section>

        {/* ── Editor preferencias ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <SectionHeader icon={<SlidersHorizontal size={17} />} color="text-[#80d8ff]" bg="bg-[#4fc3f7]/12"
            title="Editor" sub="Preferencias base del editor." />
          <div className="space-y-2">
            {/* Splash screen toggle */}
            <label className="flex h-10 cursor-pointer items-center justify-between rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 text-[13px] text-[var(--cipher-text)]">
              <span className="flex flex-col">
                <span>Omitir splash screen al iniciar</span>
                <span className="text-[11px] text-[var(--cipher-text-muted)]">La app abre directamente con animación de entrada</span>
              </span>
              <input
                type="checkbox"
                checked={localStorage.getItem('cipher-skip-splash') === 'true'}
                onChange={e => {
                  localStorage.setItem('cipher-skip-splash', String(e.target.checked))
                  setStatus(e.target.checked ? 'Splash desactivado — efectivo al reiniciar.' : 'Splash activado — efectivo al reiniciar.')
                  setTimeout(() => setStatus(null), 2500)
                }}
                className="accent-[var(--cipher-accent)]"
              />
            </label>
            {EDITOR_SETTINGS.map(setting => (
              <label key={setting.id}
                className="flex h-10 cursor-pointer items-center justify-between rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 text-[13px] text-[var(--cipher-text)]">
                <span>{setting.label}</span>
                <input type="checkbox" checked={editorSettings[setting.id]}
                  onChange={e => setEditorSettings(s => ({ ...s, [setting.id]: e.target.checked }))}
                  className="accent-[var(--cipher-accent)]" />
              </label>
            ))}
          </div>
          <button onClick={saveEditorSettings}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--cipher-accent)] text-[13px] font-medium text-white transition-all hover:opacity-80">
            <Code2 size={14} />
            Guardar preferencias
          </button>
        </section>

        {/* ── Agentes externos ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <SectionHeader icon={<Bot size={17} />} color="text-[#ffc46b]" bg="bg-[#ffab40]/12"
            title="Agentes externos" sub="Compatibilidad con Claude Code y OpenAI Codex CLI." />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => checkCli('claude')}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:text-white">
              <TestTube2 size={14} /> Claude Code
            </button>
            <button onClick={() => checkCli('codex')}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:text-white">
              <TestTube2 size={14} /> Codex CLI
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] p-3 font-mono text-[11px] leading-5 text-[var(--cipher-text-muted)]">
            npm install -g @anthropic-ai/claude-code<br />
            npm install -g @openai/codex
          </div>
        </section>

        {/* ── Servicios locales ── */}
        <section className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)]/50 p-4">
          <SectionHeader icon={<MonitorCheck size={17} />} color="text-[#56d364]" bg="bg-[#2ea043]/14"
            title="Servicios locales" sub="Configura y comprueba si Ollama o LM Studio estan activos." />
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[var(--cipher-text)]">Ollama URL / Nube</label>
                <span className="text-[10px] text-[var(--cipher-text-muted)]">Por defecto: http://localhost:11434</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ollamaUrlInput}
                  onChange={e => setOllamaUrlInput(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
                />
                <button onClick={() => saveLocalUrl('ollama', ollamaUrlInput)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                  title="Guardar URL">
                  <Save size={15} />
                </button>
                <button onClick={() => testLocal('ollama')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                  title="Probar conexion">
                  <TestTube2 size={15} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[var(--cipher-text)]">LM Studio URL</label>
                <span className="text-[10px] text-[var(--cipher-text-muted)]">Por defecto: http://localhost:1234</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lmstudioUrlInput}
                  onChange={e => setLmstudioUrlInput(e.target.value)}
                  placeholder="http://localhost:1234"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
                />
                <button onClick={() => saveLocalUrl('lmstudio', lmstudioUrlInput)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                  title="Guardar URL">
                  <Save size={15} />
                </button>
                <button onClick={() => testLocal('lmstudio')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                  title="Probar conexion">
                  <TestTube2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Status */}
        {status && (
          <div className="cipher-fade-up rounded-xl border border-[var(--cipher-accent-soft)] bg-[var(--cipher-accent-bg)] p-3 text-[13px] text-[var(--cipher-text)]">
            {status}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SectionHeader helper ─────────────────────────────────

function SectionHeader({
  icon, color, bg, title, sub,
}: {
  icon: React.ReactNode
  color: string
  bg: string
  title: string
  sub: string
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
        {icon}
      </span>
      <div>
      <h3 className="text-[14px] font-semibold text-[var(--cipher-text)]">{title}</h3>
        <p className="text-[12px] text-[var(--cipher-text-muted)]">{sub}</p>
      </div>
    </div>
  )
}