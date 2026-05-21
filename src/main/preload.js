const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cipher', {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  saveFile: (path, content) => ipcRenderer.invoke('save-file', path, content)
})