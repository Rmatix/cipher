const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cipher', {
  // ── Platform ──────────────────────────────────────────
  platform: process.platform,

  // ── AI (streaming) ───────────────────────────────────
  aiStreamStart: (params) => ipcRenderer.send('ai-stream-start', params),
  aiStreamAbort: (streamId) => ipcRenderer.send('ai-stream-abort', streamId),
  onAiStreamToken: (callback) => {
    const listener = (event, streamId, token) => callback(streamId, token)
    ipcRenderer.on('ai-stream-token', listener)
    return () => ipcRenderer.removeListener('ai-stream-token', listener)
  },
  onAiStreamEnd: (callback) => {
    const listener = (event, streamId) => callback(streamId)
    ipcRenderer.on('ai-stream-end', listener)
    return () => ipcRenderer.removeListener('ai-stream-end', listener)
  },
  onAiStreamError: (callback) => {
    const listener = (event, streamId, message) => callback(streamId, message)
    ipcRenderer.on('ai-stream-error', listener)
    return () => ipcRenderer.removeListener('ai-stream-error', listener)
  },

  // ── AI inline completion ─────────────────────────────
  aiComplete: (params) => ipcRenderer.invoke('ai-complete', params),

  // ── AI (sin streaming, solo para test-model) ─────────
  aiChat: (params) => ipcRenderer.invoke('ai-chat', params),

  // ── Claude Code / Codex CLI ──────────────────────────
  aiCliCheck: (tool) => ipcRenderer.invoke('ai-cli-check', tool),
  aiCliRun: (params) => ipcRenderer.invoke('ai-cli-run', params),

  // ── Project memory ───────────────────────────────────
  memoryExists: (folderPath) => ipcRenderer.invoke('memory-exists', folderPath),
  memoryRead: (folderPath) => ipcRenderer.invoke('memory-read', folderPath),
  memoryWrite: (folderPath, content) => ipcRenderer.invoke('memory-write', folderPath, content),
  projectScan: (folderPath, maxFiles) => ipcRenderer.invoke('project-scan', folderPath, maxFiles),

  // ── File system ──────────────────────────────────────
  openFolder: () => ipcRenderer.invoke('open-folder'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  searchInFilesNative: (folderPath, query, caseInsensitive, maxResults) => 
    ipcRenderer.invoke('search-in-files-native', folderPath, query, caseInsensitive, maxResults),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  readFileDataUrl: (path) => ipcRenderer.invoke('read-file-data-url', path),
  saveFile: (path, content) => ipcRenderer.invoke('save-file', path, content),
  portsList: () => ipcRenderer.invoke('ports-list'),
  cloudStatus: () => ipcRenderer.invoke('cloud-status'),
  ollamaList: (url) => ipcRenderer.invoke('ollama-list', url),
  lmstudioList: (url) => ipcRenderer.invoke('lmstudio-list', url),

  // ── Terminal ─────────────────────────────────────────
  terminalCreate: (options) => ipcRenderer.invoke('terminal-create', options),
  terminalInput: (id, data) => ipcRenderer.send('terminal-input', id, data),
  terminalResize: (id, cols, rows) => ipcRenderer.send('terminal-resize', id, cols, rows),
  terminalKill: (id) => ipcRenderer.invoke('terminal-kill', id),
  onTerminalData: (callback) => {
    const listener = (event, id, data) => callback(id, data)
    ipcRenderer.on('terminal-data', listener)
    return () => ipcRenderer.removeListener('terminal-data', listener)
  },
  onTerminalExit: (callback) => {
    const listener = (event, id, exitCode) => callback(id, exitCode)
    ipcRenderer.on('terminal-exit', listener)
    return () => ipcRenderer.removeListener('terminal-exit', listener)
  },

  // ── Window controls ──────────────────────────────────
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openDevTools: () => ipcRenderer.send('open-devtools'),

  // ── Git ──────────────────────────────────────────────────────────────────
  gitStatus: (folderPath) => ipcRenderer.invoke('git-status', folderPath),
  gitBranch: (folderPath) => ipcRenderer.invoke('git-branch', folderPath),
  gitCommit: (folderPath, message) => ipcRenderer.invoke('git-commit', folderPath, message),
  gitPush: (folderPath) => ipcRenderer.invoke('git-push', folderPath),
  gitPull: (folderPath) => ipcRenderer.invoke('git-pull', folderPath),
  gitLog: (folderPath) => ipcRenderer.invoke('git-log', folderPath),

  // ── Startup & Drag / Drop File Associated Open ──────────────────────────
  getStartupPath: () => ipcRenderer.invoke('get-startup-path'),
  getAppProfile: () => ipcRenderer.invoke('get-app-profile'),
  getCipherProduct: () => ipcRenderer.invoke('get-cipher-product'),
  onOpenPathRequest: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('open-path-request', listener)
    return () => ipcRenderer.removeListener('open-path-request', listener)
  },

  // ── Database (SQL Viewer) ─────────────────────────────────────────────────
  dbConnect:    (params)                    => ipcRenderer.invoke('db:connect',     params),
  dbDisconnect: (params)                    => ipcRenderer.invoke('db:disconnect',  params),
  dbSchema:     (params)                    => ipcRenderer.invoke('db:schema',      params),
  dbQuery:      (params)                    => ipcRenderer.invoke('db:query',       params),
  dbUpdateRow:  (params)                    => ipcRenderer.invoke('db:update-row',  params),
  dbInsertRow:  (params)                    => ipcRenderer.invoke('db:insert-row',  params),
  dbDeleteRow:  (params)                    => ipcRenderer.invoke('db:delete-row',  params),
  dbCreateSqlite:(params)                    => ipcRenderer.invoke('db:create-sqlite',params),
})

