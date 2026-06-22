import { useRef, useState, useEffect } from 'react'
import {
  Bot, Code2, Focus, Keyboard, KeyRound,
  MonitorCheck, Palette, RotateCcw, Save, Server,
  SlidersHorizontal, TestTube2, X, Trash2, Plus,
  CheckCircle2, XCircle, Loader2, RefreshCw,
} from 'lucide-react'
import { useStore, BUILT_IN_THEMES } from '../../store/useStore'

// ── Constants ─────────────────────────────────────────────

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
  { id: 'wordWrap',     label: 'Ajuste de línea'                  },
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
  id, label, currentKey, defaultKey, onSave,
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
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return
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
              value={captured || 'Presiona una tecla…'}
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

// ── SectionHeader ─────────────────────────────────────────

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
    <div className="mb-5 flex items-center gap-3">
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

// ── Tab definitions ────────────────────────────────────────

const SETTINGS_TABS = [
  { id: 'appearance', label: 'Apariencia',  icon: Palette,          color: 'text-[#c084fc]', bg: 'bg-[#a855f7]/14' },
  { id: 'apikeys',    label: 'API Keys',    icon: KeyRound,          color: 'text-[var(--cipher-accent)]', bg: 'bg-[var(--cipher-accent-bg)]' },
  { id: 'keybinds',  label: 'Atajos',      icon: Keyboard,          color: 'text-[#ffc46b]', bg: 'bg-[#ffab40]/12' },
  { id: 'editor',    label: 'Editor',      icon: SlidersHorizontal, color: 'text-[#80d8ff]', bg: 'bg-[#4fc3f7]/12' },
  { id: 'agents',    label: 'Agentes',     icon: Bot,               color: 'text-[#56d364]', bg: 'bg-[#2ea043]/14' },
] as const

type SettingsTab = typeof SETTINGS_TABS[number]['id']

// ── Main component ───────────────────────────────────────

export default function SettingsPanel() {
  const {
    keyBindings, setKeyBinding, resetKeyBindings,
    toggleFocusMode, themeId, setTheme,
    currentFolder,
  } = useStore()

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')

  // ── Agentic Guidelines & Skills State ───────────────────
  const [agentsMdContent, setAgentsMdContent] = useState('')
  const [skillsList, setSkillsList] = useState<{ name: string; content: string; desc?: string }[]>([])
  const [editingSkillName, setEditingSkillName] = useState('')
  const [editingSkillDesc, setEditingSkillDesc] = useState('')
  const [editingSkillPrompt, setEditingSkillPrompt] = useState('')
  const [showSkillForm, setShowSkillForm] = useState(false)

  useEffect(() => {
    if (activeTab !== 'agents' || !currentFolder) return

    const loadData = async () => {
      try {
        const content = await window.cipher.readFile(`${currentFolder}/AGENTS.md`)
        setAgentsMdContent(content || '')
      } catch (e) {
        setAgentsMdContent('')
      }

      try {
        const skillsPath = `${currentFolder}/.agents/skills`
        const entries = await window.cipher.readDirectory(skillsPath)
        const loaded: { name: string; content: string; desc?: string }[] = []
        if (entries && Array.isArray(entries)) {
          for (const entry of entries) {
            if (entry.isDirectory) {
              try {
                const skillContent = await window.cipher.readFile(`${skillsPath}/${entry.name}/SKILL.md`)
                if (skillContent) {
                  let desc = ''
                  const match = skillContent.match(/description:\s*"(.*?)"/) || skillContent.match(/description:\s*'(.*?)'/) || skillContent.match(/description:\s*([^\r\n]+)/)
                  if (match) desc = match[1]
                  loaded.push({ name: entry.name, content: skillContent, desc })
                }
              } catch (e) {}
            }
          }
        }
        setSkillsList(loaded)
      } catch (e) {
        setSkillsList([])
      }
    }

    loadData()
  }, [activeTab, currentFolder])

  const saveAgentsMd = async () => {
    if (!currentFolder) return
    try {
      await window.cipher.saveFile(`${currentFolder}/AGENTS.md`, agentsMdContent)
      showStatus('Directrices guardadas en AGENTS.md')
    } catch (err: any) {
      showStatus(`Error al guardar: ${err.message}`)
    }
  }

  const saveSkill = async () => {
    if (!currentFolder || !editingSkillName.trim()) return
    const slug = editingSkillName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    const skillDir = `${currentFolder}/.agents/skills/${slug}`
    const filePath = `${skillDir}/SKILL.md`
    const fileContent = `---
name: "${editingSkillName.trim()}"
description: "${editingSkillDesc.trim()}"
---

${editingSkillPrompt.trim()}`

    try {
      await window.cipher.saveFile(filePath, fileContent)
      showStatus(`Skill '${slug}' guardada.`)
      setSkillsList(prev => {
        const filtered = prev.filter(s => s.name !== slug)
        return [...filtered, { name: slug, content: fileContent, desc: editingSkillDesc.trim() }]
      })
      setEditingSkillName('')
      setEditingSkillDesc('')
      setEditingSkillPrompt('')
      setShowSkillForm(false)
    } catch (err: any) {
      showStatus(`Error al guardar skill: ${err.message}`)
    }
  }

  const deleteSkill = async (name: string) => {
    if (!currentFolder) return
    const filePath = `${currentFolder}/.agents/skills/${name}/SKILL.md`
    try {
      await (window as any).cipher.deleteFile(filePath)
      showStatus(`Skill '${name}' eliminada.`)
      setSkillsList(prev => prev.filter(s => s.name !== name))
    } catch (err: any) {
      showStatus(`Error al eliminar: ${err.message}`)
    }
  }

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

  const [ollamaUrlInput, setOllamaUrlInput] = useState(
    () => localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434'
  )
  const [lmstudioUrlInput, setLmstudioUrlInput] = useState(
    () => localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234'
  )

  const [status, setStatus] = useState<string | null>(null)

  const showStatus = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 2500)
  }

  const saveLocalUrl = (kind: 'ollama' | 'lmstudio', val: string) => {
    const formatted = val.trim().replace(/\/$/, '')
    localStorage.setItem(`cipher-${kind}-url`, formatted)
    showStatus(`URL de ${kind === 'ollama' ? 'Ollama' : 'LM Studio'} guardada.`)
  }

  const saveProviderKey = (id: string) => {
    localStorage.setItem(providerKeyId(id), providerKeys[id] || '')
    showStatus(`${PROVIDER_KEYS.find(item => item.id === id)?.label} guardado.`)
    // Reset detection state when key changes
    setDetectedModels(prev => ({ ...prev, [id]: [] }))
    setProviderStatus(prev => ({ ...prev, [id]: 'idle' }))
  }

  // ── Dynamic model detection ─────────────────────────────
  const [detectedModels, setDetectedModels] = useState<Record<string, { id: string; name: string }[]>>({})
  const [providerStatus, setProviderStatus] = useState<Record<string, 'idle' | 'testing' | 'valid' | 'invalid' | 'nokey'>>({})

  const detectModels = async (providerId: string) => {
    const key = providerKeys[providerId] || ''
    const label = PROVIDER_KEYS.find(item => item.id === providerId)?.label || providerId

    // Anthropic uses static list — no detection needed
    if (providerId === 'anthropic') {
      setProviderStatus(prev => ({ ...prev, [providerId]: 'valid' }))
      showStatus(`${label}: modelos conocidos disponibles (sin endpoint de listado).`)
      return
    }

    if (!key.trim()) {
      setProviderStatus(prev => ({ ...prev, [providerId]: 'nokey' }))
      showStatus(`${label}: ingresa una API key primero.`)
      return
    }

    setProviderStatus(prev => ({ ...prev, [providerId]: 'testing' }))
    try {
      const models = await window.cipher.aiListModels({
        provider: providerId,
        apiKey: key,
        baseUrl: providerId === 'nim' ? 'https://integrate.api.nvidia.com' : undefined,
      })
      if (models && models.length > 0) {
        setDetectedModels(prev => ({ ...prev, [providerId]: models }))
        setProviderStatus(prev => ({ ...prev, [providerId]: 'valid' }))
        showStatus(`${label}: ${models.length} modelo${models.length !== 1 ? 's' : ''} detectado${models.length !== 1 ? 's' : ''}.`)
      } else {
        setProviderStatus(prev => ({ ...prev, [providerId]: 'invalid' }))
        showStatus(`${label}: key inválida o sin modelos disponibles.`)
      }
    } catch {
      setProviderStatus(prev => ({ ...prev, [providerId]: 'invalid' }))
      showStatus(`${label}: error al conectar con el proveedor.`)
    }
  }

  const saveModelKey = () => {
    if (!modelName.trim() || !modelKey.trim()) return
    localStorage.setItem(modelKeyId(provider, modelName.trim()), modelKey.trim())
    setModelName('')
    setModelKey('')
    showStatus(`Key de ${modelName} (${provider}) guardada.`)
  }

  const testLocal = async (kind: 'ollama' | 'lmstudio') => {
    const url = kind === 'ollama'
      ? (localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434')
      : (localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234')
    const name = kind === 'ollama' ? 'Ollama' : 'LM Studio'
    showStatus(`Comprobando ${name}…`)
    try {
      const res = await fetch(url)
      showStatus(res.ok ? `${name} respondió correctamente.` : `Respuesta HTTP ${res.status}.`)
    } catch {
      showStatus(`${name} no está respondiendo en esa URL.`)
    }
  }

  const saveEditorSettings = () => {
    Object.entries(editorSettings).forEach(([id, enabled]) => {
      localStorage.setItem(`cipher-setting-${id}`, String(enabled))
    })
    showStatus('Preferencias del editor guardadas.')
  }

  const checkCli = async (tool: 'claude' | 'codex') => {
    const name = tool === 'claude' ? 'Claude Code' : 'Codex CLI'
    showStatus(`Comprobando ${name}…`)
    const result = await window.cipher.aiCliCheck(tool)
    showStatus(result.installed ? `${name} listo: ${result.version}` : result.error || 'No instalado.')
  }

  // ── Input shared styles ───────────────────────────────────
  const inputCls = 'h-10 w-full rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]'

  // ── Tab contents ──────────────────────────────────────────

  const renderAppearance = () => (
    <div className="space-y-6">
      <SectionHeader
        icon={<Palette size={17} />}
        color="text-[#c084fc]"
        bg="bg-[#a855f7]/14"
        title="Tema de la interfaz"
        sub="Elige el color base de toda la UI."
      />
      <div className="grid grid-cols-2 gap-3">
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
            {/* Preview miniature */}
            <div
              className="relative flex h-16 w-full gap-1 overflow-hidden p-1.5 transition-all duration-300 group-hover:opacity-95"
              style={{ backgroundColor: theme.bg }}
            >
              <div
                className="flex w-1/4 flex-col gap-1 rounded-md border border-white/[0.03] p-1"
                style={{ backgroundColor: theme.surfaceAlt }}
              >
                <div className="h-1 w-2 animate-pulse rounded-full" style={{ backgroundColor: theme.accent }} />
                <div className="h-0.5 w-full rounded-full opacity-30" style={{ backgroundColor: theme.text }} />
                <div className="h-0.5 w-2/3 rounded-full opacity-30" style={{ backgroundColor: theme.text }} />
              </div>
              <div
                className="flex flex-1 flex-col justify-between rounded-md border border-white/[0.03] p-1.5"
                style={{ backgroundColor: theme.surface }}
              >
                <div className="flex flex-col gap-1">
                  <div className="h-0.5 w-1/2 rounded-full opacity-40" style={{ backgroundColor: theme.text }} />
                  <div className="h-0.5 w-3/4 rounded-full opacity-40" style={{ backgroundColor: theme.text }} />
                  <div className="h-0.5 w-1/3 rounded-full opacity-20" style={{ backgroundColor: theme.text }} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="h-1 w-3 rounded-full" style={{ backgroundColor: theme.accentAlt }} />
                  <div className="h-1 w-1 animate-pulse rounded-full" style={{ backgroundColor: theme.accent }} />
                </div>
              </div>
            </div>
            {/* Theme name */}
            <div className="flex w-full items-center justify-between border-t border-white/[0.04] bg-black/[0.1] p-3">
              <span className="truncate text-[13px] font-medium text-[var(--cipher-text)] transition-colors group-hover:text-white">
                {theme.name}
              </span>
              {themeId === theme.id && (
                <span className="h-2 w-2 rounded-full bg-[var(--cipher-accent)] shadow-[0_0_8px_var(--cipher-accent)]" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Focus mode */}
      <div>
        <SectionHeader
          icon={<Focus size={17} />}
          color="text-[var(--cipher-accent)]"
          bg="bg-[var(--cipher-accent-bg)]"
          title="Modo enfoque"
          sub="Oculta toda la UI y deja solo el editor."
        />
        <button
          onClick={toggleFocusMode}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--cipher-accent-soft)] bg-[var(--cipher-accent-bg)] text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:opacity-80"
        >
          <Focus size={14} />
          Activar modo enfoque
          <kbd className="ml-1 rounded border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-2 py-0.5 text-[11px]">
            Ctrl+K Z
          </kbd>
        </button>
      </div>
    </div>
  )

  const renderApiKeys = () => (
    <div className="space-y-6">
      {/* Provider keys */}
      <div>
        <SectionHeader
          icon={<KeyRound size={17} />}
          color="text-[var(--cipher-accent)]"
          bg="bg-[var(--cipher-accent-bg)]"
          title="API Keys por proveedor"
          sub="Se usan como fallback para todos los modelos del proveedor."
        />
        <div className="space-y-3">
          {PROVIDER_KEYS.map(item => {
            const status = providerStatus[item.id] || 'idle'
            const models = detectedModels[item.id] || []
            return (
              <div key={item.id} className="space-y-1">
                <label className="text-[12px] font-medium text-[var(--cipher-text)]">{item.label}</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={providerKeys[item.id] || ''}
                    onChange={e => setProviderKeys(k => ({ ...k, [item.id]: e.target.value }))}
                    placeholder={item.hint}
                    className={inputCls}
                  />
                  <button
                    onClick={() => saveProviderKey(item.id)}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                    title="Guardar API key"
                  >
                    <Save size={15} />
                  </button>
                  <button
                    onClick={() => detectModels(item.id)}
                    disabled={status === 'testing'}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white disabled:opacity-50"
                    title="Probar y detectar modelos"
                  >
                    {status === 'testing'
                      ? <Loader2 size={15} className="animate-spin" />
                      : status === 'valid'
                        ? <CheckCircle2 size={15} className="text-green-400" />
                        : status === 'invalid'
                          ? <XCircle size={15} className="text-red-400" />
                          : <RefreshCw size={15} />}
                  </button>
                </div>
                {/* Status hint */}
                {status === 'nokey' && (
                  <p className="text-[11px] text-[var(--cipher-text-muted)] italic">Ingresa una API key y guárdala primero.</p>
                )}
                {status === 'invalid' && (
                  <p className="text-[11px] text-red-400/80 italic">La key no es válida o el proveedor no respondió.</p>
                )}
                {/* Detected models list */}
                {status === 'valid' && models.length > 0 && (
                  <div className="rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] p-2 max-h-40 overflow-y-auto">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cipher-text-muted)] mb-1 px-1">
                      {models.length} modelo{models.length !== 1 ? 's' : ''} disponible{models.length !== 1 ? 's' : ''}
                    </div>
                    {models.slice(0, 30).map(m => (
                      <div key={m.id} className="truncate rounded px-1.5 py-1 text-[11px] text-[var(--cipher-text)] hover:bg-[var(--cipher-surface-alt)]" title={m.id}>
                        {m.name}
                      </div>
                    ))}
                    {models.length > 30 && (
                      <div className="px-1.5 py-1 text-[11px] text-[var(--cipher-text-muted)] italic">+{models.length - 30} más…</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Model-specific key */}
      <div>
        <SectionHeader
          icon={<Server size={17} />}
          color="text-[#80d8ff]"
          bg="bg-[#4fc3f7]/12"
          title="API Key por modelo"
          sub="Para modelos con key propia en OpenRouter o NVIDIA NIM."
        />
        <div className="mb-3 grid grid-cols-2 gap-2">
          {PROVIDER_KEYS.map(item => (
            <button
              key={item.id}
              onClick={() => setProvider(item.id)}
              className={`h-9 rounded-xl border text-[12px] transition-all ${
                provider === item.id
                  ? 'border-[var(--cipher-accent)] bg-[var(--cipher-accent-bg)] text-white'
                  : 'border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <input
            value={modelName}
            onChange={e => setModelName(e.target.value)}
            placeholder="Nombre/ID del modelo"
            className={inputCls}
          />
          <input
            type="password"
            value={modelKey}
            onChange={e => setModelKey(e.target.value)}
            placeholder="API key de ese modelo"
            className={inputCls}
          />
          <button
            onClick={saveModelKey}
            className="h-10 w-full rounded-xl bg-[var(--cipher-accent)] text-[13px] font-medium text-white transition-all hover:opacity-80"
          >
            Guardar API key de modelo
          </button>
        </div>
      </div>
    </div>
  )

  const renderKeybinds = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader
          icon={<Keyboard size={17} />}
          color="text-[#ffc46b]"
          bg="bg-[#ffab40]/12"
          title="Atajos de teclado"
          sub="Haz clic en un atajo para reasignarlo."
        />
        <button
          onClick={resetKeyBindings}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--cipher-border)] px-2.5 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:border-[#ffd93d]/30 hover:text-[#ffd93d]"
          title="Restaurar todos los atajos"
        >
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
    </div>
  )

  const renderEditor = () => (
    <div className="space-y-6">
      <SectionHeader
        icon={<SlidersHorizontal size={17} />}
        color="text-[#80d8ff]"
        bg="bg-[#4fc3f7]/12"
        title="Preferencias del editor"
        sub="Controles del comportamiento del editor Monaco."
      />
      <div className="space-y-2">
        {/* Splash toggle */}
        <label className="flex h-12 cursor-pointer items-center justify-between rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3">
          <div className="flex flex-col">
            <span className="text-[13px] text-[var(--cipher-text)]">Omitir splash screen</span>
            <span className="text-[11px] text-[var(--cipher-text-muted)]">La app abre directamente con animación de entrada</span>
          </div>
          <input
            type="checkbox"
            defaultChecked={localStorage.getItem('cipher-skip-splash') === 'true'}
            onChange={e => {
              localStorage.setItem('cipher-skip-splash', String(e.target.checked))
              showStatus(e.target.checked ? 'Splash desactivado — efectivo al reiniciar.' : 'Splash activado — efectivo al reiniciar.')
            }}
            className="accent-[var(--cipher-accent)]"
          />
        </label>

        {EDITOR_SETTINGS.map(setting => (
          <label
            key={setting.id}
            className="flex h-10 cursor-pointer items-center justify-between rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3"
          >
            <span className="text-[13px] text-[var(--cipher-text)]">{setting.label}</span>
            <input
              type="checkbox"
              checked={editorSettings[setting.id]}
              onChange={e => setEditorSettings(s => ({ ...s, [setting.id]: e.target.checked }))}
              className="accent-[var(--cipher-accent)]"
            />
          </label>
        ))}
      </div>
      <button
        onClick={saveEditorSettings}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--cipher-accent)] text-[13px] font-medium text-white transition-all hover:opacity-80"
      >
        <Code2 size={14} />
        Guardar preferencias
      </button>
    </div>
  )

  const renderAgents = () => (
    <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-1">
      {/* Directrices Agenticas */}
      <div className="border-b border-[var(--cipher-border)] pb-6">
        <SectionHeader
          icon={<Bot size={17} />}
          color="text-[#60cdff]"
          bg="bg-[#60cdff]/10"
          title="Directrices Agénticas Globales"
          sub="Configura instrucciones personalizadas que el agente seguirá siempre."
        />
        <div className="space-y-3">
          <textarea
            className="w-full h-32 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] p-3 text-[13px] text-[var(--cipher-text)] outline-none focus:border-[var(--cipher-accent)] resize-none font-mono"
            placeholder="Introduce directrices globales del agente (ej. Siempre responde en español, usa la arquitectura limpia...)"
            value={agentsMdContent}
            onChange={e => setAgentsMdContent(e.target.value)}
          />
          <button
            onClick={saveAgentsMd}
            disabled={!currentFolder}
            className="flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--cipher-accent)] px-4 text-[12px] font-semibold text-black transition-all hover:bg-[var(--cipher-accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={13} /> Guardar directrices (AGENTS.md)
          </button>
          {!currentFolder && (
            <p className="text-[11px] text-[var(--cipher-text-muted)] italic">Abre un proyecto para editar AGENTS.md</p>
          )}
        </div>
      </div>

      {/* Skills del Proyecto */}
      <div className="border-b border-[var(--cipher-border)] pb-6">
        <SectionHeader
          icon={<Code2 size={17} />}
          color="text-purple-400"
          bg="bg-purple-500/10"
          title="Skills del Proyecto (.agents/skills)"
          sub="Habilidades y herramientas personalizadas que el agente puede cargar."
        />

        {/* Skills list */}
        <div className="space-y-2 mb-4">
          {skillsList.length === 0 ? (
            <div className="text-[12px] text-[var(--cipher-text-muted)] italic">No hay skills definidas en este proyecto.</div>
          ) : (
            skillsList.map(skill => (
              <div key={skill.name} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--cipher-text)] truncate">{skill.name}</div>
                  <div className="text-[11px] text-[var(--cipher-text-muted)] truncate">{skill.desc || 'Sin descripción'}</div>
                </div>
                <button
                  onClick={() => deleteSkill(skill.name)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cipher-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Eliminar skill"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Skill button / form */}
        {!showSkillForm ? (
          <button
            onClick={() => setShowSkillForm(true)}
            disabled={!currentFolder}
            className="flex h-9 items-center justify-center gap-2 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-4 text-[12px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:bg-[var(--cipher-accent-bg)] disabled:opacity-40"
          >
            <Plus size={13} /> Crear Habilidad / Skill
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--cipher-border)] pb-2 mb-1">
              <span className="text-[12px] font-bold text-[var(--cipher-text)]">Nueva Skill</span>
              <button onClick={() => setShowSkillForm(false)} className="text-[var(--cipher-text-muted)] hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase">Nombre de la Skill (slug)</label>
              <input
                type="text"
                placeholder="ej. custom-linter"
                value={editingSkillName}
                onChange={e => setEditingSkillName(e.target.value)}
                className="w-full rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 py-2 text-[12px] text-[var(--cipher-text)] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase">Descripción</label>
              <input
                type="text"
                placeholder="ej. Valida el formato del archivo..."
                value={editingSkillDesc}
                onChange={e => setEditingSkillDesc(e.target.value)}
                className="w-full rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-3 py-2 text-[12px] text-[var(--cipher-text)] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase">Instrucciones del Prompt</label>
              <textarea
                placeholder="Define los pasos, comandos o reglas de la skill..."
                value={editingSkillPrompt}
                onChange={e => setEditingSkillPrompt(e.target.value)}
                className="w-full h-24 rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] p-3 text-[12px] text-[var(--cipher-text)] outline-none resize-none font-mono"
              />
            </div>
            <button
              onClick={saveSkill}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-purple-500 text-white text-[12px] font-semibold transition-all hover:bg-purple-600"
            >
              <Save size={13} /> Guardar Skill (.agents/skills)
            </button>
          </div>
        )}
      </div>

      {/* External agents */}
      <div className="border-b border-[var(--cipher-border)] pb-6">
        <SectionHeader
          icon={<Bot size={17} />}
          color="text-[#56d364]"
          bg="bg-[#2ea043]/14"
          title="Agentes externos"
          sub="Compatibilidad con Claude Code y OpenAI Codex CLI."
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => checkCli('claude')}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
          >
            <TestTube2 size={14} /> Claude Code
          </button>
          <button
            onClick={() => checkCli('codex')}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
          >
            <TestTube2 size={14} /> Codex CLI
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] p-3 font-mono text-[11px] leading-6 text-[var(--cipher-text-muted)]">
          npm install -g @anthropic-ai/claude-code<br />
          npm install -g @openai/codex
        </div>
      </div>

      {/* Local services */}
      <div>
        <SectionHeader
          icon={<MonitorCheck size={17} />}
          color="text-[#56d364]"
          bg="bg-[#2ea043]/14"
          title="Servicios locales"
          sub="Configura y comprueba Ollama o LM Studio."
        />
        <div className="space-y-4">
          {/* Ollama */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-[var(--cipher-text)]">Ollama URL</label>
              <span className="text-[10px] text-[var(--cipher-text-muted)]">Por defecto: http://localhost:11434</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={ollamaUrlInput}
                onChange={e => setOllamaUrlInput(e.target.value)}
                placeholder="http://localhost:11434"
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={() => saveLocalUrl('ollama', ollamaUrlInput)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                title="Guardar URL"
              >
                <Save size={15} />
              </button>
              <button
                onClick={() => testLocal('ollama')}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                title="Probar conexión"
              >
                <TestTube2 size={15} />
              </button>
            </div>
          </div>

          {/* LM Studio */}
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
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={() => saveLocalUrl('lmstudio', lmstudioUrlInput)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                title="Guardar URL"
              >
                <Save size={15} />
              </button>
              <button
                onClick={() => testLocal('lmstudio')}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white"
                title="Probar conexión"
              >
                <TestTube2 size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────
  const activeTabData = SETTINGS_TABS.find(t => t.id === activeTab)!

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left tab navigation ─────────────────────────── */}
      <div className="flex w-[130px] flex-shrink-0 flex-col border-r border-[var(--cipher-border)] bg-[var(--cipher-surface)] py-3">
        {SETTINGS_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1.5 px-2 py-3 text-center transition-all ${
                isActive
                  ? `${tab.color} bg-[var(--cipher-accent-bg)]`
                  : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.03] hover:text-[var(--cipher-text)]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--cipher-accent)]" />
              )}
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                isActive ? `${tab.bg} ${tab.color}` : ''
              }`}>
                <Icon size={16} strokeWidth={1.8} />
              </span>
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Tab content area ─────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Tab header */}
        <div className={`flex items-center gap-2.5 border-b border-[var(--cipher-border)] px-5 py-3 ${activeTabData.color}`}>
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeTabData.bg}`}>
            <activeTabData.icon size={14} strokeWidth={1.8} />
          </span>
          <span className="text-[13px] font-semibold text-[var(--cipher-text)]">{activeTabData.label}</span>
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'appearance' && renderAppearance()}
          {activeTab === 'apikeys'    && renderApiKeys()}
          {activeTab === 'keybinds'   && renderKeybinds()}
          {activeTab === 'editor'     && renderEditor()}
          {activeTab === 'agents'     && renderAgents()}
        </div>

        {/* Status toast */}
        {status && (
          <div className="border-t border-[var(--cipher-border)] bg-[var(--cipher-accent-bg)] px-5 py-2.5 text-[12px] text-[var(--cipher-text)]">
            {status}
          </div>
        )}
      </div>
    </div>
  )
}