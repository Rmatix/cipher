import { useEffect, useState } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { FileItem } from '../../types/electron'
import { getLanguage } from '../../utils/fileUtils'
import FileIcon from '../shared/FileIcon'

interface TreeItemProps {
  item: FileItem
  depth: number
}

function TreeItem({ item, depth }: TreeItemProps) {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState<FileItem[]>([])
  const { addTab, setActiveTab, tabs } = useStore()

  const handleClick = async () => {
    if (item.isDirectory) {
      if (!open) {
        const items = await window.cipher.readDirectory(item.path)
        setChildren(items)
      }
      setOpen(!open)
    } else {
      const existing = tabs.find(t => t.path === item.path)
      if (existing) {
        setActiveTab(item.path)
      } else {
        addTab({
          path: item.path,
          name: item.name,
          language: getLanguage(item.name),
          modified: false,
        })
      }
    }
  }

  return (
    <div>
      <div
        className="group flex h-9 cursor-pointer items-center gap-2.5 rounded-lg pr-3 text-[13px] text-[#a9b4d6] transition-all hover:bg-white/[0.045] hover:text-white"
        style={{ paddingLeft: `${12 + depth * 18}px` }}
        onClick={handleClick}
      >
        {item.isDirectory ? (
          <>
            {open
              ? <ChevronDown size={15} className="flex-shrink-0 text-[#707b9d] transition-all group-hover:text-[#aab4d6]" />
              : <ChevronRight size={15} className="flex-shrink-0 text-[#707b9d] transition-all group-hover:text-[#aab4d6]" />
            }
            {open
              ? <FolderOpen size={18} strokeWidth={1.75} className="flex-shrink-0 text-[#d9b85f]" />
              : <Folder size={18} strokeWidth={1.75} className="flex-shrink-0 text-[#d9b85f]" />
            }
          </>
        ) : (
          <>
            <span className="w-[15px] flex-shrink-0" />
            <FileIcon fileName={item.name} />
          </>
        )}
        <span className="min-w-0 truncate">{item.name}</span>
      </div>
      {open && children.map(child => (
        <TreeItem key={child.path} item={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function FileExplorer() {
  const { currentFolder, setCurrentFolder } = useStore()
  const [items, setItems] = useState<FileItem[]>([])
  const folderName = currentFolder
    ? currentFolder.split('\\').pop() || currentFolder.split('/').pop() || currentFolder
    : ''

  useEffect(() => {
    if (!currentFolder) return
    let cancelled = false
    window.cipher.readDirectory(currentFolder).then((contents) => {
      if (!cancelled) setItems(contents)
    })
    return () => {
      cancelled = true
    }
  }, [currentFolder])

  const handleOpenFolder = async () => {
    const folder = await window.cipher.openFolder()
    if (!folder) return
    setCurrentFolder(folder)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!currentFolder ? (
        <div className="cipher-fade-up flex flex-col items-center gap-7 px-8 pt-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-[#9d87ff]">
            <Folder size={24} strokeWidth={1.75} />
          </div>
          <p className="text-center text-[14px] leading-6 text-[#7e8bae]">
            Ninguna carpeta abierta
          </p>
          <button
            onClick={handleOpenFolder}
            className="w-full max-w-56 rounded-xl border border-[#8b74ff]/50 bg-[#7a5cff] px-5 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_rgba(122,92,255,0.15)] transition-all hover:bg-[#8b74ff]"
          >
            Abrir carpeta
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex flex-shrink-0 items-center gap-2.5 px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#dce4ff]">
            <ChevronDown size={15} className="text-[#818bad]" />
            {folderName}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-5">
            {items.map(item => (
              <TreeItem key={item.path} item={item} depth={0} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
