import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { GitBranch, RefreshCw } from 'lucide-react'

export default function GitPanel() {
  const { currentFolder, gitBranch, setGitBranch, refreshGitStatus } = useStore()
  const [changes, setChanges] = useState<{ status: string; file: string }[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!currentFolder) return
    const [status, branch] = await Promise.all([
      window.cipher.gitStatus(currentFolder),
      window.cipher.gitBranch(currentFolder),
    ])
    setChanges(status)
    setGitBranch(branch)
    refreshGitStatus()
  }, [currentFolder, setGitBranch, refreshGitStatus])

  useEffect(() => {
    if (!currentFolder) return

    let cancelled = false
    Promise.all([
      window.cipher.gitStatus(currentFolder),
      window.cipher.gitBranch(currentFolder),
    ]).then(([status, branch]) => {
      if (cancelled) return
      setChanges(status)
      setGitBranch(branch)
      refreshGitStatus()
    })

    return () => {
      cancelled = true
    }
  }, [currentFolder, setGitBranch, refreshGitStatus])


  const handleCommit = async () => {
    if (!currentFolder || !message.trim()) return
    setLoading(true)
    const result = await window.cipher.gitCommit(currentFolder, message)
    if (result.success) {
      setMessage('')
      await refresh()
    } else {
      alert('Error: ' + result.error)
    }
    setLoading(false)
  }

  const statusColors: Record<string, string> = {
    M: 'text-yellow-400',
    A: 'text-green-400',
    D: 'text-red-400',
    U: 'text-blue-400',
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-2.5 text-[14px] text-[#dce4ff]">
          <GitBranch size={16} />
          <span>{gitBranch}</span>
        </div>
        <button onClick={refresh} className="rounded-lg p-2 text-[#7f8bb0] transition-all hover:bg-white/[0.06] hover:text-white">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="px-5 py-5">
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#7f8bb0]">Cambios</p>
        {changes.length === 0 ? (
          <p className="text-[13px] text-[#627091]">Sin cambios</p>
        ) : (
          changes.map((item, i) => (
            <div key={i} className="flex h-9 items-center gap-3 rounded-lg px-2 text-[13px] transition-all hover:bg-white/[0.035]">
              <span className={`font-bold ${statusColors[item.status[0]] || 'text-[#6b6b8a]'}`}>
                {item.status}
              </span>
              <span className="text-[#b0b0c8] truncate">{item.file}</span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/[0.07] px-5 py-5">
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#7f8bb0]">Commit</p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Mensaje de commit..."
          className="h-28 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-[14px] text-[#dce4ff] outline-none transition-all placeholder-[#627091] focus:border-[var(--cipher-violet)]/70 focus:bg-white/[0.055]"
          rows={3}
        />
        <button
          onClick={handleCommit}
          disabled={loading || !message.trim()}
          className="mt-4 h-11 w-full rounded-xl bg-[var(--cipher-violet)] text-[14px] font-medium text-white transition-all hover:bg-[var(--cipher-violet-bright)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Commiteando...' : 'Commit'}
        </button>
      </div>

      <div className="border-t border-white/[0.07] px-5 py-5">
        <div className="flex gap-3">
          <button
            onClick={() => currentFolder && window.cipher.gitPush(currentFolder).then(refresh)}
            className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.035] text-[14px] text-[#dce4ff] transition-all hover:border-[var(--cipher-violet)]/70 hover:bg-white/[0.055]"
          >
            Push
          </button>
          <button
            onClick={() => currentFolder && window.cipher.gitPull(currentFolder).then(refresh)}
            className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.035] text-[14px] text-[#dce4ff] transition-all hover:border-[var(--cipher-violet)]/70 hover:bg-white/[0.055]"
          >
            Pull
          </button>
        </div>
      </div>
    </div>
  )
}
