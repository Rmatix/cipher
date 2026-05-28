import { Bot, Folder, GitBranch, Search, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function Sidebar() {
  const { sidebarPanel, setSidebarPanel } = useStore()

  const panels: { id: 'files' | 'search' | 'git' | 'ai'; label: string; icon: LucideIcon }[] = [
    { id: 'files', label: 'Explorador', icon: Folder },
    { id: 'search', label: 'Busqueda', icon: Search },
    { id: 'git', label: 'Git', icon: GitBranch },
    { id: 'ai', label: 'Agente IA', icon: Bot },
  ]

  const handlePanelClick = (id: 'files' | 'search' | 'git' | 'ai' | 'settings') => {
    setSidebarPanel(sidebarPanel === id ? null : id)
  }

  return (
    <div className="flex w-20 flex-shrink-0 select-none flex-col items-center justify-between border-r border-white/[0.07] bg-[#090b13] py-5">
      <div className="flex w-full flex-col items-center gap-4">
        {panels.map((panel) => {
          const Icon = panel.icon
          const isActive = sidebarPanel === panel.id

          return (
            <button
              key={panel.id}
              onClick={() => handlePanelClick(panel.id)}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                isActive
                  ? 'bg-[#7a5cff]/16 text-[#a896ff] shadow-[0_0_0_1px_rgba(122,92,255,0.2)_inset,0_12px_30px_rgba(122,92,255,0.08)]'
                  : 'text-[#7380a2] hover:bg-white/[0.05] hover:text-[#dce4ff]'
              }`}
              title={panel.label}
            >
              {isActive && <div className="absolute -left-2.5 h-8 w-1 rounded-full bg-[#7a5cff] transition-all" />}
              <Icon size={22} strokeWidth={1.7} />

              <div className="cipher-pop-enter pointer-events-none absolute left-16 z-50 hidden rounded-lg border border-white/[0.08] bg-[#10131f] px-3 py-2 text-[12px] text-white shadow-xl group-hover:block">
                {panel.label}
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => handlePanelClick('settings')}
        className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
          sidebarPanel === 'settings'
            ? 'bg-[#7a5cff]/16 text-[#a896ff] shadow-[0_0_0_1px_rgba(122,92,255,0.2)_inset,0_12px_30px_rgba(122,92,255,0.08)]'
            : 'text-[#6f7898] hover:bg-white/[0.05] hover:text-[#dce4ff]'
        }`}
        title="Configuracion"
      >
        {sidebarPanel === 'settings' && <div className="absolute -left-2.5 h-8 w-1 rounded-full bg-[#7a5cff] transition-all" />}
        <Settings size={22} strokeWidth={1.7} />
        <div className="cipher-pop-enter pointer-events-none absolute left-16 z-50 hidden rounded-lg border border-white/[0.08] bg-[#10131f] px-3 py-2 text-[12px] text-white shadow-xl group-hover:block">
          Configuracion
        </div>
      </button>
    </div>
  )
}
