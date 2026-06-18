export interface CipherAPI {
  // ── Platform ──────────────────────────────────────────
  platform: 'win32' | 'darwin' | 'linux'

  // ── AI (streaming) ───────────────────────────────────
  aiStreamStart: (params: AIStreamParams) => void
  aiStreamAbort: (streamId: string) => void
  onAiStreamToken: (callback: (streamId: string, token: string) => void) => () => void
  onAiStreamEnd: (callback: (streamId: string) => void) => () => void
  onAiStreamError: (callback: (streamId: string, message: string) => void) => () => void

  // ── AI inline completion ─────────────────────────────
  aiComplete: (params: AICompleteParams) => Promise<AICompleteResult>

  // ── AI (sin streaming, solo para test-model) ─────────
  aiChat: (params: AIChatParams) => Promise<AIChatResult>

  // ── Claude Code / Codex CLI ──────────────────────────
  aiCliCheck: (tool: 'claude' | 'codex') => Promise<AICliCheckResult>
  aiCliRun: (params: AICliRunParams) => Promise<AIChatResult>

  // ── Project memory ───────────────────────────────────
  memoryExists: (folderPath: string) => Promise<boolean>
  memoryRead: (folderPath: string) => Promise<{ content: string } | { error: string }>
  memoryWrite: (folderPath: string, content: string) => Promise<{ ok: true } | { error: string }>
  projectScan: (folderPath: string, maxFiles?: number) => Promise<{ files: FileSnippet[] } | { error: string }>

  // ── File system ──────────────────────────────────────
  openFolder: () => Promise<string | null>
  searchInFilesNative: (folderPath: string, query: string, caseInsensitive?: boolean, maxResults?: number) => Promise<{ file: string; line: number; column: number; text: string }[]>
  readDirectory: (path: string) => Promise<FileItem[]>
  readFile: (path: string) => Promise<string>
  readFileDataUrl: (path: string) => Promise<FileDataResult>
  saveFile: (path: string, content: string) => Promise<boolean>
  portsList: () => Promise<PortInfo[]>
  cloudStatus: () => Promise<CloudStatus>
  ollamaList: (url?: string) => Promise<OllamaModel[]>
  lmstudioList: (url?: string) => Promise<LMStudioModel[]>

  // ── Terminal ─────────────────────────────────────────
  terminalCreate: (options?: string | TerminalCreateOptions) => Promise<number>
  terminalInput: (id: number, data: string) => void
  terminalResize: (id: number, cols: number, rows: number) => void
  terminalKill: (id: number) => Promise<boolean>
  onTerminalData: (callback: (id: number, data: string) => void) => () => void
  onTerminalExit: (callback: (id: number, exitCode: number) => void) => () => void

  // ── Window ───────────────────────────────────────────
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  isMaximized: () => Promise<boolean>
  openExternal: (url: string) => Promise<boolean>
  /** Register a listener for theme toggle IPC messages */
  onThemeToggle: (callback: () => void) => () => void

  // ── Git ──────────────────────────────────────────────
  gitStatus: (folderPath: string) => Promise<GitStatus[]>
  gitBranch: (folderPath: string) => Promise<string>
  gitCommit: (folderPath: string, message: string) => Promise<GitResult>
  gitPush: (folderPath: string) => Promise<GitResult>
  gitPull: (folderPath: string) => Promise<GitResult>
  gitLog: (folderPath: string) => Promise<string>

  // ── Startup & Drag / Drop File Associated Open ──────────────────────────
  getStartupPath: () => Promise<{ folderPath: string; filePath: string | null } | null>
  onOpenPathRequest: (callback: (data: { folderPath: string; filePath: string | null }) => void) => () => void
  getAppProfile: () => Promise<'common' | 'developer' | null>

  // ── Database (SQL Viewer) ─────────────────────────────
  dbConnect: (params: any) => Promise<{ connId: string; error?: string }>
  dbDisconnect: (connId: string) => Promise<{ error?: string }>
  dbSchema: (connId: string) => Promise<{ schema: any[]; error?: string }>
  dbQuery: (connId: string, sql: string) => Promise<{ rows: any[]; error?: string }>
}

// ── AI types ─────────────────────────────────────────────

export interface AIStreamParams {
  streamId: string
  model: string
  apiKey: string
  messages: ChatMessage[]
  context?: string | null
  systemPrompt?: string
  webSearch?: boolean
  thinking?: boolean
  ollamaUrl?: string
  lmstudioUrl?: string
  attachments?: {
    name: string
    type: string
    data: string
  }[]
}

export interface AICompleteParams {
  model: string
  apiKey: string
  prefix: string
  suffix: string
  language: string
  systemPrompt?: string
  ollamaUrl?: string
  lmstudioUrl?: string
}

export interface AICompleteResult {
  text: string
  error?: string
}

export interface AIChatParams {
  model: string
  apiKey: string
  messages: ChatMessage[]
  context?: string | null
  systemPrompt?: string
  ollamaUrl?: string
  lmstudioUrl?: string
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

// ── File system types ────────────────────────────────────

export interface FileSnippet {
  path: string
  content: string
}

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
}

export interface FileDataResult {
  name: string
  mime: string
  size: number
  dataUrl: string
}

export interface TerminalCreateOptions {
  cwd?: string
  profile?: 'powershell' | 'cmd' | 'git-bash' | 'wsl' | 'zsh' | 'bash' | 'sh' | 'fish' | 'system'
}

export interface PortInfo {
  port: number
  host: string
  pid: string
  protocol: string
  url: string
}

export interface CloudCliStatus {
  installed: boolean
  version?: string
}

export interface CloudStatus {
  azure: CloudCliStatus
  gcp: CloudCliStatus
  aws: CloudCliStatus
}

export interface OllamaModel {
  name: string
  size: number
}

export interface LMStudioModel {
  id: string
  object: string
}

// ── Git types ────────────────────────────────────────────

export interface GitStatus {
  status: string
  file: string
}

export interface GitResult {
  success: boolean
  error?: string
}

// ── Global ───────────────────────────────────────────────

declare global {
  interface Window {
    cipher: CipherAPI
  }
}
