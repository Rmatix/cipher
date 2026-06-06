import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  KeyRound,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  Send,
  Square,
  TestTube2,
  Trash2,
  X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'

// ── Types ────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant' | 'error' | 'system'
  content: string
  streaming?: boolean
}

interface ModelOption {
  value: string
  label: string
  soon?: boolean
}

interface ModelGroup {
  group: string
  options: ModelOption[]
}

// ── Static model list ────────────────────────────────────

const STATIC_MODELS: ModelGroup[] = [
  {
    group: 'OpenRouter',
    options: [
      { value: 'openrouter:google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
      { value: 'openrouter:google/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'openrouter:anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet' },
      { value: 'openrouter:anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'openrouter:openai/gpt-4o', label: 'GPT-4o' },
      { value: 'openrouter:openai/gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'openrouter:deepseek/deepseek-chat', label: 'DeepSeek V3' },
      { value: 'openrouter:deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { value: 'openrouter:qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B' },
      { value: 'openrouter:google/gemini-2.0-flash-001:free', label: 'Gemini 2.0 Flash (Free)' },
    ],
  },
  {
    group: 'NVIDIA NIM',
    options: [
      { value: 'nim:meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { value: 'nim:deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { value: 'nim:qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B' },
      { value: 'nim:nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B' },
    ],
  },
  {
    group: 'Anthropic',
    options: [
      { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
      { value: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
    ],
  },
  {
    group: 'OpenAI',
    options: [
      { value: 'o3-mini', label: 'o3-mini' },
      { value: 'o1', label: 'o1' },
      { value: 'o1-mini', label: 'o1-mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    ],
  },
  {
    group: 'Google',
    options: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    group: 'DeepSeek',
    options: [
      { value: 'deepseek:deepseek-chat', label: 'DeepSeek Chat (V3)' },
      { value: 'deepseek:deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
    ],
  },
  {
    group: 'Kimi (Moonshot)',
    options: [
      { value: 'kimi:moonshot-v1-8k', label: 'Kimi v1 8k' },
      { value: 'kimi:moonshot-v1-32k', label: 'Kimi v1 32k' },
      { value: 'kimi:moonshot-v1-128k', label: 'Kimi v1 128k' },
    ],
  },
  {
    group: 'Qwen (Alibaba)',
    options: [
      { value: 'qwen:qwen-max', label: 'Qwen Max' },
      { value: 'qwen:qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen:qwen-turbo', label: 'Qwen Turbo' },
      { value: 'qwen:qwen-2.5-coder-7b-instruct', label: 'Qwen 2.5 Coder 7B' },
      { value: 'qwen:qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B' },
    ],
  },
  {
    group: 'LM Studio (local)',
    options: [
      { value: 'lmstudio:local', label: 'Modelo activo' },
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

// ── Helpers ──────────────────────────────────────────────

const isLocalModel = (model: string) =>
  model.startsWith('ollama:') || model.startsWith('lmstudio:')

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
  return (
    localStorage.getItem(`cipher-api-key-${model}`) ||
    localStorage.getItem(`cipher-model-api-key-${model}`) ||
    localStorage.getItem(`cipher-model-api-key-${provider}:${modelId}`) ||
    localStorage.getItem(`cipher-provider-api-key-${provider}`) ||
    fallback ||
    ''
  )
}

function resolveCustomModel(
  value: string,
  customModels: ReturnType<typeof useStore.getState>['customModels']
): { model: string; savedKey: string | undefined } {
  if (!value.startsWith('custom:')) return { model: value, savedKey: undefined }
  const index = Number(value.replace('custom:', ''))
  const custom = customModels[index]
  if (!custom) return { model: value, savedKey: undefined }
  // If custom endpoint is set, pass it to backend via pipe-delimited format
  if (custom.url) {
    return { model: `${custom.provider}|${custom.url}|${custom.modelId}`, savedKey: custom.key }
  }
  // If openai-compatible without special url, keep legacy format
  if (custom.provider === 'openai-compatible') {
    return { model: `openai-compatible||${custom.modelId}`, savedKey: custom.key }
  }
  return { model: `${custom.provider}:${custom.modelId}`, savedKey: custom.key }
}

let streamCounter = 0
function newStreamId() {
  return `stream-${++streamCounter}-${Date.now()}`
}

function withActiveFileContext<T extends { role: 'user' | 'assistant'; content: string }>(
  messages: T[],
  context: string | null
): T[] {
  if (!context || messages.length === 0) return messages
  const next = [...messages]
  const lastIndex = next.length - 1
  const last = next[lastIndex]
  if (last.role !== 'user') return messages
  next[lastIndex] = {
    ...last,
    content: `${last.content}\n\n--- CONTEXTO DEL ARCHIVO ACTIVO ---\n${context}\n--- FIN CONTEXTO DEL ARCHIVO ACTIVO ---`,
  }
  return next
}

// ── ModelSelect ──────────────────────────────────────────

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
  const selected = groups.flatMap(g => g.options).find(o => o.value === value)

  return (
    <div className="relative flex items-center gap-4">
      <span className="w-16 text-[12px] text-[var(--cipher-text-muted)]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-4 text-left text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:bg-[var(--cipher-surface-alt)]"
      >
        <span className="truncate">{selected?.label || 'Seleccionar modelo'}</span>
        <ChevronDown size={16} className={`text-[var(--cipher-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="cipher-pop-enter absolute left-20 right-0 top-12 z-40 max-h-80 overflow-y-auto rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
            {groups.map(group => (
              <div key={group.group} className="py-1">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cipher-text-muted)]">
                  {group.group}
                </div>
                {group.options.map(option => {
                  const active = option.value === value
                  const soon = Boolean((option as ModelOption).soon)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={soon}
                      onClick={() => { if (!soon) { onChange(option.value); setOpen(false) } }}
                      title={soon ? 'Próximamente disponible' : undefined}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] transition-all ${
                        soon
                          ? 'cursor-not-allowed opacity-40'
                          : active
                            ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)] font-semibold shadow-[0_0_0_1px_var(--cipher-accent-soft)_inset]'
                            : 'text-[var(--cipher-text-muted)] hover:bg-[var(--cipher-accent-bg)] hover:text-[var(--cipher-text)]'
                      }`}
                    >
                      <span>{option.label}</span>
                      {soon
                        ? <span className="rounded-md bg-[#7a5cff]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#9d87ff]">pronto</span>
                        : active && <Check size={14} className="text-[#9d87ff]" />
                      }
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

// ── Streaming cursor ─────────────────────────────────────

function StreamingCursor() {
  return (
    <span
      className="ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] animate-pulse rounded-sm bg-[#7c4dff]"
      aria-hidden
    />
  )
}

// ── Main component ───────────────────────────────────────

export default function AIPanel() {
  const {
    aiMode, setAiMode,
    aiModel, setAiModel,
    aiDevModel, setAiDevModel,
    customModels,
    activeTabPath,
    activeFileContent,
    currentFolder,
    projectMemory,
  } = useStore()

  const [messages, setMessages] = useState<Message[]>([])
  // conversationHistory acumula solo user/assistant para enviar al modelo
  const conversationHistory = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  const [input, setInput] = useState('')
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => ({
    [aiModel]: localStorage.getItem(`cipher-api-key-${aiModel}`) || '',
  }))
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [showModelKeyModal, setShowModelKeyModal] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<ModelGroup | null>(null)
  const [lmstudioModels, setLmstudioModels] = useState<ModelGroup | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeStreamId = useRef<string | null>(null)

  // ── Attachments ─────────────────────────────────────────
  interface Attachment {
    name: string
    type: string
    size: number
    data: string // base64 without header
    previewUrl: string // base64 with header
  }
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const resultStr = reader.result as string
        const base64Data = resultStr.split(',')[1] || ''
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data,
          previewUrl: resultStr
        }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // ── AI Toggles ──────────────────────────────────────────
  const [useActiveFile, setUseActiveFile] = useState(true)
  const [enableThinking, setEnableThinking] = useState(() => localStorage.getItem('cipher-ai-thinking') === 'true')
  const [enableWebSearch, setEnableWebSearch] = useState(() => localStorage.getItem('cipher-ai-websearch') === 'true')

  useEffect(() => {
    localStorage.setItem('cipher-ai-thinking', String(enableThinking))
  }, [enableThinking])

  useEffect(() => {
    localStorage.setItem('cipher-ai-websearch', String(enableWebSearch))
  }, [enableWebSearch])

  // ── Auto-detect Ollama and LM Studio models ─────────────
  useEffect(() => {
    const ollamaUrl = localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434'
    window.cipher.ollamaList(ollamaUrl).then(models => {
      if (models.length === 0) return
      setOllamaModels({
        group: 'Ollama (local)',
        options: models.map(m => ({
          value: `ollama:${m.name}`,
          label: m.name,
        })),
      })
    }).catch(() => {})

    const lmstudioUrl = localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234'
    window.cipher.lmstudioList(lmstudioUrl).then(models => {
      if (models.length === 0) return
      setLmstudioModels({
        group: 'LM Studio (local)',
        options: models.map(m => ({
          value: `lmstudio:${m.id}`,
          label: m.id,
        })),
      })
    }).catch(() => {})
  }, [])

  const modelGroups = useMemo<ModelGroup[]>(() => {
    let base = [...STATIC_MODELS]
    if (lmstudioModels) {
      base = base.map(g =>
        g.group === 'LM Studio (local)' ? lmstudioModels : g
      )
    }
    const merged = ollamaModels
      ? [...base, ollamaModels]
      : base
    if (customModels.length === 0) return merged
    return [
      ...merged,
      {
        group: 'Personalizados',
        options: customModels.map((model, index) => ({
          value: `custom:${index}`,
          label: model.name,
        })),
      },
    ]
  }, [customModels, ollamaModels, lmstudioModels])

  const selectedModel = resolveCustomModel(aiModel, customModels)
  const apiKey = apiKeys[aiModel] ?? getStoredApiKey(selectedModel.model, selectedModel.savedKey)
  const supportsModelKey =
    selectedModel.model.startsWith('openrouter:') || selectedModel.model.startsWith('nim:')

  // ── Register stream listeners once ────────────────────
  useEffect(() => {
    const removeToken = window.cipher.onAiStreamToken((streamId, token) => {
      if (streamId !== activeStreamId.current) return
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.streaming) {
          const updated = [...prev]
          updated[updated.length - 1] = { ...last, content: last.content + token }
          return updated
        }
        return prev
      })
    })

    const removeEnd = window.cipher.onAiStreamEnd((streamId) => {
      if (streamId !== activeStreamId.current) return
      activeStreamId.current = null
      setLoading(false)
      // Mark last message as no longer streaming and save to history
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.streaming) {
          updated[updated.length - 1] = { ...last, streaming: false }
          conversationHistory.current.push({ role: 'assistant', content: last.content })
        }
        return updated
      })
    })

    const removeError = window.cipher.onAiStreamError((streamId, message) => {
      if (streamId !== activeStreamId.current) return
      activeStreamId.current = null
      setLoading(false)
      setMessages(prev => {
        // Remove the empty streaming placeholder if present
        const cleaned = prev[prev.length - 1]?.streaming
          ? prev.slice(0, -1)
          : prev
        return [...cleaned, { role: 'error', content: message }]
      })
    })

    return () => {
      removeToken()
      removeEnd()
      removeError()
    }
  }, [])

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

  const clearChat = () => {
    setMessages([])
    conversationHistory.current = []
    setCurrentPlan(null)
  }

  const modes = [
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'plan' as const, icon: FileText, label: 'Plan' },
    { id: 'dev' as const, icon: Code2, label: 'Dev' },
  ]

  const getSystemPrompt = useCallback(() => {
    const memorySection = projectMemory?.trim()
      ? `\n\n--- MEMORIA DEL PROYECTO ---\n${projectMemory}\n--- FIN MEMORIA ---`
      : ''

    if (aiMode === 'plan') {
      return `Eres un arquitecto de software experto. Genera un plan claro con objetivos, estructura de archivos, pasos de desarrollo y riesgos.${memorySection}`
    }
    if (aiMode === 'dev') {
      return `Eres un desarrollador experto. Responde con codigo real, concreto y listo para integrar cuando el usuario lo pida.${memorySection}`
    }
    return `Eres un asistente de codigo experto.${memorySection}`
  }, [aiMode, projectMemory])

  const getContext = useCallback(async () => {
    if (!activeTabPath) return null
    try {
      const content = activeFileContent ?? await window.cipher.readFile(activeTabPath)
      const fileName =
        activeTabPath.split('\\').pop() || activeTabPath.split('/').pop() || activeTabPath
      return `Archivo activo: ${fileName}\nRuta: ${activeTabPath}\nContenido actual del editor:\n\`\`\`\n${content.slice(0, 12000)}\n\`\`\``
    } catch {
      return null
    }
  }, [activeTabPath, activeFileContent])

  // ── Send with streaming ────────────────────────────────
  const sendMessage = useCallback(async (overridePrompt?: string) => {
    const promptValue = overridePrompt !== undefined ? overridePrompt : input
    if ((!promptValue.trim() && attachments.length === 0) || loading) return

    const userPrompt = promptValue.trim()
    const userMsg = userPrompt || (attachments.some(a => a.type.startsWith('image/')) ? 'Analiza la imagen adjunta.' : 'Analiza los archivos adjuntos.')
    setInput('')
    setLoading(true)

    // Append text/code attachments to the prompt message body directly
    let finalPrompt = userMsg
    const otherFiles = attachments.filter(f => !f.type.startsWith('image/') && f.type !== 'application/pdf')
    if (otherFiles.length > 0) {
      finalPrompt += '\n\n--- Archivos adjuntos ---'
      otherFiles.forEach(att => {
        try {
          const decoded = decodeURIComponent(escape(atob(att.data)))
          finalPrompt += `\n\nArchivo: ${att.name}\n\`\`\`\n${decoded}\n\`\`\``
        } catch {
          try {
            const decoded = atob(att.data)
            finalPrompt += `\n\nArchivo: ${att.name}\n\`\`\`\n${decoded}\n\`\`\``
          } catch {
            finalPrompt += `\n\nArchivo: ${att.name} (no se pudo decodificar)`
          }
        }
      })
    }

    // Keep native media attachments (images, PDFs)
    const nativeAttachments = attachments.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf').map(f => ({
      name: f.name,
      type: f.type,
      data: f.data
    }))

    setAttachments([]) // Clear attachments input

    // Add user message to UI and history
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    conversationHistory.current.push({ role: 'user', content: finalPrompt })

    // Add empty streaming placeholder
    setMessages(m => [...m, { role: 'assistant', content: '', streaming: true }])

    const resolved = resolveCustomModel(aiModel, customModels)
    const key = apiKeys[aiModel] ?? resolved.savedKey ?? getStoredApiKey(resolved.model)

    if (!key && !isLocalModel(resolved.model)) {
      setMessages(prev => {
        const cleaned = prev.slice(0, -1) // remove placeholder
        return [...cleaned, { role: 'error', content: 'Agrega tu API key para este modelo.' }]
      })
      conversationHistory.current.pop() // remove user msg from history too
      setLoading(false)
      return
    }

    const context = useActiveFile ? await getContext() : null
    const messagesForModel = withActiveFileContext(conversationHistory.current, context)
    const streamId = newStreamId()
    activeStreamId.current = streamId

    window.cipher.aiStreamStart({
      streamId,
      model: resolved.model,
      apiKey: key,
      // Send full conversation history for context
      messages: messagesForModel,
      context,
      systemPrompt: getSystemPrompt(),
      attachments: nativeAttachments,
      webSearch: enableWebSearch,
      thinking: enableThinking,
      ollamaUrl: localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434',
      lmstudioUrl: localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234',
    })
  }, [input, loading, aiModel, customModels, apiKeys, getContext, getSystemPrompt, attachments, enableWebSearch, enableThinking, useActiveFile])

  // Listen to external query trigger event
  useEffect(() => {
    const handleQuery = (e: Event) => {
      const { text, mode } = (e as CustomEvent<{ text: string; mode?: 'chat' | 'plan' | 'dev' }>).detail
      if (mode) setAiMode(mode)
      sendMessage(text)
    }
    window.addEventListener('cipher-ai-query', handleQuery)
    return () => window.removeEventListener('cipher-ai-query', handleQuery)
  }, [sendMessage, setAiMode])

  // ── Stop stream ────────────────────────────────────────
  const stopResponse = () => {
    if (activeStreamId.current) {
      window.cipher.aiStreamAbort(activeStreamId.current)
      activeStreamId.current = null
    }
    setLoading(false)
    setMessages(m => {
      const last = m[m.length - 1]
      if (last?.streaming) {
        const updated = [...m]
        updated[updated.length - 1] = { ...last, streaming: false, content: last.content + ' [detenido]' }
        return updated
      }
      return [...m, { role: 'system', content: 'Respuesta detenida.' }]
    })
  }

  // ── Test model (no streaming) ──────────────────────────
  const testModel = async () => {
    if (loading) return
    setLoading(true)
    setMessages(m => [...m, { role: 'system', content: 'Probando conexion del modelo seleccionado...' }])
    const resolved = resolveCustomModel(aiModel, customModels)
    const key = apiKeys[aiModel] ?? resolved.savedKey ?? getStoredApiKey(resolved.model)
    const result = await window.cipher.aiChat({
      model: resolved.model,
      apiKey: key,
      messages: [{ role: 'user', content: 'Responde solo: Cipher OK' }],
      context: null,
      systemPrompt: 'Eres un asistente de codigo.',
      ollamaUrl: localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434',
      lmstudioUrl: localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234',
    })
    setLoading(false)
    if (result.error) {
      setMessages(m => [...m, { role: 'error', content: result.error! }])
    } else {
      setMessages(m => [...m, { role: 'assistant', content: result.text || 'Cipher OK' }])
    }
  }

  // ── Approve plan ───────────────────────────────────────
  const approvePlan = async () => {
    if (!currentPlan || loading) return
    setAiMode('dev')
    setMessages(m => [...m, { role: 'system', content: 'Plan aprobado. Iniciando desarrollo...' }])
    setLoading(true)

    const resolved = resolveCustomModel(aiDevModel, customModels)
    const key = apiKeys[aiDevModel] ?? resolved.savedKey ?? getStoredApiKey(resolved.model)
    const context = useActiveFile ? await getContext() : null
    const streamId = newStreamId()
    activeStreamId.current = streamId

    const prompt = `Ejecuta este plan:\n\n${currentPlan}`
    conversationHistory.current.push({ role: 'user', content: prompt })
    const messagesForModel = withActiveFileContext(conversationHistory.current, context)
    setMessages(m => [...m, { role: 'assistant', content: '', streaming: true }])

    window.cipher.aiStreamStart({
      streamId,
      model: resolved.model,
      apiKey: key,
      messages: messagesForModel,
      context,
      systemPrompt: 'Eres un desarrollador experto. Responde con codigo real, concreto y listo para integrar.',
      webSearch: enableWebSearch,
      thinking: enableThinking,
      ollamaUrl: localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434',
      lmstudioUrl: localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234',
    })

    setCurrentPlan(null)
  }

  // ── External agent (Claude Code / Codex) ──────────────
  const runExternalAgent = async (tool: 'claude' | 'codex') => {
    if (!input.trim() || loading) return
    const prompt = input.trim()
    setInput('')
    setLoading(true)
    setMessages(m => [...m, {
      role: 'user',
      content: `[${tool === 'claude' ? 'Claude Code' : 'Codex CLI'}] ${prompt}`
    }])

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

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Mode tabs */}
      <div className="flex flex-shrink-0 gap-3 border-b border-[var(--cipher-border)] p-5">
        {modes.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setAiMode(id)}
            className={`flex h-11 flex-1 items-center justify-center gap-2.5 rounded-xl border text-[13px] transition-all ${
              aiMode === id
                ? 'border-[var(--cipher-accent)] bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)] font-semibold'
                : 'border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)]'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Model selectors */}
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

      {/* API key row */}
      <div className="flex flex-shrink-0 gap-3 px-5 pb-4">
        <input
          type="password"
          value={apiKey}
          onChange={e => updateApiKey(e.target.value)}
          placeholder={
            isLocalModel(selectedModel.model)
              ? 'Modelo local: no requiere API key'
              : 'API key...'
          }
          className="h-11 flex-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-4 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)] focus:bg-[var(--cipher-surface-alt)]"
        />
        <button
          onClick={saveKey}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)]"
          title="Guardar API key"
        >
          <Save size={15} />
        </button>
        <button
          onClick={testModel}
          disabled={loading}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)] disabled:opacity-50"
          title="Probar modelo"
        >
          <TestTube2 size={15} />
        </button>
        <button
          onClick={() => setShowCustomModal(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)]"
          title="Agregar modelo personalizado"
        >
          <Plus size={15} />
        </button>
      </div>

      {supportsModelKey && (
        <div className="flex-shrink-0 px-5 pb-4">
          <button
            onClick={() => setShowModelKeyModal(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--cipher-accent-soft)] bg-[var(--cipher-accent-bg)] text-[13px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:bg-[var(--cipher-accent-soft)]"
          >
            <KeyRound size={14} />
            Agregar API key de un modelo
          </button>
        </div>
      )}

      {/* AI Controls (Context, Thinking, Search) */}
      <div className="flex flex-col flex-shrink-0 gap-3 border-b border-[var(--cipher-border)] px-5 pb-5 text-[12px] text-[var(--cipher-text-muted)]">
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-[var(--cipher-text)]">
            <input
              type="checkbox"
              checked={useActiveFile}
              onChange={e => setUseActiveFile(e.target.checked)}
              className="accent-[var(--cipher-accent)]"
            />
            Usar archivo activo como contexto
          </label>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:bg-[var(--cipher-surface-alt)] hover:text-[#ff9a9a]"
              title="Limpiar conversación"
            >
              <Trash2 size={13} />
              Limpiar
            </button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-[var(--cipher-text)]">
            <input
              type="checkbox"
              checked={enableThinking}
              onChange={e => setEnableThinking(e.target.checked)}
              className="accent-[var(--cipher-accent)]"
            />
            Razonamiento (Thinking)
          </label>
          <label
            className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-[var(--cipher-text)]"
            title="Búsqueda web DuckDuckGo para modelos locales/nube"
          >
            <input
              type="checkbox"
              checked={enableWebSearch}
              onChange={e => setEnableWebSearch(e.target.checked)}
              className="accent-[var(--cipher-accent)]"
            />
            Busqueda Web
          </label>
        </div>
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="cipher-fade-up rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-[13px] leading-6 text-[#7f8bb0]">
            Selecciona un modelo, guarda su key si aplica y usa el boton de prueba para validar la conexion.
            {ollamaModels && (
              <p className="mt-2 text-[12px] text-[#5a7a4a]">
                ✓ Ollama detectado — {ollamaModels.options.length} modelo{ollamaModels.options.length !== 1 ? 's' : ''} disponible{ollamaModels.options.length !== 1 ? 's' : ''}
              </p>
            )}
            {lmstudioModels && (
              <p className="mt-2 text-[12px] text-[#5a7a4a]">
                ✓ LM Studio detectado — {lmstudioModels.options.length} modelo{lmstudioModels.options.length !== 1 ? 's' : ''} disponible{lmstudioModels.options.length !== 1 ? 's' : ''}
              </p>
            )}
            {projectMemory && (
              <p className="mt-2 text-[12px] text-[#7a5cff]">
                ✓ Memoria del proyecto activa — el agente conoce el contexto
              </p>
            )}
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
                className="w-full resize-y rounded-xl border border-[var(--cipher-accent)] bg-[var(--cipher-bg)] p-4 font-mono text-[12px] text-[var(--cipher-text)] outline-none"
                rows={8}
              />
            ) : (
              <div className={`break-words rounded-xl border-l-2 p-3 text-[13px] leading-relaxed ${
                msg.role === 'user' ? 'border-[var(--cipher-accent-alt)] bg-[var(--cipher-surface-alt)]' :
                msg.role === 'error' ? 'border-[#ff6b6b] bg-[var(--cipher-surface-alt)] text-[#ff9a9a]' :
                msg.role === 'system' ? 'border-[var(--cipher-text-muted)] bg-transparent text-[var(--cipher-text-muted)]' :
                'border-[var(--cipher-accent)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text)]'
              }`}>
                {renderContentWithThinking(msg.content, msg.streaming)}
              </div>
            )}
          </div>
        ))}

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

      {/* Input area */}
      <div className="flex flex-shrink-0 flex-col gap-3 border-t border-[var(--cipher-border)] p-5">
        {/* Attachments preview list */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {attachments.map((file, idx) => (
              <div key={idx} className="relative flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 pr-8 text-[12px] text-[#b7c1de]">
                {file.type.startsWith('image/') ? (
                  <img src={file.previewUrl} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-white/[0.05] text-[#7f8bb0]">
                    <FileText size={16} />
                  </div>
                )}
                <div className="flex flex-col max-w-[120px]">
                  <span className="truncate font-medium text-[#dce4ff]">{file.name}</span>
                  <span className="text-[10px] text-[#687498]">{formatSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="absolute right-1 top-1 rounded-full p-0.5 text-[#6b6b8a] transition-all hover:bg-white/[0.1] hover:text-[#ff9a9a]"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end">
          <button
            type="button"
            onClick={triggerFileUpload}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)]"
            title="Adjuntar archivo o imagen"
          >
            <Paperclip size={15} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
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
              'Escribele al asistente o adjunta imágenes/archivos...'
            }
            className="flex-1 resize-none rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-4 py-3 text-[14px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)] focus:bg-[var(--cipher-surface-alt)]"
            rows={2}
          />
          <div className="flex flex-col gap-1">
            {loading ? (
              <button
                onClick={stopResponse}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff6b6b] text-white transition-all hover:bg-[#ff4444]"
                title="Detener respuesta"
              >
                <Square size={12} fill="white" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() && attachments.length === 0}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7c4dff] text-white transition-all hover:bg-[#6a3de8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Claude Code / Codex buttons */}
      {aiMode === 'dev' && (
        <div className="flex flex-shrink-0 gap-2 border-t border-[var(--cipher-border)] px-5 pb-5">
          <button
            onClick={() => runExternalAgent('claude')}
            disabled={!input.trim() || loading}
            className="h-10 flex-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[12px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ejecutar con Claude Code
          </button>
          <button
            onClick={() => runExternalAgent('codex')}
            disabled={!input.trim() || loading}
            className="h-10 flex-1 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[12px] text-[var(--cipher-text)] transition-all hover:border-[var(--cipher-accent)] hover:text-[var(--cipher-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ejecutar con Codex CLI
          </button>
        </div>
      )}

      {/* Modals */}
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

// ── ModelApiKeyModal ─────────────────────────────────────

function ModelApiKeyModal({
  model,
  onClose,
  onSaved,
}: {
  model: string
  onClose: () => void
  onSaved: () => void
}) {
  const provider = getProviderFromModel(model)
  const defaultModelId = model.includes(':') ? model.split(':').slice(1).join(':') : model
  const [modelName, setModelName] = useState(defaultModelId)
  const [key, setKey] = useState(
    localStorage.getItem(`cipher-model-api-key-${provider}:${defaultModelId}`) || ''
  )

  const save = () => {
    if (!modelName.trim() || !key.trim()) return
    localStorage.setItem(`cipher-model-api-key-${provider}:${modelName.trim()}`, key.trim())
    localStorage.setItem(`cipher-model-api-key-${model}`, key.trim())
    onSaved()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-5 backdrop-blur-[2px]">
      <div className="cipher-pop-enter w-full max-w-sm rounded-2xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-white">API key de modelo</h3>
            <p className="mt-1 text-[12px] text-[#7f8bb0]">
              {provider === 'nim' ? 'NVIDIA NIM' : 'OpenRouter'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b6b8a] transition-all hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={modelName}
            onChange={e => setModelName(e.target.value)}
            placeholder="Nombre/ID del modelo"
            className="h-11 w-full rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-4 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
          />
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="API key del modelo"
            className="h-11 w-full rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-4 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
          />
          <button
            onClick={save}
            className="h-11 w-full rounded-xl bg-[#7c4dff] text-[13px] font-medium text-white transition-all hover:bg-[#8b74ff]"
          >
            Guardar API key
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CustomModelModal ─────────────────────────────────────

function CustomModelModal({ onClose }: { onClose: () => void }) {
  const { addCustomModel, customModels, removeCustomModel } = useStore()
  const [provider, setProvider] = useState('openrouter')
  const [modelId, setModelId] = useState('')
  const [key, setKey] = useState('')
  const [alias, setAlias] = useState('')

  // Default endpoints
  const [endpointUrl, setEndpointUrl] = useState('https://openrouter.ai/api/v1')


  // Derived display name: alias || modelId
  const displayName = alias.trim() || modelId.trim() || ''

  const save = () => {
    if (!modelId) return
    addCustomModel({
      name: displayName || modelId,
      provider,
      modelId: modelId.trim(),
      url: endpointUrl.trim() || undefined,
      key: key.trim() || undefined,
      alias: alias.trim() || undefined,
    })
    setModelId('')
    setKey('')
    setAlias('')
  }

  const isCloudProvider = ['openrouter', 'nim', 'openai', 'anthropic', 'google', 'deepseek', 'kimi', 'qwen'].includes(provider)

  return (
    <div className="cipher-pop-enter absolute inset-0 z-50 flex flex-col overflow-y-auto bg-[var(--cipher-bg)] p-5">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[14px] font-bold text-white">Agregar modelo</span>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Proveedor */}
        <ModelSelect
          label="Proveedor"
          value={provider}
          onChange={(newProvider) => {
            setProvider(newProvider)
            if (newProvider === 'openrouter') setEndpointUrl('https://openrouter.ai/api/v1')
            else if (newProvider === 'nim') setEndpointUrl('https://integrate.api.nvidia.com/v1')
            else if (newProvider === 'openai') setEndpointUrl('https://api.openai.com/v1')
            else if (newProvider === 'anthropic') setEndpointUrl('https://api.anthropic.com/v1')
            else if (newProvider === 'google') setEndpointUrl('https://generativelanguage.googleapis.com')
            else if (newProvider === 'deepseek') setEndpointUrl('https://api.deepseek.com/v1')
            else if (newProvider === 'kimi') setEndpointUrl('https://api.moonshot.cn/v1')
            else if (newProvider === 'qwen') setEndpointUrl('https://dashscope.aliyuncs.com/compatible-mode/v1')
            else if (newProvider === 'openai-compatible') setEndpointUrl('http://localhost:1234/v1')
            else setEndpointUrl('')
          }}
          groups={PROVIDERS}
        />

        {/* Endpoint URL - visible for cloud providers AND openai-compatible */}
        {(isCloudProvider || provider === 'openai-compatible') && (
          <input
            value={endpointUrl}
            onChange={e => setEndpointUrl(e.target.value)}
            placeholder="Endpoint URL"
            className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-4 py-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
          />
        )}

        {/* API Key */}
        {(provider !== 'ollama' && provider !== 'lmstudio') && (
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="API key"
            className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-4 py-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
          />
        )}

        {/* Model Name */}
        <input
          value={modelId}
          onChange={e => setModelId(e.target.value)}
          placeholder="Model name, ej: google/gemma-2-9b-it:free"
          className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-4 py-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
        />

        {/* Model Alias (opcional) */}
        <input
          value={alias}
          onChange={e => setAlias(e.target.value)}
          placeholder="Alias (opcional), ej: Mi modelo favorito"
          className="rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-4 py-3 text-[13px] text-[var(--cipher-text)] outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
        />

        <button
          onClick={save}
          className="rounded-xl bg-[var(--cipher-accent)] py-3 text-[13px] text-white transition-all hover:opacity-80"
        >
          Guardar modelo
        </button>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-[12px] text-[var(--cipher-text-muted)]">Modelos guardados</p>
        {customModels.map((m, i) => (
          <div key={i} className="flex items-center justify-between border-b border-[var(--cipher-border)] py-2.5">
            <span className="text-[13px] text-[var(--cipher-text)]">
              {m.alias || m.name}{' '}
              <span className="text-[var(--cipher-text-muted)]">({m.provider})</span>
            </span>
            <button
              onClick={() => removeCustomModel(i)}
              className="rounded-lg p-1.5 text-[#ff6b6b] transition-all hover:bg-[#ff6b6b]/12 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Markdown parsing helpers ──────────────────────────────

function parseMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <pre key={`code-${idx}`} className="my-2.5 overflow-x-auto rounded-lg bg-[#070912] p-3.5 font-mono text-[12px] text-[#80d8ff] border border-white/[0.05]">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3-${idx}`} className="mt-4 mb-2 text-[14px] font-bold text-[#e2e8f0]">{renderInlineMarkdown(line.slice(4))}</h3>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${idx}`} className="mt-4 mb-2 text-[15px] font-bold text-[#e2e8f0]">{renderInlineMarkdown(line.slice(3))}</h2>);
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${idx}`} className="mt-4 mb-2 text-[16px] font-bold text-[#e2e8f0]">{renderInlineMarkdown(line.slice(2))}</h1>);
      return;
    }

    // Lists
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      elements.push(
        <li key={`li-${idx}`} className="ml-4 list-disc py-0.5 text-[13px] text-[#dce4ff]">
          {renderInlineMarkdown(line.slice(2))}
        </li>
      );
      return;
    }

    const numberedMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      elements.push(
        <li key={`li-num-${idx}`} className="ml-4 list-decimal py-0.5 text-[13px] text-[#dce4ff]">
          {renderInlineMarkdown(numberedMatch[2])}
        </li>
      );
      return;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={`space-${idx}`} className="h-2" />);
      return;
    }

    // Regular paragraphs
    elements.push(
      <p key={`p-${idx}`} className="mb-1 text-[13px] leading-relaxed text-[#dce4ff]">
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  // Handle unclosed code blocks (for streaming responses)
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre key="unclosed-code" className="my-2.5 overflow-x-auto rounded-lg bg-[#070912] p-3.5 font-mono text-[12px] text-[#80d8ff] border border-white/[0.05]">
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-[#b7c1de]">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-[#070912] px-1.5 py-0.5 font-mono text-[12px] text-[#4fc3f7] border border-white/[0.04]">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ── Markdown and Thinking parsing helpers ──────────────────────────────

function renderContentWithThinking(content: string, streaming?: boolean) {
  const { thinking, mainText } = parseThinking(content)
  
  return (
    <div className="space-y-3">
      {thinking && (
        <ThinkingAccordion content={thinking} active={streaming && !mainText} />
      )}
      {mainText && (
        <div className="cipher-markdown">
          {parseMarkdown(mainText)}
          {streaming && <StreamingCursor />}
        </div>
      )}
      {!mainText && thinking && streaming && (
        <div className="mt-1">
          <StreamingCursor />
        </div>
      )}
    </div>
  )
}

function ThinkingAccordion({ content, active }: { content: string; active?: boolean }) {
  const [open, setOpen] = useState(Boolean(active))
  const expanded = Boolean(active) || open

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden text-[12px]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-[#7f8bb0] hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2 font-medium">
          <Loader2 size={12} className={`text-[#9d87ff] ${active ? 'animate-spin' : ''}`} />
          {active ? 'Pensando...' : 'Proceso de pensamiento'}
        </span>
        <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-white/[0.04] bg-black/15 p-3 font-mono text-[11px] leading-relaxed text-[#8b96b8] whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  )
}

function parseThinking(text: string): { thinking: string; mainText: string } {
  if (!text) return { thinking: '', mainText: '' }
  
  const match = text.match(/<thinking>([\s\S]*?)<\/thinking>/)
  if (match) {
    const thinking = match[1].trim()
    const mainText = text.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
    return { thinking, mainText }
  }
  
  if (text.includes('<thinking>')) {
    const parts = text.split('<thinking>')
    const thinking = parts[1] || ''
    return { thinking, mainText: '' }
  }
  
  return { thinking: '', mainText: text }
}
