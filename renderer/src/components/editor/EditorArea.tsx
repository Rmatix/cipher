import { useStore } from '../../store/useStore'
import TabBar from './TabBar'
import MonacoEditor from './MonacoEditor'
import BottomPanel from '../terminal/BottomPanel'
import { X } from 'lucide-react'

export default function EditorArea() {
  const {
    terminalVisible,
    activeTabPath,
    splitActiveTabPath,
    editorSplitDirection,
    setEditorSplitDirection,
    activeEditorGroup,
    setActiveEditorGroup,
  } = useStore()

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0 min-w-0">
      <TabBar />
      <div className={`flex flex-1 overflow-hidden min-h-0 ${editorSplitDirection === 'down' ? 'flex-col' : ''}`}>
        <div
          className={`min-h-0 flex-1 overflow-hidden ${activeEditorGroup === 'main' ? 'ring-1 ring-inset ring-[var(--cipher-accent-soft)]' : ''}`}
          onMouseDown={() => setActiveEditorGroup('main')}
        >
          <MonacoEditor key={`primary-${activeTabPath || 'empty'}`} group="main" />
        </div>
        {editorSplitDirection === 'down' && (
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[var(--cipher-border)] ${activeEditorGroup === 'split' ? 'ring-1 ring-inset ring-[var(--cipher-accent-soft)]' : ''}`}
            onMouseDown={() => setActiveEditorGroup('split')}
          >
            <div className="flex h-8 items-center justify-between border-b border-[var(--cipher-border-soft)] bg-[var(--cipher-surface)] px-3">
              <span className="min-w-0 truncate text-[11px] uppercase tracking-[0.12em] text-[var(--cipher-text-muted)]">
                Split editor down: {splitActiveTabPath?.split(/[\\/]/).pop() || 'sin archivo'}
              </span>
              <button
                onClick={() => setEditorSplitDirection('single')}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--cipher-text-muted)] transition-all hover:bg-white/[0.06] hover:text-white"
                title="Cerrar split"
              >
                <X size={13} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <MonacoEditor key={`split-${splitActiveTabPath || 'empty'}`} filePath={splitActiveTabPath} group="split" />
            </div>
          </div>
        )}
      </div>
      {terminalVisible && <BottomPanel />}
    </div>
  )
}
