import { useState } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getLanguage } from '../../utils/fileUtils'

interface SearchResult {
  file: string
  matches: { line: number; text: string }[]
}

export default function SearchPanel() {
  const { currentFolder, addTab } = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async (value: string) => {
    setQuery(value)
    if (value.length < 2 || !currentFolder) {
      setResults([])
      return
    }
    setSearching(true)
    const found = await searchInFolder(currentFolder, value)
    setResults(found)
    setSearching(false)
  }

  async function searchInFolder(folderPath: string, q: string, results: SearchResult[] = []) {
    try {
      const items = await window.cipher.readDirectory(folderPath)
      for (const item of items) {
        if (item.name.startsWith('.')) continue
        if (item.isDirectory && ['node_modules', '.git', 'dist', 'build'].includes(item.name)) continue
        if (item.isDirectory) {
          await searchInFolder(item.path, q, results)
        } else {
          try {
            const content = await window.cipher.readFile(item.path)
            const lines = content.split('\n')
            const matches = lines
              .map((line, idx) => ({ line: idx + 1, text: line.trim() }))
              .filter(m => m.text.toLowerCase().includes(q.toLowerCase()))
              .slice(0, 5)
            if (matches.length > 0) results.push({ file: item.path, matches })
          } catch {
            // Silence error when reading file fails
          }
        }
      }
    } catch {
      // Silence error when reading directory fails
    }
    return results
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 p-5">
        <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 transition-all focus-within:border-[#7a5cff]/70 focus-within:bg-white/[0.055]">
          <Search size={17} className="text-[#7f8bb0]" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 bg-transparent text-[14px] text-[#dce4ff] outline-none placeholder-[#627091]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searching && (
          <p className="cipher-fade-up px-5 py-4 text-[13px] text-[#9d87ff]">Buscando...</p>
        )}
        {!searching && results.length === 0 && query.length >= 2 && (
          <p className="cipher-fade-up px-5 py-4 text-[13px] text-[#627091]">Sin resultados</p>
        )}
        {results.map(result => {
          const fileName = result.file.split('\\').pop() || result.file
          return (
            <div key={result.file}>
              <div className="px-5 py-2 text-[12px] font-semibold text-[#4fc3f7]">
                {fileName}
              </div>
              {result.matches.map(match => (
                <div
                  key={match.line}
                  onClick={() => addTab({
                    path: result.file,
                    name: fileName,
                    language: getLanguage(fileName),
                    modified: false,
                  })}
                  className="flex cursor-pointer gap-3 px-5 py-1.5 text-[12px] transition-all hover:bg-[#1a1a2e]"
                >
                  <span className="w-8 flex-shrink-0 text-[#6b6b8a]">{match.line}</span>
                  <span className="text-[#b0b0c8] truncate">{match.text.slice(0, 60)}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
