/**
 * mcp.js — Cipher MCP (Model Context Protocol) Client
 * Real MCP client with SSE + Stdio transport, persistence, and tool discovery.
 *
 * Supports the core MCP surface: initialize handshake, tools/list, tools/call.
 * Persistence: ~/.cipher/mcp-servers.json
 */

'use strict'

const { ipcMain, app } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
const http = require('http')
const https = require('https')
const { URL } = require('url')

// ── Persistence ────────────────────────────────────────────

function configDir() {
  const dir = path.join(app.getPath('home') || os.homedir(), '.cipher')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function configPath() {
  return path.join(configDir(), 'mcp-servers.json')
}

function loadServers() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data.servers) ? data.servers : []
  } catch {
    return []
  }
}

function saveServers(servers) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify({ servers }, null, 2), 'utf-8')
  } catch (e) {
    console.error('MCP: failed to persist servers:', e.message)
  }
}

// ── Client registry ────────────────────────────────────────
// Each client: { id, name, transport, status, error, tools, conn, proc }

const clients = new Map()
let mainWindowRef = null

function broadcastStatus() {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return
  const snapshot = Array.from(clients.values()).map(c => ({
    id: c.id,
    name: c.name,
    transport: c.transport,
    status: c.status,
    error: c.error,
    toolCount: (c.tools || []).length,
  }))
  mainWindowRef.webContents.send('mcp:server-status', snapshot)
}

// ── JSON-RPC helpers ───────────────────────────────────────

let rpcIdCounter = 0
function nextRpcId() { return ++rpcIdCounter }

function rpcRequest(method, params) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: nextRpcId(),
    method,
    params: params || {},
  })
}

// ── Stdio transport ────────────────────────────────────────

function connectStdio(client, serverConfig) {
  return new Promise((resolve) => {
    const cmd = serverConfig.command
    const args = serverConfig.args || []
    const env = { ...process.env, ...(serverConfig.env || {}) }

    let proc
    try {
      proc = spawn(cmd, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      })
    } catch (e) {
      client.status = 'error'
      client.error = `No se pudo iniciar el proceso: ${e.message}`
      broadcastStatus()
      resolve(false)
      return
    }

    client.proc = proc
    let buffer = ''

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      // Newline-delimited JSON framing
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          handleStdioMessage(client, msg)
        } catch {
          // Ignore non-JSON output (server logs)
        }
      }
    })

    proc.stderr.on('data', (chunk) => {
      // Log stderr but don't fail — MCP servers often log to stderr
      const text = chunk.toString().trim()
      if (text && process.env.NODE_ENV === 'development') {
        console.error(`MCP[${client.name}] stderr:`, text)
      }
    })

    proc.on('error', (err) => {
      client.status = 'error'
      client.error = `Error de proceso: ${err.message}`
      broadcastStatus()
    })

    proc.on('exit', (code) => {
      if (client.status === 'connected') {
        client.status = 'disconnected'
        client.error = code !== null && code !== 0 ? `Proceso terminó con código ${code}` : null
        broadcastStatus()
      }
    })

    // Send initialize handshake
    sendStdio(client, rpcRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'cipher-studio', version: '2.9.0' },
    }))

    // Wait briefly for initialize response
    const initTimeout = setTimeout(() => {
      if (client.status === 'connecting') {
        client.status = 'error'
        client.error = 'Timeout en handshake initialize (el servidor no respondió en 8s)'
        broadcastStatus()
        resolve(false)
      }
    }, 8000)

    client._resolveInit = (ok) => {
      clearTimeout(initTimeout)
      resolve(ok)
    }
  })
}

function sendStdio(client, message) {
  if (!client.proc || client.proc.killed) return
  try {
    client.proc.stdin.write(message + '\n')
  } catch {
    // stdin may be closed
  }
}

// Track pending stdio requests for response correlation
function handleStdioMessage(client, msg) {
  // initialize response
  if (msg.id === 1 && msg.result) {
    client.status = 'connected'
    client.error = null
    broadcastStatus()
    // Request tools list
    sendStdio(client, rpcRequest('tools/list', {}))
    if (client._resolveInit) client._resolveInit(true)
    return
  }
  // tools/list response
  if (msg.result && Array.isArray(msg.result.tools)) {
    client.tools = msg.result.tools
    broadcastStatus()
    return
  }
  // tools/call response
  if (msg._resolveCall) {
    msg._resolveCall(msg)
    return
  }
  // Notifications (ignore for now)
}

// ── SSE / HTTP transport ───────────────────────────────────

function httpGetJson(urlStr, headers, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let parsed
    try {
      parsed = new URL(urlStr)
    } catch (e) {
      reject(new Error('URL inválida'))
      return
    }
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(parsed, { headers: headers || {}, timeout: timeoutMs }, (res) => {
      let body = ''
      res.on('data', (d) => { body += d })
      res.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch { reject(new Error('Respuesta no es JSON válido')) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function httpPostJson(urlStr, payload, headers, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let parsed
    try {
      parsed = new URL(urlStr)
    } catch (e) {
      reject(new Error('URL inválida'))
      return
    }
    const lib = parsed.protocol === 'https:' ? https : http
    const bodyStr = JSON.stringify(payload)
    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(headers || {}),
      },
      timeout: timeoutMs,
    }
    const req = lib.request(parsed, opts, (res) => {
      let body = ''
      res.on('data', (d) => { body += d })
      res.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch { reject(new Error('Respuesta no es JSON válido')) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(bodyStr)
    req.end()
  })
}

async function connectSse(client, serverConfig) {
  const baseUrl = serverConfig.url.replace(/\/$/, '')
  const rpcUrl = `${baseUrl}/mcp`
  client.rpcUrl = rpcUrl
  client.baseUrl = baseUrl

  try {
    client.status = 'connecting'
    broadcastStatus()

    // Initialize handshake over HTTP POST (simple, broadly compatible)
    const initResp = await httpPostJson(rpcUrl, {
      jsonrpc: '2.0',
      id: nextRpcId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'cipher-studio', version: '2.9.0' },
      },
    }, serverConfig.headers, 10000)

    if (initResp.error) {
      throw new Error(initResp.error.message || 'Error en initialize')
    }

    client.status = 'connected'
    client.error = null
    broadcastStatus()

    // Discover tools
    const toolsResp = await httpPostJson(rpcUrl, {
      jsonrpc: '2.0',
      id: nextRpcId(),
      method: 'tools/list',
      params: {},
    }, serverConfig.headers, 10000)

    if (toolsResp.result && Array.isArray(toolsResp.result.tools)) {
      client.tools = toolsResp.result.tools
      broadcastStatus()
    }

    return true
  } catch (e) {
    client.status = 'error'
    client.error = e.message || 'Error de conexión SSE'
    broadcastStatus()
    return false
  }
}

// ── Client lifecycle ───────────────────────────────────────

function createClient(serverConfig) {
  const client = {
    id: serverConfig.id,
    name: serverConfig.name,
    transport: serverConfig.transport,
    status: 'disconnected',
    error: null,
    tools: [],
    rpcUrl: null,
    proc: null,
    config: serverConfig,
  }
  clients.set(client.id, client)
  return client
}

async function connectServer(serverConfig) {
  let client = clients.get(serverConfig.id)
  if (!client) {
    client = createClient(serverConfig)
  }
  if (client.status === 'connected' || client.status === 'connecting') return true

  client.status = 'connecting'
  client.error = null
  broadcastStatus()

  if (serverConfig.transport === 'stdio') {
    return connectStdio(client, serverConfig)
  } else {
    return connectSse(client, serverConfig)
  }
}

function disconnectServer(id) {
  const client = clients.get(id)
  if (!client) return
  if (client.proc && !client.proc.killed) {
    try { client.proc.kill() } catch { /* ignore */ }
  }
  client.proc = null
  client.status = 'disconnected'
  client.error = null
  client.tools = []
  broadcastStatus()
}

// ── IPC registration ───────────────────────────────────────

function registerMcpHandlers(mainWindow) {
  mainWindowRef = mainWindow

  // List configured servers (from disk + runtime status)
  ipcMain.handle('mcp:list-servers', async () => {
    const servers = loadServers()
    return servers.map(s => {
      const client = clients.get(s.id)
      return {
        ...s,
        status: client?.status || 'disconnected',
        error: client?.error || null,
        toolCount: client?.tools?.length || 0,
      }
    })
  })

  // Add a new server config and persist
  ipcMain.handle('mcp:add-server', async (event, server) => {
    const servers = loadServers()
    const newServer = {
      id: server.id || `mcp-${Date.now()}`,
      name: server.name,
      transport: server.transport || 'sse',
      url: server.url || '',
      command: server.command || '',
      args: server.args || [],
      env: server.env || {},
      headers: server.headers || {},
      autoStart: server.autoStart !== false,
    }
    // Remove existing with same id, then add
    const filtered = servers.filter(s => s.id !== newServer.id)
    filtered.push(newServer)
    saveServers(filtered)
    return newServer
  })

  // Remove a server config and disconnect
  ipcMain.handle('mcp:remove-server', async (event, id) => {
    disconnectServer(id)
    clients.delete(id)
    const servers = loadServers().filter(s => s.id !== id)
    saveServers(servers)
    return true
  })

  // Connect to a server
  ipcMain.handle('mcp:connect', async (event, id) => {
    const servers = loadServers()
    const config = servers.find(s => s.id === id)
    if (!config) return { ok: false, error: 'Servidor no encontrado' }
    const ok = await connectServer(config)
    return { ok, error: ok ? null : (clients.get(id)?.error || 'Error de conexión') }
  })

  // Disconnect from a server
  ipcMain.handle('mcp:disconnect', async (event, id) => {
    disconnectServer(id)
    return { ok: true }
  })

  // List tools for a connected server
  ipcMain.handle('mcp:list-tools', async (event, id) => {
    const client = clients.get(id)
    if (!client || client.status !== 'connected') return []
    return client.tools || []
  })

  // Call a tool
  ipcMain.handle('mcp:call-tool', async (event, { id, name, args }) => {
    const client = clients.get(id)
    if (!client || client.status !== 'connected') {
      return { error: 'Servidor no conectado' }
    }

    if (client.transport === 'stdio') {
      return new Promise((resolve) => {
        const reqId = nextRpcId()
        const message = JSON.stringify({
          jsonrpc: '2.0',
          id: reqId,
          method: 'tools/call',
          params: { name, arguments: args || {} },
        })
        // Set up a one-time handler for this id
        const origStdout = client.proc?.stdout
        if (!origStdout) { resolve({ error: 'Proceso no disponible' }); return }

        const onCallResult = (msg) => {
          if (msg.id === reqId) {
            if (msg.error) resolve({ error: msg.error.message })
            else resolve({ result: msg.result })
          }
        }
        // Temporarily augment message handler
        client._callHandlers = client._callHandlers || []
        client._callHandlers.push(onCallResult)
        sendStdio(client, message)

        setTimeout(() => resolve({ error: 'Timeout en tools/call' }), 20000)
      })
    } else {
      // SSE / HTTP
      try {
        const resp = await httpPostJson(client.rpcUrl, {
          jsonrpc: '2.0',
          id: nextRpcId(),
          method: 'tools/call',
          params: { name, arguments: args || {} },
        }, client.config.headers, 20000)
        if (resp.error) return { error: resp.error.message }
        return { result: resp.result }
      } catch (e) {
        return { error: e.message }
      }
    }
  })

  // Test a server config (without persisting) — tries to connect and report
  ipcMain.handle('mcp:test-server', async (event, server) => {
    const tempConfig = {
      id: `test-${Date.now()}`,
      name: server.name || 'Test',
      transport: server.transport,
      url: server.url,
      command: server.command,
      args: server.args,
      env: server.env,
      headers: server.headers,
      autoStart: false,
    }
    const ok = await connectServer(tempConfig)
    const result = {
      ok,
      error: ok ? null : (clients.get(tempConfig.id)?.error || 'Error'),
      toolCount: clients.get(tempConfig.id)?.tools?.length || 0,
    }
    // Cleanup temp client
    disconnectServer(tempConfig.id)
    clients.delete(tempConfig.id)
    return result
  })

  // Auto-start servers marked autoStart on app ready
  setTimeout(() => {
    const servers = loadServers()
    for (const s of servers) {
      if (s.autoStart !== false) {
        connectServer(s).catch(() => {})
      }
    }
  }, 3000)
}

module.exports = { registerMcpHandlers }
