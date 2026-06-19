import { create } from 'zustand'

// ── Theme system ─────────────────────────────────────────

export interface CipherTheme {
  id: string
  name: string
  bg: string        // body / app background
  surface: string   // panels / titlebar
  surfaceAlt: string// sidebar, settings
  border: string    // borders
  accent: string    // purple accent
  accentAlt: string // blue accent
  text: string      // primary text
  textMuted: string // secondary text
}

export const BUILT_IN_THEMES: CipherTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight (soft)',
    bg: '#0c1018',
    surface: '#11141e',
    surfaceAlt: '#141822',
    border: 'rgba(255,255,255,0.04)',
    accent: '#7a70ff',
    accentAlt: '#4db1e5',
    text: '#dce4ff',
    textMuted: '#8a92b3',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    bg: '#0a0a0a',
    surface: '#111111',
    surfaceAlt: '#161616',
    border: 'rgba(255,255,255,0.06)',
    accent: '#9d87ff',
    accentAlt: '#60cdff',
    text: '#e8e8f0',
    textMuted: '#6b7280',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#080f0a',
    surface: '#0b1410',
    surfaceAlt: '#0e1a14',
    border: 'rgba(86,211,100,0.10)',
    accent: '#56d364',
    accentAlt: '#3fb950',
    text: '#d2f4d8',
    textMuted: '#6e9a74',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bg: '#060c14',
    surface: '#08101e',
    surfaceAlt: '#0a1526',
    border: 'rgba(79,195,247,0.10)',
    accent: '#4fc3f7',
    accentAlt: '#38bdf8',
    text: '#cce8f8',
    textMuted: '#5a8099',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: '#07080f',
    surface: '#0c0d1a',
    surfaceAlt: '#0f1020',
    border: 'rgba(157,135,255,0.09)',
    accent: '#c084fc',
    accentAlt: '#f0abfc',
    text: '#ecdeff',
    textMuted: '#8070a0',
  },
  {
    id: 'nord',
    name: 'Nordic Frost',
    bg: '#2e3440',
    surface: '#3b4252',
    surfaceAlt: '#242933',
    border: 'rgba(216,222,233,0.06)',
    accent: '#88c0d0',
    accentAlt: '#81a1c1',
    text: '#d8dee9',
    textMuted: '#4c566a',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    bg: '#0f051d',
    surface: '#1a0b2e',
    surfaceAlt: '#140724',
    border: 'rgba(255,0,128,0.12)',
    accent: '#ff007f',
    accentAlt: '#00f0ff',
    text: '#e2d9f3',
    textMuted: '#ffaa00',
  },
  {
    id: 'monokai',
    name: 'Monokai Retro',
    bg: '#1e1e1e',
    surface: '#272822',
    surfaceAlt: '#181816',
    border: 'rgba(249,38,114,0.1)',
    accent: '#a6e22e',
    accentAlt: '#f92672',
    text: '#f8f8f2',
    textMuted: '#75715e',
  },
  {
    id: 'snow',
    name: 'Snow Light',
    bg: '#f0ede8',
    surface: '#faf8f5',
    surfaceAlt: '#e8e4dd',
    border: 'rgba(0,0,0,0.09)',
    accent: '#5b4fcf',
    accentAlt: '#0284c7',
    text: '#1e293b',
    textMuted: '#64748b',
  },
];

function applyTheme(theme: CipherTheme) {
  const root = document.documentElement
  root.style.setProperty('--cipher-bg',          theme.bg)
  root.style.setProperty('--cipher-surface',     theme.surface)
  root.style.setProperty('--cipher-surface-alt', theme.surfaceAlt)
  root.style.setProperty('--cipher-border',      theme.border)
  root.style.setProperty('--cipher-border-soft', theme.border.replace(/[\d.]+\)$/, '0.045)'))
  root.style.setProperty('--cipher-accent',      theme.accent)
  root.style.setProperty('--cipher-accent-alt',  theme.accentAlt)
  root.style.setProperty('--cipher-accent-soft', `${theme.accent}55`)
  root.style.setProperty('--cipher-accent-bg',   `${theme.accent}22`)
  root.style.setProperty('--cipher-text',        theme.text)
  root.style.setProperty('--cipher-text-muted',  theme.textMuted)

  // For light themes (snow), apply a warm gradient; for dark themes use the bg color
  const isLight = theme.id === 'snow'
  if (isLight) {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
  document.body.style.background = isLight
    ? `linear-gradient(135deg, ${theme.surfaceAlt} 0%, ${theme.bg} 40%, ${theme.surface} 100%)`
    : theme.bg
  document.body.style.color = theme.text
}

function loadThemeId(): string {
  return localStorage.getItem('cipher-theme-id') || 'midnight'
}

// ── Change History ───────────────────────────────────────

export interface ChangeEntry {
  id: string
  filePath: string
  fileName: string
  savedAt: number   // timestamp ms
  snapshot: string  // full file content at save time (max 200 kB)
}

const MAX_HISTORY_PER_FILE = 30
const MAX_SNAPSHOT_SIZE = 200_000

function loadHistory(): ChangeEntry[] {
  try {
    return JSON.parse(localStorage.getItem('cipher-change-history') || '[]')
  } catch {
    return []
  }
}

function saveHistory(entries: ChangeEntry[]) {
  try {
    localStorage.setItem('cipher-change-history', JSON.stringify(entries))
  } catch {
    // quota exceeded — trim and retry
    const trimmed = entries.slice(-50)
    localStorage.setItem('cipher-change-history', JSON.stringify(trimmed))
  }
}

interface KeyBinding {
  id: string
  label: string
  defaultKey: string
  currentKey: string
  action: string
}

const DEFAULT_KEYBINDINGS: KeyBinding[] = [
  { id: 'save',          label: 'Guardar archivo',       defaultKey: 'Ctrl+S',       currentKey: 'Ctrl+S',       action: 'cipher-save-active'     },
  { id: 'format',        label: 'Formatear documento',   defaultKey: 'Ctrl+Shift+F', currentKey: 'Ctrl+Shift+F', action: 'cipher-format-active'   },
  { id: 'palette',       label: 'Paleta de comandos',    defaultKey: 'Ctrl+Shift+P', currentKey: 'Ctrl+Shift+P', action: 'cipher-command-palette' },
  { id: 'explorer',      label: 'Abrir explorador',      defaultKey: 'Ctrl+B',       currentKey: 'Ctrl+B',       action: 'cipher-panel-files'     },
  { id: 'ai',            label: 'Abrir Agente IA',       defaultKey: 'Ctrl+Shift+A', currentKey: 'Ctrl+Shift+A', action: 'cipher-panel-ai'        },
  { id: 'debug',         label: 'Abrir Debugger IA',     defaultKey: 'Ctrl+Shift+D', currentKey: 'Ctrl+Shift+D', action: 'cipher-panel-debug'     },
  { id: 'memory',        label: 'Abrir Memoria',         defaultKey: 'Ctrl+Shift+M', currentKey: 'Ctrl+Shift+M', action: 'cipher-panel-memory'    },
  { id: 'terminal',      label: 'Abrir terminal',        defaultKey: 'Ctrl+`',       currentKey: 'Ctrl+`',       action: 'cipher-toggle-terminal' },
  { id: 'focus',         label: 'Modo enfoque',          defaultKey: 'Ctrl+K Z',     currentKey: 'Ctrl+K Z',     action: 'cipher-toggle-focus'    },
  { id: 'aiCompletion',  label: 'Toggle autocompletado', defaultKey: 'Ctrl+Shift+I', currentKey: 'Ctrl+Shift+I', action: 'cipher-toggle-ai-completion' },
]

function loadKeyBindings(): KeyBinding[] {
  try {
    const saved = localStorage.getItem('cipher-keybindings')
    if (!saved) return DEFAULT_KEYBINDINGS
    const savedMap: Record<string, string> = JSON.parse(saved)
    return DEFAULT_KEYBINDINGS.map(kb => ({
      ...kb,
      currentKey: savedMap[kb.id] ?? kb.defaultKey,
    }))
  } catch {
    return DEFAULT_KEYBINDINGS
  }
}

export type { KeyBinding }
export { DEFAULT_KEYBINDINGS }

interface CodeNote {
  id: string
  filePath: string
  line: number
  content: string
  createdAt: number
}

interface EditorMarker {
  severity: 1 | 2 | 4 | 8  // hint=1, info=2, warning=4, error=8
  message: string
  startLineNumber: number
  endLineNumber: number
  startColumn: number
  endColumn: number
  source?: string
  filePath: string
}

interface Tab {
  path: string
  name: string
  language: string
  modified: boolean
}

interface TerminalInstance {
  id: number
  ptyId: number
  label: string
  profile?: string
}

export interface CustomModel {
  name: string
  provider: string
  modelId: string
  url?: string          // base URL for openai-compatible
  key?: string
  endpoint?: string     // custom API endpoint (for OpenRouter, NIM, etc.)
  alias?: string        // optional display alias
  endpointName?: string // Custom endpoint group name (e.g. "OpenRouter", "Ollama Nube")
}

interface AppState {
  // Profile
  appProfile: 'common' | 'developer'
  setAppProfile: (profile: 'common' | 'developer') => void
  cipherProduct: 'lite' | 'dev' | 'studio'
  setCipherProduct: (product: 'lite' | 'dev' | 'studio') => void

  // Folder
  currentFolder: string | null
  setCurrentFolder: (folder: string | null) => void

  // Tabs
  tabs: Tab[]
  activeTabPath: string | null
  activeFileContent: string | null
  addTab: (tab: Tab) => void
  removeTab: (path: string) => void
  setActiveTab: (path: string) => void
  setActiveFileContent: (content: string | null) => void
  updateTabModified: (path: string, modified: boolean) => void

  // Sidebar
  sidebarPanel: 'files' | 'search' | 'git' | 'ai' | 'memory' | 'debug' | 'history' | 'notes' | 'workflows' | 'database' | 'settings' | 'mcp' | null
  setSidebarPanel: (panel: 'files' | 'search' | 'git' | 'ai' | 'memory' | 'debug' | 'history' | 'notes' | 'workflows' | 'database' | 'settings' | 'mcp' | null) => void

  // Terminal
  terminalVisible: boolean
  setTerminalVisible: (visible: boolean) => void
  bottomPanel: 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'cloud'
  setBottomPanel: (panel: 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'cloud') => void
  editorSplitDirection: 'single' | 'down'
  setEditorSplitDirection: (direction: 'single' | 'down') => void
  activeEditorGroup: 'main' | 'split'
  setActiveEditorGroup: (group: 'main' | 'split') => void
  splitActiveTabPath: string | null
  setSplitActiveTab: (path: string | null) => void
  terminals: TerminalInstance[]
  activeTerminalId: number | null
  addTerminal: (t: TerminalInstance) => void
  removeTerminal: (id: number) => void
  setActiveTerminal: (id: number) => void

  // AI
  aiMode: 'chat' | 'plan' | 'dev' | 'composer'
  setAiMode: (mode: 'chat' | 'plan' | 'dev' | 'composer') => void
  aiModel: string
  setAiModel: (model: string) => void
  aiDevModel: string
  setAiDevModel: (model: string) => void
  customModels: CustomModel[]
  addCustomModel: (model: CustomModel) => void
  removeCustomModel: (index: number) => void

  // Project memory
  // El contenido en memoria del PROYECTO.md activo (null = no cargado aún)
  projectMemory: string | null
  setProjectMemory: (memory: string | null) => void

  // Focus mode
  focusMode: boolean
  setFocusMode: (v: boolean) => void
  toggleFocusMode: () => void

  // Key bindings
  keyBindings: KeyBinding[]
  setKeyBinding: (id: string, key: string) => void
  resetKeyBindings: () => void

  // Editor markers (errors/warnings from Monaco)
  editorMarkers: EditorMarker[]
  setEditorMarkers: (markers: EditorMarker[]) => void

  // Git
  gitBranch: string
  setGitBranch: (branch: string) => void
  gitStatusMap: Record<string, string>
  refreshGitStatus: () => Promise<void>

  // Theme
  themeId: string
  setTheme: (id: string) => void

  // Change history
  changeHistory: ChangeEntry[]
  pushChangeEntry: (filePath: string, fileName: string, snapshot: string) => void
  clearFileHistory: (filePath: string) => void
  clearAllHistory: () => void

  // Code notes
  notes: CodeNote[]
  addNote: (filePath: string, line: number, content: string) => void
  editNote: (id: string, content: string) => void
  deleteNote: (id: string) => void

  // Language workflows
  runBuildCommand: (lang: typeof SUPPORTED_LANGUAGES[number]) => void
  runLintCommand: (lang: typeof SUPPORTED_LANGUAGES[number]) => void
}

export const SUPPORTED_LANGUAGES = ['python', 'cpp', 'rust'] as const;

export const useStore = create<AppState>((set, get) => ({
  // Utility actions for language‑specific workflows
  runBuildCommand: (lang: typeof SUPPORTED_LANGUAGES[number]) => {
    // Dispatch a terminal command appropriate for the language
    const cmdMap: Record<string, string> = {
      python: 'scripts/build-python.sh',
      cpp: 'scripts/build-cpp.sh',
      rust: 'cargo build --release',
    };
    const command = cmdMap[lang];
    if (command) {
      window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: command }));
    }
  },
  runLintCommand: (lang: typeof SUPPORTED_LANGUAGES[number]) => {
    const lintMap: Record<string, string> = {
      python: 'flake8 .',
      cpp: 'cppcheck .',
      rust: 'cargo clippy',
    };
    const command = lintMap[lang];
    if (command) {
      window.dispatchEvent(new CustomEvent('cipher-terminal-command', { detail: command }));
    }
  },
  // Profile
  appProfile: 'developer',
  setAppProfile: (profile) => set({ appProfile: profile }),
  cipherProduct: 'studio',
  setCipherProduct: (product) => set({ cipherProduct: product }),

  // Folder
  currentFolder: null,
  setCurrentFolder: (folder) => {
    set({ currentFolder: folder });
    if (folder) {
      get().refreshGitStatus();
      
      // Restore previously open tabs for this folder (filter out deleted files)
      try {
        const stored = localStorage.getItem(`cipher-tabs-${folder}`)
        if (stored) {
          const { tabs, activeTabPath } = JSON.parse(stored)
          const validTabs = tabs
          const validActive = validTabs.find((t: { path: string }) => t.path === activeTabPath)
            ? activeTabPath
            : validTabs[0]?.path ?? null
          set({ tabs: validTabs, activeTabPath: validActive })
        } else {
          set({ tabs: [], activeTabPath: null })
        }
      } catch (e) {
        console.error('Failed to restore tabs:', e)
      }
    } else {
      set({ gitStatusMap: {}, tabs: [], activeTabPath: null });
    }
  },

  // Tabs
  tabs: [],
  activeTabPath: null,
  activeFileContent: null,
  addTab: (tab) => set((state) => {
    const nextTabs = state.tabs.find(t => t.path === tab.path)
      ? state.tabs
      : [...state.tabs, tab]
    
    if (state.currentFolder) {
      localStorage.setItem(
        `cipher-tabs-${state.currentFolder}`,
        JSON.stringify({ tabs: nextTabs, activeTabPath: tab.path })
      )
    }
    return {
      tabs: nextTabs,
      activeTabPath: tab.path
    }
  }),
  removeTab: (path) => set((state) => {
    const newTabs = state.tabs.filter(t => t.path !== path)
    const newActive = state.activeTabPath === path
      ? newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null
      : state.activeTabPath
    if (state.currentFolder) {
      localStorage.setItem(
        `cipher-tabs-${state.currentFolder}`,
        JSON.stringify({ tabs: newTabs, activeTabPath: newActive })
      )
    }
    return { tabs: newTabs, activeTabPath: newActive, activeFileContent: null }
  }),
  setActiveTab: (path) => set((state) => {
    if (state.currentFolder) {
      localStorage.setItem(
        `cipher-tabs-${state.currentFolder}`,
        JSON.stringify({ tabs: state.tabs, activeTabPath: path })
      )
    }
    return { activeTabPath: path }
  }),
  setActiveFileContent: (content) => set({ activeFileContent: content }),
  updateTabModified: (path, modified) => set((state) => ({
    tabs: state.tabs.map(t => t.path === path ? { ...t, modified } : t)
  })),

  // Sidebar
  sidebarPanel: 'files',
  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),

  // Terminal
  terminalVisible: false,
  setTerminalVisible: (visible) => set({ terminalVisible: visible }),
  bottomPanel: 'terminal',
  setBottomPanel: (panel) => set({ bottomPanel: panel, terminalVisible: true }),
  editorSplitDirection: 'single',
  setEditorSplitDirection: (direction) => set((state) => {
    if (direction === 'single') {
      return { editorSplitDirection: direction, activeEditorGroup: 'main', splitActiveTabPath: null }
    }
    const alternateTab = state.tabs.find(tab => tab.path !== state.activeTabPath)
    return {
      editorSplitDirection: direction,
      activeEditorGroup: 'split',
      splitActiveTabPath: state.splitActiveTabPath || alternateTab?.path || state.activeTabPath,
    }
  }),
  activeEditorGroup: 'main',
  setActiveEditorGroup: (group) => set({ activeEditorGroup: group }),
  splitActiveTabPath: null,
  setSplitActiveTab: (path) => set({ splitActiveTabPath: path, activeEditorGroup: 'split' }),
  terminals: [],
  activeTerminalId: null,
  addTerminal: (t) => set((state) => ({
    terminals: [...state.terminals, t],
    activeTerminalId: t.id
  })),
  removeTerminal: (id) => set((state) => {
    const newTerminals = state.terminals.filter(t => t.id !== id)
    return {
      terminals: newTerminals,
      activeTerminalId: newTerminals.length > 0
        ? newTerminals[newTerminals.length - 1].id
        : null
    }
  }),
  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  // AI
  aiMode: 'chat' as 'chat' | 'plan' | 'dev' | 'composer',
  setAiMode: (mode) => set({ aiMode: mode }),
  aiModel: 'openrouter:deepseek/deepseek-chat-v4',
  setAiModel: (model) => set({ aiModel: model }),
  aiDevModel: 'ollama:qwen-3.7-coder:7b',
  setAiDevModel: (model) => set({ aiDevModel: model }),
  customModels: JSON.parse(localStorage.getItem('cipher-custom-models') || '[]'),
  addCustomModel: (model) => set((state) => {
    const updated = [...state.customModels, model]
    localStorage.setItem('cipher-custom-models', JSON.stringify(updated))
    return { customModels: updated }
  }),
  removeCustomModel: (index) => set((state) => {
    const updated = state.customModels.filter((_, i) => i !== index)
    localStorage.setItem('cipher-custom-models', JSON.stringify(updated))
    return { customModels: updated }
  }),

  // Project memory
  projectMemory: null,
  setProjectMemory: (memory) => set({ projectMemory: memory }),

  // Focus mode
  focusMode: false,
  setFocusMode: (v) => set({ focusMode: v }),
  toggleFocusMode: () => set(state => ({ focusMode: !state.focusMode })),

  // Key bindings
  keyBindings: loadKeyBindings(),
  setKeyBinding: (id, key) => set(state => {
    const updated = state.keyBindings.map(kb => kb.id === id ? { ...kb, currentKey: key } : kb)
    const savedMap = Object.fromEntries(updated.map(kb => [kb.id, kb.currentKey]))
    localStorage.setItem('cipher-keybindings', JSON.stringify(savedMap))
    return { keyBindings: updated }
  }),
  resetKeyBindings: () => set(() => {
    localStorage.removeItem('cipher-keybindings')
    return { keyBindings: DEFAULT_KEYBINDINGS }
  }),

  // Editor markers
  editorMarkers: [],
  setEditorMarkers: (markers) => set({ editorMarkers: markers }),

  // Git
  gitBranch: 'main',
  setGitBranch: (branch) => set({ gitBranch: branch }),
  gitStatusMap: {},
  refreshGitStatus: async () => {
    const folder = get().currentFolder
    if (!folder) return
    // Perf: run git-status fetching in a non-blocking macrotask callback
    setTimeout(async () => {
      try {
        const statusList = await window.cipher.gitStatus(folder)
        const map: Record<string, string> = {}
        for (const item of statusList) {
          // Normalize slashes to make relative path lookup match renderer path joins
          const normalizedFile = item.file.replace(/\\/g, '/')
          map[normalizedFile] = item.status
        }
        set({ gitStatusMap: map })
      } catch (e) {
        console.error('Failed to refresh git status:', e)
      }
    }, 50)
  },

  // Theme
  themeId: (() => {
    const id = loadThemeId()
    const theme = BUILT_IN_THEMES.find(t => t.id === id) || BUILT_IN_THEMES[0]
    // Apply immediately so no flash on load
    applyTheme(theme)
    return theme.id
  })(),
  setTheme: (id) => {
    const theme = BUILT_IN_THEMES.find(t => t.id === id) || BUILT_IN_THEMES[0]
    applyTheme(theme)
    localStorage.setItem('cipher-theme-id', theme.id)
    set({ themeId: theme.id })
  },

  // Change history
  changeHistory: loadHistory(),
  pushChangeEntry: (filePath, fileName, snapshot) => set(state => {
    const trimmedSnapshot = snapshot.slice(0, MAX_SNAPSHOT_SIZE)
    const entry: ChangeEntry = {
      id: `${filePath}-${Date.now()}`,
      filePath,
      fileName,
      savedAt: Date.now(),
      snapshot: trimmedSnapshot,
    }
    // Keep last MAX_HISTORY_PER_FILE entries per file
    const others = state.changeHistory.filter(e => e.filePath !== filePath)
    const forFile = state.changeHistory
      .filter(e => e.filePath === filePath)
      .concat(entry)
      .slice(-MAX_HISTORY_PER_FILE)
    const updated = [...others, ...forFile].sort((a, b) => b.savedAt - a.savedAt)
    saveHistory(updated)
    return { changeHistory: updated }
  }),
  clearFileHistory: (filePath) => set(state => {
    const updated = state.changeHistory.filter(e => e.filePath !== filePath)
    saveHistory(updated)
    return { changeHistory: updated }
  }),
  clearAllHistory: () => {
    localStorage.removeItem('cipher-change-history')
    set({ changeHistory: [] })
  },

  // Code notes
  notes: (() => {
    try {
      return JSON.parse(localStorage.getItem('cipher-code-notes') || '[]')
    } catch {
      return []
    }
  })(),
  addNote: (filePath, line, content) => set((state) => {
    const newNote: CodeNote = {
      id: `${filePath}-${line}-${Date.now()}`,
      filePath,
      line,
      content,
      createdAt: Date.now()
    }
    const updated = [...state.notes, newNote]
    localStorage.setItem('cipher-code-notes', JSON.stringify(updated))
    return { notes: updated }
  }),
  editNote: (id, content) => set((state) => {
    const updated = state.notes.map(n => n.id === id ? { ...n, content } : n)
    localStorage.setItem('cipher-code-notes', JSON.stringify(updated))
    return { notes: updated }
  }),
  deleteNote: (id) => set((state) => {
    const updated = state.notes.filter(n => n.id !== id)
    localStorage.setItem('cipher-code-notes', JSON.stringify(updated))
    return { notes: updated }
  }),
}))
