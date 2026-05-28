import { useEffect, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useStore } from '../../store/useStore'

export default function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<number | null>(null)
  const { currentFolder, addTerminal, removeTerminal } = useStore()

  useEffect(() => {
    if (!terminalRef.current) return

    let disposed = false
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      theme: {
        background: '#0a0a14',
        foreground: '#e0e0f0',
        cursor: '#7c4dff',
        selectionBackground: '#7c4dff33',
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
      if (ptyId !== null) {
        window.cipher.terminalResize(ptyId, term.cols, term.rows)
      }
    }

    const dataListener = term.onData((input) => {
      const ptyId = ptyIdRef.current
      if (ptyId !== null) {
        window.cipher.terminalInput(ptyId, input)
      }
    })

    if (!window.cipher?.terminalCreate) {
      term.writeln('Terminal integrada disponible al ejecutar Cipher con Electron.')
      term.writeln('Usa pnpm dev o pnpm start para iniciar la aplicacion completa.')
      return () => {
        disposed = true
        dataListener.dispose()
        term.dispose()
        xtermRef.current = null
        fitAddonRef.current = null
      }
    }

    const unsubscribeData = window.cipher.onTerminalData((id, data) => {
      if (id === ptyIdRef.current) {
        term.write(data)
      }
    })

    const unsubscribeExit = window.cipher.onTerminalExit((id, exitCode) => {
      if (id !== ptyIdRef.current) return
      term.writeln(`\r\n[Proceso terminado con codigo ${exitCode}]`)
      removeTerminal(id)
      ptyIdRef.current = null
    })

    window.cipher.terminalCreate(currentFolder || undefined)
      .then((ptyId) => {
        if (disposed) {
          window.cipher.terminalKill(ptyId)
          return
        }
        ptyIdRef.current = ptyId
        addTerminal({ id: ptyId, ptyId, label: `Terminal ${ptyId}` })
        syncSize()
        term.focus()
      })
      .catch((error: Error) => {
        term.writeln('No se pudo iniciar la terminal integrada.')
        term.writeln(error.message)
      })

    const handleResize = () => {
      syncSize()
    }

    const handleTerminalCommand = (event: Event) => {
      const command = (event as CustomEvent<string>).detail
      const ptyId = ptyIdRef.current
      if (!command || ptyId === null) return
      window.cipher.terminalInput(ptyId, `${command}\r`)
      term.focus()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('cipher-terminal-command', handleTerminalCommand)

    return () => {
      disposed = true
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('cipher-terminal-command', handleTerminalCommand)
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
  }, [addTerminal, currentFolder, removeTerminal])

  return (
    <div ref={terminalRef} className="h-full overflow-hidden bg-[#070912]" />
  )
}
