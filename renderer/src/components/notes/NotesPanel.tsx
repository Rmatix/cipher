import { BookOpen, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getLanguage } from '../../utils/fileUtils'
import FileIcon from '../shared/FileIcon'

function groupByFile<T extends { filePath: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.filePath]) acc[item.filePath] = []
    acc[item.filePath].push(item)
    return acc
  }, {})
}

export default function NotesPanel() {
  const { notes, tabs, addTab, setActiveTab, deleteNote } = useStore()
  const groups = groupByFile(notes)
  const files = Object.keys(groups).sort((a, b) => a.localeCompare(b))

  const openNote = (filePath: string, line: number) => {
    const existing = tabs.find(tab => tab.path === filePath)
    if (!existing) {
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || filePath
      addTab({
        path: filePath,
        name: fileName,
        language: getLanguage(fileName),
        modified: false,
      })
    } else {
      setActiveTab(filePath)
    }

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cipher-open-note-line', {
        detail: { path: filePath, line },
      }))
    }, 50)
  }

  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <BookOpen size={32} className="text-[var(--cipher-text-muted)]" />
        <p className="text-[13px] text-[var(--cipher-text-muted)]">Todavía no hay notas inline.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-[var(--cipher-border)] px-4 py-3 text-[12px] text-[var(--cipher-text-muted)]">
        {notes.length} nota{notes.length !== 1 ? 's' : ''} en {files.length} archivo{files.length !== 1 ? 's' : ''}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {files.map(filePath => {
          const fileNotes = [...groups[filePath]].sort((a, b) => a.line - b.line)
          const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || filePath
          return (
            <div key={filePath} className="mb-3 rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)]">
              <div className="flex items-center gap-2 border-b border-[var(--cipher-border)] px-3 py-2.5">
                <FileIcon fileName={fileName} size={15} />
                <span className="truncate text-[12px] font-medium text-[var(--cipher-text)]">{fileName}</span>
              </div>
              <div className="p-2">
                {fileNotes.map(note => (
                  <div key={note.id} className="mb-1 flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-[var(--cipher-bg)]">
                    <button
                      onClick={() => openNote(note.filePath, note.line)}
                      className="min-w-0 flex-1 text-left"
                      title="Abrir nota en el editor"
                    >
                      <div className="text-[11px] text-[var(--cipher-accent)]">Línea {note.line}</div>
                      <div className="truncate text-[12px] text-[var(--cipher-text)]">{note.content}</div>
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cipher-text-muted)] hover:bg-[#ff6b6b]/12 hover:text-[#ff9a9a]"
                      title="Eliminar nota"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
