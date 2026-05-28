import { useEffect, useState } from 'react'
import { ExternalLink, Maximize2, Minimize2, Search, Square, X } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function Titlebar() {
  const { currentFolder, setCurrentFolder, sidebarPanel, setSidebarPanel } = useStore()
  const [isMaximized, setIsMaximized] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    const checkMaximized = async () => {
      if (!window.cipher?.isMaximized) return
      try {
        const max = await window.cipher.isMaximized()
        setIsMaximized(max)
      } catch {
        setIsMaximized(false)
      }
    }

    checkMaximized()
    window.addEventListener('resize', checkMaximized)
    return () => window.removeEventListener('resize', checkMaximized)
  }, [])

  const handleOpenFolder = async () => {
    if (!window.cipher?.openFolder) return
    const folder = await window.cipher.openFolder()
    if (!folder) return
    setCurrentFolder(folder)
    setSidebarPanel('files')
  }

  const toggleSidebarPanel = (panel: 'files' | 'search' | 'git' | 'ai' | 'settings') => {
    setSidebarPanel(sidebarPanel === panel ? null : panel)
  }

  const openDocumentation = () => {
    window.cipher?.openExternal?.('https://github.com/Rmatix/cipher')
  }

  const menuItems = [
    {
      label: 'Archivo',
      options: [
        { label: 'Nuevo archivo', action: () => {} },
        { label: 'Abrir carpeta', action: handleOpenFolder },
        { label: 'Paleta de comandos', action: () => window.dispatchEvent(new Event('cipher-command-palette')) },
        { label: 'Guardar', action: () => window.dispatchEvent(new Event('cipher-save-active')) },
        { label: 'Salir', action: () => window.cipher.closeWindow() },
      ],
    },
    {
      label: 'Editar',
      options: [
        { label: 'Deshacer', action: () => {} },
        { label: 'Rehacer', action: () => {} },
        { label: 'Cortar', action: () => {} },
        { label: 'Copiar', action: () => {} },
        { label: 'Pegar', action: () => {} },
        { label: 'Formatear documento', action: () => window.dispatchEvent(new Event('cipher-format-active')) },
      ],
    },
    {
      label: 'Ver',
      options: [
        { label: 'Explorador', action: () => toggleSidebarPanel('files') },
        { label: 'Busqueda', action: () => toggleSidebarPanel('search') },
        { label: 'Control de versiones', action: () => toggleSidebarPanel('git') },
        { label: 'Agente IA', action: () => toggleSidebarPanel('ai') },
        { label: 'Configuracion', action: () => toggleSidebarPanel('settings') },
      ],
    },
    {
      label: 'Ayuda',
      options: [
        { label: 'Acerca de Cipher', action: () => alert('Cipher Code Editor v0.1.0') },
        { label: 'Documentacion del proyecto', action: openDocumentation },
      ],
    },
  ]

  return (
    <div className="drag flex h-14 flex-shrink-0 select-none items-center justify-between border-b border-white/[0.07] bg-[#0b0d16]/95 z-50">
      <div className="no-drag flex h-full items-center gap-5 pl-7 pr-6">
        <img src="./logo.png" alt="Cipher Logo" className="h-6 w-6 object-contain transition-transform duration-300 hover:scale-110" />
        <span className="mr-4 text-[15px] font-semibold text-[#f4f7ff]">Cipher</span>

        <div className="flex items-center gap-2.5">
          {menuItems.map((menu) => (
            <div
              key={menu.label}
              className="relative"
              onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
            >
              <button
                onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                className={`rounded-lg px-3.5 py-2 text-[13px] text-[#9aa6c8] transition-all hover:bg-white/[0.06] hover:text-white ${
                  activeMenu === menu.label ? 'bg-white/[0.08] text-white' : ''
                }`}
              >
                {menu.label}
              </button>

              {activeMenu === menu.label && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                  <div className="cipher-pop-enter absolute left-0 z-20 mt-2 w-64 rounded-xl border border-white/[0.08] bg-[#10131f] py-2 shadow-2xl">
                    {menu.options.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          option.action()
                          setActiveMenu(null)
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] text-[#b7c1de] transition-all hover:bg-[#7a5cff] hover:text-white"
                      >
                        <span>{option.label}</span>
                        {option.label === 'Documentacion del proyecto' && <ExternalLink size={14} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="no-drag flex max-w-3xl flex-1 justify-center px-10">
        <button
          onClick={() => toggleSidebarPanel('search')}
          className="flex h-10 w-full items-center justify-between gap-8 rounded-xl border border-white/[0.08] bg-[#070912] px-4 text-[13px] text-[#7884aa] transition-all hover:border-[#7a5cff]/70 hover:bg-[#0d1020] hover:text-[#dce4ff] hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search size={14} />
            <span className="truncate">{currentFolder || 'Buscar en el proyecto...'}</span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-1.5 pr-1 text-[11px] text-[#4f5a7a]">Ctrl+Shift+F <ExternalLink size={11} className="opacity-60" /></span>
        </button>
      </div>

      <div className="no-drag flex h-full items-center">
        <button
          onClick={() => window.cipher?.minimizeWindow?.()}
          className="flex h-full w-14 items-center justify-center text-[#7d88aa] transition-all hover:bg-white/[0.06] hover:text-white"
          title="Minimizar"
        >
          <Minimize2 size={15} />
        </button>
        <button
          onClick={async () => {
            if (!window.cipher?.maximizeWindow) return
            window.cipher.maximizeWindow()
            if (window.cipher.isMaximized) {
              try {
                setIsMaximized(await window.cipher.isMaximized())
              } catch {
                setIsMaximized(false)
              }
            }
          }}
          className="flex h-full w-14 items-center justify-center text-[#7d88aa] transition-all hover:bg-white/[0.06] hover:text-white"
          title="Maximizar"
        >
          {isMaximized ? <Square size={13} className="scale-75" /> : <Maximize2 size={15} />}
        </button>
        <button
          onClick={() => window.cipher?.closeWindow?.()}
          className="flex h-full w-14 items-center justify-center text-[#7d88aa] transition-all hover:bg-[#ef4444] hover:text-white"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
