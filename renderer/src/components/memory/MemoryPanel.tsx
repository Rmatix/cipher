import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'

import { resolveCustomModel, getStoredApiKey } from '../ai/models'

// ── Helpers ──────────────────────────────────────────────

const MEMORY_PLACEHOLDER = `# Memoria del Proyecto

## Descripcion
_Describe brevemente que hace este proyecto._

## Stack tecnico
- 

## Arquitectura
_Carpetas principales y su proposito._

## Convenciones
_Nombrado, patrones de codigo, etc._

## Estado actual
_En que punto esta el desarrollo._

## Notas para el agente
_Instrucciones especiales para la IA._
`

// ── Auto-generate prompt ─────────────────────────────────

function buildGeneratePrompt(
  files: { path: string; content: string }[],
  existingMemory: string
): string {
  const fileList = files
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n')

  const existingSection = existingMemory.trim()
    ? `\n\nEl proyecto ya tiene esta memoria parcial — actualiza y expande:\n\`\`\`\n${existingMemory}\n\`\`\``
    : ''

  return `Analiza el siguiente codigo fuente y genera un archivo PROYECTO.md completo y util para un agente IA que va a trabajar en este proyecto.

El documento debe incluir:
1. Descripcion clara del proyecto
2. Stack tecnico (lenguajes, frameworks, librerias clave)
3. Arquitectura (estructura de carpetas y su proposito)
4. Patrones y convenciones del codigo
5. Estado actual del desarrollo
6. Puntos de entrada principales (archivos clave)
7. Notas importantes para el agente IA

Responde SOLO con el contenido Markdown del PROYECTO.md, sin explicaciones adicionales, sin bloques de codigo externos.${existingSection}

--- CODIGO FUENTE ---

${fileList}`
}

// ── Status badge ─────────────────────────────────────────

function StatusBadge({ exists }: { exists: boolean | null }) {
  if (exists === null) return null
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
      exists
        ? 'bg-[var(--cipher-status-ok)]/15 text-[var(--cipher-status-ok)]'
        : 'bg-white/[0.06] text-[var(--cipher-muted-ink)]'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${exists ? 'bg-[var(--cipher-status-ok)]' : 'bg-[var(--cipher-muted-ink)]'}`} />
      {exists ? 'Memoria activa' : 'Sin memoria'}
    </span>
  )
}

// ── Main component ───────────────────────────────────────

export default function MemoryPanel() {
  const { currentFolder, projectMemory, setProjectMemory, aiModel, customModels } = useStore()

  const [content, setContent] = useState('')
  const [memoryExists, setMemoryExists] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const activeStreamId = useRef<string | null>(null)
  const streamCounter = useRef(0)

  // ── Load memory ────────────────────────────────────────
  // Declared before useEffect so the effect can reference it
  const loadMemory = useCallback(async () => {
    if (!currentFolder) return
    const exists = await window.cipher.memoryExists(currentFolder)
    setMemoryExists(exists)
    if (exists) {
      const result = await window.cipher.memoryRead(currentFolder)
      if ('content' in result) {
        setContent(result.content)
        setProjectMemory(result.content)
      }
    } else {
      setContent(MEMORY_PLACEHOLDER)
      setProjectMemory(null)
    }
  }, [currentFolder, setProjectMemory])

  // ── Load memory when folder changes ───────────────────
  useEffect(() => {
    if (!currentFolder) {
      const t = setTimeout(() => {
        setContent('')
        setMemoryExists(null)
      }, 0)
      return () => clearTimeout(t)
    }
    // loadMemory is async and sets state inside — intentional pattern for IPC calls
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMemory()
  }, [currentFolder, loadMemory])

  // Sync store → local state when another component updates memory
  useEffect(() => {
    if (projectMemory !== null && projectMemory !== content) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContent(projectMemory)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectMemory])

  // ── Save ───────────────────────────────────────────────
  const saveMemory = async () => {
    if (!currentFolder) return
    setError(null)
    const result = await window.cipher.memoryWrite(currentFolder, content)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setProjectMemory(content)
    setMemoryExists(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Clear ──────────────────────────────────────────────
  const clearMemory = async () => {
    if (!currentFolder) return
    await window.cipher.memoryWrite(currentFolder, '')
    setContent(MEMORY_PLACEHOLDER)
    setProjectMemory(null)
    setMemoryExists(false)
  }

  // ── Auto-generate via streaming ────────────────────────
  const generateMemory = useCallback(async () => {
    if (!currentFolder || generating) return
    setError(null)
    setGenerating(true)
    setGenerateProgress('Escaneando proyecto...')
    setStreamingContent('')
    setShowPreview(true)

    // 1. Scan project files
    const scanResult = await window.cipher.projectScan(currentFolder, 45)
    if ('error' in scanResult) {
      setError(`Error al escanear: ${scanResult.error}`)
      setGenerating(false)
      return
    }
    const { files } = scanResult
    if (files.length === 0) {
      setError('No se encontraron archivos de codigo en el proyecto.')
      setGenerating(false)
      return
    }

    setGenerateProgress(`Analizando ${files.length} archivos...`)

    // 2. Build prompt
    const prompt = buildGeneratePrompt(files, memoryExists ? content : '')

    // 3. Resolve model + key
    const resolved = resolveCustomModel(aiModel, customModels)
    const resolvedModel = resolved.model
    const apiKey = resolved.savedKey ?? getStoredApiKey(resolved.model)

    // 4. Stream response
    const streamId = `memory-gen-${++streamCounter.current}-${Date.now()}`
    activeStreamId.current = streamId
    let accumulated = ''

    const removeToken = window.cipher.onAiStreamToken((sid, token) => {
      if (sid !== streamId) return
      accumulated += token
      setStreamingContent(accumulated)
      setGenerateProgress('Generando documentacion...')
    })

    const removeEnd = window.cipher.onAiStreamEnd((sid) => {
      if (sid !== streamId) return
      cleanup()
      finalizeGeneration(accumulated)
    })

    const removeError = window.cipher.onAiStreamError((sid, msg) => {
      if (sid !== streamId) return
      cleanup()
      setError(`Error del modelo: ${msg}`)
      setGenerating(false)
      setGenerateProgress('')
    })

    function cleanup() {
      removeToken()
      removeEnd()
      removeError()
      activeStreamId.current = null
    }

    async function finalizeGeneration(result: string) {
      // Strip possible markdown fence if model wrapped in ```markdown ... ```
      const clean = result
        .replace(/^```(?:markdown)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim()

      setContent(clean)
      setStreamingContent('')
      setGenerateProgress('Guardando...')

      // Auto-save
      const writeResult = await window.cipher.memoryWrite(currentFolder!, clean)
      if ('error' in writeResult) {
        setError(`Generado pero no guardado: ${writeResult.error}`)
      } else {
        setProjectMemory(clean)
        setMemoryExists(true)
      }

      setGenerating(false)
      setGenerateProgress('')
    }

    window.cipher.aiStreamStart({
      streamId,
      model: resolvedModel,
      apiKey,
      messages: [{ role: 'user', content: prompt }],
      context: null,
      systemPrompt: 'Eres un experto en documentacion de software. Genera documentacion clara, concisa y util para agentes IA.',
    })
  // content y memoryExists son leidos en el snapshot del closure al momento de generar — intencional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder, generating, aiModel, customModels, setProjectMemory])

  // Stop generation
  const stopGeneration = () => {
    if (activeStreamId.current) {
      window.cipher.aiStreamAbort(activeStreamId.current)
      activeStreamId.current = null
    }
    setGenerating(false)
    setGenerateProgress('')
    if (streamingContent) {
      setContent(streamingContent)
      setStreamingContent('')
    }
  }

  // ── No folder open ─────────────────────────────────────
  if (!currentFolder) {
    return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <BookOpen size={32} className="text-[var(--cipher-text-muted)]" />
        <p className="text-[13px] text-[var(--cipher-text-muted)]">Abre una carpeta para gestionar la memoria del proyecto.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--cipher-border)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <BookOpen size={15} className="text-[var(--cipher-accent)]" />
          <span className="text-[13px] font-semibold text-[var(--cipher-text)]">Memoria del proyecto</span>
        </div>
        <StatusBadge exists={memoryExists} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-shrink-0 gap-2 border-b border-[var(--cipher-border)] px-5 py-3">
        {/* Auto-generate */}
        {generating ? (
          <button
            onClick={stopGeneration}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--cipher-status-err)]/20 text-[12px] text-[var(--cipher-status-err)] transition-all hover:bg-[var(--cipher-status-err)]/30"
          >
            <X size={13} />
            Detener
          </button>
        ) : (
          <button
            onClick={generateMemory}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--cipher-accent-bg)] text-[12px] text-[var(--cipher-text)] transition-all hover:bg-[var(--cipher-accent-soft)] hover:text-white"
          >
            <Sparkles size={13} />
            Auto-generar con IA
          </button>
        )}

        {/* Save */}
        <button
          onClick={saveMemory}
          disabled={generating}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent)] hover:text-white disabled:opacity-40"
          title="Guardar memoria (Ctrl+S)"
        >
          {saved ? <CheckCircle2 size={14} className="text-[var(--cipher-status-ok)]" /> : <Save size={14} />}
        </button>

        {/* Reset */}
        <button
          onClick={clearMemory}
          disabled={generating}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-status-err)]/50 hover:text-[var(--cipher-status-err)] disabled:opacity-40"
          title="Limpiar memoria"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Progress bar */}
      {generating && generateProgress && (
        <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-[var(--cipher-border)] bg-[var(--cipher-accent-bg)] px-5 py-2.5">
          <Loader2 size={12} className="animate-spin text-[var(--cipher-accent)]" />
          <span className="text-[12px] text-[var(--cipher-text)]">{generateProgress}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-shrink-0 items-start gap-2 border-b border-[var(--cipher-status-err)]/20 bg-[var(--cipher-status-err)]/08 px-5 py-3">
          <span className="text-[12px] leading-relaxed text-[var(--cipher-status-err)]">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-[var(--cipher-status-err)] hover:text-white">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Streaming preview toggle */}
      {generating && streamingContent && (
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex flex-shrink-0 items-center justify-between border-b border-[var(--cipher-border)] px-5 py-2.5 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:text-white"
        >
          <span className="flex items-center gap-2">
            <Bot size={12} className="text-[var(--cipher-accent)]" />
            Vista previa en tiempo real
          </span>
          {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}

      {/* Streaming preview */}
      {generating && streamingContent && showPreview && (
        <div className="max-h-48 flex-shrink-0 overflow-y-auto border-b border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-5 py-3">
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--cipher-text-muted)]">
            {streamingContent}
            <span className="ml-0.5 inline-block h-[10px] w-[2px] translate-y-[1px] animate-pulse rounded-sm bg-[var(--cipher-accent)]" />
          </pre>
        </div>
      )}

      {/* Editor */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--cipher-text-muted)]">
            .cipher/PROYECTO.md
          </span>
          <span className="text-[11px] text-[var(--cipher-text-muted)]">
            {content.length} chars
          </span>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.ctrlKey && e.key === 's') {
              e.preventDefault()
              saveMemory()
            }
          }}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-[var(--cipher-bg)] px-5 py-3 font-mono text-[12px] leading-relaxed text-[var(--cipher-text)] outline-none placeholder-[var(--cipher-text-muted)] selection:bg-[var(--cipher-accent-bg)]"
          placeholder={MEMORY_PLACEHOLDER}
        />
      </div>

      {/* Footer hint */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-[var(--cipher-border)] px-5 py-2.5">
        <span className="text-[11px] text-[var(--cipher-text-muted)]">
          La memoria se inyecta automáticamente en cada mensaje al agente
        </span>
        {memoryExists && (
          <span className="text-[11px] text-[var(--cipher-text-muted)]">Ctrl+S para guardar</span>
        )}
      </div>
    </div>
  )
}