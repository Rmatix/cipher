import { useEffect, useRef, useState } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { Focus, FolderOpen, Plus, Search, Terminal as TerminalIcon, Zap, ZapOff } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { CustomModel } from '../../store/useStore'
import type { FileDataResult } from '../../types/electron'
import { getFileKind, type FileKind } from '../../utils/fileUtils'

// ── Debounce util ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

import { resolveCustomModel, getStoredApiKey } from '../ai/models'

// ── API key helper (mirrors AIPanel logic) ───────────────

function resolveModel(
  aiModel: string,
  customModels: CustomModel[]
): { model: string; apiKey: string } {
  const resolved = resolveCustomModel(aiModel, customModels)
  const key = resolved.savedKey ?? getStoredApiKey(resolved.model)
  return { model: resolved.model, apiKey: key }
}

// ── AI Completion toggle button ──────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

function MediaPreview({
  filePath,
  fileName,
  kind,
}: {
  filePath: string
  fileName: string
  kind: Exclude<FileKind, 'text'>
}) {
  const [media, setMedia] = useState<FileDataResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    window.cipher.readFileDataUrl(filePath)
      .then((result) => {
        if (mounted) setMedia(result)
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'No se pudo abrir el archivo')
      })
    return () => {
      mounted = false
    }
  }, [filePath])

  return (
    <div className="flex h-full flex-col bg-[var(--cipher-bg)]">
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#dce4ff]">{fileName}</p>
          <p className="text-[11px] text-[#687396]">
            {media ? `${media.mime} - ${formatBytes(media.size)}` : kind}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
        {error ? (
          <div className="rounded-lg border border-[#ff6b6b]/20 bg-[#ff6b6b]/8 px-5 py-4 text-sm text-[#ff9c9c]">
            {error}
          </div>
        ) : !media ? (
          <div className="text-sm text-[#5f6a8c]">Cargando vista previa...</div>
        ) : kind === 'image' ? (
          <img
            src={media.dataUrl}
            alt={fileName}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : kind === 'audio' ? (
          <audio src={media.dataUrl} controls className="w-full max-w-xl" />
        ) : (
          <video src={media.dataUrl} controls className="max-h-full max-w-full" />
        )}
      </div>
    </div>
  )
}

function AICompletionToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? 'Desactivar autocompletado IA (Tab)' : 'Activar autocompletado IA (Tab)'}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
        enabled
          ? 'bg-[#7c4dff]/20 text-[#c5b8ff] hover:bg-[#7c4dff]/30'
          : 'bg-white/[0.04] text-[#4a5070] hover:bg-white/[0.08] hover:text-[#7f8bb0]'
      }`}
    >
      {enabled ? <Zap size={11} /> : <ZapOff size={11} />}
      IA
    </button>
  )
}

// ── Main component ───────────────────────────────────────

export default function MonacoEditor({
  filePath,
  group = 'main',
}: {
  filePath?: string | null
  group?: 'main' | 'split'
}) {
  const {
    tabs,
    activeTabPath,
    setCurrentFolder,
    setSidebarPanel,
    setTerminalVisible,
    setBottomPanel,
    updateTabModified,
    setActiveFileContent,
    aiModel,
    customModels,
    setEditorMarkers,
    focusMode,
    toggleFocusMode,
    notes,
    addNote,
    pushChangeEntry,
    setActiveEditorGroup,
    themeId,
  } = useStore()

  const editorPath = filePath ?? activeTabPath
  const activeTab = tabs.find(t => t.path === editorPath)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  const monaco = useMonaco()
  const [contentState, setContentState] = useState<{ path: string | null; value: string | null }>({
    path: null,
    value: null,
  })
  const activeFileKind = activeTab ? getFileKind(activeTab.name) : 'text'
  const content = contentState.path === editorPath ? contentState.value : null

  // AI completion state
  const [aiCompletionEnabled, setAiCompletionEnabled] = useState(
    () => localStorage.getItem('cipher-ai-completion') !== 'false'
  )
  // Ref so the provider always has the latest values without re-registering
  const aiCompletionEnabledRef = useRef(aiCompletionEnabled)
  const aiModelRef = useRef(aiModel)
  const customModelsRef = useRef(customModels)
  // Track in-flight request to avoid parallel calls
  const completionInFlight = useRef(false)
  const noteDecorationIds = useRef<string[]>([])
  const [showNoteBox, setShowNoteBox] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteLine, setNoteLine] = useState<number | null>(null)

  useEffect(() => { aiCompletionEnabledRef.current = aiCompletionEnabled }, [aiCompletionEnabled])
  useEffect(() => { aiModelRef.current = aiModel }, [aiModel])
  useEffect(() => { customModelsRef.current = customModels }, [customModels])
  useEffect(() => {
    if (activeFileKind !== 'text') {
      editorRef.current = null
      setEditorMarkers([])
    }
  }, [activeFileKind, setEditorMarkers])

  // Listen to toggle event from keybinding system
  useEffect(() => {
    const handler = () => {
      setAiCompletionEnabled(v => {
        const next = !v
        localStorage.setItem('cipher-ai-completion', String(next))
        return next
      })
    }
    window.addEventListener('cipher-toggle-ai-completion', handler)
    return () => window.removeEventListener('cipher-toggle-ai-completion', handler)
  }, [])

  const toggleAiCompletion = () => {
    setAiCompletionEnabled(v => {
      const next = !v
      localStorage.setItem('cipher-ai-completion', String(next))
      return next
    })
  }

  // ── Define theme ──────────────────────────────────────
  useEffect(() => {
    if (!monaco) return
    const styles = getComputedStyle(document.documentElement)
    const css = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
    const isLightTheme = themeId === 'snow'
    monaco.editor.defineTheme('cipher-dark', {
      base: isLightTheme ? 'vs' : 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment',  foreground: isLightTheme ? '7f8c8d' : '6b6b8a', fontStyle: 'italic' },
        { token: 'keyword',  foreground: '7c4dff' },
        { token: 'string',   foreground: isLightTheme ? '0088cc' : '4fc3f7' },
        { token: 'number',   foreground: 'ffab40' },
      ],
      colors: {
        'editor.background':                css('--cipher-bg', isLightTheme ? '#ffffff' : '#0a0d16'),
        'editor.foreground':                css('--cipher-text', isLightTheme ? '#2c3e50' : '#dce4ff'),
        'editor.lineHighlightBackground':   css('--cipher-surface-alt', isLightTheme ? '#f0f4f8' : '#121827'),
        'editor.selectionBackground':       css('--cipher-accent-bg', '#7a5cff33'),
        'editorCursor.foreground':          css('--cipher-accent', '#7a5cff'),
        'editorLineNumber.foreground':      isLightTheme ? '#bdc3c7' : '#39425f',
        'editorLineNumber.activeForeground': css('--cipher-text-muted', isLightTheme ? '#7f8c8d' : '#8da0d8'),
        'editorWidget.background':          css('--cipher-surface-alt', isLightTheme ? '#ffffff' : '#10131f'),
        'editorWidget.border':              css('--cipher-border', isLightTheme ? '#bdc3c7' : '#252d45'),
        'minimap.background':               css('--cipher-bg', isLightTheme ? '#f5f7fa' : '#080a12'),
        // Ghost text color (inline completion)
        'editorGhostText.foreground':       css('--cipher-accent-soft', '#5a4da0'),
      },
    })
    monaco.editor.setTheme('cipher-dark')
  }, [monaco, themeId])

  // ── Sync Monaco markers → store ───────────────────────
  useEffect(() => {
    if (!monaco) return
    const syncMarkers = () => {
      const model = editorRef.current?.getModel()
      if (!model || !editorPath) {
        setEditorMarkers([])
        return
      }

      const result = monaco.editor.getModelMarkers({ resource: model.uri })
      setEditorMarkers(
        result.map(m => ({
          severity: m.severity as 1 | 2 | 4 | 8,
          message: m.message,
          startLineNumber: m.startLineNumber,
          endLineNumber: m.endLineNumber,
          startColumn: m.startColumn,
          endColumn: m.endColumn,
          source: m.source,
          filePath: editorPath,
        }))
      )
    }

    const sub = monaco.editor.onDidChangeMarkers(() => syncMarkers())
    syncMarkers()
    return () => {
      sub.dispose()
      setEditorMarkers([])
    }
  }, [monaco, editorPath, setEditorMarkers])
  useEffect(() => {
    if (!monaco || !editorRef.current || !editorPath) return
    const editor = editorRef.current
    const model = editor.getModel?.()
    if (!model) return

    const fileNotes = notes.filter(note => note.filePath === editorPath)
    const decorations = fileNotes.map(note => ({
      range: new monaco.Range(note.line, 1, note.line, 1),
      options: {
        glyphMarginClassName: 'cipher-line-note-decor',
        glyphMarginHoverMessage: { value: note.content },
      },
    }))

    noteDecorationIds.current = editor.deltaDecorations(noteDecorationIds.current, decorations)
  }, [monaco, notes, editorPath])
  useEffect(() => {
    if (!monaco) return

    // Debounced fetcher — waits 600ms after the user stops typing
    const fetchCompletion = debounce(async (
      position: { lineNumber: number; column: number },
      resolve: (items: unknown[]) => void
    ) => {
      if (!aiCompletionEnabledRef.current) return resolve([])
      if (completionInFlight.current) return resolve([])

      const editor = editorRef.current
      if (!editor) return resolve([])

      const monacoModel = editor.getModel()
      if (!monacoModel) return resolve([])

      const offset = monacoModel.getOffsetAt(position)
      const fullText = monacoModel.getValue()
      const prefix = fullText.slice(0, offset)
      const suffix = fullText.slice(offset)
      const language = monacoModel.getLanguageId()

      // Don't trigger on very short prefixes or inside comments/strings heuristically
      const lastLine = prefix.split('\n').pop() || ''
      if (lastLine.trim().length < 2) return resolve([])

      const { model: resolvedModel, apiKey } = resolveModel(
        aiModelRef.current,
        customModelsRef.current
      )

      // Local models are ok without key; remote need one
      const isLocal = resolvedModel.startsWith('ollama:') || resolvedModel.startsWith('lmstudio:')
      if (!apiKey && !isLocal) return resolve([])

      completionInFlight.current = true
      try {
        const result = await window.cipher.aiComplete({
          model: resolvedModel,
          apiKey,
          prefix,
          suffix,
          language,
          ollamaUrl: localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434',
          lmstudioUrl: localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234',
        })

        if (!result.text) return resolve([])

        // Strip common model artifacts: leading newlines when already on new line,
        // and any accidental code fence markers
        let text = result.text
          .replace(/^```[\w]*\n?/i, '')
          .replace(/\n?```$/i, '')

        // If the model echoed the last word of prefix, strip it
        const lastWord = (prefix.match(/\b(\w+)\s*$/) || [])[1]
        if (lastWord && text.startsWith(lastWord)) {
          text = text.slice(lastWord.length)
        }

        if (!text.trim()) return resolve([])

        resolve([{
          insertText: text,
          range: new monaco.Range(
            position.lineNumber, position.column,
            position.lineNumber, position.column
          ),
        }])
      } catch {
        resolve([])
      } finally {
        completionInFlight.current = false
      }
    }, 600)

    const disposable = monaco.languages.registerInlineCompletionsProvider('*', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provideInlineCompletions(_model: any, position: any): any {
        return new Promise(resolve => {
          fetchCompletion(position, (items: unknown[]) => {
            resolve({ items })
          })
        })
      },
      // Requerido por la interfaz — el cleanup real lo hace useEffect via disposable.dispose()
      disposeInlineCompletions(): void {},
    })

    return () => disposable.dispose()
  }, [monaco])

  // ── Load file content ─────────────────────────────────
  useEffect(() => {
    if (!editorPath) {
      if (group === 'main') setActiveFileContent(null)
      return
    }
    if (activeTab && getFileKind(activeTab.name) !== 'text') {
      if (group === 'main') setActiveFileContent(null)
      return
    }
    let isMounted = true
    window.cipher.readFile(editorPath)
      .then((val) => {
        if (!isMounted) return
        setContentState({ path: editorPath, value: val })
        if (group === 'main') setActiveFileContent(val)
      })
      .catch(() => {
        if (!isMounted) return
        setContentState({ path: editorPath, value: '' })
        if (group === 'main') setActiveFileContent('')
      })
    return () => {
      isMounted = false
      if (group === 'main') setActiveFileContent(null)
    }
  }, [activeTab, editorPath, group, setActiveFileContent])

  // ── Editor mount ──────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMount = (editor: any) => {
    editorRef.current = editor
    editor.onDidFocusEditorWidget?.(() => setActiveEditorGroup(group))

    // Ctrl+S → save
    editor.addCommand(2097152 | 49, async () => {
      if (editorPath) {
        const content = editor.getValue()
        await window.cipher.saveFile(editorPath, content)
        updateTabModified(editorPath, false)
        const tab = tabs.find(t => t.path === editorPath)
        if (tab) pushChangeEntry(editorPath, tab.name, content)
        useStore.getState().refreshGitStatus()
      }
    })

    // Tab → accept inline completion (Monaco handles this natively when
    // inlineSuggest is enabled; we just make sure the option is set)
  }

  // ── Global event listeners ────────────────────────────
  useEffect(() => {
    const saveActive = async () => {
      const editor = editorRef.current
      if (!editor || !editorPath || activeFileKind !== 'text') return
      const content = editor.getValue()
      await window.cipher.saveFile(editorPath, content)
      updateTabModified(editorPath, false)
      const tab = tabs.find(t => t.path === editorPath)
      if (tab) pushChangeEntry(editorPath, tab.name, content)
      useStore.getState().refreshGitStatus()
    }

    const formatActive = async () => {
      const editor = editorRef.current
      if (!editor) return
      await editor.getAction('editor.action.formatDocument')?.run()
    }

    const restoreSnapshot = (event: Event) => {
      const { path, content } = (event as CustomEvent<{ path: string; content: string }>).detail
      const editor = editorRef.current
      if (!editor || path !== editorPath) return
      editor.setValue(content)
    }
    const openNoteLine = (event: Event) => {
      const { path, line } = (event as CustomEvent<{ path: string; line: number }>).detail
      const editor = editorRef.current
      if (!editor || path !== editorPath) return
      setActiveEditorGroup(group)
      editor.revealLineInCenter(line)
      editor.setPosition({ lineNumber: line, column: 1 })
      editor.focus()
    }

    window.addEventListener('cipher-save-active', saveActive)
    window.addEventListener('cipher-format-active', formatActive)
    window.addEventListener('cipher-restore-snapshot', restoreSnapshot)
    window.addEventListener('cipher-open-note-line', openNoteLine)
    return () => {
      window.removeEventListener('cipher-save-active', saveActive)
      window.removeEventListener('cipher-format-active', formatActive)
      window.removeEventListener('cipher-restore-snapshot', restoreSnapshot)
      window.removeEventListener('cipher-open-note-line', openNoteLine)
    }
  }, [activeFileKind, editorPath, updateTabModified, pushChangeEntry, tabs, group, setActiveEditorGroup])

  const openAddNote = () => {
    const editor = editorRef.current
    if (!editor || !editorPath) return
    const position = editor.getPosition?.()
    const line = position?.lineNumber ?? 1
    setNoteLine(line)
    setNoteDraft('')
    setShowNoteBox(true)
  }

  const saveNoteForLine = () => {
    if (!editorPath || !noteLine || !noteDraft.trim()) return
    addNote(editorPath, noteLine, noteDraft.trim())
    setShowNoteBox(false)
    setNoteDraft('')
  }

  const handleChange = (value?: string) => {
    if (editorPath) updateTabModified(editorPath, true)
    if (group === 'main') setActiveFileContent(value ?? editorRef.current?.getValue?.() ?? '')
    setEditorMarkers([])
  }

  // ── Welcome screen ────────────────────────────────────
  if (!activeTab) {
    const openFolder = async () => {
      const folder = await window.cipher.openFolder()
      if (!folder) return
      setCurrentFolder(folder)
      setSidebarPanel('files')
    }

    return (
      <div className="flex h-full items-center justify-center bg-[var(--cipher-bg)] px-12 py-12">
        <div className="grid w-full max-w-5xl grid-cols-[minmax(260px,1fr)_minmax(300px,380px)] items-center gap-24 max-[980px]:max-w-xl max-[980px]:grid-cols-1 max-[980px]:gap-14">
          <div className="cipher-fade-up flex flex-col items-center text-center max-[900px]:order-1">
            <img
              src="./logo.png"
              alt="Cipher"
              className="mb-10 h-36 w-36 object-contain opacity-85 drop-shadow-[0_0_30px_rgba(122,92,255,0.34)] transition-transform duration-500 hover:scale-105"
            />
            <h1 className="text-6xl font-semibold tracking-[0.1em] leading-normal text-[#eef3ff]">Cipher</h1>
            <p className="mt-4 text-[13px] font-medium tracking-[0.46em] text-[#8f9bc0]">CODE EDITOR</p>
          </div>

          <div className="cipher-fade-up flex flex-col gap-5 max-[900px]:order-2">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#6f7a9d]">Inicio</p>
            <button
              onClick={openFolder}
              className="flex h-14 items-center gap-4 rounded-xl border border-[#8b74ff]/50 bg-[#7a5cff] px-6 text-[14px] font-medium text-white shadow-[0_14px_40px_rgba(122,92,255,0.16)] transition-all hover:bg-[#8b74ff]"
            >
              <FolderOpen size={19} strokeWidth={1.8} />
              Abrir carpeta
            </button>
            <button
              onClick={() => setSidebarPanel('search')}
              className="flex h-14 items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 text-[14px] font-medium text-[#c5cef0] transition-all hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
            >
              <Search size={19} strokeWidth={1.8} />
              Buscar proyecto
            </button>
            <button
              onClick={() => { setBottomPanel('terminal'); setTerminalVisible(true) }}
              className="flex h-14 items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 text-[14px] font-medium text-[#c5cef0] transition-all hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
            >
              <TerminalIcon size={19} strokeWidth={1.8} />
              Abrir terminal
            </button>

            <div className="mt-8 space-y-4 border-t border-white/[0.07] pt-7 text-[13px] text-[#6f7a9d]">
              <button
                onClick={() => window.dispatchEvent(new Event('cipher-command-palette'))}
                className="flex w-full items-center justify-between gap-6 rounded-lg px-1 py-1.5 text-left transition-all hover:text-[#dce4ff]"
              >
                <span>Paleta de comandos</span>
                <kbd className="rounded border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[12px] text-[#b7c1de]">Ctrl+Shift+P</kbd>
              </button>
              <button
                onClick={() => setSidebarPanel('files')}
                className="flex w-full items-center justify-between gap-6 rounded-lg px-1 py-1.5 text-left transition-all hover:text-[#dce4ff]"
              >
                <span>Explorador</span>
                <kbd className="rounded border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[12px] text-[#b7c1de]">Ctrl+B</kbd>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeFileKind !== 'text') {
    return (
      <MediaPreview
        key={activeTab.path}
        filePath={activeTab.path}
        fileName={activeTab.name}
        kind={activeFileKind}
      />
    )
  }

  if (content === null) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--cipher-bg)]">
        <div className="cipher-fade-up text-center text-sm text-[#4a4a6a]">Cargando archivo...</div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Top-right controls */}
      <div className="absolute right-4 top-2 z-10 flex items-center gap-1.5">
        <button
          onClick={openAddNote}
          title="Agregar nota en la línea actual"
          className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-[#4a5070] transition-all hover:bg-white/[0.08] hover:text-[#7f8bb0]"
        >
          <Plus size={11} />
          Nota
        </button>
        <AICompletionToggle enabled={aiCompletionEnabled} onToggle={toggleAiCompletion} />
        <button
          onClick={toggleFocusMode}
          title="Modo enfoque (Ctrl+K Z)"
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
            focusMode
              ? 'bg-[#7c4dff]/20 text-[#c5b8ff] hover:bg-[#7c4dff]/30'
              : 'bg-white/[0.04] text-[#4a5070] hover:bg-white/[0.08] hover:text-[#7f8bb0]'
          }`}
        >
          <Focus size={11} />
          Enfoque
        </button>
      </div>
      {showNoteBox && (
        <div className="absolute right-4 top-12 z-20 w-72 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-3 shadow-2xl">
          <div className="mb-2 text-[12px] text-[var(--cipher-text-muted)]">Nueva nota en línea {noteLine}</div>
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-2.5 py-2 text-[12px] text-[var(--cipher-text)] outline-none placeholder-[var(--cipher-text-muted)]"
            placeholder="Escribe una nota rápida…"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowNoteBox(false)}
              className="h-8 rounded-lg px-2.5 text-[12px] text-[var(--cipher-text-muted)] hover:bg-[var(--cipher-surface-alt)]"
            >
              Cancelar
            </button>
            <button
              onClick={saveNoteForLine}
              className="h-8 rounded-lg bg-[var(--cipher-accent-bg)] px-2.5 text-[12px] text-[var(--cipher-text)] hover:bg-[var(--cipher-accent-soft)]"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <Editor
        key={activeTab.path}
        height="100%"
        language={activeTab.language}
        theme="cipher-dark"
        defaultValue={content}
        onMount={handleMount}
        onChange={handleChange}
        loader={{ paths: { vs: '../../node_modules/monaco-editor/min/vs' } }}
        options={{
          fontSize: 15,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          glyphMargin: true,
          // Minimap: off for files >500 lines to save GPU, on for smaller files
          minimap: { enabled: true, renderCharacters: false, scale: 0.85, maxColumn: 100 },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          roundedSelection: true,
          cursorStyle: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'all',
          bracketPairColorization: { enabled: true },
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: false, // Disabled: running formatter on each keystroke is expensive
          overviewRulerBorder: false,
          overviewRulerLanes: 2,
          // Perf: widget DOM nodes stay fixed in body, avoids layout thrashing
          fixedOverflowWidgets: true,
          // Perf: semantic highlighting adds extra parse pass; tokens are enough
          semanticHighlighting: { enabled: false },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
            useShadows: false,
          },
          // Perf: only suggest in code, not in strings or comments
          quickSuggestions: {
            other: 'inline',
            comments: false,
            strings: false,
          },
          // ── Inline AI suggestions ───────────────────
          inlineSuggest: {
            enabled: true,
            mode: 'prefix',     // muestra la sugerencia como ghost text
            showToolbar: 'onHover',
          },
          suggest: {
            preview: true,
            showWords: false, // words list is noisy; rely on AI/LSP instead
          },
        }}
      />
    </div>
  )
}
