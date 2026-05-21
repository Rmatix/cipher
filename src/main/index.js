const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../renderer/assets/logo.ico'),
    webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, 'preload.js')
},
    frame: true,
    title: 'Cipher Code Editor',
    backgroundColor: '#0d0d1a'
  })

  win.loadFile('src/renderer/index.html')
}

// Abrir diálogo de carpeta
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// Leer contenido de una carpeta
ipcMain.handle('read-directory', async (event, folderPath) => {
  const items = fs.readdirSync(folderPath, { withFileTypes: true })
  return items.map(item => ({
    name: item.name,
    isDirectory: item.isDirectory(),
    path: path.join(folderPath, item.name)
  })).sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
})

// Leer contenido de un archivo
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
})

// Guardar archivo
ipcMain.handle('save-file', async (event, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})