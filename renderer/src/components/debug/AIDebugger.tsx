import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronRight,
  Info,
  Lightbulb,
  Loader2,
  Sparkles,
  Square,
  WrapText,
  X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'

// ── Types ────────────────────────────────────────────────

interface AIResponse {
  markerId: string
  content: string
  streaming: boolean
  type: 'explain' | 'fix'
}

// ── Helpers ──────────────────────────────────────────────

function getStoredApiKey(model: string): string {
  const provider = model.startsWith('openrouter:') ? 'openrouter'
    : model.startsWith('nim:')       ? 'nim'
    : model.startsWith('deepseek:')  ? 'deepseek'
    : model.startsWith('kimi:')      ? 'kimi'
    : model.startsWith('qwen:')      ? 'qwen'
    : model.startsWith('claude')     ? 'anthropic'
    : model.startsWith('gpt')        ? 'openai'
    : model.startsWith('gemini')     ? 'google'
    : 'custom'
  return (
    localStorage.getItem(`cipher-api-key-${model}`) ||
    localStorage.getItem(`cipher-provider-api-key-${provider}`) ||
    ''
  )
}

function resolveModel(
  aiModel: string,
  customModels: { name: string; provider: string; modelId: string; url?: string; key?: string }[]
): { model: string; apiKey: string } {
  if (aiModel.startsWith('custom:')) {
    const index = Number(aiModel.replace('custom:', ''))
    const custom = customModels[index]
    if (custom) {
      const model = custom.provider === 'openai-compatible' && custom.url
        ? `openai-compatible|${custom.url}|${custom.modelId}`
        : `${custom.provider}:${custom.modelId}`
      return { model, apiKey: custom.key || '' }
    }
  }
  return { model: aiModel, apiKey: getStoredApiKey(aiModel) }
}

function severityLabel(s: number) {
  if (s === 8) return { label: 'Error',      color: 'text-[#ff6b6b]', bg: 'bg-[#ff6b6b]/10', border: 'border-[#ff6b6b]/20', icon: AlertCircle }
  if (s === 4) return { label: 'Advertencia', color: 'text-[#ffd93d]', bg: 'bg-[#ffd93d]/08', border: 'border-[#ffd93d]/20', icon: AlertTriangle }
  if (s === 2) return { label: 'Info',        color: 'text-[#4fc3f7]', bg: 'bg-[#4fc3f7]/08', border: 'border-[#4fc3f7]/20', icon: Info }
  return { label: 'Sugerencia',               color: 'text-[#9d87ff]', bg: 'bg-[#9d87ff]/08', border: 'border-[#9d87ff]/20', icon: Lightbulb }
}

function markerId(marker: { filePath: string; startLineNumber: number; startColumn: number; message: string }) {
  return `${marker.filePath}:${marker.startLineNumber}:${marker.startColumn}:${marker.message.slice(0, 20)}`
}

let streamCounter = 0
function newStreamId() {
  return `debug-${++streamCounter}-${Date.now()}`
}

// ── StreamingCursor ──────────────────────────────────────

function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-[12px] w-[2px] translate-y-[1px] animate-pulse rounded-sm bg-[#7c4dff]" />
  )
}

// ── Main component ───────────────────────────────────────

export default function AIDebugger() {
  const { editorMarkers, activeTabPath, aiModel, customModels } = useStore()

  const [responses, setResponses] = useState<Record<string, AIResponse>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filterSeverity, setFilterSeverity] = useState<number | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const activeStreamId = useRef<string | null>(null)
  const activeMarkerId = useRef<string | null>(null)

  // ── Register stream listeners ──────────────────────────
  useEffect(() => {
    const removeToken = window.cipher.onAiStreamToken((streamId, token) => {
      if (streamId !== activeStreamId.current) return
      const mid = activeMarkerId.current!
      setResponses(prev => ({
        ...prev,
        [mid]: {
          ...prev[mid],
          content: (prev[mid]?.content ?? '') + token,
          streaming: true,
        },
      }))
    })

    const removeEnd = window.cipher.onAiStreamEnd((streamId) => {
      if (streamId !== activeStreamId.current) return
      const mid = activeMarkerId.current!
      activeStreamId.current = null
      activeMarkerId.current = null
      setIsStreaming(false)
      setResponses(prev => ({
        ...prev,
        [mid]: { ...prev[mid], streaming: false },
      }))
    })

    const removeError = window.cipher.onAiStreamError((streamId, message) => {
      if (streamId !== activeStreamId.current) return
      const mid = activeMarkerId.current!
      activeStreamId.current = null
      activeMarkerId.current = null
      setIsStreaming(false)
      setResponses(prev => ({
        ...prev,
        [mid]: { markerId: mid, content: `Error: ${message}`, streaming: false, type: 'explain' },
      }))
    })

    return () => { removeToken(); removeEnd(); removeError() }
  }, [])

  const stopStream = useCallback(() => {
    if (activeStreamId.current) {
      window.cipher.aiStreamAbort(activeStreamId.current)
      activeStreamId.current = null
    }
    if (activeMarkerId.current) {
      const mid = activeMarkerId.current
      activeMarkerId.current = null
      setIsStreaming(false)
      setResponses(prev => ({
        ...prev,
        [mid]: { ...prev[mid], streaming: false },
      }))
    }
  }, [])

  const askAI = useCallback(async (
    marker: typeof editorMarkers[0],
    type: 'explain' | 'fix'
  ) => {
    const mid = markerId(marker)

    // Stop any existing stream
    if (activeStreamId.current) stopStream()

    const { label } = severityLabel(marker.severity)
    const fileShort = marker.filePath.split('\\').pop() || marker.filePath.split('/').pop() || marker.filePath

    // Try to read the file for context
    let fileContext = ''
    if (activeTabPath) {
      try {
        const content = await window.cipher.readFile(activeTabPath)
        const lines = content.split('\n')
        const start = Math.max(0, marker.startLineNumber - 5)
        const end = Math.min(lines.length, marker.endLineNumber + 5)
        const snippet = lines.slice(start, end)
          .map((line, i) => `${start + i + 1} | ${line}`)
          .join('\n')
        fileContext = `\nCodigo relevante (lineas ${start + 1}-${end}):\n\`\`\`\n${snippet}\n\`\`\``
      } catch { /* no file context */ }
    }

    const prompt = type === 'explain'
      ? `Tengo un ${label.toLowerCase()} de TypeScript/JavaScript en el archivo "${fileShort}" en la línea ${marker.startLineNumber}:

**Mensaje:** ${marker.message}${marker.source ? `\n**Fuente:** ${marker.source}` : ''}${fileContext}

Explica en español de forma clara y concisa:
1. Qué significa este error exactamente
2. Por qué ocurre
3. Cómo solucionarlo (con ejemplo de código si aplica)`
      : `Necesito corregir este ${label.toLowerCase()} en "${fileShort}" línea ${marker.startLineNumber}:

**Mensaje:** ${marker.message}${marker.source ? `\n**Fuente:** ${marker.source}` : ''}${fileContext}

Proporciona el código corregido específico para esta línea. Muestra solo el fragmento que debe cambiar, sin explicación larga.`

    const { model, apiKey } = resolveModel(aiModel, customModels)
    const isLocal = model.startsWith('ollama:') || model.startsWith('lmstudio:')
    if (!apiKey && !isLocal) {
      setResponses(prev => ({
        ...prev,
        [mid]: { markerId: mid, content: 'Configura una API key en el panel del Agente IA.', streaming: false, type },
      }))
      return
    }

    const streamId = newStreamId()
    activeStreamId.current = streamId
    activeMarkerId.current = mid
    setIsStreaming(true)

    setResponses(prev => ({
      ...prev,
      [mid]: { markerId: mid, content: '', streaming: true, type },
    }))

    // Auto-expand
    setExpanded(prev => ({ ...prev, [mid]: true }))

    window.cipher.aiStreamStart({
      streamId,
      model,
      apiKey,
      messages: [{ role: 'user', content: prompt }],
      context: null,
      systemPrompt: 'Eres un experto en debugging de TypeScript, JavaScript y desarrollo web. Respondes en español, de forma directa y precisa.',
    })
  }, [aiModel, customModels, activeTabPath, stopStream])

  // ── Filter ─────────────────────────────────────────────
  const actionableMarkers = editorMarkers.filter(m => m.severity === 8 || m.severity === 4)
  const filtered = filterSeverity
    ? actionableMarkers.filter(m => m.severity === filterSeverity)
    : actionableMarkers

  const errors   = actionableMarkers.filter(m => m.severity === 8).length
  const warnings = actionableMarkers.filter(m => m.severity === 4).length

  // Group by file
  const byFile = filtered.reduce<Record<string, typeof actionableMarkers>>((acc, m) => {
    const file = m.filePath.split('\\').pop() || m.filePath.split('/').pop() || m.filePath
    if (!acc[file]) acc[file] = []
    acc[file].push(m)
    return acc
  }, {})

  // ── Empty state ────────────────────────────────────────
  if (actionableMarkers.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2ea043]/10">
          <AlertCircle size={26} className="text-[#3fb950]" />
        </div>
        <p className="text-[14px] font-medium text-[#dce4ff]">Sin errores ni advertencias</p>
        <p className="text-[12px] text-[#6b7280]">
          Cuando Monaco detecte un problema accionable, aparecera aqui para explicarlo o sugerir un fix.
        </p>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Summary bar */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 py-3">
        <button
          onClick={() => setFilterSeverity(filterSeverity === 8 ? null : 8)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-all ${
            filterSeverity === 8 ? 'bg-[#ff6b6b]/20 text-[#ff9a9a]' : 'text-[#ff6b6b] hover:bg-[#ff6b6b]/10'
          }`}
        >
          <AlertCircle size={12} />
          {errors} error{errors !== 1 ? 'es' : ''}
        </button>
        <button
          onClick={() => setFilterSeverity(filterSeverity === 4 ? null : 4)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-all ${
            filterSeverity === 4 ? 'bg-[#ffd93d]/20 text-[#ffe97d]' : 'text-[#ffd93d] hover:bg-[#ffd93d]/10'
          }`}
        >
          <AlertTriangle size={12} />
          {warnings} advertencia{warnings !== 1 ? 's' : ''}
        </button>

        {isStreaming && (
          <button
            onClick={stopStream}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#ff6b6b]/10 px-2.5 py-1.5 text-[12px] text-[#ff9a9a] transition-all hover:bg-[#ff6b6b]/20"
          >
            <Square size={11} fill="currentColor" />
            Detener
          </button>
        )}
      </div>

      {/* Marker list */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {Object.entries(byFile).map(([file, markers]) => (
          <div key={file} className="border-b border-white/[0.05]">
            {/* File header */}
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#0d0f1a] px-5 py-2.5">
              <WrapText size={12} className="text-[#4a5070]" />
              <span className="text-[12px] font-semibold text-[#7f8bb0]">{file}</span>
              <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#6b7280]">
                {markers.length}
              </span>
            </div>

            {/* Markers */}
            {markers.map((marker) => {
              const mid = markerId(marker)
              const { label, color, bg, border, icon: Icon } = severityLabel(marker.severity)
              const response = responses[mid]
              const isExpanded = expanded[mid]
              const isStreaming = response?.streaming

              return (
                <div key={mid} className={`border-b border-white/[0.04] ${bg}`}>
                  {/* Marker header */}
                  <div className="flex items-start gap-3 px-5 py-3">
                    <Icon size={14} className={`mt-0.5 flex-shrink-0 ${color}`} />

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="break-words text-[13px] leading-relaxed text-[#dce4ff]">
                        {marker.message}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-[#5a6080]">
                        <span className={`font-medium ${color}`}>{label}</span>
                        {marker.source && <span>{marker.source}</span>}
                        <span>Ln {marker.startLineNumber}, Col {marker.startColumn}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => askAI(marker, 'explain')}
                        disabled={!!isStreaming}
                        title="Explicar con IA"
                        className="flex h-7 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 text-[11px] text-[#9d87ff] transition-all hover:border-[#7a5cff]/40 hover:bg-[#7a5cff]/12 hover:text-white disabled:opacity-40"
                      >
                        {isStreaming && response?.type === 'explain'
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Bot size={11} />
                        }
                        Explicar
                      </button>
                      <button
                        onClick={() => askAI(marker, 'fix')}
                        disabled={!!isStreaming}
                        title="Sugerir fix"
                        className="flex h-7 items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 text-[11px] text-[#4fc3f7] transition-all hover:border-[#4fc3f7]/40 hover:bg-[#4fc3f7]/10 hover:text-white disabled:opacity-40"
                      >
                        {isStreaming && response?.type === 'fix'
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Sparkles size={11} />
                        }
                        Fix
                      </button>
                      {response && (
                        <button
                          onClick={() => setExpanded(prev => ({ ...prev, [mid]: !isExpanded }))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5a6080] transition-all hover:text-white"
                        >
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      )}
                      {response && !isStreaming && (
                        <button
                          onClick={() => setResponses(prev => { const n = { ...prev }; delete n[mid]; return n })}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5a6080] transition-all hover:text-[#ff6b6b]"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI response */}
                  {response && isExpanded && (
                    <div className={`mx-4 mb-3 rounded-xl border ${border} bg-[#070912] p-4`}>
                      <div className="mb-2 flex items-center gap-2">
                        <Bot size={12} className="text-[#7c4dff]" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b8a]">
                          {response.type === 'explain' ? 'Explicación' : 'Fix sugerido'}
                        </span>
                      </div>
                      <div className="break-words text-[13px] leading-relaxed text-[#dce4ff]">
                        {renderContentWithThinking(response.content, response.streaming)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-shrink-0 items-center border-t border-white/[0.07] px-5 py-2.5">
        <span className="text-[11px] text-[#3a4060]">
          {filtered.length} problema{filtered.length !== 1 ? 's' : ''} · usa el modelo activo en el Agente IA
        </span>
      </div>
    </div>
  )
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
