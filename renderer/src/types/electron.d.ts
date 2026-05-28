export interface CipherAPI {
  // File system
  openFolder: () => Promise<string | null>
  readDirectory: (path: string) => Promise<FileItem[]>
  readFile: (path: string) => Promise<string>
  saveFile: (path: string, content: string) => Promise<boolean>
  ollamaList: () => Promise<OllamaModel[]>

  // Terminal
  terminalCreate: (cwd?: string) => Promise<number>
  terminalInput: (id: number, data: string) => void
  terminalResize: (id: number, cols: number, rows: number) => void
  terminalKill: (id: number) => Promise<boolean>
  onTerminalData: (callback: (id: number, data: string) => void) => () => void
  onTerminalExit: (callback: (id: number, exitCode: number) => void) => () => void

  // Window
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  isMaximized: () => Promise<boolean>
  openExternal: (url: string) => Promise<boolean>

  // Git
  gitStatus: (folderPath: string) => Promise<GitStatus[]>
  gitBranch: (folderPath: string) => Promise<string>
  gitCommit: (folderPath: string, message: string) => Promise<GitResult>
  gitPush: (folderPath: string) => Promise<GitResult>
  gitPull: (folderPath: string) => Promise<GitResult>
  gitLog: (folderPath: string) => Promise<string>

  // AI
  aiChat: (params: AIChatParams) => Promise<AIChatResult>
  aiCliCheck: (tool: 'claude' | 'codex') => Promise<AICliCheckResult>
  aiCliRun: (params: AICliRunParams) => Promise<AIChatResult>
}

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
}

export interface OllamaModel {
  name: string
  size: number
}

export interface GitStatus {
  status: string
  file: string
}

export interface GitResult {
  success: boolean
  error?: string
}

export interface AIChatParams {
  model: string
  apiKey: string
  messages: ChatMessage[]
  context?: string | null
  systemPrompt?: string
}

export interface AIChatResult {
  text?: string
  error?: string
}

export interface AICliCheckResult {
  installed: boolean
  version?: string
  error?: string
}

export interface AICliRunParams {
  tool: 'claude' | 'codex'
  prompt: string
  cwd?: string | null
  model?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

declare global {
  interface Window {
    cipher: CipherAPI
  }
}
