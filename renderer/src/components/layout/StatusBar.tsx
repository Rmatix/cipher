import { useStore } from '../../store/useStore'
import { FileCode2, GitBranch, Terminal } from 'lucide-react'

export default function StatusBar() {
  const { gitBranch, terminalVisible, setTerminalVisible, setBottomPanel, tabs, activeTabPath } = useStore()

  const activeTab = tabs.find(t => t.path === activeTabPath)

  return (
    <div className="grid h-10 flex-shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t border-white/[0.06] bg-[#101522] px-4 text-[12px]">
      <div className="flex min-w-0 items-center gap-5">
        <span className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#b7c1de] transition-all hover:text-white">
          <GitBranch size={13} />
          {gitBranch}
        </span>
        <span className="text-[12px] text-[#b7c1de]">0 errores</span>
      </div>

      <div className="flex min-w-0 items-center gap-2 px-6 text-[#8d99bd]">
        <FileCode2 size={13} className="flex-shrink-0" />
        <span className="max-w-[340px] truncate">{activeTab?.name || 'Sin archivo abierto'}</span>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-5">
        <button
          onClick={() => {
            setBottomPanel('terminal')
            setTerminalVisible(!terminalVisible)
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-all ${
            terminalVisible ? 'bg-[#7a5cff]/20 text-white' : 'text-[#b7c1de] hover:text-white'
          }`}
        >
          <Terminal size={13} />
          Terminal
        </button>
        <span className="text-[12px] text-[#b7c1de]">
          {activeTab?.language || 'Texto'}
        </span>
        <span className="text-[12px] text-[#b7c1de]">UTF-8</span>
        <span className="text-[12px] text-[#b7c1de]">Ln 1, Col 1</span>
      </div>
    </div>
  )
}
