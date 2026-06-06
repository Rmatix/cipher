import { X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import FileIcon from '../shared/FileIcon'

export default function TabBar() {
  const {
    tabs,
    activeTabPath,
    activeEditorGroup,
    splitActiveTabPath,
    editorSplitDirection,
    setActiveTab,
    setSplitActiveTab,
    removeTab,
  } = useStore()
  const visibleActivePath = editorSplitDirection === 'down' && activeEditorGroup === 'split'
    ? splitActiveTabPath
    : activeTabPath

  const activateTab = (path: string) => {
    if (editorSplitDirection === 'down' && activeEditorGroup === 'split') {
      setSplitActiveTab(path)
      return
    }
    setActiveTab(path)
  }

  if (tabs.length === 0) {
    return (
      <div className="flex h-12 flex-shrink-0 items-center border-b border-[var(--cipher-border)] bg-[var(--cipher-bg)] px-5">
        <span className="text-[13px] text-[var(--cipher-text-muted)]">Abre un archivo para empezar</span>
      </div>
    )
  }

  return (
    <div className="flex h-12 flex-shrink-0 overflow-x-auto border-b border-[var(--cipher-border)] bg-[var(--cipher-bg)]">
      {tabs.map(tab => (
        <div
          key={tab.path}
          onClick={() => activateTab(tab.path)}
          className={`cipher-tab-enter group flex h-full min-w-[164px] max-w-[260px] cursor-pointer items-center gap-2.5 border-r border-[var(--cipher-border)] px-4 transition-all ${
            visibleActivePath === tab.path
              ? 'bg-[var(--cipher-surface)] border-t border-t-[var(--cipher-accent)] text-[var(--cipher-text)]'
              : 'bg-[var(--cipher-bg)] text-[var(--cipher-text-muted)] hover:bg-[var(--cipher-surface)] hover:text-[var(--cipher-text)]'
          }`}
        >
          <FileIcon fileName={tab.name} size={16} />
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
