import { useEffect, useState, useCallback } from 'react';

/**
 * ThemeSwitcher - toggles between light and dark themes.
 * Persists the user choice in localStorage under 'cipher-theme'.
 * Applies theme by setting a data attribute on the document element.
 */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    // Initialize from localStorage or default to dark
    (() => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('cipher-theme') : null;
      return stored === 'light' ? 'light' : 'dark';
    })()
  );

  // Apply theme to document root
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cipher-theme', next);
    }
  }, [theme]);

  // Listen for IPC toggle shortcut from main process
  useEffect(() => {
    if (window.cipher && typeof window.cipher.onThemeToggle === 'function') {
      const off = window.cipher.onThemeToggle(() => {
        toggle();
      });
      return off;
    }
  }, [toggle]);

  return (
    <button
      onClick={toggle}
      className="flex h-10 w-12 items-center justify-center rounded-md text-[var(--cipher-text-muted)] transition-colors hover:bg-white/[0.06]"
      title="Toggle light/dark theme"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
