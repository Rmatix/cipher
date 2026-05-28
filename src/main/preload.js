const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cipher', {
  aiChat: (params) => ipcRenderer.invoke('ai-chat', params),
  aiCliCheck: (tool) => ipcRenderer.invoke('ai-cli-check', tool),
  aiCliRun: (params) => ipcRenderer.invoke('ai-cli-run', params),
  // File system
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  saveFile: (path, content) => ipcRenderer.invoke('save-file', path, content),
  ollamaList: () => ipcRenderer.invoke('ollama-list'),
  // Terminal
  terminalCreate: (cwd) => ipcRenderer.invoke('terminal-create', cwd),
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

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Git operations
  gitStatus: (folderPath) => ipcRenderer.invoke('git-status', folderPath),
  gitBranch: (folderPath) => ipcRenderer.invoke('git-branch', folderPath),
  gitCommit: (folderPath, message) => ipcRenderer.invoke('git-commit', folderPath, message),
  gitPush: (folderPath) => ipcRenderer.invoke('git-push', folderPath),
  gitPull: (folderPath) => ipcRenderer.invoke('git-pull', folderPath),
  gitLog: (folderPath) => ipcRenderer.invoke('git-log', folderPath),
})
