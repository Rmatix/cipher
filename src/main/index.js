const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

let mainWindow = null
const terminals = new Map() // id -> ptyProcess
let terminalIdCounter = 0
const allowedRoots = new Set()

function normalizeFsPath(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') {
    throw new Error('Ruta invalida')
  }
  return path.resolve(inputPath)
}

function rememberAllowedRoot(folderPath) {
  allowedRoots.add(normalizeFsPath(folderPath))
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../../renderer/public/logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    title: 'Cipher Code Editor',
    backgroundColor: '#0d0d1a'
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

function createTerminal(cwd) {
  const pty = require('node-pty')
  const id = ++terminalIdCounter
  const isWin = os.platform() === 'win32'
  const shell = isWin ? 'powershell.exe' : 'bash'
  const args = isWin ? ['-NoLogo'] : []
  const spawnCwd = resolveAllowedCwd(cwd)

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

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(requireHttpUrl(url))
  return true
})

// ── File system operations ───────────────────────────────

// Abrir carpeta
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  rememberAllowedRoot(result.filePaths[0])
  return result.filePaths[0]
})

// Leer directorio
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

// Leer archivo
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(requireAllowedPath(filePath), 'utf-8')
})

// Guardar archivo
ipcMain.handle('save-file', async (event, filePath, content) => {
  fs.writeFileSync(requireAllowedPath(filePath), content, 'utf-8')
  return true
})

// ── Git operations ──────────────────────────────────────

const { execFileSync } = require('child_process')

function stripProvider(model, provider) {
  return model.startsWith(`${provider}:`) ? model.replace(`${provider}:`, '') : model
}

function toSystemPrompt(context, systemPrompt) {
  return systemPrompt || (context
    ? `Eres un asistente de codigo experto. Contexto del archivo activo:\n\n${context}`
    : 'Eres un asistente de codigo experto.')
}

ipcMain.handle('git-status', async (event, folderPath) => {
  try {
    const output = execFileSync('git', ['status', '--short'], { cwd: requireAllowedPath(folderPath), encoding: 'utf-8' })
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

// ── App lifecycle ────────────────────────────────────────

// ── AI Agent ────────────────────────────────────────────

ipcMain.handle('ai-chat', async (event, { model, apiKey, messages, context, systemPrompt }) => {

  try {
    // Claude / Anthropic
    if (model.startsWith('claude') || model.startsWith('anthropic:')) {
      const anthropicModel = stripProvider(model, 'anthropic')
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 4096,
          system: toSystemPrompt(context, systemPrompt),
          messages: messages
        })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.content[0].text }
    }

    // OpenAI
    if (model.startsWith('gpt') || model.startsWith('o') || model.startsWith('openai:')) {
      const openaiModel = stripProvider(model, 'openai')
      const systemMsg = toSystemPrompt(context, systemPrompt)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [{ role: 'system', content: systemMsg }, ...messages]
        })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.choices[0].message.content }
    }

    // Gemini / Google
    if (model.startsWith('gemini') || model.startsWith('google:')) {
      const googleModel = stripProvider(model, 'google')
      const sysPrefix = systemPrompt || (context ? `Contexto del archivo activo:\n\n${context}\n\n` : '')
      const prompt = sysPrefix + messages[messages.length - 1].content
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.candidates[0].content.parts[0].text }
    }

    // LM Studio (compatible con API de OpenAI)
if (model.startsWith('lmstudio:')) {
  const response = await fetch('http://localhost:1234/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer lmstudio'
    },
    body: JSON.stringify({
      model: 'local-model',
      messages: context
        ? [{ role: 'system', content: `Eres un asistente de codigo experto. Contexto:\n\n${context}` }, ...messages]
        : messages,
      stream: false
    })
  })
  const data = await response.json()
  if (data.error) return { error: data.error.message }
  return { text: data.choices[0].message.content }
}

// DeepSeek
if (model.startsWith('deepseek:')) {
  const dsModel = model.replace('deepseek:', '')
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: dsModel,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages
    })
  })
  const data = await response.json()
  if (data.error) return { error: data.error.message }
  return { text: data.choices[0].message.content }
}

// Kimi (Moonshot)
if (model.startsWith('kimi:')) {
  const kimiModel = model.replace('kimi:', '')
  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: kimiModel,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages
    })
  })
  const data = await response.json()
  if (data.error) return { error: data.error.message }
  return { text: data.choices[0].message.content }
}

// Qwen (Alibaba)
if (model.startsWith('qwen:')) {
  const qwenModel = model.replace('qwen:', '')
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: qwenModel,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages
    })
  })
  const data = await response.json()
  if (data.error) return { error: data.error.message }
  return { text: data.choices[0].message.content }
}

    // Ollama (local)
if (model.startsWith('ollama:')) {
  const ollamaModel = model.replace('ollama:', '')
  const systemMsg = systemPrompt || (context
  ? `Eres un asistente de codigo experto. Contexto del archivo activo:\n\n${context}`
  : 'Eres un asistente de codigo experto.')
  
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      messages: [
        { role: 'system', content: systemMsg },
        ...messages
      ],
      stream: false
    })
  })
  const data = await response.json()
  return { text: data.message.content }
}

// OpenRouter
if (model.startsWith('openrouter:')) {
  const orModel = model.replace('openrouter:', '')
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/Rmatix/cipher',
      'X-Title': 'Cipher Code Editor'
    },
    body: JSON.stringify({
      model: orModel,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages
    })
  })
  const data = await response.json()
  if (data.error) return { error: data.error.message }
  return { text: data.choices[0].message.content }
}

// NVIDIA NIM
if (model.startsWith('nim:')) {
  const nimModel = model.replace('nim:', '')
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: nimModel,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages
    })
  })
  const data = await response.json()
  if (data.error) return { error: data.error.message }
  return { text: data.choices[0].message.content }
}

    // Compatible OpenAI custom URL
    if (model.startsWith('openai-compatible|')) {
      const parts = model.split('|')
      const baseUrl = parts[1]
      const modelId = parts.slice(2).join('|')
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages
        })
      })
      const data = await response.json()
      if (data.error) return { error: data.error.message }
      return { text: data.choices[0].message.content }
    }

    return { error: 'Modelo no soportado' }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('ollama-list', async () => {
  try {
    const response = await fetch('http://localhost:11434/api/tags')
    const data = await response.json()
    return data.models || []
  } catch (e) {
    return []
  }
})

function getCliCommand(tool) {
  if (tool === 'claude') return { command: 'claude' }
  if (tool === 'codex') return { command: 'codex' }
  return null
}

ipcMain.handle('ai-cli-check', async (event, tool) => {
  const cli = getCliCommand(tool)
  if (!cli) return { installed: false, error: 'CLI no soportada' }

  try {
    const output = execFileSync(cli.command, ['--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
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
