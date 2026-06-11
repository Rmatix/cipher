import { useEffect, useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { FileItem } from '../../types/electron'
import { getLanguage, getMaterialFolderIcon } from '../../utils/fileUtils'
import FileIcon from '../shared/FileIcon'

interface TreeItemProps {
  item: FileItem
  depth: number
}

function TreeItem({ item, depth }: TreeItemProps) {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState<FileItem[]>([])
  const { addTab, setActiveTab, tabs, gitStatusMap, currentFolder } = useStore()

  // Find relative path for git status matching
  let relativePath = ''
  if (currentFolder) {
    const rootPath = currentFolder.replace(/\\/g, '/')
    const itemPath = item.path.replace(/\\/g, '/')
    if (itemPath.startsWith(rootPath)) {
      relativePath = itemPath.slice(rootPath.length).replace(/^\//, '')
    }
  }

  const gitStatus = relativePath ? gitStatusMap[relativePath] : undefined

  // Check if this item is ignored (starts with '!' or has a parent folder in gitStatusMap that is ignored)
  let isIgnored = false
  if (gitStatus && gitStatus.startsWith('!')) {
    isIgnored = true
  } else if (relativePath) {
    const pathParts = relativePath.split('/')
    let currentCheck = ''
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentCheck = currentCheck ? `${currentCheck}/${pathParts[i]}` : pathParts[i]
      const parentStatus = gitStatusMap[currentCheck] || gitStatusMap[`${currentCheck}/`]
      if (parentStatus && parentStatus.startsWith('!')) {
        isIgnored = true
        break
      }
    }
  }

  let textColorClass = 'text-[#a9b4d6]'
  let gitBadge = ''
  let badgeColorClass = ''

  if (isIgnored) {
    textColorClass = 'text-[#5a647d] opacity-55' // muted gray for ignored files
  } else if (gitStatus) {
    const firstChar = gitStatus[0]
    if (firstChar === 'M') {
      textColorClass = 'text-[#e2b34c]' // yellow/orange for modified
      gitBadge = 'M'
      badgeColorClass = 'text-[#e2b34c]'
    } else if (firstChar === '?' || firstChar === 'U' || firstChar === 'A') {
      textColorClass = 'text-[#56d364]' // green for untracked/added
      gitBadge = firstChar === '?' ? 'U' : firstChar
      badgeColorClass = 'text-[#56d364]'
    }
  }

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
        className="group flex h-9 cursor-pointer items-center justify-between rounded-lg pr-3 text-[13px] transition-all hover:bg-white/[0.045] hover:text-white"
        style={{ paddingLeft: `${12 + depth * 18}px` }}
        onClick={handleClick}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {item.isDirectory ? (
            <>
              {open
                ? <ChevronDown size={15} className="flex-shrink-0 text-[#707b9d] transition-all group-hover:text-[#aab4d6]" />
                : <ChevronRight size={15} className="flex-shrink-0 text-[#707b9d] transition-all group-hover:text-[#aab4d6]" />
              }
              <img
                src={getMaterialFolderIcon(item.name, open)}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-[18px] w-[18px] flex-shrink-0 select-none object-contain"
              />
            </>
          ) : (
            <>
              <span className="w-[15px] flex-shrink-0" />
              <FileIcon fileName={item.name} />
            </>
          )}
          <span className={`truncate ${textColorClass}`}>{item.name}</span>
        </div>
        
        {gitBadge && (
          <span className={`text-[10px] font-semibold opacity-85 ml-2 mr-1 select-none ${badgeColorClass}`}>
            {gitBadge}
          </span>
        )}
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
            <img
              src={getMaterialFolderIcon('src', true)}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-8 w-8 select-none object-contain"
            />
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
          <button
            onClick={handleOpenFolder}
            className="flex flex-shrink-0 items-center gap-2.5 px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#dce4ff] hover:bg-white/[0.04] transition-all text-left outline-none"
          >
            <ChevronDown size={15} className="text-[#818bad]" />
            <span className="truncate">{folderName}</span>
          </button>
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
