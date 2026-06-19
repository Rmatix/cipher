const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { registerDbHandlers } = require('./db-bridge')
const { initUpdater } = require('./updater')


let mainWindow = null
let native = null
try {
  native = require('../../index.node')
} catch (e) {
  console.error('Failed to load native Rust module:', e)
}
const terminals = new Map()
let terminalIdCounter = 0
const allowedRoots = new Set()

let pendingOpenPath = null

function parseArgPath(argv) {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg || arg.startsWith('-')) continue
    // Skip electron/Vite main process scripts and dot
    if (arg.includes('index.js') || arg.includes('main') || arg === '.') continue
    try {
      if (fs.existsSync(arg)) {
        const absolutePath = path.resolve(arg)
        const stat = fs.statSync(absolutePath)
        if (stat.isDirectory()) {
          return { folderPath: absolutePath, filePath: null }
        } else if (stat.isFile()) {
          return { folderPath: path.dirname(absolutePath), filePath: absolutePath }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return null
}

// Parse initial arguments asynchronously
const startupPathPromise = (async () => {
  try {
    const parsed = parseArgPath(process.argv)
    if (parsed) {
      allowedRoots.add(parsed.folderPath)
      pendingOpenPath = parsed
    } else {
      const configPath = path.join(app.getPath('userData'), 'cipher-config.json')
      const exists = await fs.promises.access(configPath).then(() => true).catch(() => false)
      if (exists) {
        const content = await fs.promises.readFile(configPath, 'utf-8')
        const config = JSON.parse(content)
        if (config && config.lastOpenedFolder) {
          const folderExists = await fs.promises.access(config.lastOpenedFolder).then(() => true).catch(() => false)
          if (folderExists) {
            const lastFolder = path.resolve(config.lastOpenedFolder)
            allowedRoots.add(lastFolder)
            pendingOpenPath = { folderPath: lastFolder, filePath: null }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to load last workspace config:', e)
  }
  return pendingOpenPath
})()

// Single instance lock to prevent multiple windows
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      
      const openPath = parseArgPath(argv)
      if (openPath) {
        allowedRoots.add(openPath.folderPath)
        saveLastFolder(openPath.folderPath)
        mainWindow.webContents.send('open-path-request', openPath)
      }
    }
  })
}
function normalizeFsPath(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') {
    throw new Error('Ruta invalida')
  }
  return path.resolve(inputPath)
}

function saveLastFolder(folderPath) {
  try {
    const configPath = path.join(app.getPath('userData'), 'cipher-config.json')
    fs.writeFileSync(configPath, JSON.stringify({ lastOpenedFolder: folderPath }), 'utf-8')
  } catch (e) {
    console.error('Failed to save last opened workspace folder:', e)
  }
}

function rememberAllowedRoot(folderPath) {
  const norm = normalizeFsPath(folderPath)
  allowedRoots.add(norm)
  saveLastFolder(norm)
}

function isPathInside(parentPath, childPath) {
  const parent = normalizeFsPath(parentPath)
  const child = normalizeFsPath(childPath)
  const relative = path.relative(parent, child)
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
}

function requireAllowedPath(targetPath) {
  const resolved = normalizeFsPath(targetPath)
  for (const root of allowedRoots) {
    if (isPathInside(root, resolved)) return resolved
  }
  throw new Error('Ruta fuera de la carpeta abierta')
}

function resolveAllowedCwd(cwd) {
  if (cwd) return requireAllowedPath(cwd)
  const firstRoot = allowedRoots.values().next().value
  return firstRoot || process.env.USERPROFILE || process.env.HOME || os.homedir()
}

function mimeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const map = {
    '.aac': 'audio/aac',
    '.avif': 'image/avif',
    '.avi': 'video/x-msvideo',
    '.bmp': 'image/bmp',
    '.flac': 'audio/flac',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.m4a': 'audio/mp4',
    '.m4v': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.oga': 'audio/ogg',
    '.ogg': 'audio/ogg',
    '.ogv': 'video/ogg',
    '.opus': 'audio/opus',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
  }
  return map[ext] || 'application/octet-stream'
}

function requireHttpUrl(urlString) {
  const parsed = new URL(urlString)
  if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
    throw new Error('Protocolo externo no permitido')
  }
  return parsed.toString()
}

function isTrustedAppNavigation(urlString) {
  try {
    const parsed = new URL(urlString)
    if (process.env.NODE_ENV === 'development') {
      return parsed.origin === 'http://localhost:5173'
    }
    return parsed.protocol === 'file:'
  } catch {
    return false
  }
}

// Handle open-devtools IPC from renderer
ipcMain.on('open-devtools', () => {
  if (mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' })
})

function createWindow() {
  const isMac = os.platform() === 'darwin'
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, isMac ? '../../renderer/public/logo.png' : '../../renderer/public/logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    ...(isMac ? { titleBarStyle: 'hidden' } : {}),
    title: 'Cipher Code Editor',
    backgroundColor: '#0d0d1a'
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const isControl = process.platform === 'darwin' ? input.meta : input.control
      if (
        (isControl && input.shift && input.key.toLowerCase() === 'i') || // Ctrl+Shift+I
        input.key === 'F12' || // F12
        input.key === 'F2' // F2
      ) {
        mainWindow.webContents.openDevTools({ mode: 'detach' })
        event.preventDefault()
      }
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer-dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      shell.openExternal(requireHttpUrl(url))
    } catch {
      // Block unsupported external protocols.
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedAppNavigation(url)) {
      event.preventDefault()
    }
  })
}

// ── Terminal management ──────────────────────────────────

function resolveTerminalProfile(profile) {
  const isWin = os.platform() === 'win32'
  if (!isWin) {
    let shellPath = process.env.SHELL || (os.platform() === 'darwin' ? '/bin/zsh' : '/bin/bash')
    if (profile === 'zsh') {
      shellPath = '/bin/zsh'
    } else if (profile === 'bash') {
      shellPath = '/bin/bash'
    } else if (profile === 'sh') {
      shellPath = '/bin/sh'
    } else if (profile === 'fish') {
      const fishCandidates = ['/usr/local/bin/fish', '/usr/bin/fish', '/bin/fish']
      const foundFish = fishCandidates.find(candidate => fs.existsSync(candidate))
      if (foundFish) shellPath = foundFish
    }
    return { shell: shellPath, args: [], label: path.basename(shellPath) || 'shell' }
  }

  if (profile === 'cmd') return { shell: 'cmd.exe', args: [], label: 'cmd' }
  if (profile === 'wsl') return { shell: 'wsl.exe', args: [], label: 'wsl' }
  if (profile === 'git-bash') {
    const candidates = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs\\Git\\bin\\bash.exe') : null,
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData\\Local\\Programs\\Git\\bin\\bash.exe') : null,
      path.join(os.homedir(), 'AppData\\Local\\Programs\\Git\\bin\\bash.exe')
    ].filter(Boolean)
    const gitBash = candidates.find(candidate => fs.existsSync(candidate))
    if (gitBash) return { shell: gitBash, args: ['--login', '-i'], label: 'git-bash' }
  }
  return { shell: 'powershell.exe', args: ['-NoLogo'], label: 'powershell' }
}

function createTerminal(options = {}) {
  const pty = require('node-pty')
  const id = ++terminalIdCounter
  const cwd = typeof options === 'string' ? options : options.cwd
  const profile = typeof options === 'string' ? undefined : options.profile
  const terminalProfile = resolveTerminalProfile(profile)
  const spawnCwd = resolveAllowedCwd(cwd)

  const ptyProcess = pty.spawn(terminalProfile.shell, terminalProfile.args, {
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

ipcMain.handle('terminal-create', (event, options) => {
  return createTerminal(options)
})

ipcMain.on('terminal-input', (event, id, data) => {
  const proc = terminals.get(id)
  if (proc) proc.write(data)
})

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

ipcMain.handle('terminal-kill', (event, id) => {
  const proc = terminals.get(id)
  if (proc) {
    proc.kill()
    terminals.delete(id)
  }
  return true
})

// ── Window controls ──────────────────────────────────────

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

ipcMain.handle('get-startup-path', async () => {
  await startupPathPromise
  return pendingOpenPath
})

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(requireHttpUrl(url))
  return true
})

ipcMain.handle('get-app-profile', async () => {
  return 'developer' // Cipher Studio — always full feature set
})

ipcMain.handle('get-cipher-product', async () => {
  return 'studio'
})

// ── File system ──────────────────────────────────────────

ipcMain.handle('search-in-files-native', async (event, folderPath, query, caseInsensitive, maxResults) => {
  if (!native || !native.searchInFiles) {
    // Note: napi-rs exposes camelCase by default: searchInFiles, countLines, diffStrings, cleanCode
    // Let's check native/src/lib.rs function names. napi-rs automatically translates snake_case functions to camelCase unless specified!
    // Wait, let's verify if search_in_files is exposed as searchInFiles or search_in_files.
    // In Rust, it has `#[napi]` on `pub fn search_in_files`. Yes, napi-rs converts snake_case to camelCase in TS/JS by default!
    // So the function name is native.searchInFiles.
    throw new Error('Modulo nativo de Rust no disponible')
  }
  const safePath = requireAllowedPath(folderPath)
  return native.searchInFiles(safePath, query, caseInsensitive || false, maxResults || 500)
})

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  rememberAllowedRoot(result.filePaths[0])
  return result.filePaths[0]
})

ipcMain.handle('read-directory', async (event, folderPath) => {
  const safeFolderPath = requireAllowedPath(folderPath)
  const items = fs.readdirSync(safeFolderPath, { withFileTypes: true })
  return items.map(item => ({
    name: item.name,
    isDirectory: item.isDirectory(),
    path: path.join(safeFolderPath, item.name)
  })).sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
})

ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(requireAllowedPath(filePath), 'utf-8')
})

ipcMain.handle('read-file-data-url', async (event, filePath) => {
  const safePath = requireAllowedPath(filePath)
  const buffer = fs.readFileSync(safePath)
  const mime = mimeForFile(safePath)
  return {
    name: path.basename(safePath),
    mime,
    size: buffer.length,
    dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
  }
})

ipcMain.handle('save-file', async (event, filePath, content) => {
  fs.writeFileSync(requireAllowedPath(filePath), content, 'utf-8')
  return true
})

// ── Git ──────────────────────────────────────────────────

const { execFileSync } = require('child_process')

function parsePortsOutput(output) {
  const rows = []
  const seen = new Set()
  output.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    const match = trimmed.match(/^(tcp|tcp6)\s+\S+\s+\S+\s+(\S+):(\d+)\s+\S+\s+LISTEN(?:\s+(\d+|[-\w/.]+))?/i)
      || trimmed.match(/^TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)/i)
    if (!match) return

    const isWindowsMatch = trimmed.toUpperCase().startsWith('TCP')
    const host = isWindowsMatch ? match[1] : match[2]
    const port = Number(isWindowsMatch ? match[2] : match[3])
    const pid = isWindowsMatch ? match[3] : match[4]
    if (!port || seen.has(port)) return
    seen.add(port)
    rows.push({
      port,
      host: host === '*' || host === '::' ? 'localhost' : host.replace(/^\[|\]$/g, ''),
      pid: pid || '',
      protocol: 'http',
      url: `http://localhost:${port}`,
    })
  })
  return rows.sort((a, b) => a.port - b.port)
}

function listPorts() {
  try {
    if (os.platform() === 'win32') {
      return parsePortsOutput(execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf-8' }))
    }
    const command = os.platform() === 'darwin' ? 'lsof' : 'ss'
    const args = os.platform() === 'darwin'
      ? ['-nP', '-iTCP', '-sTCP:LISTEN']
      : ['-ltnp']
    return parsePortsOutput(execFileSync(command, args, { encoding: 'utf-8' }))
  } catch {
    return []
  }
}

function checkCli(command, args = ['--version']) {
  try {
    const version = execFileSync(command, args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return { installed: true, version: version.split(/\r?\n/)[0] || 'Instalado' }
  } catch {
    return { installed: false }
  }
}

ipcMain.handle('ports-list', async () => listPorts())

ipcMain.handle('cloud-status', async () => ({
  azure: checkCli('az'),
  gcp: checkCli('gcloud'),
  aws: checkCli('aws'),
}))

function stripProvider(model, provider) {
  return model.startsWith(`${provider}:`) ? model.replace(`${provider}:`, '') : model
}

// Parses a model string possibly in pipe-delimited format: "provider|endpointUrl|modelId"
// Returns { provider, modelId, baseUrl } or null if not a pipe format.
function parseProviderEndpoint(model) {
  if (!model.includes('|')) return null
  const parts = model.split('|')
  if (parts.length < 3) return null
  return {
    provider: parts[0],
    baseUrl: parts[1],
    modelId: parts.slice(2).join('|'),
  }
}

function decodeHtmlEntities(str) {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2f;/g, '/')
    .replace(/&#59;/g, ';')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
}

async function searchDuckDuckGo(query) {
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (!response.ok) {
      throw new Error(`DuckDuckGo HTTP ${response.status}`)
    }
    const html = await response.text()
    const results = []
    const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    
    let match
    let count = 0
    while ((match = regex.exec(html)) !== null && count < 5) {
      let url = match[1]
      if (url.startsWith('//')) {
        url = 'https:' + url
      }
      try {
        const urlObj = new URL(url)
        const uddg = urlObj.searchParams.get('uddg')
        if (uddg) url = uddg
      } catch {}

      if (url.includes('duckduckgo.com/l/?') && url.includes('ad_provider')) {
        continue
      }

      const title = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      const snippet = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      
      results.push({ title, url, snippet })
      count++
    }
    return results
  } catch (err) {
    console.error("DuckDuckGo search failed:", err)
    return []
  }
}

function toSystemPrompt(context, systemPrompt, options = {}) {
  const base = systemPrompt || 'Eres un asistente de codigo experto.'
  const contextSection = context
    ? `Contexto del archivo activo. Usa este codigo como referencia principal y no pidas al usuario que lo proporcione otra vez:\n\n${context}`
    : ''

  const extras = []
  if (contextSection) {
    extras.push(contextSection)
  }
  if (options.thinking) {
    extras.push('Modo razonamiento visible: si ayuda, incluye un bloque <thinking> con un resumen breve de tu enfoque antes de la respuesta final. No incluyas razonamiento privado paso a paso.')
  }
  if (options.webSearch) {
    if (options.webSearchResults && options.webSearchResults.length > 0) {
      const resultsStr = options.webSearchResults.map((r, i) => 
        `[${i + 1}] Título: ${r.title}\nURL: ${r.url}\nResumen: ${r.snippet}`
      ).join('\n\n')
      extras.push(`RESULTADOS DE BÚSQUEDA WEB RECIENTES:\n${resultsStr}\n\nUsa esta información para responder a las preguntas del usuario sobre temas de actualidad o información externa. Cita las fuentes (título y URL) si utilizas la información.`)
    } else {
      extras.push('La búsqueda web fue solicitada pero no se pudieron obtener resultados de DuckDuckGo en este momento.')
    }
  }

  return extras.length ? `${base}\n\n${extras.join('\n')}` : base
}

function openRouterTools(webSearch) {
  return webSearch ? [{ type: 'openrouter:web_search' }] : undefined
}

function formatOpenAIMessages(messages, attachments) {
  if (!attachments || attachments.length === 0) return messages
  const openaiMessages = [...messages]
  const lastMsg = openaiMessages[openaiMessages.length - 1]
  if (lastMsg && lastMsg.role === 'user') {
    const content = [{ type: 'text', text: lastMsg.content }]
    attachments.forEach(att => {
      if (att.type.startsWith('image/')) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${att.type};base64,${att.data}`
          }
        })
      }
    })
    openaiMessages[openaiMessages.length - 1] = { role: 'user', content }
  }
  return openaiMessages
}

ipcMain.handle('git-status', async (event, folderPath) => {
  try {
    const output = execFileSync('git', ['status', '--porcelain', '--ignored'], { cwd: requireAllowedPath(folderPath), encoding: 'utf-8' })
    return output.split('\n').filter(line => line.trim()).map(line => {
      const status = line.substring(0, 2).trim()
      const file = line.substring(3).trim()
      return { status, file }
    })
  } catch (e) {
    return []
  }
})

ipcMain.handle('git-branch', async (event, folderPath) => {
  try {
    const output = execFileSync('git', ['branch', '--show-current'], { cwd: requireAllowedPath(folderPath), encoding: 'utf-8' })
    return output.trim()
  } catch (e) {
    return 'unknown'
  }
})

ipcMain.handle('git-commit', async (event, folderPath, message) => {
  try {
    const safeCwd = requireAllowedPath(folderPath)
    execFileSync('git', ['add', '.'], { cwd: safeCwd })
    execFileSync('git', ['commit', '-m', String(message || '').slice(0, 500)], { cwd: safeCwd })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('git-push', async (event, folderPath) => {
  try {
    execFileSync('git', ['push'], { cwd: requireAllowedPath(folderPath) })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('git-pull', async (event, folderPath) => {
  try {
    execFileSync('git', ['pull'], { cwd: requireAllowedPath(folderPath) })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('git-log', async (event, folderPath) => {
  try {
    const output = execFileSync('git', ['log', '--oneline', '-n', '10'], { cwd: requireAllowedPath(folderPath), encoding: 'utf-8' })
    return output
  } catch (e) {
    return ''
  }
})

// ── AI Streaming ─────────────────────────────────────────
//
// Protocolo IPC de streaming:
//   renderer -> main : 'ai-stream-start'  { streamId, model, apiKey, messages, context, systemPrompt }
//   main -> renderer : 'ai-stream-token'  (streamId, token)
//   main -> renderer : 'ai-stream-end'    (streamId)
//   main -> renderer : 'ai-stream-error'  (streamId, errorMessage)
//   renderer -> main : 'ai-stream-abort'  (streamId)          -- cancela el stream activo
//
// También se mantiene 'ai-chat' (sin streaming) para test-model y compatibilidad.

const activeAborts = new Map() // streamId -> AbortController

function sendToken(streamId, token) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ai-stream-token', streamId, token)
  }
}

function sendEnd(streamId) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ai-stream-end', streamId)
  }
  activeAborts.delete(streamId)
}

function sendError(streamId, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ai-stream-error', streamId, message)
  }
  activeAborts.delete(streamId)
}

// Parsea un chunk de SSE y devuelve el texto delta o null
function extractDeltaOpenAI(line) {
  if (!line.startsWith('data: ')) return null
  const data = line.slice(6).trim()
  if (data === '[DONE]') return null
  try {
    const parsed = JSON.parse(data)
    return parsed.choices?.[0]?.delta?.content ?? null
  } catch {
    return null
  }
}

function extractDeltaAnthropic(line) {
  if (!line.startsWith('data: ')) return null
  const data = line.slice(6).trim()
  try {
    const parsed = JSON.parse(data)
    if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
      return parsed.delta.text ?? null
    }
    return null
  } catch {
    return null
  }
}

// Lee un ReadableStream de fetch y emite tokens via IPC
async function pipeStream(response, streamId, extractDelta, signal) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (signal?.aborted) break
        const delta = extractDelta(line)
        if (delta) sendToken(streamId, delta)
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

ipcMain.on('ai-stream-abort', (event, streamId) => {
  const controller = activeAborts.get(streamId)
  if (controller) {
    controller.abort()
    activeAborts.delete(streamId)
  }
})

ipcMain.on('ai-stream-start', async (event, { streamId, model, apiKey, messages, context, systemPrompt, webSearch = false, thinking = false, ollamaUrl, lmstudioUrl, attachments }) => {
  const controller = new AbortController()
  activeAborts.set(streamId, controller)
  const { signal } = controller

  let webSearchResults = null
  if (webSearch) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg && lastUserMsg.content) {
      let query = ''
      if (typeof lastUserMsg.content === 'string') {
        query = lastUserMsg.content
      } else if (Array.isArray(lastUserMsg.content)) {
        const textPart = lastUserMsg.content.find(p => p.type === 'text')
        if (textPart) query = textPart.text
      }
      if (query.trim()) {
        webSearchResults = await searchDuckDuckGo(query.trim())
      }
    }
  }

  const aiOptions = { 
    webSearch: Boolean(webSearch), 
    thinking: Boolean(thinking),
    webSearchResults
  }

  try {

    const parsedEndpoint = parseProviderEndpoint(model)

    // ── Anthropic ──────────────────────────────────────
    if (model.startsWith('claude') || model.startsWith('anthropic:') || parsedEndpoint?.provider === 'anthropic') {
      const anthropicModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'anthropic')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://api.anthropic.com/v1'
      let anthropicMessages = messages
      if (attachments && attachments.length > 0) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg && lastMsg.role === 'user') {
          const content = [{ type: 'text', text: lastMsg.content }]
          attachments.forEach(att => {
            if (att.type.startsWith('image/')) {
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: att.type,
                  data: att.data
                }
              })
            } else if (att.type === 'application/pdf') {
              content.push({
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: att.data
                }
              })
            }
          })
          anthropicMessages = [...messages.slice(0, -1), { role: 'user', content }]
        }
      }
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 4096,
          stream: true,
          system: toSystemPrompt(context, systemPrompt, aiOptions),
          messages: anthropicMessages
        }),
        signal
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaAnthropic, signal)
      return sendEnd(streamId)
    }

    // ── OpenAI ─────────────────────────────────────────
    if (model.startsWith('gpt') || model.startsWith('openai:') || /^o[1-9][-.]/.test(model) || parsedEndpoint?.provider === 'openai') {
      const openaiModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'openai')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://api.openai.com/v1'
      const systemMsg = toSystemPrompt(context, systemPrompt, aiOptions)
      const formattedMsgs = formatOpenAIMessages(messages, attachments)
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          stream: true,
          messages: [{ role: 'system', content: systemMsg }, ...formattedMsgs]
        }),
        signal
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaOpenAI, signal)
      return sendEnd(streamId)
    }

    // ── Google Gemini ──────────────────────────────────
    if (model.startsWith('gemini') || model.startsWith('google:') || parsedEndpoint?.provider === 'google') {
      const googleModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'google')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com'
      const sysPrefix = `${toSystemPrompt(context, systemPrompt, aiOptions)}\n\n`
      const prompt = sysPrefix + messages[messages.length - 1].content
      const parts = [{ text: prompt }]
      if (attachments && attachments.length > 0) {
        attachments.forEach(att => {
          if (att.type.startsWith('image/')) {
            parts.push({
              inlineData: {
                mimeType: att.type,
                data: att.data
              }
            })
          }
        })
      }
      const response = await fetch(
        `${baseUrl}/v1beta/models/${googleModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
          signal
        }
      )
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, (line) => {
        if (!line.startsWith('data: ')) return null
        try {
          const parsed = JSON.parse(line.slice(6))
          return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? null
        } catch { return null }
      }, signal)
      return sendEnd(streamId)
    }

    // ── DeepSeek ───────────────────────────────────────
    if (model.startsWith('deepseek:') || parsedEndpoint?.provider === 'deepseek') {
      const dsModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'deepseek')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://api.deepseek.com/v1'
      const formattedMsgs = formatOpenAIMessages(messages, attachments)
      const msgs = [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...formattedMsgs]
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: dsModel, stream: true, messages: msgs }),
        signal
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaOpenAI, signal)
      return sendEnd(streamId)
    }

    // ── Kimi (Moonshot) ────────────────────────────────
    if (model.startsWith('kimi:') || parsedEndpoint?.provider === 'kimi') {
      const kimiModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'kimi')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://api.moonshot.cn/v1'
      const formattedMsgs = formatOpenAIMessages(messages, attachments)
      const msgs = [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...formattedMsgs]
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: kimiModel, stream: true, messages: msgs }),
        signal
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaOpenAI, signal)
      return sendEnd(streamId)
    }

    // ── Qwen (Alibaba) ─────────────────────────────────
    if (model.startsWith('qwen:') || parsedEndpoint?.provider === 'qwen') {
      const qwenModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'qwen')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      const formattedMsgs = formatOpenAIMessages(messages, attachments)
      const msgs = [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...formattedMsgs]
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: qwenModel, stream: true, messages: msgs }),
        signal
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaOpenAI, signal)
      return sendEnd(streamId)
    }

    // ── OpenRouter ─────────────────────────────────────
    if (model.startsWith('openrouter:') || parsedEndpoint?.provider === 'openrouter') {
      const pe = parsedEndpoint
      const orModel = pe ? pe.modelId : stripProvider(model, 'openrouter')
      const baseUrl = pe ? pe.baseUrl.replace(/\/$/, '') : 'https://openrouter.ai/api/v1'
      const formattedMsgs = formatOpenAIMessages(messages, attachments)
      const msgs = [{ role: 'system', content: toSystemPrompt(context, systemPrompt, { ...aiOptions, nativeWebSearch: Boolean(webSearch) }) }, ...formattedMsgs]
      const tools = openRouterTools(webSearch)
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/Rmatix/cipher',
          'X-Title': 'Cipher Code Editor'
        },
        body: JSON.stringify({
          model: orModel,
          stream: true,
          messages: msgs,
          ...(tools ? { tools } : {})
        }),
        signal
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaOpenAI, signal)
      return sendEnd(streamId)
    }

    // ── NVIDIA NIM ─────────────────────────────────────
    if (model.startsWith('nim:') || parsedEndpoint?.provider === 'nim') {
      const pe = parsedEndpoint
      const nimModel = pe ? pe.modelId : stripProvider(model, 'nim')
      const baseUrl = pe ? pe.baseUrl.replace(/\/$/, '') : 'https://integrate.api.nvidia.com/v1'
      const formattedMsgs = formatOpenAIMessages(messages, attachments)
      const msgs = [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...formattedMsgs]
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: nimModel, stream: true, messages: msgs }),
        signal
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaOpenAI, signal)
      return sendEnd(streamId)
    }

    // ── Ollama ─────────────────────────────────────────
    if (model.startsWith('ollama:') || parsedEndpoint?.provider === 'ollama') {
      const ollamaModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'ollama')
      const systemMsg = toSystemPrompt(context, systemPrompt, aiOptions)
      const host = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : (ollamaUrl || process.env.OLLAMA_HOST || 'http://localhost:11434')
      
      let ollamaMessages = [{ role: 'system', content: systemMsg }, ...messages]
      if (attachments && attachments.length > 0) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg && lastMsg.role === 'user') {
          const images = attachments.filter(a => a.type.startsWith('image/')).map(a => a.data)
          if (images.length > 0) {
            ollamaMessages = [
              { role: 'system', content: systemMsg },
              ...messages.slice(0, -1),
              { role: 'user', content: lastMsg.content, images }
            ]
          }
        }
      }

      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          stream: true,
          messages: ollamaMessages
        }),
        signal
      })
      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        let errMsg = `Ollama error HTTP ${response.status}`
        try {
          const parsed = JSON.parse(errText)
          if (parsed.error) errMsg += `: ${parsed.error}`
        } catch {
          if (errText) errMsg += `: ${errText}`
        }
        return sendError(streamId, errMsg)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        if (signal?.aborted) break
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed = JSON.parse(line)
            const delta = parsed.message?.content
            if (delta) sendToken(streamId, delta)
          } catch { /* skip malformed */ }
        }
      }
      return sendEnd(streamId)
    }

    // ── LM Studio ─────────────────────────────────────
    if (model.startsWith('lmstudio:') || parsedEndpoint?.provider === 'lmstudio') {
      const lmModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'lmstudio')
      const modelId = lmModel === 'local' ? 'local-model' : lmModel
      const msgs = [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...messages]
      const host = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : (lmstudioUrl || process.env.LMSTUDIO_HOST || 'http://localhost:1234')
      const response = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer lmstudio' },
        body: JSON.stringify({ model: modelId, stream: true, messages: msgs }),
        signal
      })
      if (!response.ok) {
        return sendError(streamId, `LM Studio error HTTP ${response.status}`)
      }
      await pipeStream(response, streamId, extractDeltaOpenAI, signal)
      return sendEnd(streamId)
    }

    // ── OpenAI-compatible custom URL ───────────────────
    // Also catches any pipe-delimited model not handled above (generic fallback)
    if (model.startsWith('openai-compatible|') || model.includes('|')) {
      const parts = model.split('|')
      const baseUrl = parts[1]
      const modelId = parts.slice(2).join('|')
      if (!baseUrl) {
        // No endpoint given — skip
        // fall through
      } else {
        const msgs = [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...messages]
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: modelId, stream: true, messages: msgs }),
          signal
        })
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          return sendError(streamId, err?.error?.message || `HTTP ${response.status}`)
        }
        await pipeStream(response, streamId, extractDeltaOpenAI, signal)
        return sendEnd(streamId)
      }
    }

    sendError(streamId, 'Modelo no soportado')

  } catch (e) {
    if (e.name === 'AbortError') {
      sendEnd(streamId)
    } else {
      sendError(streamId, e.message)
    }
  }
})

// ── ai-chat (sin streaming, para test-model) ─────────────

ipcMain.handle('ai-chat', async (event, { model, apiKey, messages, context, systemPrompt, webSearch = false, ollamaUrl, lmstudioUrl }) => {
  try {
    let webSearchResults = null
    if (webSearch) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMsg && lastUserMsg.content) {
        let query = ''
        if (typeof lastUserMsg.content === 'string') {
          query = lastUserMsg.content
        } else if (Array.isArray(lastUserMsg.content)) {
          const textPart = lastUserMsg.content.find(p => p.type === 'text')
          if (textPart) query = textPart.text
        }
        if (query.trim()) {
          webSearchResults = await searchDuckDuckGo(query.trim())
        }
      }
    }
    const aiOptions = { webSearch: Boolean(webSearch), webSearchResults }

    const parsedEndpoint = parseProviderEndpoint(model)

    if (model.startsWith('claude') || model.startsWith('anthropic:') || parsedEndpoint?.provider === 'anthropic') {
      const anthropicModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'anthropic')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://api.anthropic.com/v1'
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: anthropicModel, max_tokens: 256, system: toSystemPrompt(context, systemPrompt, aiOptions), messages })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.content[0].text }
    }
    if (model.startsWith('gpt') || model.startsWith('openai:') || /^o[1-9][-.]/.test(model) || parsedEndpoint?.provider === 'openai') {
      const openaiModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'openai')
      const baseUrl = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : 'https://api.openai.com/v1'
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: openaiModel, messages: [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...messages] })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.choices[0].message.content }
    }
    if (model.startsWith('ollama:') || parsedEndpoint?.provider === 'ollama') {
      const ollamaModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'ollama')
      const host = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : (ollamaUrl || process.env.OLLAMA_HOST || 'http://localhost:11434')
      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ollamaModel, stream: false, messages: [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...messages] })
      })
      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        let errMsg = `Ollama error HTTP ${response.status}`
        try {
          const parsed = JSON.parse(errText)
          if (parsed.error) errMsg += `: ${parsed.error}`
        } catch {
          if (errText) errMsg += `: ${errText}`
        }
        return { error: errMsg }
      }
      const data = await response.json()
      return { text: data.message.content }
    }
    if (model.startsWith('lmstudio:') || parsedEndpoint?.provider === 'lmstudio') {
      const lmModel = parsedEndpoint ? parsedEndpoint.modelId : stripProvider(model, 'lmstudio')
      const modelId = lmModel === 'local' ? 'local-model' : lmModel
      const host = parsedEndpoint ? parsedEndpoint.baseUrl.replace(/\/$/, '') : (lmstudioUrl || process.env.LMSTUDIO_HOST || 'http://localhost:1234')
      const response = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer lmstudio' },
        body: JSON.stringify({ model: modelId, stream: false, messages })
      })
      const data = await response.json()
      return { text: data.choices[0].message.content }
    }
    if (model.startsWith('openrouter:') || parsedEndpoint?.provider === 'openrouter') {
      const pe = parsedEndpoint
      const orModel = pe ? pe.modelId : stripProvider(model, 'openrouter')
      const baseUrl = pe ? pe.baseUrl.replace(/\/$/, '') : 'https://openrouter.ai/api/v1'
      const tools = openRouterTools(webSearch)
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://github.com/Rmatix/cipher', 'X-Title': 'Cipher Code Editor' },
        body: JSON.stringify({
          model: orModel,
          messages: [{ role: 'system', content: toSystemPrompt(context, systemPrompt, { ...aiOptions, nativeWebSearch: Boolean(webSearch) }) }, ...messages],
          ...(tools ? { tools } : {})
        })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.choices[0].message.content }
    }
    if (model.startsWith('nim:') || parsedEndpoint?.provider === 'nim') {
      const pe = parsedEndpoint
      const nimModel = pe ? pe.modelId : stripProvider(model, 'nim')
      const baseUrl = pe ? pe.baseUrl.replace(/\/$/, '') : 'https://integrate.api.nvidia.com/v1'
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: nimModel, messages: [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...messages] })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.choices[0].message.content }
    }
    // Fallback genérico compatible con OpenAI para cualquier otro personalizado que use pipe
    if (model.includes('|')) {
      const parts = model.split('|')
      const provider = parts[0]
      const baseUrl = parts[1]
      const modelId = parts.slice(2).join('|')
      if (baseUrl) {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: modelId, messages: [{ role: 'system', content: toSystemPrompt(context, systemPrompt, aiOptions) }, ...messages] })
        })
        const data = await response.json()
        if (data.error) return { error: data.error.message }
        return { text: data.choices[0].message.content }
      }
    }
    return { error: 'Test no disponible para este modelo. Usa el chat directamente.' }
  } catch (e) {
    return { error: e.message }
  }
})

// ── Ollama / LM Studio model lists ───────────────────────

ipcMain.handle('ollama-list', async (event, url) => {
  try {
    const host = url || process.env.OLLAMA_HOST || 'http://localhost:11434'
    const response = await fetch(`${host}/api/tags`)
    const data = await response.json()
    return data.models || []
  } catch (e) {
    return []
  }
})

ipcMain.handle('lmstudio-list', async (event, url) => {
  try {
    const host = url || process.env.LMSTUDIO_HOST || 'http://localhost:1234'
    const response = await fetch(`${host}/v1/models`)
    const data = await response.json()
    return data.data || []
  } catch (e) {
    return []
  }
})

// ── Claude Code / Codex CLI ──────────────────────────────

function getCliCommand(tool) {
  if (tool === 'claude') return { command: 'claude' }
  if (tool === 'codex') return { command: 'codex' }
  return null
}

ipcMain.handle('ai-cli-check', async (event, tool) => {
  const cli = getCliCommand(tool)
  if (!cli) return { installed: false, error: 'CLI no soportada' }
  try {
    const output = execFileSync(cli.command, ['--version'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { installed: true, version: output.trim() || 'Instalado' }
  } catch (e) {
    return {
      installed: false,
      error: tool === 'claude'
        ? 'Claude Code no esta instalado o no esta en PATH. Instala con: npm install -g @anthropic-ai/claude-code'
        : 'Codex CLI no esta instalado o no esta en PATH. Instala con: npm install -g @openai/codex'
    }
  }
})

ipcMain.handle('ai-cli-run', async (event, { tool, prompt, cwd, model }) => {
  const cli = getCliCommand(tool)
  if (!cli || !prompt) return { error: 'CLI o prompt invalido' }
  const args = tool === 'claude'
    ? ['-p', prompt]
    : ['exec', ...(model ? ['--model', model] : []), prompt]
  try {
    const output = execFileSync(cli.command, args, {
      cwd: resolveAllowedCwd(cwd),
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 8
    })
    return { text: output.trim() }
  } catch (e) {
    return { error: e.stderr?.toString() || e.message }
  }
})

// ── AI Inline Completion ─────────────────────────────────
//
// Pensado para autocompletado inline en Monaco.
// Es síncrono (no streaming), con respuesta corta y rápida.
// El renderer debouncea las llamadas antes de invocar esto.

ipcMain.handle('ai-complete', async (event, { model, apiKey, prefix, suffix, language, systemPrompt, ollamaUrl, lmstudioUrl }) => {
  const safePrefix = String(prefix || '').slice(-3000)  // últimas 3000 chars = contexto suficiente
  const safeSuffix = String(suffix || '').slice(0, 500) // 500 chars adelante
  const lang = String(language || 'code')

  const prompt = `Completa el siguiente codigo ${lang}. Responde SOLO con el codigo que va exactamente despues del cursor, sin explicaciones, sin markdown, sin repetir lo que ya hay. Si no hay nada obvio que completar, responde con cadena vacia.

<prefix>${safePrefix}</prefix>
<suffix>${safeSuffix}</suffix>

Completa:`

  const sys = systemPrompt || `Eres un motor de autocompletado de codigo experto. Respondes SOLO con el fragmento de codigo que continua el cursor. Nunca explicas, nunca usas bloques markdown, nunca repites codigo existente. Si la completacion no es obvia, devuelves cadena vacia.`

  try {
    // ── Anthropic ──────────────────────────────────────
    if (model.startsWith('claude') || model.startsWith('anthropic:')) {
      const m = stripProvider(model, 'anthropic')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: m, max_tokens: 150, system: sys, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await res.json()
      if (data.error) return { text: '' }
      return { text: data.content?.[0]?.text?.trim() ?? '' }
    }

    // ── OpenAI / OpenRouter / DeepSeek / Kimi / Qwen / NIM ──
    const openaiCompatible = [
      { prefix: 'gpt',         url: 'https://api.openai.com/v1/chat/completions',                         header: 'Authorization' },
      { prefix: 'openai:',     url: 'https://api.openai.com/v1/chat/completions',                         header: 'Authorization' },
      { prefix: 'openrouter:', url: 'https://openrouter.ai/api/v1/chat/completions',                      header: 'Authorization' },
      { prefix: 'deepseek:',   url: 'https://api.deepseek.com/v1/chat/completions',                       header: 'Authorization' },
      { prefix: 'kimi:',       url: 'https://api.moonshot.cn/v1/chat/completions',                        header: 'Authorization' },
      { prefix: 'qwen:',       url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', header: 'Authorization' },
      { prefix: 'nim:',        url: 'https://integrate.api.nvidia.com/v1/chat/completions',               header: 'Authorization' },
    ]
    for (const { prefix: p, url, header } of openaiCompatible) {
      const matches = p === 'o' ? /^o[1-9][-.]/.test(model) : model.startsWith(p)
      if (!matches) continue
      const m = model.includes(':') ? model.split(':').slice(1).join(':') : model
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [header]: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: m, max_tokens: 150,
          messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      if (data.error) return { text: '' }
      return { text: data.choices?.[0]?.message?.content?.trim() ?? '' }
    }

    // ── Ollama ─────────────────────────────────────────
    if (model.startsWith('ollama:')) {
      const m = stripProvider(model, 'ollama')
      const host = ollamaUrl || process.env.OLLAMA_HOST || 'http://localhost:11434'
      const res = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m, prompt: `${sys}\n\n${prompt}`, stream: false, options: { num_predict: 150 } })
      })
      const data = await res.json()
      return { text: data.response?.trim() ?? '' }
    }

    // ── LM Studio ─────────────────────────────────────
    if (model.startsWith('lmstudio:')) {
      const lmModel = stripProvider(model, 'lmstudio')
      const modelId = lmModel === 'local' ? 'local-model' : lmModel
      const host = lmstudioUrl || process.env.LMSTUDIO_HOST || 'http://localhost:1234'
      const res = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer lmstudio' },
        body: JSON.stringify({
          model: modelId, max_tokens: 150,
          messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      return { text: data.choices?.[0]?.message?.content?.trim() ?? '' }
    }

    return { text: '' }
  } catch {
    return { text: '' }
  }
})

// ── Project memory (.cipher/PROYECTO.md) ────────────────
//
// Estructura en disco:
//   <projectRoot>/.cipher/PROYECTO.md   ← memoria del proyecto
//
// IPC handlers:
//   memory-read   (folderPath) → { content: string } | { error }
//   memory-write  (folderPath, content) → { ok: true } | { error }
//   memory-exists (folderPath) → boolean
//   project-scan  (folderPath, maxFiles?) → { files: FileSnippet[] }

function cipherDir(folderPath) {
  return path.join(requireAllowedPath(folderPath), '.cipher')
}

function memoryFilePath(folderPath) {
  return path.join(cipherDir(folderPath), 'PROYECTO.md')
}

ipcMain.handle('memory-exists', (event, folderPath) => {
  try {
    return fs.existsSync(memoryFilePath(folderPath))
  } catch {
    return false
  }
})

ipcMain.handle('memory-read', (event, folderPath) => {
  try {
    const file = memoryFilePath(folderPath)
    if (!fs.existsSync(file)) return { content: '' }
    const content = fs.readFileSync(file, 'utf-8')
    return { content }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('memory-write', (event, folderPath, content) => {
  try {
    const dir = cipherDir(folderPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(memoryFilePath(folderPath), content, 'utf-8')
    return { ok: true }
  } catch (e) {
    return { error: e.message }
  }
})

// Escanea el proyecto y devuelve snippets de archivos de código
// para que la IA pueda generar el PROYECTO.md
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.vue', '.svelte', '.astro',
  '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.toml', '.env.example',
  '.md', '.mdx', '.txt',
  '.sh', '.bash', '.zsh', '.fish',
  '.sql', '.prisma', '.graphql',
  '.html', '.xml',
])

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.cipher', 'dist', 'build', 'out',
  'release', '.next', '.nuxt', '.vite', 'coverage', '.cache',
  '__pycache__', '.pytest_cache', 'venv', '.venv', 'target',
])

function scanDir(dirPath, files, maxFiles, maxBytes) {
  if (files.length >= maxFiles) return
  let entries
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return
  }
  // dirs first, then files — mirrors the explorer order
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  for (const entry of sorted) {
    if (files.length >= maxFiles) break
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        scanDir(path.join(dirPath, entry.name), files, maxFiles, maxBytes)
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (!CODE_EXTENSIONS.has(ext)) continue
      const fullPath = path.join(dirPath, entry.name)
      try {
        const stat = fs.statSync(fullPath)
        if (stat.size > maxBytes) continue
        const content = fs.readFileSync(fullPath, 'utf-8')
        files.push({ path: fullPath, content: content.slice(0, 3000) })
      } catch {
        // skip unreadable files
      }
    }
  }
}

ipcMain.handle('project-scan', (event, folderPath, maxFiles = 40) => {
  try {
    const root = requireAllowedPath(folderPath)
    const files = []
    scanDir(root, files, maxFiles, 80 * 1024) // max 80KB por archivo
    // Make paths relative to project root for readability
    const result = files.map(f => ({
      path: path.relative(root, f.path).replace(/\\/g, '/'),
      content: f.content,
    }))
    return { files: result }
  } catch (e) {
    return { error: e.message }
  }
})

// ── App lifecycle ────────────────────────────────────────

app.whenReady().then(() => {
  if (cipherProduct === 'studio') {
    registerDbHandlers()
  }
  createWindow()
  initUpdater(mainWindow)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      initUpdater(mainWindow)
    }
  })
})


app.on('window-all-closed', () => {
  for (const [id, proc] of terminals) {
    try { proc.kill() } catch (e) {}
  }
  terminals.clear()
  if (process.platform !== 'darwin') app.quit()
})
