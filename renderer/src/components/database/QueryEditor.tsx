import { useRef, useEffect, useState, useCallback } from 'react'
import { Play, Clock, Copy, Check } from 'lucide-react'

interface QueryEditorProps {
  value: string
  onChange: (v: string) => void
  onRun: (sql: string) => void
  running: boolean
  elapsed: number | null
}

export default function QueryEditor({ value, onChange, onRun, running, elapsed }: QueryEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let editor: any
    let disposed = false

    // Load Monaco dynamically using the same loader the main editor uses
    const loadMonaco = async () => {
      try {
        const monaco = await import('monaco-editor')
        if (disposed || !editorRef.current) return

        editor = monaco.editor.create(editorRef.current, {
          value,
          language: 'sql',
          theme: 'vs-dark',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          automaticLayout: true,
          wordWrap: 'on',
          scrollbar: { verticalScrollbarSize: 6 },
          suggest: { showWords: true },
          quickSuggestions: true,
          renderLineHighlight: 'gutter',
          lineDecorationsWidth: 0,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          contextmenu: false,
        })

        monacoRef.current = editor

        editor.onDidChangeModelContent(() => {
          onChange(editor.getValue())
        })

        // Ctrl+Enter to run query
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          const selected = editor.getModel()?.getValueInRange(editor.getSelection())
          const sql = selected?.trim() || editor.getValue().trim()
          if (sql) onRun(sql)
        })

      } catch (err) {
        console.error('QueryEditor Monaco load error:', err)
      }
    }

    loadMonaco()

    return () => {
      disposed = true
      editor?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync value from outside only when editor is idle
  useEffect(() => {
    const editor = monacoRef.current
    if (!editor) return
    if (editor.getValue() !== value) {
      const model = editor.getModel()
      if (model) {
        editor.executeEdits('external', [{
          range: model.getFullModelRange(),
          text: value,
        }])
      }
    }
  }, [value])

  const handleRun = useCallback(() => {
    const editor = monacoRef.current
    if (!editor) return
    const selected = editor.getModel()?.getValueInRange(editor.getSelection())
    const sql = selected?.trim() || editor.getValue().trim()
    if (sql) onRun(sql)
  }, [onRun])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [value])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-3 py-1.5">
        <button
          onClick={handleRun}
          disabled={running || !value.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--cipher-accent)] px-3 py-1 text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={11} className={running ? 'animate-pulse' : ''} />
          {running ? 'Ejecutando…' : 'Ejecutar'}
          <kbd className="ml-1 rounded border border-white/20 bg-white/10 px-1 text-[10px]">Ctrl+↵</kbd>
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--cipher-border)] px-2 py-1 text-[12px] text-[var(--cipher-text-muted)] transition-all hover:text-[var(--cipher-text)]"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>

        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--cipher-text-muted)]">
          {elapsed !== null && (
            <>
              <Clock size={10} />
              <span>{elapsed}ms</span>
            </>
          )}
          <span className="text-[var(--cipher-text-muted)]/50">Selecciona texto para ejecutar parcial</span>
        </div>
      </div>

      {/* Editor area */}
      <div ref={editorRef} className="flex-1" />
    </div>
  )
}
