import { useEffect, useRef, useState } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { FolderOpen, Search, Terminal as TerminalIcon } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function MonacoEditor() {
  const { tabs, activeTabPath, setCurrentFolder, setSidebarPanel, setTerminalVisible, setBottomPanel, updateTabModified } = useStore()
  const activeTab = tabs.find(t => t.path === activeTabPath)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  const monaco = useMonaco()
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('cipher-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b6b8a', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7c4dff' },
        { token: 'string', foreground: '4fc3f7' },
        { token: 'number', foreground: 'ffab40' },
      ],
      colors: {
        'editor.background': '#0a0d16',
        'editor.foreground': '#dce4ff',
        'editor.lineHighlightBackground': '#121827',
        'editor.selectionBackground': '#7a5cff33',
        'editorCursor.foreground': '#7a5cff',
        'editorLineNumber.foreground': '#39425f',
        'editorLineNumber.activeForeground': '#8da0d8',
        'editorWidget.background': '#10131f',
        'editorWidget.border': '#252d45',
        'minimap.background': '#080a12',
      }
    })
  }, [monaco])

  useEffect(() => {
    if (!activeTabPath) return
    
    let isMounted = true
    window.cipher.readFile(activeTabPath)
      .then((val) => {
        if (isMounted) setContent(val)
      })
      .catch(() => {
        if (isMounted) setContent('')
      })
    return () => {
      isMounted = false
    }
  }, [activeTabPath])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMount = (editor: any) => {
    editorRef.current = editor
    editor.addCommand(
      // Ctrl+S
      2097152 | 49,
      async () => {
        if (activeTabPath) {
          const content = editor.getValue()
          await window.cipher.saveFile(activeTabPath, content)
          updateTabModified(activeTabPath, false)
        }
      }
    )
  }

  useEffect(() => {
    const saveActive = async () => {
      const editor = editorRef.current
      if (!editor || !activeTabPath) return
      await window.cipher.saveFile(activeTabPath, editor.getValue())
      updateTabModified(activeTabPath, false)
    }

    const formatActive = async () => {
      const editor = editorRef.current
      if (!editor) return
      await editor.getAction('editor.action.formatDocument')?.run()
    }

    window.addEventListener('cipher-save-active', saveActive)
    window.addEventListener('cipher-format-active', formatActive)
    return () => {
      window.removeEventListener('cipher-save-active', saveActive)
      window.removeEventListener('cipher-format-active', formatActive)
    }
  }, [activeTabPath, updateTabModified])

  const handleChange = () => {
    if (activeTabPath) {
      updateTabModified(activeTabPath, true)
    }
  }

  if (!activeTab) {
    const openFolder = async () => {
      const folder = await window.cipher.openFolder()
      if (!folder) return
      setCurrentFolder(folder)
      setSidebarPanel('files')
    }

    return (
      <div className="flex h-full items-center justify-center bg-[#0a0d16] px-12 py-12">
        <div className="grid w-full max-w-5xl grid-cols-[minmax(260px,1fr)_minmax(300px,380px)] items-center gap-24 max-[980px]:max-w-xl max-[980px]:grid-cols-1 max-[980px]:gap-14">
          <div className="cipher-fade-up flex flex-col items-center text-center max-[900px]:order-1">
            <img src="./logo.png" alt="Cipher" className="mb-10 h-36 w-36 object-contain opacity-85 drop-shadow-[0_0_30px_rgba(122,92,255,0.34)] transition-transform duration-500 hover:scale-105" />
            <h1 className="text-6xl font-semibold tracking-[0.1em] text-[#eef3ff]">Cipher</h1>
            <p className="mt-6 text-[13px] font-medium tracking-[0.46em] text-[#8f9bc0]">CODE EDITOR</p>
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
              onClick={() => {
                setBottomPanel('terminal')
                setTerminalVisible(true)
              }}
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

  if (content === null) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0d16]">
        <div className="cipher-fade-up text-center text-sm text-[#4a4a6a]">
          Cargando archivo...
        </div>
      </div>
    )
  }

  return (
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
        minimap: { enabled: true, renderCharacters: false, scale: 0.85 },
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
        formatOnType: true,
        overviewRulerBorder: false,
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
    />
  )
}
