import { useStore, BUILT_IN_THEMES } from '../../store/useStore'

const DARK_FALLBACK = 'midnight'
const LIGHT_THEME = 'snow'
const LAST_DARK_KEY = 'cipher-last-dark-theme'

/**
 * ThemeSwitcher — toggles between the active dark theme and 'Snow Light'.
 * Uses the unified theme system in useStore (cipher-theme-id / CSS variables).
 * Pressing the button when in a dark theme saves it as last-dark, then switches
 * to Snow Light. Pressing again restores the saved dark theme.
 */
export default function ThemeSwitcher() {
  const { themeId, setTheme } = useStore()
  const isLight = themeId === LIGHT_THEME

  const toggle = () => {
    if (isLight) {
      // Restore last dark theme
      const lastDark = localStorage.getItem(LAST_DARK_KEY) || DARK_FALLBACK
      setTheme(lastDark)
    } else {
      // Save current dark theme, then switch to light
      localStorage.setItem(LAST_DARK_KEY, themeId)
      setTheme(LIGHT_THEME)
    }
  }

  const title = isLight
    ? `Tema claro activo — clic para volver a ${BUILT_IN_THEMES.find(t => t.id === (localStorage.getItem(LAST_DARK_KEY) || DARK_FALLBACK))?.name ?? 'Midnight'}`
    : 'Cambiar a tema claro (Snow Light)'

  return (
    <button
      onClick={toggle}
      title={title}
      aria-label={isLight ? 'Activar tema oscuro' : 'Activar tema claro'}
      className="flex h-10 w-12 items-center justify-center rounded-md text-[var(--cipher-text-muted)] transition-colors hover:bg-white/[0.06]"
    >
      {isLight ? '☀️' : '🌙'}
    </button>
  )
}
