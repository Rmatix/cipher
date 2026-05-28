import { useState } from 'react'
import { Bot, Code2, KeyRound, MonitorCheck, Save, Server, SlidersHorizontal, TestTube2 } from 'lucide-react'

const PROVIDER_KEYS = [
  { id: 'openrouter', label: 'OpenRouter', hint: 'Key por defecto para modelos OpenRouter' },
  { id: 'nim', label: 'NVIDIA NIM', hint: 'Key por defecto para modelos NVIDIA NIM' },
  { id: 'openai', label: 'OpenAI', hint: 'Key para GPT y Codex API' },
  { id: 'anthropic', label: 'Anthropic', hint: 'Key para Claude API' },
  { id: 'google', label: 'Google Gemini', hint: 'Key de Google AI Studio' },
  { id: 'deepseek', label: 'DeepSeek', hint: 'Key para DeepSeek API' },
  { id: 'kimi', label: 'Kimi', hint: 'Key para Moonshot/Kimi' },
  { id: 'qwen', label: 'Qwen', hint: 'Key para DashScope/Qwen' },
]

const EDITOR_SETTINGS = [
  { id: 'formatOnSave', label: 'Formatear al guardar' },
  { id: 'autoSave', label: 'Autoguardado experimental' },
  { id: 'wordWrap', label: 'Ajuste de linea' },
  { id: 'minimap', label: 'Minimapa' },
  { id: 'aiContext', label: 'Enviar archivo activo como contexto IA' },
]

function providerKeyId(provider: string) {
  return `cipher-provider-api-key-${provider}`
}

function modelKeyId(provider: string, model: string) {
  return `cipher-model-api-key-${provider}:${model}`
}

export default function SettingsPanel() {
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => Object.fromEntries(
    PROVIDER_KEYS.map(provider => [provider.id, localStorage.getItem(providerKeyId(provider.id)) || ''])
  ))
  const [provider, setProvider] = useState('openrouter')
  const [modelName, setModelName] = useState('')
  const [modelKey, setModelKey] = useState('')
  const [editorSettings, setEditorSettings] = useState<Record<string, boolean>>(() => Object.fromEntries(
    EDITOR_SETTINGS.map(setting => [setting.id, localStorage.getItem(`cipher-setting-${setting.id}`) !== 'false'])
  ))
  const [status, setStatus] = useState<string | null>(null)

  const saveProviderKey = (id: string) => {
    localStorage.setItem(providerKeyId(id), providerKeys[id] || '')
    setStatus(`${PROVIDER_KEYS.find(item => item.id === id)?.label} guardado.`)
  }

  const saveModelKey = () => {
    if (!modelName.trim() || !modelKey.trim()) return
    localStorage.setItem(modelKeyId(provider, modelName.trim()), modelKey.trim())
    setModelName('')
    setModelKey('')
    setStatus('API key por modelo guardada.')
  }

  const testLocal = async (kind: 'ollama' | 'lmstudio') => {
    const url = kind === 'ollama' ? 'http://localhost:11434/api/tags' : 'http://localhost:1234/v1/models'
    setStatus(`Probando ${kind === 'ollama' ? 'Ollama' : 'LM Studio'}...`)
    try {
      const response = await fetch(url)
      setStatus(response.ok ? `${kind === 'ollama' ? 'Ollama' : 'LM Studio'} respondio correctamente.` : `Respuesta HTTP ${response.status}.`)
    } catch {
      setStatus(`${kind === 'ollama' ? 'Ollama' : 'LM Studio'} no esta respondiendo.`)
    }
  }

  const saveEditorSettings = () => {
    Object.entries(editorSettings).forEach(([id, enabled]) => {
      localStorage.setItem(`cipher-setting-${id}`, String(enabled))
    })
    setStatus('Preferencias del editor guardadas.')
  }

  const checkCli = async (tool: 'claude' | 'codex') => {
    setStatus(`Comprobando ${tool === 'claude' ? 'Claude Code' : 'Codex CLI'}...`)
    const result = await window.cipher.aiCliCheck(tool)
    setStatus(result.installed ? `${tool === 'claude' ? 'Claude Code' : 'Codex CLI'} listo: ${result.version}` : result.error || 'No instalado.')
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="space-y-5">
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7a5cff]/14 text-[#a896ff]">
              <KeyRound size={17} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#e8eeff]">API keys por proveedor</h3>
              <p className="text-[12px] text-[#7f8bb0]">Se usan como fallback para modelos y proveedores.</p>
            </div>
          </div>

          <div className="space-y-3">
            {PROVIDER_KEYS.map(item => (
              <div key={item.id} className="space-y-2">
                <label className="text-[12px] font-medium text-[#aab4d6]">{item.label}</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={providerKeys[item.id] || ''}
                    onChange={event => setProviderKeys(keys => ({ ...keys, [item.id]: event.target.value }))}
                    placeholder={item.hint}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#070912] px-3 text-[13px] text-[#dce4ff] outline-none transition-all placeholder-[#596585] focus:border-[#7a5cff]/70"
                  />
                  <button
                    onClick={() => saveProviderKey(item.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#10131f] text-[#7f8bb0] transition-all hover:border-[#7a5cff]/70 hover:text-white"
                    title="Guardar"
                  >
                    <Save size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4fc3f7]/12 text-[#80d8ff]">
              <Server size={17} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#e8eeff]">API key por modelo</h3>
              <p className="text-[12px] text-[#7f8bb0]">Para modelos con key propia en OpenRouter o NVIDIA NIM.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PROVIDER_KEYS.map(item => (
              <button
                key={item.id}
                onClick={() => setProvider(item.id)}
                className={`h-10 rounded-xl border text-[13px] transition-all ${provider === item.id ? 'border-[#7c4dff] bg-[#7c4dff]/16 text-white' : 'border-white/[0.08] bg-[#10131f] text-[#7f8bb0] hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-3">
            <input
              value={modelName}
              onChange={event => setModelName(event.target.value)}
              placeholder="Nombre/ID del modelo"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#070912] px-3 text-[13px] text-[#dce4ff] outline-none transition-all placeholder-[#596585] focus:border-[#7a5cff]/70"
            />
            <input
              type="password"
              value={modelKey}
              onChange={event => setModelKey(event.target.value)}
              placeholder="API key de ese modelo"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#070912] px-3 text-[13px] text-[#dce4ff] outline-none transition-all placeholder-[#596585] focus:border-[#7a5cff]/70"
            />
            <button
              onClick={saveModelKey}
              className="h-10 w-full rounded-xl bg-[#7c4dff] text-[13px] font-medium text-white transition-all hover:bg-[#8b74ff]"
            >
              Agregar API key de modelo
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffab40]/12 text-[#ffc46b]">
              <Bot size={17} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#e8eeff]">Agentes externos</h3>
              <p className="text-[12px] text-[#7f8bb0]">Compatibilidad con Claude Code y OpenAI Codex CLI.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => checkCli('claude')} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#10131f] text-[13px] text-[#c5cef0] transition-all hover:border-[#7a5cff]/70 hover:text-white">
              <TestTube2 size={14} />
              Claude Code
            </button>
            <button onClick={() => checkCli('codex')} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#10131f] text-[13px] text-[#c5cef0] transition-all hover:border-[#7a5cff]/70 hover:text-white">
              <TestTube2 size={14} />
              Codex CLI
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#070912] p-3 font-mono text-[11px] leading-5 text-[#8d99bd]">
            npm install -g @anthropic-ai/claude-code<br />
            npm install -g @openai/codex
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4fc3f7]/12 text-[#80d8ff]">
              <SlidersHorizontal size={17} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#e8eeff]">Editor</h3>
              <p className="text-[12px] text-[#7f8bb0]">Preferencias base para la primera version.</p>
            </div>
          </div>
          <div className="space-y-2">
            {EDITOR_SETTINGS.map(setting => (
              <label key={setting.id} className="flex h-10 cursor-pointer items-center justify-between rounded-xl border border-white/[0.06] bg-[#10131f] px-3 text-[13px] text-[#c5cef0]">
                <span>{setting.label}</span>
                <input
                  type="checkbox"
                  checked={editorSettings[setting.id]}
                  onChange={event => setEditorSettings(settings => ({ ...settings, [setting.id]: event.target.checked }))}
                  className="accent-[#7c4dff]"
                />
              </label>
            ))}
          </div>
          <button onClick={saveEditorSettings} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#7c4dff] text-[13px] font-medium text-white transition-all hover:bg-[#8b74ff]">
            <Code2 size={14} />
            Guardar preferencias
          </button>
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2ea043]/14 text-[#56d364]">
              <MonitorCheck size={17} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#e8eeff]">Servicios locales</h3>
              <p className="text-[12px] text-[#7f8bb0]">Comprueba si Ollama o LM Studio estan activos.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => testLocal('ollama')} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#10131f] text-[13px] text-[#c5cef0] transition-all hover:border-[#7a5cff]/70 hover:text-white">
              <TestTube2 size={14} />
              Ollama
            </button>
            <button onClick={() => testLocal('lmstudio')} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#10131f] text-[13px] text-[#c5cef0] transition-all hover:border-[#7a5cff]/70 hover:text-white">
              <TestTube2 size={14} />
              LM Studio
            </button>
          </div>
        </section>

        {status && (
          <div className="cipher-fade-up rounded-xl border border-[#7a5cff]/20 bg-[#7a5cff]/10 p-3 text-[13px] text-[#c5cef0]">
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
