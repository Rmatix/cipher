import { getMaterialFileIcon } from '../../utils/fileUtils'

interface Props {
  fileName: string
  size?: number
  className?: string
}

export default function FileIcon({ fileName, size = 17, className = '' }: Props) {
  return (
    <span className={`flex w-[18px] flex-shrink-0 items-center justify-center ${className}`}>
      <img
        src={getMaterialFileIcon(fileName)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="select-none object-contain"
        style={{ width: size, height: size }}
      />
    </span>
  )
}
