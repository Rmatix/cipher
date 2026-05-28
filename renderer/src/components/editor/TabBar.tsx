import { X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getTabIcon } from '../../utils/fileUtils'

export default function TabBar() {
  const { tabs, activeTabPath, setActiveTab, removeTab } = useStore()

  if (tabs.length === 0) {
    return (
      <div className="flex h-12 flex-shrink-0 items-center border-b border-white/[0.07] bg-[#0a0d16] px-5">
        <span className="text-[13px] text-[#5d688a]">Abre un archivo para empezar</span>
      </div>
    )
  }

  return (
    <div className="flex h-12 flex-shrink-0 overflow-x-auto border-b border-white/[0.07] bg-[#0a0d16]">
      {tabs.map(tab => (
        <div
          key={tab.path}
          onClick={() => setActiveTab(tab.path)}
          className={`cipher-tab-enter group flex h-full min-w-[164px] max-w-[260px] cursor-pointer items-center gap-2.5 border-r border-white/[0.07] px-4 transition-all ${
            activeTabPath === tab.path
              ? 'bg-[#10131f] border-t border-t-[#7a5cff] text-[#dce4ff]'
              : 'bg-[#0a0d16] text-[#7884aa] hover:bg-[#10131f] hover:text-[#dce4ff]'
          }`}
        >
          <span className="font-mono text-[11px] font-bold text-[#80d8ff]">
            {getTabIcon(tab.name)}
          </span>
          <span className="flex-1 truncate text-[13px]">
            {tab.name}{tab.modified ? ' *' : ''}
          </span>
          <button
            onClick={e => { e.stopPropagation(); removeTab(tab.path) }}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md opacity-0 transition-all hover:bg-[#ff6b6b]/12 hover:text-[#ff6b6b] group-hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
