import { Bot, BookOpen, Bug, Clock, Database, Folder, GitBranch, Search, Settings, Activity, StickyNote, Cpu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../../store/useStore'

type PanelId = 'files' | 'search' | 'git' | 'ai' | 'memory' | 'debug' | 'history' | 'notes' | 'workflows' | 'database' | 'settings' | 'mcp'

export default function Sidebar() {
  const { sidebarPanel, setSidebarPanel, projectMemory, editorMarkers, changeHistory, appProfile, cipherProduct } = useStore()

  const errorCount = editorMarkers.filter(m => m.severity === 8).length

  let panels: { id: PanelId; label: string; icon: LucideIcon; badge?: boolean; badgeCount?: number }[] = [
    { id: 'files',   label: 'Explorador',      icon: Folder                                                    },
    { id: 'search',  label: 'Busqueda',         icon: Search                                                    },
    { id: 'git',     label: 'Git',              icon: GitBranch                                                 },
    { id: 'ai',      label: 'Agente IA',        icon: Bot                                                       },
    { id: 'mcp',     label: 'Infraestructura MCP', icon: Cpu                                                   },
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

  // Dev edition keeps AI chat and CLI, but hides SQL Viewer (database)
  if (cipherProduct === 'dev') {
    panels = panels.filter(p => p.id !== 'database')
  }

  const handlePanelClick = (id: PanelId | 'settings') => {
    setSidebarPanel(sidebarPanel === id ? null : id)
  }

  return (
    <div className="flex w-16 flex-shrink-0 select-none flex-col items-center justify-between border-r border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] py-4">
      <div className="flex w-full flex-col items-center gap-3">
        {panels.map((panel) => {
          const Icon = panel.icon
          const isActive = sidebarPanel === panel.id

          return (
            <button
              key={panel.id}
              onClick={() => handlePanelClick(panel.id)}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                isActive
                  ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-accent)] shadow-[0_0_0_1px_var(--cipher-accent-soft)_inset]'
                  : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.04] hover:text-[var(--cipher-text)]'
              }`}
              title={panel.label}
            >
              {isActive && (
                <div className="absolute left-0 h-6 w-0.5 rounded-r bg-[var(--cipher-accent)] transition-all" />
              )}
              <Icon size={18} strokeWidth={1.5} />

              {/* Badge dot or count */}
              {panel.badge && !isActive && (
                panel.badgeCount && panel.badgeCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--cipher-status-err)] px-0.5 text-[9px] font-bold text-white">
                    {panel.badgeCount > 9 ? '9+' : panel.badgeCount}
                  </span>
                ) : (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--cipher-accent)]" />
                )
              )}

              <div className="cipher-pop-enter pointer-events-none absolute left-14 z-50 hidden rounded-md border border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-2.5 py-1.5 text-[11px] text-[var(--cipher-text)] shadow-xl group-hover:block whitespace-nowrap">
                {panel.label}
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => handlePanelClick('settings')}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
          sidebarPanel === 'settings'
            ? 'bg-[var(--cipher-accent-bg)] text-[var(--cipher-accent)] shadow-[0_0_0_1px_var(--cipher-accent-soft)_inset]'
            : 'text-[var(--cipher-text-muted)] hover:bg-white/[0.04] hover:text-[var(--cipher-text)]'
        }`}
        title="Configuración"
      >
        {sidebarPanel === 'settings' && (
          <div className="absolute left-0 h-6 w-0.5 rounded-r bg-[var(--cipher-accent)] transition-all" />
        )}
        <Settings size={18} strokeWidth={1.5} />
        <div className="cipher-pop-enter pointer-events-none absolute left-14 z-50 hidden rounded-md border border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-2.5 py-1.5 text-[11px] text-[var(--cipher-text)] shadow-xl group-hover:block">
          Configuración
        </div>
      </button>
    </div>
  )
}
