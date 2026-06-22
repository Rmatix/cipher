import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ChevronDown, Copy, Eraser, GitBranch, MoreHorizontal, PanelBottom, Plus, Scissors, Square, Terminal as TerminalIcon, Trash2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'

type TerminalProfile = 'system' | 'powershell' | 'cmd' | 'git-bash' | 'wsl' | 'zsh' | 'bash' | 'sh' | 'fish'

interface TerminalSessionState {
  id: number
  profile: TerminalProfile
  label: string
}

interface TerminalCommand {
  id: number
  text: string
}

const profileLabels: Record<TerminalProfile, string> = {
  system: 'System Shell',
  powershell: 'PowerShell',
  cmd: 'Command Prompt',
  'git-bash': 'Git Bash',
  wsl: 'WSL (Linux)',
  zsh: 'Zsh',
  bash: 'Bash',
  sh: 'Sh',
  fish: 'Fish',
}

let sessionCounter = 0

function createSession(profile: TerminalProfile = 'system'): TerminalSessionState {
  sessionCounter += 1
  return {
    id: sessionCounter,
    profile,
    label: `${profileLabels[profile]} ${sessionCounter}`,
  }
}

function TerminalPane({
  session,
  active,
  command,
  onFocus,
  onReady,
  onExit,
}: {
  session: TerminalSessionState
  active: boolean
  command: TerminalCommand | null
  onFocus: () => void
  onReady: (sessionId: number, ptyId: number) => void
  onExit: (sessionId: number) => void
}) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)
  const { currentFolder, addTerminal, removeTerminal, terminalVisible, bottomPanel } = useStore()
  const lastExecutedCommandIdRef = useRef<number | null>(null)

  const runPendingCommand = useCallback(() => {
    const ptyId = ptyIdRef.current
    if (!command || ptyId === null) return
    if (lastExecutedCommandIdRef.current === command.id) return

    window.cipher.terminalInput(ptyId, `${command.text}\r`)
    lastExecutedCommandIdRef.current = command.id
    xtermRef.current?.focus()
  }, [command])

  useEffect(() => {
    if (!terminalRef.current) return

    let disposed = false
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.22,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      allowTransparency: true,
      theme: {
        background: getComputedStyle(document.documentElement).getPropertyValue('--cipher-bg').trim() || '#111111',
        foreground: getComputedStyle(document.documentElement).getPropertyValue('--cipher-text').trim() || '#f1f1f1',
        cursor: getComputedStyle(document.documentElement).getPropertyValue('--cipher-accent').trim() || '#f1f1f1',
        selectionBackground: getComputedStyle(document.documentElement).getPropertyValue('--cipher-accent-bg').trim() || '#4b556355',
        black: '#000000',
        blue: '#62aaff',
        brightBlue: '#8cc4ff',
        brightCyan: '#8be9fd',
        brightGreen: '#8fdc8f',
        brightRed: '#ff8a8a',
        brightYellow: '#ffd580',
        cyan: '#5ed6e8',
        green: '#73d18c',
        red: '#f47067',
        yellow: '#d7ba7d',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    fitAddon.fit()
    xtermRef.current = term
    fitAddonRef.current = fitAddon

    const syncSize = () => {
      fitAddon.fit()
      const ptyId = ptyIdRef.current
      if (ptyId !== null) window.cipher.terminalResize(ptyId, term.cols, term.rows)
    }

    const dataListener = term.onData((input) => {
      const ptyId = ptyIdRef.current
      if (ptyId !== null) window.cipher.terminalInput(ptyId, input)
    })

    if (!window.cipher?.terminalCreate) {
      term.writeln('Terminal integrada disponible al ejecutar Cipher con Electron.')
      term.writeln('Usa pnpm dev o pnpm start para iniciar la aplicacion completa.')
      return () => {
        disposed = true
        dataListener.dispose()
        term.dispose()
      }
    }

    const unsubscribeData = window.cipher.onTerminalData((id, data) => {
      if (id === ptyIdRef.current) term.write(data)
    })

    const unsubscribeExit = window.cipher.onTerminalExit((id, exitCode) => {
      if (id !== ptyIdRef.current) return
      term.writeln(`\r\n[Proceso terminado con codigo ${exitCode}]`)
      removeTerminal(id)
      ptyIdRef.current = null
      onExit(session.id)
    })

    window.cipher.terminalCreate({ cwd: currentFolder || undefined, profile: session.profile })
      .then((ptyId) => {
        if (disposed) {
          window.cipher.terminalKill(ptyId)
          return
        }
        ptyIdRef.current = ptyId
        addTerminal({ id: ptyId, ptyId, label: session.label, profile: session.profile })
        onReady(session.id, ptyId)
        syncSize()
        if (active) {
          runPendingCommand()
        }
      })
      .catch((error: Error) => {
        term.writeln('No se pudo iniciar la terminal integrada.')
        term.writeln(error.message)
      })

    const resizeObserver = new ResizeObserver(syncSize)
    resizeObserver.observe(terminalRef.current)
    window.addEventListener('resize', syncSize)

    return () => {
      disposed = true
      resizeObserver.disconnect()
      window.removeEventListener('resize', syncSize)
      dataListener.dispose()
      unsubscribeData()
      unsubscribeExit()
      const ptyId = ptyIdRef.current
      if (ptyId !== null) {
        window.cipher.terminalKill(ptyId)
        removeTerminal(ptyId)
      }
      term.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      ptyIdRef.current = null
    }
  }, [addTerminal, currentFolder, onExit, onReady, removeTerminal, session.id, session.label, session.profile, active, runPendingCommand])

  // Fit and focus when visibility status changes
  useEffect(() => {
    if (!active || !terminalVisible || bottomPanel !== 'terminal') return
    const t = setTimeout(() => {
      fitAddonRef.current?.fit()
      xtermRef.current?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [active, terminalVisible, bottomPanel])

  // Run command if provided and terminal is active
  useEffect(() => {
    if (active) {
      runPendingCommand()
    }
  }, [active, command, runPendingCommand])

  return (
    <div
      className={`min-h-0 flex-1 overflow-hidden border-l border-[var(--cipher-border-soft)] first:border-l-0 ${active ? 'bg-[var(--cipher-bg)]' : 'bg-[var(--cipher-surface)]'}`}
      onMouseDown={onFocus}
    >
      <div ref={terminalRef} className="h-full overflow-hidden px-4 py-3 bg-[var(--cipher-bg)]/80 backdrop-blur-md rounded-xl m-2 border border-white/[0.03]" />
    </div>
  )
}

export default function TerminalPanel() {
  const { setEditorSplitDirection, setSidebarPanel } = useStore()
  const [sessions, setSessions] = useState<TerminalSessionState[]>(() => [createSession('system')])
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0].id)
  const [splitMode, setSplitMode] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [command, setCommand] = useState<TerminalCommand | null>(null)
  const ptyBySession = useRef(new Map<number, number>())
  
  // Right-click rename terminal state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: number } | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const activeSession = useMemo(
    () => sessions.find(session => session.id === activeSessionId) || sessions[0],
    [activeSessionId, sessions]
  )

  const handlePaneReady = useCallback((sessionId: number, ptyId: number) => {
    ptyBySession.current.set(sessionId, ptyId)
  }, [])

  const handlePaneExit = useCallback((sessionId: number) => {
    ptyBySession.current.delete(sessionId)
  }, [])

  const addSession = (profile: TerminalProfile = activeSession?.profile || 'system') => {
    const next = createSession(profile)
    setSessions(current => [...current, next])
    setActiveSessionId(next.id)
    setProfileMenuOpen(false)
    setSplitMode(false)
  }

  const splitTerminal = () => {
    const next = createSession(activeSession?.profile || 'system')
    setSessions(current => [...current, next])
    setActiveSessionId(next.id)
    setSplitMode(true)
  }

  const killSession = (sessionId: number) => {
    setSessions(current => {
      const next = current.filter(s => s.id !== sessionId)
      const remaining = next.length > 0 ? next : [createSession('system')]
      if (sessionId === activeSessionId) {
        setActiveSessionId(remaining[remaining.length - 1].id)
      }
      return remaining
    })
  }

  const runInActive = (text: string) => {
    setCommand({ id: Date.now(), text })
    setMoreOpen(false)
  }

  const handleContextMenu = (e: React.MouseEvent, sessionId: number) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sessionId
    })
  }

  const finishRename = (sessionId: number) => {
    if (editName.trim()) {
      setSessions(current => current.map(s => s.id === sessionId ? { ...s, label: editName.trim() } : s))
    }
    setEditingSessionId(null)
  }

  useEffect(() => {
    const handleTerminalCommand = (event: Event) => {
      const text = (event as CustomEvent<string>).detail
      if (text) runInActive(text)
    }
    window.addEventListener('cipher-terminal-command', handleTerminalCommand)
    
    const closeMenu = () => setContextMenu(null)
    window.addEventListener('click', closeMenu)

    return () => {
      window.removeEventListener('cipher-terminal-command', handleTerminalCommand)
      window.removeEventListener('click', closeMenu)
    }
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--cipher-bg)] text-[var(--cipher-text)]">
      <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-2">
        <div
          onContextMenu={(e) => activeSession && handleContextMenu(e, activeSession.id)}
          className="flex items-center gap-2 px-1 text-[12px] font-medium text-[var(--cipher-text)] cursor-pointer select-none"
        >
          <TerminalIcon size={14} className="text-[var(--cipher-accent)]" />
          {editingSessionId === activeSession?.id ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => finishRename(activeSession.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishRename(activeSession.id)
                if (e.key === 'Escape') setEditingSessionId(null)
              }}
              className="bg-[#2a2a2a] text-white border border-[var(--cipher-accent)] rounded px-1.5 py-0.5 text-[11px] outline-none w-32"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>
              {activeSession ? `${profileLabels[activeSession.profile]} (${activeSession.label})` : 'Terminal'}
            </span>
          )}
        </div>

        <div className="relative flex items-center gap-1">
          <button
            onClick={() => addSession()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cipher-text)] transition-all hover:bg-white/[0.08] hover:text-white"
            title="New Terminal"
          >
            <Plus size={15} />
          </button>
          <button
            onClick={() => setProfileMenuOpen(value => !value)}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-[var(--cipher-text)] transition-all hover:bg-white/[0.08] hover:text-white"
            title="Select Profile"
          >
            {profileLabels[activeSession?.profile || 'system']}
            <ChevronDown size={13} />
          </button>
          <button
            onClick={splitTerminal}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cipher-text)] transition-all hover:bg-white/[0.08] hover:text-white"
            title="Split Terminal"
          >
            <PanelBottom size={14} />
          </button>
          <button
            onClick={() => runInActive(activeSession?.profile === 'cmd' ? 'cls' : 'clear')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cipher-text)] transition-all hover:bg-white/[0.08] hover:text-white"
            title="Clear Terminal"
          >
            <Eraser size={14} />
          </button>
          <button
            onClick={() => killSession(activeSessionId)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cipher-text)] transition-all hover:bg-[var(--cipher-status-err)]/12 hover:text-[var(--cipher-status-err)]"
            title="Kill Terminal"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setMoreOpen(value => !value)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cipher-text)] transition-all hover:bg-white/[0.08] hover:text-white"
            title="More Actions"
          >
            <MoreHorizontal size={15} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-20 top-8 z-50 w-56 overflow-hidden rounded-md border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] py-1 shadow-2xl">
              {((): TerminalProfile[] => {
                const p = window.cipher.platform
                if (p === 'win32') return ['system', 'powershell', 'cmd', 'git-bash', 'wsl']
                return ['system', 'zsh', 'bash', 'sh', 'fish']
              })().map(profile => (
                <button
                  key={profile}
                  onClick={() => addSession(profile)}
                  className="flex h-8 w-full items-center px-3 text-left text-[12px] text-[#d8dee9] hover:bg-white/[0.08]"
                >
                  {profileLabels[profile]}
                </button>
              ))}
            </div>
          )}

          {moreOpen && (
            <div className="absolute right-0 top-8 z-50 w-72 overflow-hidden rounded-md border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] py-1 shadow-2xl">
              <button onClick={() => runInActive('git worktree list')} className="flex h-9 w-full items-center gap-3 px-3 text-left text-[12px] text-[#d8dee9] hover:bg-white/[0.08]">
                <GitBranch size={14} /> Worktree: list
              </button>
              <button onClick={() => { setSidebarPanel('git'); setMoreOpen(false) }} className="flex h-9 w-full items-center gap-3 px-3 text-left text-[12px] text-[#d8dee9] hover:bg-white/[0.08]">
                <Square size={14} /> Open Changes
              </button>
              <button onClick={() => { setEditorSplitDirection('down'); setMoreOpen(false) }} className="flex h-9 w-full items-center gap-3 px-3 text-left text-[12px] text-[#d8dee9] hover:bg-white/[0.08]">
                <Scissors size={14} /> Split Editor Down
              </button>
              <button onClick={() => navigator.clipboard?.writeText(activeSession?.label || '')} className="flex h-9 w-full items-center gap-3 px-3 text-left text-[12px] text-[#d8dee9] hover:bg-white/[0.08]">
                <Copy size={14} /> Copy Terminal Name
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className={`flex min-h-0 flex-1 ${splitMode ? 'flex-row' : 'flex-col'}`}>
          {sessions.map(session => {
            const isVisible = splitMode ? true : session.id === activeSessionId
            return (
              <div
                key={session.id}
                className="flex flex-1 min-h-0 min-w-0 h-full w-full"
                style={{ display: isVisible ? 'flex' : 'none' }}
              >
                <TerminalPane
                  session={session}
                  active={session.id === activeSessionId}
                  command={command}
                  onFocus={() => setActiveSessionId(session.id)}
                  onReady={handlePaneReady}
                  onExit={handlePaneExit}
                />
              </div>
            )
          })}
        </div>

        {sessions.length > 1 && (
          <div className="flex w-44 flex-shrink-0 flex-col border-l border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] py-1.5">
            <div className="px-3 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7884aa]">
              Terminales
            </div>
            <div className="flex-1 overflow-y-auto px-1.5">
              {sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  onDoubleClick={() => {
                    setEditingSessionId(session.id)
                    setEditName(session.label)
                  }}
                  onContextMenu={(e) => handleContextMenu(e, session.id)}
                  className={`group flex h-8 cursor-pointer items-center justify-between rounded-md px-2 text-[12px] transition-all ${
                    activeSessionId === session.id
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-[#a8adb8] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <TerminalIcon size={12} className={activeSessionId === session.id ? 'text-[var(--cipher-violet)]' : 'text-[#7884aa]'} />
                    {editingSessionId === session.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => finishRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename(session.id)
                          if (e.key === 'Escape') setEditingSessionId(null)
                        }}
                        className="bg-[#2a2a2a] text-white border border-[var(--cipher-accent)] rounded px-1.5 py-0.5 text-[11px] outline-none w-28"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate">{session.label}</span>
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      killSession(session.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#7884aa] hover:bg-white/[0.08] hover:text-[var(--cipher-status-err)] transition-opacity"
                    title="Kill Terminal"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-44 overflow-hidden rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] py-1 shadow-2xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setEditingSessionId(contextMenu.sessionId)
              const sessionToRename = sessions.find(s => s.id === contextMenu.sessionId)
              setEditName(sessionToRename ? sessionToRename.label : '')
              setContextMenu(null)
            }}
            className="flex h-8 w-full items-center px-3 text-left text-[12px] text-[var(--cipher-text)] hover:bg-[var(--cipher-accent)] hover:text-white"
          >
            Cambiar nombre
          </button>
          <button
            onClick={() => {
              killSession(contextMenu.sessionId)
              setContextMenu(null)
            }}
            className="flex h-8 w-full items-center px-3 text-left text-[12px] text-[var(--cipher-status-err)] hover:bg-[var(--cipher-status-err)]/12"
          >
            Eliminar terminal
          </button>
        </div>
      )}
    </div>
  )
}
