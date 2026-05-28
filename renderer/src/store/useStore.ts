import { create } from 'zustand'

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
}

interface CustomModel {
  name: string
  provider: string
  modelId: string
  url?: string
  key?: string
}

interface AppState {
  // Folder
  currentFolder: string | null
  setCurrentFolder: (folder: string | null) => void

  // Tabs
  tabs: Tab[]
  activeTabPath: string | null
  addTab: (tab: Tab) => void
  removeTab: (path: string) => void
  setActiveTab: (path: string) => void
  updateTabModified: (path: string, modified: boolean) => void

  // Sidebar
  sidebarPanel: 'files' | 'search' | 'git' | 'ai' | 'settings' | null
  setSidebarPanel: (panel: 'files' | 'search' | 'git' | 'ai' | 'settings' | null) => void

  // Terminal
  terminalVisible: boolean
  setTerminalVisible: (visible: boolean) => void
  bottomPanel: 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'azure'
  setBottomPanel: (panel: 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'azure') => void
  terminals: TerminalInstance[]
  activeTerminalId: number | null
  addTerminal: (t: TerminalInstance) => void
  removeTerminal: (id: number) => void
  setActiveTerminal: (id: number) => void

  // AI
  aiMode: 'chat' | 'plan' | 'dev'
  setAiMode: (mode: 'chat' | 'plan' | 'dev') => void
  aiModel: string
  setAiModel: (model: string) => void
  aiDevModel: string
  setAiDevModel: (model: string) => void
  customModels: CustomModel[]
  addCustomModel: (model: CustomModel) => void
  removeCustomModel: (index: number) => void

  // Git
  gitBranch: string
  setGitBranch: (branch: string) => void
}

export const useStore = create<AppState>((set) => ({
  // Folder
  currentFolder: null,
  setCurrentFolder: (folder) => set({ currentFolder: folder }),

  // Tabs
  tabs: [],
  activeTabPath: null,
  addTab: (tab) => set((state) => ({
    tabs: state.tabs.find(t => t.path === tab.path)
      ? state.tabs
      : [...state.tabs, tab],
    activeTabPath: tab.path
  })),
  removeTab: (path) => set((state) => {
    const newTabs = state.tabs.filter(t => t.path !== path)
    const newActive = state.activeTabPath === path
      ? newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null
      : state.activeTabPath
    return { tabs: newTabs, activeTabPath: newActive }
  }),
  setActiveTab: (path) => set({ activeTabPath: path }),
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
  aiMode: 'chat',
  setAiMode: (mode) => set({ aiMode: mode }),
  aiModel: 'openrouter:deepseek/deepseek-chat-v3-0324:free',
  setAiModel: (model) => set({ aiModel: model }),
  aiDevModel: 'ollama:qwen2.5-coder:7b',
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

  // Git
  gitBranch: 'main',
  setGitBranch: (branch) => set({ gitBranch: branch }),
}))
