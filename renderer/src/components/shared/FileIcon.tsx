import { Braces, File, FileCode2, FileJson, Hash, Image, Info, Settings2, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getFileIconColor } from '../../utils/fileUtils'

interface Props {
  fileName: string
  size?: number
}

const iconMap: Record<string, LucideIcon> = {
  html: Braces,
  css: Hash,
  scss: Hash,
  json: FileJson,
  md: Info,
  png: Image,
  jpg: Image,
  jpeg: Image,
  svg: Image,
  ico: Image,
  vite: Zap,
  config: Settings2,
}

const labelMap: Record<string, string> = {
  js: 'JS',
  jsx: 'JSX',
  ts: 'TS',
  tsx: 'TSX',
  py: 'PY',
  go: 'GO',
  rs: 'RS',
  cs: 'C#',
  cpp: 'C++',
}

export default function FileIcon({ fileName, size = 15 }: Props) {
  const lowerName = fileName.toLowerCase()
  const ext = lowerName.split('.').pop() || ''
  const color = getFileIconColor(fileName)
  const isVite = lowerName.includes('vite.config')
  const isConfig = lowerName.includes('config') || lowerName.startsWith('.')
  const label = labelMap[ext]
  const Icon = isVite ? iconMap.vite : isConfig ? iconMap.config : iconMap[ext] || FileCode2

  if (label) {
    return (
      <span
        className="w-5 flex-shrink-0 text-center font-mono text-[9px] font-bold leading-none"
        style={{ color }}
      >
        {label}
      </span>
    )
  }

  return (
    <span className="flex w-5 flex-shrink-0 justify-center" style={{ color }}>
      {ext ? <Icon size={size} strokeWidth={1.85} /> : <File size={size} strokeWidth={1.85} />}
    </span>
  )
}
