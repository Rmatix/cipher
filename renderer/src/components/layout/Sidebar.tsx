import { Bot, BookOpen, Bug, Clock, Database, Folder, GitBranch, Search, Settings, Activity, StickyNote } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../../store/useStore'

type PanelId = 'files' | 'search' | 'git' | 'ai' | 'memory' | 'debug' | 'history' | 'notes' | 'workflows' | 'database' | 'settings'

export default function Sidebar() {
  const { sidebarPanel, setSidebarPanel, projectMemory, editorMarkers, changeHistory, appProfile } = useStore()

  const errorCount = editorMarkers.filter(m => m.severity === 8).length

  let panels: { id: PanelId; label: string; icon: LucideIcon; badge?: boolean; badgeCount?: number }[] = [
    { id: 'files',   label: 'Explorador',      icon: Folder                                                    },
    { id: 'search',  label: 'Busqueda',         icon: Search                                                    },
    { id: 'git',     label: 'Git',              icon: GitBranch                                                 },
    { id: 'ai',      label: 'Agente IA',        icon: Bot                                                       },
    { id: 'memory',  label: 'Memoria proyecto', icon: BookOpen,  badge: !!projectMemory                         },
    { id: 'debug',   label: 'Debugger IA',      icon: Bug,       badge: errorCount > 0, badgeCount: errorCount  },
    { id: 'history', label: 'Historial',        icon: Clock,     badge: changeHistory.length > 0                },
    { id: 'notes',     label: 'Notas',             icon: StickyNote                                                },
    { id: 'workflows', label: 'Workflows (BETA)',  icon: Activity                                                  },
    { id: 'database',  label: 'SQL Viewer',        icon: Database                                                  },
  ]

  // Filter out developer features if profile is common user
  if (appProfile === 'common') {
    panels = panels.filter(p => ['files', 'search', 'notes', 'history'].includes(p.id))
  }

  const handlePanelClick = (id: PanelId | 'settings') => {
    setSidebarPanel(sidebarPanel === id ? null : id)
  }

  return (
    <div className="flex w-24 flex-shrink-0 select-none flex-col items-center justify-between border-r border-[var(--cipher-border)] bg-[var(--cipher-surface)] py-6">
      <div className="flex w-full flex-col items-center gap-5">
        {panels.map((panel) => {
          const Icon = panel.icon
          const isActive = sidebarPanel === panel.id

          return (
            <button
              key={panel.id}
              onClick={() => handlePanelClick(panel.id)}
              className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
                isActive
                  ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)] shadow-[0_0_0_1px_var(--cipher-accent-soft)_inset]'
                  : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.05] hover:text-[var(--cipher-text)]'
              }`}
              title={panel.label}
            >
              {isActive && (
                <div className="absolute -left-3.5 h-9 w-1.5 rounded-full bg-[var(--cipher-accent)] transition-all" />
              )}
              <Icon size={24} strokeWidth={1.7} />

              {/* Badge dot or count */}
              {panel.badge && !isActive && (
                panel.badgeCount && panel.badgeCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6b6b] px-1 text-[10px] font-bold text-white">
                    {panel.badgeCount > 9 ? '9+' : panel.badgeCount}
                  </span>
                ) : (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--cipher-accent)]" />
                )
              )}

              <div className="cipher-pop-enter pointer-events-none absolute left-16 z-50 hidden rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-3 py-2 text-[12px] text-[var(--cipher-text)] shadow-xl group-hover:block whitespace-nowrap">
                {panel.label}
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => handlePanelClick('settings')}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
          sidebarPanel === 'settings'
            ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-text)] shadow-[0_0_0_1px_var(--cipher-accent-soft)_inset]'
            : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.05] hover:text-[var(--cipher-text)]'
        }`}
        title="Configuracion"
      >
        {sidebarPanel === 'settings' && (
          <div className="absolute -left-3.5 h-9 w-1.5 rounded-full bg-[var(--cipher-accent)] transition-all" />
        )}
        <Settings size={24} strokeWidth={1.7} />
        <div className="cipher-pop-enter pointer-events-none absolute left-16 z-50 hidden rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-3 py-2 text-[12px] text-[var(--cipher-text)] shadow-xl group-hover:block">
          Configuracion
        </div>
      </button>
    </div>
  )
}
