import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Code2,
  FileText,
  KeyRound,
  MessageSquare,
  Plus,
  Save,
  Send,
  Square,
  TestTube2,
  X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'

interface Message {
  role: 'user' | 'assistant' | 'error' | 'system'
  content: string
}

interface ModelOption {
  value: string
  label: string
}

interface ModelGroup {
  group: string
  options: ModelOption[]
}

const MODELS: ModelGroup[] = [
  {
    group: 'OpenRouter',
    options: [
      { value: 'openrouter:openai/gpt-5.2', label: 'OpenAI GPT-5.2' },
      { value: 'openrouter:openai/gpt-5.2-codex', label: 'OpenAI GPT-5.2 Codex' },
      { value: 'openrouter:anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
      { value: 'openrouter:google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
      { value: 'openrouter:deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 (Free)' },
      { value: 'openrouter:qwen/qwen-2.5-coder-7b-instruct:free', label: 'Qwen Coder 7B (Free)' },
      { value: 'openrouter:google/gemini-flash-1.5:free', label: 'Gemini Flash 1.5 (Free)' },
    ],
  },
  {
    group: 'NVIDIA NIM',
    options: [
      { value: 'nim:meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
      { value: 'nim:nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B' },
      { value: 'nim:mistralai/mixtral-8x7b-instruct-v0.1', label: 'Mixtral 8x7B' },
    ],
  },
  {
    group: 'Ollama (local)',
    options: [
      { value: 'ollama:qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B' },
      { value: 'ollama:llama3.1', label: 'Llama 3.1' },
      { value: 'ollama:deepseek-coder', label: 'DeepSeek Coder' },
    ],
  },
  {
    group: 'LM Studio (local)',
    options: [
      { value: 'lmstudio:local', label: 'Modelo activo' },
    ],
  },
  {
    group: 'Anthropic',
    options: [
      { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1' },
      { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    ],
  },
  {
    group: 'OpenAI',
    options: [
      { value: 'gpt-5.2', label: 'GPT-5.2' },
      { value: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
      { value: 'gpt-5.1', label: 'GPT-5.1' },
      { value: 'gpt-5.1-codex', label: 'GPT-5.1 Codex' },
      { value: 'gpt-5-mini', label: 'GPT-5 mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    ],
  },
  {
    group: 'Google',
    options: [
      { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
      { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
      { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
  {
    group: 'DeepSeek',
    options: [
      { value: 'deepseek:deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek:deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ],
  },
]

const PROVIDERS: ModelGroup[] = [
  {
    group: 'Proveedor',
    options: [
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'nim', label: 'NVIDIA NIM' },
      { value: 'ollama', label: 'Ollama local' },
      { value: 'lmstudio', label: 'LM Studio local' },
      { value: 'openai-compatible', label: 'Compatible OpenAI' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'anthropic', label: 'Anthropic' },
      { value: 'google', label: 'Google' },
      { value: 'deepseek', label: 'DeepSeek' },
      { value: 'kimi', label: 'Kimi' },
      { value: 'qwen', label: 'Qwen' },
    ],
  },
]

const isLocalModel = (model: string) => model.startsWith('ollama:') || model.startsWith('lmstudio:')

function getProviderFromModel(model: string) {
  if (model.startsWith('openrouter:')) return 'openrouter'
  if (model.startsWith('nim:')) return 'nim'
  if (model.startsWith('deepseek:')) return 'deepseek'
  if (model.startsWith('kimi:')) return 'kimi'
  if (model.startsWith('qwen:')) return 'qwen'
  if (model.startsWith('ollama:')) return 'ollama'
  if (model.startsWith('lmstudio:')) return 'lmstudio'
  if (model.startsWith('gpt') || model.startsWith('o') || model.startsWith('openai:')) return 'openai'
  if (model.startsWith('claude') || model.startsWith('anthropic:')) return 'anthropic'
  if (model.startsWith('gemini') || model.startsWith('google:')) return 'google'
  return 'custom'
}

function getStoredApiKey(model: string, fallback?: string) {
  const provider = getProviderFromModel(model)
  const modelId = model.includes(':') ? model.split(':').slice(1).join(':') : model
  return localStorage.getItem(`cipher-api-key-${model}`)
    || localStorage.getItem(`cipher-model-api-key-${model}`)
    || localStorage.getItem(`cipher-model-api-key-${provider}:${modelId}`)
    || localStorage.getItem(`cipher-provider-api-key-${provider}`)
    || fallback
    || ''
}

function resolveCustomModel(value: string, customModels: ReturnType<typeof useStore.getState>['customModels']) {
  if (!value.startsWith('custom:')) return { model: value, savedKey: undefined }

  const index = Number(value.replace('custom:', ''))
  const custom = customModels[index]
  if (!custom) return { model: value, savedKey: undefined }

  if (custom.provider === 'openai-compatible' && custom.url) {
    return {
      model: `openai-compatible|${custom.url}|${custom.modelId}`,
      savedKey: custom.key,
    }
  }

  return {
    model: `${custom.provider}:${custom.modelId}`,
    savedKey: custom.key,
  }
}

function ModelSelect({
  label,
  value,
  onChange,
  groups,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  groups: ModelGroup[]
}) {
  const [open, setOpen] = useState(false)
  const selected = groups.flatMap(group => group.options).find(option => option.value === value)

  return (
    <div className="relative flex items-center gap-4">
      <span className="w-16 text-[12px] text-[#7f8bb0]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(isOpen => !isOpen)}
        className="flex h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#070912] px-4 text-left text-[13px] text-[#dce4ff] shadow-[0_0_0_1px_rgba(255,255,255,0.015)_inset] transition-all hover:border-[#7a5cff]/70 hover:bg-[#0d1020]"
      >
        <span className="truncate">{selected?.label || 'Seleccionar modelo'}</span>
        <ChevronDown size={16} className={`text-[#7f8bb0] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="cipher-pop-enter absolute left-20 right-0 top-12 z-40 max-h-80 overflow-y-auto rounded-xl border border-white/[0.1] bg-[#10131f] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
            {groups.map(group => (
              <div key={group.group} className="py-1">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#687498]">
                  {group.group}
                </div>
                {group.options.map(option => {
                  const active = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] transition-all ${
                        active
                          ? 'bg-[#7a5cff]/18 text-white'
                          : 'text-[#b7c1de] hover:bg-white/[0.055] hover:text-white'
                      }`}
                    >
                      <span>{option.label}</span>
                      {active && <Check size={14} className="text-[#9d87ff]" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AIPanel() {
  const {
    aiMode,
    setAiMode,
    aiModel,
    setAiModel,
    aiDevModel,
    setAiDevModel,
    customModels,
    activeTabPath,
    currentFolder,
  } = useStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => ({
    [aiModel]: localStorage.getItem(`cipher-api-key-${aiModel}`) || '',
  }))
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [showModelKeyModal, setShowModelKeyModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<boolean>(false)

  const modelGroups = useMemo<ModelGroup[]>(() => {
    if (customModels.length === 0) return MODELS
    return [
      ...MODELS,
      {
        group: 'Personalizados',
        options: customModels.map((model, index) => ({
          value: `custom:${index}`,
          label: model.name,
        })),
      },
    ]
  }, [customModels])

  const selectedModel = resolveCustomModel(aiModel, customModels)
  const apiKey = apiKeys[aiModel] ?? getStoredApiKey(selectedModel.model, selectedModel.savedKey)
  const supportsModelKey = selectedModel.model.startsWith('openrouter:') || selectedModel.model.startsWith('nim:')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveKey = () => {
    localStorage.setItem(`cipher-api-key-${aiModel}`, apiKey)
    setMessages(m => [...m, { role: 'system', content: 'API key guardada para este modelo.' }])
  }

  const updateApiKey = (value: string) => {
    setApiKeys(keys => ({ ...keys, [aiModel]: value }))
  }

  const modes = [
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'plan' as const, icon: FileText, label: 'Plan' },
    { id: 'dev' as const, icon: Code2, label: 'Dev' },
  ]

  const getSystemPrompt = () => {
    if (aiMode === 'plan') {
      return `Eres un arquitecto de software experto. Genera un plan claro con objetivos, estructura de archivos, pasos de desarrollo y riesgos.`
    }
    if (aiMode === 'dev') {
      return `Eres un desarrollador experto. Responde con codigo real, concreto y listo para integrar cuando el usuario lo pida.`
    }
    return 'Eres un asistente de codigo experto.'
  }

  const getContext = async () => {
    if (!activeTabPath) return null
    try {
      const content = await window.cipher.readFile(activeTabPath)
      const fileName = activeTabPath.split('\\').pop() || activeTabPath.split('/').pop() || activeTabPath
      return `Archivo: ${fileName}\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``
    } catch {
      return null
    }
  }

  const runAiRequest = async (prompt: string, modelValue = aiModel) => {
    const resolved = resolveCustomModel(modelValue, customModels)
    const key = apiKeys[modelValue]
      ?? resolved.savedKey
      ?? getStoredApiKey(resolved.model)

    if (!key && !isLocalModel(resolved.model)) {
      return { error: 'Agrega tu API key para este modelo.' }
    }

    const context = await getContext()
    return window.cipher.aiChat({
      model: resolved.model,
      apiKey: key,
      messages: [{ role: 'user', content: prompt }],
      context,
      systemPrompt: getSystemPrompt(),
    })
  }

  const testModel = async () => {
    if (loading) return
    setLoading(true)
    setMessages(m => [...m, { role: 'system', content: 'Probando conexion del modelo seleccionado...' }])
    const result = await runAiRequest('Responde solo: Cipher OK')
    setLoading(false)

    if (result.error) {
      setMessages(m => [...m, { role: 'error', content: result.error! }])
      return
    }
    setMessages(m => [...m, { role: 'assistant', content: result.text || 'Cipher OK' }])
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)
    abortRef.current = false

    try {
      const result = await runAiRequest(userMsg)
      if (abortRef.current) return

      if (result.error) {
        setMessages(m => [...m, { role: 'error', content: result.error! }])
      } else {
        const text = result.text || ''
        if (aiMode === 'plan') {
          setCurrentPlan(text)
        }
        setMessages(m => [...m, { role: 'assistant', content: text }])
      }
    } catch (e) {
      if (!abortRef.current) {
        const error = e as Error
        setMessages(m => [...m, { role: 'error', content: error.message }])
      }
    }

    setLoading(false)
  }

  const stopResponse = () => {
    abortRef.current = true
    setLoading(false)
    setMessages(m => [...m, { role: 'system', content: 'Respuesta detenida.' }])
  }

  const runExternalAgent = async (tool: 'claude' | 'codex') => {
    if (!input.trim() || loading) return
    const prompt = input.trim()
    setInput('')
    setLoading(true)
    setMessages(m => [...m, { role: 'user', content: `[${tool === 'claude' ? 'Claude Code' : 'Codex CLI'}] ${prompt}` }])

    const result = await window.cipher.aiCliRun({
      tool,
      prompt,
      cwd: currentFolder,
      model: tool === 'codex' ? 'gpt-5.2-codex' : undefined,
    })

    if (result.error) {
      setMessages(m => [...m, { role: 'error', content: result.error! }])
    } else {
      setMessages(m => [...m, { role: 'assistant', content: result.text || '' }])
    }
    setLoading(false)
  }

  const approvePlan = async () => {
    if (!currentPlan) return
    setAiMode('dev')
    setMessages(m => [...m, { role: 'system', content: 'Plan aprobado. Iniciando desarrollo...' }])
    setLoading(true)

    const result = await runAiRequest(`Ejecuta este plan:\n\n${currentPlan}`, aiDevModel)

    if (result.error) {
      setMessages(m => [...m, { role: 'error', content: result.error! }])
    } else {
      setMessages(m => [...m, { role: 'assistant', content: result.text || '' }])
    }
    setLoading(false)
    setCurrentPlan(null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 gap-3 border-b border-white/[0.07] p-5">
        {modes.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setAiMode(id)}
            className={`flex h-11 flex-1 items-center justify-center gap-2.5 rounded-xl border text-[13px] transition-all ${
              aiMode === id
                ? 'border-[#7c4dff] bg-[rgba(124,77,255,0.15)] text-white'
                : 'border-[#2a2a4a] bg-[#121626] text-[#7f8bb0] hover:border-[#7c4dff] hover:text-white'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 space-y-4 px-5 py-4">
        <ModelSelect
          label={aiMode === 'chat' ? 'Modelo' : 'Plan IA'}
          value={aiModel}
          onChange={setAiModel}
          groups={modelGroups}
        />

        {(aiMode === 'plan' || aiMode === 'dev') && (
          <ModelSelect
            label="Dev IA"
            value={aiDevModel}
            onChange={setAiDevModel}
            groups={modelGroups}
          />
        )}
      </div>

      <div className="flex flex-shrink-0 gap-3 px-5 pb-4">
        <input
          type="password"
          value={apiKey}
          onChange={e => updateApiKey(e.target.value)}
          placeholder={isLocalModel(selectedModel.model) ? 'Modelo local: no requiere API key' : 'API key...'}
          className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-[#070912] px-4 text-[13px] text-[#dce4ff] outline-none transition-all placeholder-[#627091] focus:border-[#7a5cff]/70 focus:bg-[#0d1020]"
        />
        <button
          onClick={saveKey}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#10131f] text-[#7f8bb0] transition-all hover:border-[#7a5cff]/70 hover:text-white"
          title="Guardar API key"
        >
          <Save size={15} />
        </button>
        <button
          onClick={testModel}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#10131f] text-[#7f8bb0] transition-all hover:border-[#7a5cff]/70 hover:text-white"
          title="Probar modelo"
        >
          <TestTube2 size={15} />
        </button>
        <button
          onClick={() => setShowCustomModal(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#10131f] text-[#7f8bb0] transition-all hover:border-[#7a5cff]/70 hover:text-white"
          title="Agregar modelo personalizado"
        >
          <Plus size={15} />
        </button>
      </div>

      {supportsModelKey && (
        <div className="flex-shrink-0 px-5 pb-4">
          <button
            onClick={() => setShowModelKeyModal(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#7a5cff]/30 bg-[#7a5cff]/10 text-[13px] text-[#d9d2ff] transition-all hover:border-[#7a5cff]/70 hover:bg-[#7a5cff]/16 hover:text-white"
          >
            <KeyRound size={14} />
            Agregar API key de un modelo
          </button>
        </div>
      )}

      <div className="flex-shrink-0 border-b border-white/[0.07] px-5 pb-5">
        <label className="flex cursor-pointer items-center gap-3 text-[13px] text-[#7f8bb0]">
          <input type="checkbox" defaultChecked className="accent-[#7c4dff]" />
          Usar archivo activo como contexto
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="cipher-fade-up rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-[13px] leading-6 text-[#7f8bb0]">
            Selecciona un modelo, guarda su key si aplica y usa el boton de prueba para validar la conexion.
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="cipher-fade-up flex flex-col gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              msg.role === 'user' ? 'text-[#4fc3f7]' :
              msg.role === 'error' ? 'text-[#ff6b6b]' :
              msg.role === 'system' ? 'text-[#6b6b8a]' :
              'text-[#9d87ff]'
            }`}>
              {msg.role === 'user' ? 'Tu' :
               msg.role === 'error' ? 'Error' :
               msg.role === 'system' ? 'Sistema' :
               'Cipher IA'}
            </span>
            {msg.role === 'assistant' && aiMode === 'plan' && currentPlan === msg.content ? (
              <textarea
                defaultValue={msg.content}
                onChange={e => setCurrentPlan(e.target.value)}
                className="w-full resize-y rounded-xl border border-[#7c4dff] bg-[#0d0d1a] p-4 font-mono text-[12px] text-[#e0e0f0] outline-none"
                rows={8}
              />
            ) : (
              <div className={`whitespace-pre-wrap break-words rounded-xl border-l-2 p-3 text-[13px] leading-relaxed ${
                msg.role === 'user' ? 'border-[#4fc3f7] bg-[#121626]' :
                msg.role === 'error' ? 'border-[#ff6b6b] bg-[#121626] text-[#ff9a9a]' :
                msg.role === 'system' ? 'border-[#6b6b8a] bg-transparent text-[#8b96b8]' :
                'border-[#7c4dff] bg-[#121626] text-[#dce4ff]'
              }`}>
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="cipher-fade-up flex items-center gap-2 text-[12px] text-[#6b6b8a]">
            <span>Cipher IA esta pensando</span>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c4dff]"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {currentPlan && aiMode === 'plan' && !loading && (
          <button
            onClick={approvePlan}
            className="w-full rounded-xl bg-[#2ea043] py-3 text-[13px] text-white transition-all hover:bg-[#3fb950]"
          >
            Aprobar plan e iniciar desarrollo
          </button>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-shrink-0 gap-3 border-t border-white/[0.07] p-5">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder={
            aiMode === 'plan' ? 'Describe que quieres construir...' :
            aiMode === 'dev' ? 'Describe que quieres desarrollar...' :
            'Escribele al agente...'
          }
          className="flex-1 resize-none rounded-xl border border-white/[0.08] bg-[#070912] px-4 py-3 text-[14px] text-[#dce4ff] outline-none transition-all placeholder-[#627091] focus:border-[#7a5cff]/70 focus:bg-[#0d1020]"
          rows={3}
        />
        <div className="flex flex-col gap-1">
          {loading ? (
            <button
              onClick={stopResponse}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6b6b] text-white transition-all hover:bg-[#ff4444]"
            >
              <Square size={12} fill="white" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c4dff] text-white transition-all hover:bg-[#6a3de8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>

      {aiMode === 'dev' && (
        <div className="flex flex-shrink-0 gap-2 border-t border-white/[0.07] px-5 pb-5">
          <button
            onClick={() => runExternalAgent('claude')}
            disabled={!input.trim() || loading}
            className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-[#10131f] text-[12px] text-[#c5cef0] transition-all hover:border-[#7a5cff]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ejecutar con Claude Code
          </button>
          <button
            onClick={() => runExternalAgent('codex')}
            disabled={!input.trim() || loading}
            className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-[#10131f] text-[12px] text-[#c5cef0] transition-all hover:border-[#7a5cff]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ejecutar con Codex CLI
          </button>
        </div>
      )}

      {showCustomModal && <CustomModelModal onClose={() => setShowCustomModal(false)} />}
      {showModelKeyModal && (
        <ModelApiKeyModal
          model={selectedModel.model}
          onClose={() => setShowModelKeyModal(false)}
          onSaved={() => {
            setShowModelKeyModal(false)
            setMessages(m => [...m, { role: 'system', content: 'API key de modelo guardada.' }])
          }}
        />
      )}
    </div>
  )
}

function ModelApiKeyModal({ model, onClose, onSaved }: { model: string; onClose: () => void; onSaved: () => void }) {
  const provider = getProviderFromModel(model)
  const defaultModelId = model.includes(':') ? model.split(':').slice(1).join(':') : model
  const [modelName, setModelName] = useState(defaultModelId)
  const [key, setKey] = useState(localStorage.getItem(`cipher-model-api-key-${provider}:${defaultModelId}`) || '')

  const save = () => {
    if (!modelName.trim() || !key.trim()) return
    localStorage.setItem(`cipher-model-api-key-${provider}:${modelName.trim()}`, key.trim())
    localStorage.setItem(`cipher-model-api-key-${model}`, key.trim())
    onSaved()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-5 backdrop-blur-[2px]">
      <div className="cipher-pop-enter w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#10131f] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-white">API key de modelo</h3>
            <p className="mt-1 text-[12px] text-[#7f8bb0]">{provider === 'nim' ? 'NVIDIA NIM' : 'OpenRouter'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#6b6b8a] transition-all hover:bg-white/[0.06] hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input value={modelName} onChange={event => setModelName(event.target.value)} placeholder="Nombre/ID del modelo" className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#070912] px-4 text-[13px] text-[#dce4ff] outline-none transition-all placeholder-[#596585] focus:border-[#7a5cff]/70" />
          <input type="password" value={key} onChange={event => setKey(event.target.value)} placeholder="API key del modelo" className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#070912] px-4 text-[13px] text-[#dce4ff] outline-none transition-all placeholder-[#596585] focus:border-[#7a5cff]/70" />
          <button onClick={save} className="h-11 w-full rounded-xl bg-[#7c4dff] text-[13px] font-medium text-white transition-all hover:bg-[#8b74ff]">
            Guardar API key
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomModelModal({ onClose }: { onClose: () => void }) {
  const { addCustomModel, customModels, removeCustomModel } = useStore()
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('openrouter')
  const [modelId, setModelId] = useState('')
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')

  const save = () => {
    if (!name || !modelId) return
    addCustomModel({ name, provider, modelId, url: url || undefined, key: key || undefined })
    setName('')
    setModelId('')
    setUrl('')
    setKey('')
  }

  return (
    <div className="cipher-pop-enter absolute inset-0 z-50 flex flex-col overflow-y-auto bg-[#0d0d1a] p-5">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[14px] font-bold text-white">Modelo personalizado</span>
        <button onClick={onClose} className="rounded-lg p-2 text-[#6b6b8a] transition-all hover:bg-white/[0.06] hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del modelo" className="rounded-xl border border-[#2a2a4a] bg-[#121626] px-4 py-3 text-[13px] text-[#e0e0f0] outline-none transition-all placeholder-[#4a4a6a] focus:border-[#7c4dff]" />
        <ModelSelect label="Proveedor" value={provider} onChange={setProvider} groups={PROVIDERS} />
        <input value={modelId} onChange={e => setModelId(e.target.value)} placeholder="ID del modelo" className="rounded-xl border border-[#2a2a4a] bg-[#121626] px-4 py-3 text-[13px] text-[#e0e0f0] outline-none transition-all placeholder-[#4a4a6a] focus:border-[#7c4dff]" />
        {provider === 'openai-compatible' && (
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL base, ej: http://localhost:1234/v1" className="rounded-xl border border-[#2a2a4a] bg-[#121626] px-4 py-3 text-[13px] text-[#e0e0f0] outline-none transition-all placeholder-[#4a4a6a] focus:border-[#7c4dff]" />
        )}
        <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="API key, vacio si es local" className="rounded-xl border border-[#2a2a4a] bg-[#121626] px-4 py-3 text-[13px] text-[#e0e0f0] outline-none transition-all placeholder-[#4a4a6a] focus:border-[#7c4dff]" />
        <button onClick={save} className="rounded-xl bg-[#7c4dff] py-3 text-[13px] text-white transition-all hover:bg-[#6a3de8]">
          Guardar modelo
        </button>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-[12px] text-[#6b6b8a]">Modelos guardados</p>
        {customModels.map((m, i) => (
          <div key={i} className="flex items-center justify-between border-b border-[#1e1e3a] py-2.5">
            <span className="text-[13px] text-[#e0e0f0]">{m.name} <span className="text-[#6b6b8a]">({m.provider})</span></span>
            <button onClick={() => removeCustomModel(i)} className="rounded-lg p-1.5 text-[#ff6b6b] transition-all hover:bg-[#ff6b6b]/12 hover:text-red-400">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
