import ThemeSwitcher from './ThemeSwitcher';
import { ExternalLink, Focus, Maximize2, Minimize2, Play, Search, Square, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import ModelSelector from './ModelSelector';

import { useState, useEffect } from 'react';

// ── Run command map ──────────────────────────────────────
const RUN_COMMANDS: Record<string, { cmd: (path: string) => string; label: string }> = {
  javascript:  { cmd: (p) => `node "${p}"`,        label: 'Node.js'  },
  typescript:  { cmd: (p) => `npx ts-node "${p}"`, label: 'ts-node'  },
  python:      { cmd: (p) => `python "${p}"`,       label: 'Python'   },
  rust:        { cmd: () => `cargo run`,            label: 'Cargo'    },
  go:          { cmd: (p) => `go run "${p}"`,       label: 'Go'       },
  ruby:        { cmd: (p) => `ruby "${p}"`,         label: 'Ruby'     },
  php:         { cmd: (p) => `php "${p}"`,          label: 'PHP'      },
  shellscript: { cmd: (p) => `bash "${p}"`,         label: 'Bash'     },
  lua:         { cmd: (p) => `lua "${p}"`,          label: 'Lua'      },
  perl:        { cmd: (p) => `perl "${p}"`,         label: 'Perl'     },
  powershell:  { cmd: (p) => `powershell -ExecutionPolicy Bypass -File "${p}"`, label: 'PowerShell' },
  bat:         { cmd: (p) => `"${p}"`,              label: 'Batch'    },
  c:           { cmd: (p) => {
    const output = p.replace(/\.[^/.]+$/, '');
    return `gcc "${p}" -o "${output}" && "${output}"`;
  }, label: 'GCC' },
  cpp:         { cmd: (p) => {
    const output = p.replace(/\.[^/.]+$/, '');
    return `g++ "${p}" -o "${output}" && "${output}"`;
  }, label: 'G++' },
  csharp:      { cmd: () => `dotnet run`,           label: 'C# (.NET)' },
  java:        { cmd: (p) => `java "${p}"`,         label: 'Java'     },
}

export default function Titlebar() {
  const {
    currentFolder, setCurrentFolder,
    sidebarPanel, setSidebarPanel,
    toggleFocusMode,
    activeTabPath, tabs,
    setTerminalVisible, setBottomPanel,
  } = useStore()

  const [isMaximized, setIsMaximized] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [runFlash, setRunFlash] = useState(false)
  const [isMac] = useState(() => window.cipher.platform === 'darwin')

  // Derive runner from active tab language
  const activeTab = tabs.find(t => t.path === activeTabPath)
  const runner = activeTab ? RUN_COMMANDS[activeTab.language] : null

  const handleRun = () => {
    if (!runner || !activeTabPath) return
    const cmd = runner.cmd(activeTabPath)
    // Open terminal if not visible, then send command
    setBottomPanel('terminal')
    setTerminalVisible(true)
    // Small delay so terminal panel mounts before receiving the command
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: cmd }))
    }, 180)
    setRunFlash(true)
    setTimeout(() => setRunFlash(false), 600)
  }

  useEffect(() => {
    const checkMaximized = async () => {
      if (!window.cipher?.isMaximized) return
      try {
        setIsMaximized(await window.cipher.isMaximized())
      } catch {
        setIsMaximized(false)
      }
    }
    checkMaximized()
    window.addEventListener('resize', checkMaximized)
    return () => window.removeEventListener('resize', checkMaximized)
  }, [])

  const handleOpenFolder = async () => {
    if (!window.cipher?.openFolder) return
    const folder = await window.cipher.openFolder()
    if (!folder) return
    setCurrentFolder(folder)
    setSidebarPanel('files')
  }

  const togglePanel = (panel: 'files' | 'search' | 'git' | 'ai' | 'memory' | 'debug' | 'history' | 'settings') => {
    setSidebarPanel(sidebarPanel === panel ? null : panel)
  }

  const openDocumentation = () => {
    window.cipher?.openExternal?.('https://github.com/Rmatix/cipher')
  }

  const menuItems = [
    {
      label: 'Archivo',
      options: [
        { label: 'Abrir carpeta',      action: handleOpenFolder },
        { label: 'Paleta de comandos', action: () => window.dispatchEvent(new Event('cipher-command-palette')), shortcut: 'Ctrl+Shift+P' },
        { label: 'Guardar',            action: () => window.dispatchEvent(new Event('cipher-save-active')),    shortcut: 'Ctrl+S' },
        { label: 'Salir',              action: () => window.cipher.closeWindow() },
      ],
    },
    {
      label: 'Editar',
      options: [
        { label: 'Formatear documento', action: () => window.dispatchEvent(new Event('cipher-format-active')), shortcut: 'Ctrl+Shift+F' },
      ],
    },
    {
      label: 'Ver',
      options: [
        { label: 'Explorador',           action: () => togglePanel('files'),    shortcut: 'Ctrl+B'       },
        { label: 'Busqueda',             action: () => togglePanel('search')                             },
        { label: 'Control de versiones', action: () => togglePanel('git')                                },
        { label: 'Agente IA',            action: () => togglePanel('ai'),       shortcut: 'Ctrl+Shift+A' },
        { label: 'Memoria',              action: () => togglePanel('memory'),   shortcut: 'Ctrl+Shift+M' },
        { label: 'Debugger IA',          action: () => togglePanel('debug'),    shortcut: 'Ctrl+Shift+D' },
        { label: 'Historial',            action: () => togglePanel('history')                            },
        { label: 'Configuracion',        action: () => togglePanel('settings')                           },
        { label: 'Modo enfoque',         action: toggleFocusMode,               shortcut: 'Ctrl+K Z'     },
      ],
    },
    {
      label: 'Ayuda',
      options: [
        { label: 'Acerca de Cipher',          action: () => alert('Cipher Studio v2.9.0') },
        { label: 'Documentacion del proyecto', action: openDocumentation, external: true        },
      ],
    },
  ]

  return (
    <div className="drag z-50 flex h-14 w-full flex-shrink-0 select-none items-center justify-between border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)]/95">
      <div className="no-drag flex h-full items-center gap-6 pr-4 pl-5">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src="./logo.png"
            alt="Cipher Logo"
            className="h-7 w-7 object-contain flex-shrink-0 transition-transform duration-300 hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 10px rgba(122,92,255,0.6)) drop-shadow(0 0 20px rgba(56,189,248,0.3))' }}
          />
          <span className="text-[15px] font-semibold tracking-wide text-[var(--cipher-text)] flex-shrink-0">Cipher</span>
        </div>

        <div className="h-4 w-px bg-white/[0.1] flex-shrink-0" />
        <ThemeSwitcher />
        <ModelSelector />
        <div className="flex items-center gap-2.5">
          {menuItems.map((menu) => (
            <div
              key={menu.label}
              className="relative"
              onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
            >
              <button
                onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                className={`rounded-lg px-3.5 py-2 text-[13px] text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-white ${
                  activeMenu === menu.label ? 'bg-white/[0.08] text-white' : ''
                }`}
              >
                {menu.label}
              </button>

              {activeMenu === menu.label && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                  <div className="cipher-pop-enter absolute left-0 z-20 mt-2 w-72 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] py-2 shadow-2xl">
                    {menu.options.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => { option.action(); setActiveMenu(null) }}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] text-[var(--cipher-text)] transition-all hover:bg-[var(--cipher-accent)] hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          {option.label}
                          {'external' in option && option.external && <ExternalLink size={12} className="opacity-60" />}
                        </span>
                        {'shortcut' in option && option.shortcut && (
                          <kbd className="rounded border border-white/[0.1] bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#6b7da0]">
                            {option.shortcut}
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Drag Spacer 1 */}
      <div className="drag h-full flex-1 min-w-[12px]" />

      {/* Search bar */}
      <div className="no-drag flex w-[520px] items-center justify-center gap-3 px-4">
        {/* Run button */}
        {runner && (
          <button
            onClick={handleRun}
            title={`Ejecutar con ${runner.label} (${activeTab?.name})`}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
              runFlash
                ? 'border-[var(--cipher-status-ok)]/60 bg-[var(--cipher-status-ok)]/20 text-[var(--cipher-status-ok)]'
                : 'border-[var(--cipher-status-ok)]/30 bg-[var(--cipher-status-ok)]/10 text-[var(--cipher-status-ok)] hover:border-[var(--cipher-status-ok)]/60 hover:bg-[var(--cipher-status-ok)]/20'
            }`}
          >
            <Play size={12} className="fill-current" />
            <span>Ejecutar</span>
          </button>
        )}
        <button
          onClick={() => togglePanel('search')}
          className="flex h-10 w-full items-center justify-between gap-8 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-4 text-[13px] text-[var(--cipher-text-muted)] transition-all hover:border-[var(--cipher-accent-soft)] hover:bg-[var(--cipher-surface-alt)] hover:text-[var(--cipher-text)]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search size={14} />
            <span className="truncate">{currentFolder || 'Buscar en el proyecto...'}</span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] text-[#4f5a7a]">
            Ctrl+Shift+F
          </span>
        </button>
      </div>

      {/* Drag Spacer 2 */}
      <div className="drag h-full flex-1 min-w-[12px]" />

      {/* Window controls */}
      <div className="no-drag flex h-full items-center">
        {/* Focus mode button */}
        <button
          onClick={toggleFocusMode}
          className="flex h-full w-12 items-center justify-center text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-[#c5b8ff]"
          title="Modo enfoque (Ctrl+K Z)"
        >
          <Focus size={15} className="icon" />
        </button>

        {!isMac && (
          <>
            <div className="mx-1 h-5 w-px bg-white/[0.07]" />

            <button
              onClick={() => window.cipher?.minimizeWindow?.()}
              className="flex h-full w-14 items-center justify-center text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-white"
              title="Minimizar"
            >
              <Minimize2 size={15} className="icon" />
            </button>
            <button
              onClick={async () => {
                window.cipher?.maximizeWindow?.()
                if (window.cipher?.isMaximized) {
                  try { setIsMaximized(await window.cipher.isMaximized()) } catch { setIsMaximized(false) }
                }
              }}
              className="flex h-full w-14 items-center justify-center text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-white"
              title="Maximizar"
            >
              {isMaximized ? <Square size={13} className="scale-75" /> : <Maximize2 size={15} className="icon" />}
            </button>
            <button
              onClick={() => window.cipher?.closeWindow?.()}
              className="flex h-full w-14 items-center justify-center text-[var(--cipher-text-muted)] transition-all hover:bg-[var(--cipher-status-err)] hover:text-white"
              title="Cerrar"
            >
              <X size={16} className="icon" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
