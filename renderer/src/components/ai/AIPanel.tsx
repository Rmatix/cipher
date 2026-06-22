import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  KeyRound,
  Layers,
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
import {
  PROVIDERS,
  getProviderFromModel,
  getStoredApiKey,
  resolveCustomModel,
  isLocalModel,
} from './models'
import type { ModelGroup, ModelOption } from './models'
import { useDynamicModels } from './useDynamicModels'

// ── Types ────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant' | 'error' | 'system'
  content: string
  streaming?: boolean
}

// ── Helpers ──────────────────────────────────────────────


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
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#38bdf8] border-b border-[#38bdf8]/20 mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8]/60" />
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

  // ── Agentic Guidelines & Skills ─────────────────────────
  const [agenticGuidelines, setAgenticGuidelines] = useState<string>('')
  const [activeSkills, setActiveSkills] = useState<{ name: string; content: string }[]>([])

  useEffect(() => {
    if (!currentFolder) {
      setAgenticGuidelines('')
      setActiveSkills([])
      return
    }

    const loadGuidelinesAndSkills = async () => {
      let guidelines = ''
      
      // Load CLAUDE.md
      try {
        const claudeContent = await window.cipher.readFile(`${currentFolder}/CLAUDE.md`)
        if (claudeContent) {
          guidelines += `\n--- CLAUDE.md ---\n${claudeContent}\n`
        }
      } catch (e) {}

      // Load AGENTS.md
      try {
        const agentsRootContent = await window.cipher.readFile(`${currentFolder}/AGENTS.md`)
        if (agentsRootContent) {
          guidelines += `\n--- AGENTS.md ---\n${agentsRootContent}\n`
        }
      } catch (e) {}

      // Load .agents/AGENTS.md
      try {
        const agentsSubContent = await window.cipher.readFile(`${currentFolder}/.agents/AGENTS.md`)
        if (agentsSubContent) {
          guidelines += `\n--- .agents/AGENTS.md ---\n${agentsSubContent}\n`
        }
      } catch (e) {}

      setAgenticGuidelines(guidelines)

      // Load skills
      try {
        const skillsPath = `${currentFolder}/.agents/skills`
        const entries = await window.cipher.readDirectory(skillsPath)
        const loadedSkills: { name: string; content: string }[] = []
        
        if (entries && Array.isArray(entries)) {
          for (const entry of entries) {
            if (entry.isDirectory) {
              const skillName = entry.name
              try {
                const skillContent = await window.cipher.readFile(`${skillsPath}/${skillName}/SKILL.md`)
                if (skillContent) {
                  loadedSkills.push({ name: skillName, content: skillContent })
                }
              } catch (e) {}
            }
          }
        }
        setActiveSkills(loadedSkills)
      } catch (e) {
        setActiveSkills([])
      }
    }

    loadGuidelinesAndSkills()
  }, [currentFolder])

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

  // ── Custom model groups (from user's custom endpoints) ──
  const customModelGroups = useMemo<ModelGroup[]>(() => {
    if (customModels.length === 0) return []
    const customGroupsMap = new Map<string, ModelOption[]>()
    customModels.forEach((model, index) => {
      const groupName = model.endpointName || 'Personalizados'
      if (!customGroupsMap.has(groupName)) {
        customGroupsMap.set(groupName, [])
      }
      customGroupsMap.get(groupName)!.push({
        value: `custom:${index}`,
        label: model.alias || model.name || model.modelId,
      })
    })
    const customGroupsList: ModelGroup[] = []
    customGroupsMap.forEach((options, group) => {
      customGroupsList.push({ group, options })
    })
    return customGroupsList
  }, [customModels])

  // ── Dynamic model discovery (by provider API key) ────────
  const { modelGroups } = useDynamicModels(customModelGroups)

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
    { id: 'chat' as const, icon: MessageSquare, label: 'Agente' },
    { id: 'plan' as const, icon: FileText, label: 'Plan' },
    { id: 'dev' as const, icon: Code2, label: 'Dev' },
    { id: 'composer' as const, icon: Layers, label: 'Composer' },
  ]

  const getSystemPrompt = useCallback(() => {
    const memorySection = projectMemory?.trim()
      ? `\n\n--- MEMORIA DEL PROYECTO ---\n${projectMemory}\n--- FIN MEMORIA ---`
      : ''

    const guidelinesSection = agenticGuidelines?.trim()
      ? `\n\n--- DIRECTRICES AGENTICAS ---\n${agenticGuidelines}\n--- FIN DIRECTRICES ---`
      : ''

    const skillsSection = activeSkills.length > 0
      ? `\n\n--- HABILIDADES / SKILLS DISPONIBLES ---\n${activeSkills.map(s => `[Skill: ${s.name}]\n${s.content}`).join('\n\n')}\n--- FIN HABILIDADES ---`
      : ''

    const fileExt = activeTabPath ? activeTabPath.split('.').pop() : ''
    let dynamicRules = ''
    if (fileExt === 'tsx' || fileExt === 'ts') {
      dynamicRules = '\n\n--- DIRECTRICES DE CONTEXTO (React/TypeScript) ---\n- Prioriza tipado estricto.\n- Sigue principios de componentes limpios y funcionales.'
    } else if (fileExt === 'js' || fileExt === 'jsx') {
      dynamicRules = '\n\n--- DIRECTRICES DE CONTEXTO (JavaScript) ---\n- Usa ES6+ moderno.\n- Limita los efectos secundarios.'
    } else if (fileExt === 'sql') {
      dynamicRules = '\n\n--- DIRECTRICES DE CONTEXTO (SQL) ---\n- Usa sintaxis ANSI SQL.\n- Optimiza consultas.'
    }

    let modePrompt = ''
    if (aiMode === 'plan') {
      modePrompt = `Eres un arquitecto de software experto. Genera un plan claro con objetivos, estructura de archivos, pasos de desarrollo y riesgos.`
    } else if (aiMode === 'dev') {
      modePrompt = `Eres un desarrollador experto. Responde con codigo real, concreto y listo para integrar cuando el usuario lo pida.`
    } else if (aiMode === 'composer') {
      modePrompt = `Eres un ingeniero de software experto en modificar multiples archivos a la vez. Cuando el usuario te pida cambios, responde con bloques de codigo marcados asi:\n\n\`\`\`filepath:ruta/al/archivo.ext\n// contenido del archivo\n\`\`\`\n\nSiempre muestra el archivo completo modificado, no solo el fragmento. Usa rutas relativas al proyecto.`
    } else {
      modePrompt = `Eres un asistente de codigo experto.`
    }

    return `${modePrompt}${memorySection}${guidelinesSection}${skillsSection}${dynamicRules}`
  }, [aiMode, projectMemory, agenticGuidelines, activeSkills, activeTabPath])

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

      {/* Agentic Guidelines & Skills indicators */}
      {(agenticGuidelines || activeSkills.length > 0) && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {agenticGuidelines && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--cipher-accent)]/20 bg-[var(--cipher-accent-bg)]/30 px-2.5 py-1 text-[11px] text-[var(--cipher-accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cipher-accent)] animate-pulse" />
              Directrices agenticas activas
            </div>
          )}
          {activeSkills.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 px-2.5 py-1 text-[11px] text-purple-400">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
              {activeSkills.length} {activeSkills.length === 1 ? 'Skill cargada' : 'Skills cargadas'}
            </div>
          )}
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
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="cipher-fade-up rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-4 text-[13px] leading-6 text-[var(--cipher-text-muted)]">
            Selecciona un modelo, guarda su key si aplica y usa el boton de prueba para validar la conexion.
            {(() => {
              const ollamaGroup = modelGroups.find(g => g.group === 'Ollama (local)')
              if (!ollamaGroup) return null
              const count = ollamaGroup.options.length
              return (
                <p className="mt-2 text-[12px] text-[#5a7a4a]">
                  ✓ Ollama detectado — {count} modelo{count !== 1 ? 's' : ''} disponible{count !== 1 ? 's' : ''}
                </p>
              )
            })()}
            {(() => {
              const lmGroup = modelGroups.find(g => g.group === 'LM Studio (local)')
              if (!lmGroup) return null
              const count = lmGroup.options.length
              return (
                <p className="mt-2 text-[12px] text-[#5a7a4a]">
                  ✓ LM Studio detectado — {count} modelo{count !== 1 ? 's' : ''} disponible{count !== 1 ? 's' : ''}
                </p>
              )
            })()}
            {projectMemory && (
              <p className="mt-2 text-[12px] text-[var(--cipher-accent)]">
                ✓ Memoria del proyecto activa — el agente conoce el contexto
              </p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`cipher-fade-up flex flex-col gap-2.5 ${
            msg.role === 'user' ? 'items-end' : 'items-start'
          }`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              msg.role === 'user' ? 'text-[var(--cipher-accent)]' :
              msg.role === 'error' ? 'text-[#ef4444]' :
              msg.role === 'system' ? 'text-[#38bdf8]' :
              'text-[var(--cipher-text)]'
            }`}>
              {msg.role === 'user' ? 'Tú' :
               msg.role === 'error' ? 'Error' :
               msg.role === 'system' ? 'Sistema' :
               'Agente Autónomo'}
            </span>

            {msg.role === 'assistant' && aiMode === 'plan' && currentPlan === msg.content ? (
              <textarea
                defaultValue={msg.content}
                onChange={e => setCurrentPlan(e.target.value)}
                className="w-full resize-y rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] p-4 font-mono text-[12px] text-[var(--cipher-text)] outline-none leading-relaxed"
                rows={10}
              />
            ) : (
              <div className={`break-words rounded-xl px-4 py-3 text-[13px] leading-[1.65] ${
                msg.role === 'user'
                  ? 'max-w-[85%] border border-[var(--cipher-accent-soft)] bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)] rounded-tr-none'
                  : msg.role === 'error'
                  ? 'w-full border-l-2 border-red-500 bg-red-500/5 text-red-400 pl-4'
                  : msg.role === 'system'
                  ? 'w-full border-l-2 border-[#38bdf8] bg-[#38bdf8]/5 text-[#38bdf8]/90 pl-4'
                  : 'w-full border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)]/35 text-[var(--cipher-text)]'
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
            rows={3}
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

      {/* Composer mode hint */}
      {aiMode === 'composer' && (
        <div className="flex-shrink-0 border-t border-[var(--cipher-border)] px-5 pb-4 pt-3">
          <div className="rounded-xl border border-[#7c4dff]/30 bg-[#7c4dff]/10 p-3 text-[12px] text-[var(--cipher-text-muted)] leading-5">
            <p className="font-semibold text-[#c5b8ff] mb-1">Modo Composer activo</p>
            El agente propondrá cambios en múltiples archivos con bloques marcados como
            <code className="mx-1 rounded bg-white/[0.07] px-1.5 py-0.5 text-[11px] text-[#c5b8ff]">```filepath:ruta</code>.
            Copia y aplica cada bloque al archivo correspondiente.
          </div>
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
  const { addCustomModel, customModels, removeCustomModel, setAiModel } = useStore()
  const [provider, setProvider] = useState('openrouter')
  const [endpointName, setEndpointName] = useState('OpenRouter')
  const [endpointUrl, setEndpointUrl] = useState('https://openrouter.ai/api/v1')
  const [apiKey, setApiKey] = useState('')
  const [modelsList, setModelsList] = useState<{ modelId: string; alias: string }[]>([
    { modelId: 'openai/gpt-oss-120b:free', alias: 'GPT OSS' },
    { modelId: 'google/gemma-4-31b-it:free', alias: 'Gemma 4' },
  ])

  // Extract unique endpoints configured so far
  const uniqueEndpoints = useMemo(() => {
    const map = new Map<string, { endpointName: string; url: string; key: string; provider: string; modelsCount: number }>()
    customModels.forEach(m => {
      const name = m.endpointName || 'Personalizado'
      if (!map.has(name)) {
        map.set(name, {
          endpointName: name,
          url: m.url || '',
          key: m.key || '',
          provider: m.provider,
          modelsCount: 0
        })
      }
      map.get(name)!.modelsCount++
    })
    return Array.from(map.values())
  }, [customModels])

  const loadEndpoint = (ep: typeof uniqueEndpoints[number]) => {
    setEndpointName(ep.endpointName)
    setEndpointUrl(ep.url)
    setApiKey(ep.key)
    setProvider(ep.provider)
    const matching = customModels.filter(m => m.endpointName === ep.endpointName)
    if (matching.length > 0) {
      setModelsList(matching.map(m => ({ modelId: m.modelId, alias: m.alias || '' })))
    }
  }

  const addModelRow = () => {
    setModelsList(prev => [...prev, { modelId: '', alias: '' }])
  }

  const removeModelRow = (index: number) => {
    if (modelsList.length === 1) {
      setModelsList([{ modelId: '', alias: '' }])
    } else {
      setModelsList(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleModelChange = (index: number, field: 'modelId' | 'alias', value: string) => {
    setModelsList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const save = () => {
    if (!endpointName.trim()) return

    // 1. Remove existing models for this endpoint name to overwrite
    const indicesToRemove: number[] = []
    customModels.forEach((m, idx) => {
      if (m.endpointName === endpointName.trim()) {
        indicesToRemove.push(idx)
      }
    })
    indicesToRemove.sort((a, b) => b - a).forEach(idx => {
      removeCustomModel(idx)
    })

    // 2. Add the models and select the first valid added model
    let newIndex = customModels.length - indicesToRemove.length
    let selectedSet = false

    modelsList.forEach(m => {
      if (!m.modelId.trim()) return
      addCustomModel({
        name: m.alias.trim() || m.modelId.trim(),
        provider,
        modelId: m.modelId.trim(),
        url: endpointUrl.trim() || undefined,
        key: apiKey.trim() || undefined,
        alias: m.alias.trim() || undefined,
        endpointName: endpointName.trim()
      })
      if (!selectedSet) {
        setAiModel(`custom:${newIndex}`)
        selectedSet = true
      }
      newIndex++
    })

    onClose()
  }

  const removeWholeEndpoint = () => {
    if (!endpointName.trim()) return
    const indicesToRemove: number[] = []
    customModels.forEach((m, idx) => {
      if (m.endpointName === endpointName.trim()) {
        indicesToRemove.push(idx)
      }
    })
    indicesToRemove.sort((a, b) => b - a).forEach(idx => {
      removeCustomModel(idx)
    })
    setEndpointName('')
    setEndpointUrl('')
    setApiKey('')
    setModelsList([{ modelId: '', alias: '' }])
  }



  return (
    <div className="cipher-pop-enter absolute inset-0 z-50 flex flex-col overflow-y-auto bg-[#11141e] p-6 text-[var(--cipher-text)]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-[var(--cipher-border)] pb-4">
        <div>
          <h2 className="text-[15px] font-bold text-white">Edit custom endpoint</h2>
          <p className="mt-1 text-[11px] text-[var(--cipher-text-muted)] leading-relaxed">
            Provide your endpoint details below. You can add as many models from the endpoint as you'd
            like and can also provide aliases for the model picker in your input.
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Provider selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase tracking-wider">Provider</label>
          <ModelSelect
            label="Select"
            value={provider}
            onChange={(newProvider) => {
              setProvider(newProvider)
              if (newProvider === 'openrouter') {
                setEndpointName('OpenRouter')
                setEndpointUrl('https://openrouter.ai/api/v1')
              } else if (newProvider === 'nim') {
                setEndpointName('NVIDIA NIM')
                setEndpointUrl('https://integrate.api.nvidia.com/v1')
              } else if (newProvider === 'openai') {
                setEndpointName('OpenAI Custom')
                setEndpointUrl('https://api.openai.com/v1')
              } else if (newProvider === 'anthropic') {
                setEndpointName('Anthropic Custom')
                setEndpointUrl('https://api.anthropic.com/v1')
              } else if (newProvider === 'google') {
                setEndpointName('Google Custom')
                setEndpointUrl('https://generativelanguage.googleapis.com')
              } else if (newProvider === 'deepseek') {
                setEndpointName('DeepSeek Custom')
                setEndpointUrl('https://api.deepseek.com/v1')
              } else if (newProvider === 'kimi') {
                setEndpointName('Kimi Custom')
                setEndpointUrl('https://api.moonshot.cn/v1')
              } else if (newProvider === 'qwen') {
                setEndpointName('Qwen Custom')
                setEndpointUrl('https://dashscope.aliyuncs.com/compatible-mode/v1')
              } else if (newProvider === 'openai-compatible') {
                setEndpointName('OpenAI Compatible')
                setEndpointUrl('http://localhost:1234/v1')
              } else if (newProvider === 'ollama') {
                setEndpointName('Ollama Cloud')
                setEndpointUrl('http://localhost:11434')
              } else {
                setEndpointName('Custom Endpoint')
                setEndpointUrl('')
              }
            }}
            groups={PROVIDERS}
          />
        </div>

        {/* Endpoint Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase tracking-wider">Endpoint name</label>
          <input
            value={endpointName}
            onChange={e => setEndpointName(e.target.value)}
            placeholder="e.g. OpenRouter"
            className="rounded-lg border border-[var(--cipher-border)] bg-[#0c1018] px-3.5 py-2.5 text-[13px] text-white outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
          />
        </div>

        {/* Endpoint URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase tracking-wider">Endpoint URL</label>
          <input
            value={endpointUrl}
            onChange={e => setEndpointUrl(e.target.value)}
            placeholder="https://..."
            className="rounded-lg border border-[var(--cipher-border)] bg-[#0c1018] px-3.5 py-2.5 text-[13px] text-white outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
          />
        </div>

        {/* API Key */}
        {provider !== 'lmstudio' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase tracking-wider">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="••••••••••••••••••••••••"
              className="rounded-lg border border-[var(--cipher-border)] bg-[#0c1018] px-3.5 py-2.5 text-[13px] text-white outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
            />
          </div>
        )}

        {/* Dynamic Models list */}
        <div className="mt-2 flex flex-col gap-2.5">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-medium text-[var(--cipher-text-muted)] uppercase tracking-wider">
            <div className="col-span-6">Model name</div>
            <div className="col-span-5">Model alias (optional)</div>
            <div className="col-span-1"></div>
          </div>

          <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
            {modelsList.map((m, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={m.modelId}
                  onChange={e => handleModelChange(idx, 'modelId', e.target.value)}
                  placeholder="e.g. openai/gpt-oss-120b:free"
                  className="col-span-6 rounded-lg border border-[var(--cipher-border)] bg-[#0c1018] px-3 py-2 text-[13px] text-white outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
                />
                <input
                  value={m.alias}
                  onChange={e => handleModelChange(idx, 'alias', e.target.value)}
                  placeholder="e.g. GPT OSS"
                  className="col-span-5 rounded-lg border border-[var(--cipher-border)] bg-[#0c1018] px-3 py-2 text-[13px] text-white outline-none transition-all placeholder-[var(--cipher-text-muted)] focus:border-[var(--cipher-accent)]"
                />
                <button
                  onClick={() => removeModelRow(idx)}
                  className="col-span-1 flex justify-center items-center rounded-lg p-2 text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-red-400"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addModelRow}
            className="self-start mt-1 flex items-center gap-1.5 rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-3 py-1.5 text-[12px] text-white transition-all hover:bg-white/[0.05]"
          >
            <Plus size={13} />
            Add model
          </button>
        </div>
      </div>

      {/* Footer / Buttons */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--cipher-border)] pt-4">
        <button
          onClick={removeWholeEndpoint}
          disabled={!endpointName.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-2 text-[13px] font-medium text-red-400 transition-all hover:bg-red-900/30 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Trash2 size={15} />
          Remove
        </button>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-4 py-2 text-[13px] font-medium text-[var(--cipher-text)] transition-all hover:bg-white/[0.03]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-[var(--cipher-accent)] px-4 py-2 text-[13px] font-medium text-white transition-all hover:opacity-85"
          >
            Save
          </button>
        </div>
      </div>

      {/* Existing endpoints list */}
      {uniqueEndpoints.length > 0 && (
        <div className="mt-6 border-t border-[var(--cipher-border)] pt-4">
          <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-2.5">Configured endpoints</h3>
          <div className="flex flex-col gap-1.5">
            {uniqueEndpoints.map((ep, i) => (
              <div
                key={i}
                onClick={() => loadEndpoint(ep)}
                className="flex items-center justify-between rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)]/35 p-3 cursor-pointer transition-all hover:border-[var(--cipher-accent)] hover:bg-[var(--cipher-surface-alt)]/60"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-white">{ep.endpointName}</span>
                  <span className="text-[11px] text-[var(--cipher-text-muted)] truncate max-w-[240px]">{ep.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--cipher-accent-bg)] px-2 py-0.5 text-[10px] text-[var(--cipher-accent)] font-semibold border border-[var(--cipher-accent-soft)]">
                    {ep.modelsCount} {ep.modelsCount === 1 ? 'model' : 'models'}
                  </span>
                  <span className="text-[11px] text-[var(--cipher-text-muted)] uppercase tracking-wider font-semibold">
                    {ep.provider}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
          <pre key={`code-${idx}`} className="my-3 overflow-x-auto rounded-lg border border-[var(--cipher-border)] p-4 font-mono text-[12px]" style={{ background: 'var(--cipher-code-bg)', color: 'var(--cipher-code-text)' }}>
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
      elements.push(<h3 key={`h3-${idx}`} className="mt-4 mb-2 text-[14px] font-bold text-[var(--cipher-text)]">{renderInlineMarkdown(line.slice(4))}</h3>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${idx}`} className="mt-4 mb-2 text-[15px] font-bold text-[var(--cipher-text)]">{renderInlineMarkdown(line.slice(3))}</h2>);
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${idx}`} className="mt-4 mb-2 text-[16px] font-bold text-[var(--cipher-text)]">{renderInlineMarkdown(line.slice(2))}</h1>);
      return;
    }

    // Lists
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      elements.push(
        <li key={`li-${idx}`} className="ml-4 list-disc py-0.5 text-[13px] text-[var(--cipher-text)]">
          {renderInlineMarkdown(line.slice(2))}
        </li>
      );
      return;
    }

    const numberedMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      elements.push(
        <li key={`li-num-${idx}`} className="ml-4 list-decimal py-0.5 text-[13px] text-[var(--cipher-text)]">
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
      <p key={`p-${idx}`} className="mb-2.5 text-[13px] leading-relaxed text-[var(--cipher-text)]">
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  // Handle unclosed code blocks (for streaming responses)
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre key="unclosed-code" className="my-3 overflow-x-auto rounded-lg border border-[var(--cipher-border)] p-4 font-mono text-[12px]" style={{ background: 'var(--cipher-code-bg)', color: 'var(--cipher-code-text)' }}>
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-2">{elements}</div>;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[var(--cipher-text)]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-[var(--cipher-text-muted)]">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded-md px-1.5 py-0.5 font-mono text-[12px] border" style={{ background: 'var(--cipher-code-inline-bg)', color: 'var(--cipher-code-inline-text)', borderColor: 'var(--cipher-border)' }}>{part.slice(1, -1)}</code>;
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
    <div className="rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)]/30 overflow-hidden text-[12px]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-[var(--cipher-text-muted)] hover:bg-[var(--cipher-surface-alt)]/60"
      >
        <span className="flex items-center gap-2 font-medium">
          <Loader2 size={12} className={`text-[var(--cipher-accent)] ${active ? 'animate-spin' : ''}`} />
          {active ? 'Pensando...' : 'Proceso de pensamiento'}
        </span>
        <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-[var(--cipher-border)] bg-[var(--cipher-bg)]/40 p-3 font-mono text-[11px] leading-relaxed text-[var(--cipher-text-muted)] whitespace-pre-wrap">
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
