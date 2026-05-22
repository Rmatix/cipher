const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const pty = require('node-pty')

let mainWindow = null
const terminals = new Map() // id -> ptyProcess
let terminalIdCounter = 0

function createWindow() {
  mainWindow = new BrowserWindow({
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
    frame: false,
    title: 'Cipher Code Editor',
    backgroundColor: '#0d0d1a'
  })

  mainWindow.loadFile('src/renderer/index.html')
}

// ── Terminal management ──────────────────────────────────

function createTerminal(cwd) {
  const id = ++terminalIdCounter
  const isWin = os.platform() === 'win32'
  const shell = isWin ? 'powershell.exe' : 'bash'
  const args = isWin ? ['-NoLogo'] : []
  const spawnCwd = cwd || process.env.HOME || process.env.USERPROFILE

  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: spawnCwd,
    env: process.env
  })

  ptyProcess.onData(data => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-data', id, data)
    }
  })

  ptyProcess.onExit(({ exitCode }) => {
    terminals.delete(id)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-exit', id, exitCode)
    }
  })

  terminals.set(id, ptyProcess)
  return id
}

// Create a new terminal
ipcMain.handle('terminal-create', (event, cwd) => {
  return createTerminal(cwd)
})

// Write data to a terminal
ipcMain.on('terminal-input', (event, id, data) => {
  const proc = terminals.get(id)
  if (proc) proc.write(data)
})

// Resize a terminal
ipcMain.on('terminal-resize', (event, id, cols, rows) => {
  const proc = terminals.get(id)
  if (proc) {
    try {
      proc.resize(cols, rows)
    } catch (e) {
      // ignore resize errors on dead terminals
    }
  }
})

// Kill a terminal
ipcMain.handle('terminal-kill', (event, id) => {
  const proc = terminals.get(id)
  if (proc) {
    proc.kill()
    terminals.delete(id)
  }
  return true
})

// Window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
})

// ── File system operations ───────────────────────────────

// Abrir carpeta
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// Leer directorio
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

// Leer archivo
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
})

// Guardar archivo
ipcMain.handle('save-file', async (event, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})

// ── Git operations ──────────────────────────────────────

const { execSync } = require('child_process')

ipcMain.handle('git-status', async (event, folderPath) => {
  try {
    const output = execSync('git status --short', { cwd: folderPath, encoding: 'utf-8' })
    return output.split('\n').filter(line => line.trim()).map(line => {
      const status = line.substring(0, 2).trim()
      const file = line.substring(3)
      return { status, file }
    })
  } catch (e) {
    return []
  }
})

ipcMain.handle('git-branch', async (event, folderPath) => {
  try {
    const output = execSync('git branch --show-current', { cwd: folderPath, encoding: 'utf-8' })
    return output.trim()
  } catch (e) {
    return 'unknown'
  }
})

ipcMain.handle('git-commit', async (event, folderPath, message) => {
  try {
    execSync(`git add .`, { cwd: folderPath })
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: folderPath })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('git-push', async (event, folderPath) => {
  try {
    execSync('git push', { cwd: folderPath })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('git-pull', async (event, folderPath) => {
  try {
    execSync('git pull', { cwd: folderPath })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('git-log', async (event, folderPath) => {
  try {
    const output = execSync('git log --oneline -n 10', { cwd: folderPath, encoding: 'utf-8' })
    return output
  } catch (e) {
    return ''
  }
})

// ── App lifecycle ────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Kill all terminal processes
  for (const [id, proc] of terminals) {
    try { proc.kill() } catch (e) {}
  }
  terminals.clear()
  if (process.platform !== 'darwin') app.quit()
})