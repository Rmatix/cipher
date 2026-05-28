import { useStore } from '../../store/useStore'
import TabBar from './TabBar'
import MonacoEditor from './MonacoEditor'
import BottomPanel from '../terminal/BottomPanel'

export default function EditorArea() {
  const { terminalVisible, activeTabPath } = useStore()

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0 min-w-0">
      <TabBar />
      <div className="flex-1 overflow-hidden min-h-0">
        <MonacoEditor key={activeTabPath || 'empty'} />
      </div>
      {terminalVisible && <BottomPanel />}
    </div>
  )
}
