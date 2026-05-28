import { useStore } from '../../store/useStore'
import FileExplorer from '../sidebar/FileExplorer'
import SearchPanel from '../sidebar/SearchPanel'
import GitPanel from '../sidebar/GitPanel'
import AIPanel from '../ai/AIPanel'
import SettingsPanel from '../settings/SettingsPanel'

export default function Panel() {
  const { sidebarPanel } = useStore()

  if (!sidebarPanel) return null

  const titles = {
    files: 'EXPLORADOR',
    search: 'BUSCAR',
    git: 'CONTROL DE VERSIONES',
    ai: 'AGENTE IA',
    settings: 'CONFIGURACION',
  }

  return (
    <div className="cipher-panel-enter flex w-96 flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#090b13]">
      <div className="flex-shrink-0 border-b border-white/[0.07] px-6 py-5 text-[12px] font-semibold tracking-[0.22em] text-[#828daf]">
        {titles[sidebarPanel]}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {sidebarPanel === 'files' && <FileExplorer />}
        {sidebarPanel === 'search' && <SearchPanel />}
        {sidebarPanel === 'git' && <GitPanel />}
        {sidebarPanel === 'ai' && <AIPanel />}
        {sidebarPanel === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}
