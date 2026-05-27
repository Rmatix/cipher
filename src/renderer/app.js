const cipherAPI = window.cipher

let currentFolder = null

// ── Terminal State ──────────────────────────────────────
const terminalInstances = new Map()
let activeTerminalTab = null
let terminalTabCounter = 0
let terminalVisible = true

// ── Tabs State ──────────────────────────────────────────
const openTabs = new Map()
let activeTabPath = null

window.addEventListener('DOMContentLoaded', () => {
  const startupSound = new Audio('./assets/startup.mp3')
  startupSound.volume = 0.5

  setTimeout(() => {
    startupSound.play().catch(() => {})
    runSplashAnimation().then(() => {
      const splash = document.getElementById('splash-screen')
      const appEl = document.getElementById('app')
      splash.style.display = 'none'
      appEl.style.display = 'flex'
      initMonaco()
      initSidebar()
      initFolder()
      initTerminal()
      initWindowControls()
      initMenubar()
      initSearch()
      initGit()
      initAI()
      setupKeyboardShortcuts()
    })
  }, 500)
})

function runSplashAnimation() {
  return new Promise(resolve => {
    const logo = document.getElementById('logo-img')
    const logoText = document.getElementById('logo-text')
    const subtitle = document.getElementById('logo-subtitle')
    const canvas = document.getElementById('particle-canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    logo.style.opacity = '0'
    subtitle.style.opacity = '0'

    logoText.innerHTML = ''
    logoText.style.opacity = '1'
    'Cipher'.split('').forEach(char => {
      const span = document.createElement('span')
      span.className = 'letter'
      span.textContent = char
      span.style.opacity = '0'
      span.style.transform = 'translateY(20px)'
      span.style.display = 'inline-block'
      logoText.appendChild(span)
    })

    // FASE 1: Logo aparece con pulso suave
    logo.style.transition = 'opacity 1s ease'
    logo.style.opacity = '1'

    let pulseFrame = 0
    const pulseAnim = setInterval(() => {
      pulseFrame++
      const glow = 15 + Math.sin(pulseFrame * 0.1) * 10
      logo.style.filter = `drop-shadow(0 0 ${glow}px #7c4dff) drop-shadow(0 0 ${glow * 0.5}px #4fc3f7)`
    }, 30)

    // FASE 2: Letras aparecen una por una
    setTimeout(() => {
      const letters = document.querySelectorAll('#logo-text .letter')
      letters.forEach((letter, i) => {
        setTimeout(() => {
          letter.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
          letter.style.opacity = '1'
          letter.style.transform = 'translateY(0px)'
        }, i * 150)
      })
    }, 500)

    // FASE 3: Subtitle aparece
    setTimeout(() => {
      subtitle.style.transition = 'opacity 0.8s ease'
      subtitle.style.opacity = '1'
    }, 1800)

    // FASE 4: Partículas y transición al editor
    setTimeout(() => {
      clearInterval(pulseAnim)
      const container = document.getElementById('logo-container')
      const rect = container.getBoundingClientRect()

      const particles = []
      const colors = ['#7c4dff', '#4fc3f7', '#ffffff', '#b388ff', '#80d8ff']

      for (let i = 0; i < 250; i++) {
        particles.push({
          x: rect.left + Math.random() * rect.width,
          y: rect.top + Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 3,
          size: Math.random() * 5 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.015 + 0.008
        })
      }

      container.style.transition = 'opacity 0.3s ease'
      container.style.opacity = '0'

      function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        let alive = false

        particles.forEach(p => {
          if (p.alpha <= 0) return
          alive = true
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.15
          p.vx *= 0.99
          p.alpha -= p.decay
          p.size *= 0.97

          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.fillStyle = p.color
          ctx.shadowBlur = 8
          ctx.shadowColor = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })

        if (alive) {
          requestAnimationFrame(animateParticles)
        } else {
          resolve()
        }
      }

      animateParticles()
    }, 5500)
  })
}

// ════════════════════════════════════════════════════════
//  WINDOW CONTROLS
// ════════════════════════════════════════════════════════

function initWindowControls() {
  const btnMinimize = document.getElementById('btn-minimize')
  const btnMaximize = document.getElementById('btn-maximize')
  const btnClose = document.getElementById('btn-close')

  if (btnMinimize) btnMinimize.addEventListener('click', () => cipherAPI.minimizeWindow())
  if (btnMaximize) btnMaximize.addEventListener('click', () => cipherAPI.maximizeWindow())
  if (btnClose) btnClose.addEventListener('click', () => cipherAPI.closeWindow())
}

// ════════════════════════════════════════════════════════
//  MONACO EDITOR
// ════════════════════════════════════════════════════════

function initMonaco() {
  require.config({
    paths: {
      vs: '../../node_modules/monaco-editor/min/vs'
    }
  })

  require(['vs/editor/editor.main'], function() {
    monaco.editor.defineTheme('cipher-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b6b8a', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7c4dff' },
        { token: 'string', foreground: '4fc3f7' },
        { token: 'number', foreground: 'ffab40' },
        { token: 'type', foreground: '69f0ae' },
      ],
      colors: {
        'editor.background': '#0d0d1a',
        'editor.foreground': '#e0e0f0',
        'editor.lineHighlightBackground': '#1a1a2e',
        'editor.selectionBackground': '#7c4dff33',
        'editorCursor.foreground': '#7c4dff',
        'editorLineNumber.foreground': '#3a3a5a',
        'editorLineNumber.activeForeground': '#7c4dff',
        'editor.inactiveSelectionBackground': '#7c4dff1a',
        'editorIndentGuide.background': '#1e1e3a',
        'editorIndentGuide.activeBackground': '#3a3a5a',
        'editorWidget.background': '#0a0a14',
        'editorWidget.border': '#1e1e3a',
        'minimap.background': '#08080f',
      }
    })

    window.editor = monaco.editor.create(
      document.getElementById('editor-container'), {
        value: '// Bienvenido a Cipher Code Editor\n// Abre una carpeta para empezar\n\nconsole.log("Hello from Cipher!")',
        language: 'javascript',
        theme: 'cipher-dark',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        roundedSelection: true,
        cursorStyle: 'line',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        padding: { top: 10 },
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
      }
    )

    window.editor.onDidChangeCursorPosition(e => {
      document.querySelector('.status-right .status-item:last-child').textContent =
        `Ln ${e.position.lineNumber}, Col ${e.position.column}`
    })

    // Guardar con Ctrl+S
    window.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      if (window.currentFilePath) {
        const content = window.editor.getValue()
        await cipherAPI.saveFile(window.currentFilePath, content)
        const tab = openTabs.get(window.currentFilePath)
        if (tab) {
          const nameEl = tab.tabEl.querySelector('.tab-name')
          nameEl.textContent = nameEl.textContent.replace(' ●', '')
        }
      }
    })

    // Toggle terminal con Ctrl+`
    window.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
      toggleTerminalPanel()
    })
  })
}

// ════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════

function initSidebar() {
  const icons = document.querySelectorAll('.sidebar-icon')

  icons.forEach(icon => {
    if (icon.id === 'btn-settings') return
    icon.addEventListener('click', () => {
      togglePanel(icon.id)
    })
  })
}

// ════════════════════════════════════════════════════════
//  TABS SYSTEM
// ════════════════════════════════════════════════════════

function createTab(filePath, fileName) {
  if (openTabs.has(filePath)) {
    activateTab(filePath)
    return
  }

  const tabsContainer = document.getElementById('tabs-container')
  const tabEl = document.createElement('div')
  tabEl.className = 'tab'
  tabEl.dataset.path = filePath
  tabEl.innerHTML = `
    <span class="tab-icon">${getTabIcon(fileName)}</span>
    <span class="tab-name">${fileName}</span>
    <span class="tab-close" title="Cerrar">×</span>
  `

  tabEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) {
      activateTab(filePath)
    }
  })

  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation()
    closeTab(filePath)
  })

  tabsContainer.appendChild(tabEl)
  openTabs.set(filePath, { tabEl, model: null })
}

function activateTab(filePath) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  const tab = openTabs.get(filePath)
  if (!tab) return
  tab.tabEl.classList.add('active')
  activeTabPath = filePath
  window.currentFilePath = filePath

  if (tab.model && window.editor) {
    window.editor.setModel(tab.model)
    const fileName = filePath.split('\\').pop()
    document.querySelector('.status-right .status-item:first-child').textContent = getLanguage(fileName)
  }
}

function closeTab(filePath) {
  const tab = openTabs.get(filePath)
  if (!tab) return

  tab.tabEl.remove()
  if (tab.model) tab.model.dispose()
  openTabs.delete(filePath)

  if (activeTabPath === filePath) {
    const remaining = Array.from(openTabs.keys())
    if (remaining.length > 0) {
      activateTab(remaining[remaining.length - 1])
    } else {
      activeTabPath = null
      window.currentFilePath = null
      if (window.editor) {
        window.editor.setModel(
          monaco.editor.createModel('// Abre un archivo para empezar', 'javascript')
        )
      }
    }
  }
}

// ════════════════════════════════════════════════════════
//  FILE EXPLORER
// ════════════════════════════════════════════════════════

function initFolder() {
  document.getElementById('btn-open-folder').addEventListener('click', async () => {
    const folderPath = await cipherAPI.openFolder()
    if (!folderPath) return
    currentFolder = folderPath
    await renderFileTree(folderPath)

    const projectName = folderPath.split('\\').pop() || folderPath.split('/').pop()
    if (projectName && projectName.toLowerCase() !== 'cipher') {
      document.getElementById('titlebar-name').textContent = `Cipher — ${projectName}`
    } else {
      document.getElementById('titlebar-name').textContent = 'Cipher'
    }
  })
}

async function renderFileTree(folderPath) {
  const items = await cipherAPI.readDirectory(folderPath)
  const panelContent = document.getElementById('panel-content')
  const folderName = folderPath.split('\\').pop() || folderPath.split('/').pop()

  panelContent.innerHTML = `
    <div class="tree-root">
      <div class="tree-folder-title">
        <span class="tree-arrow">▾</span>
        <span class="tree-icon">📁</span>
        <span>${folderName}</span>
      </div>
      <div class="tree-children" id="tree-root-children"></div>
    </div>
  `

  const container = document.getElementById('tree-root-children')
  renderItems(items, container)
}

function renderItems(items, container) {
  items.forEach(item => {
    const el = document.createElement('div')
    el.className = item.isDirectory ? 'tree-item tree-dir' : 'tree-item tree-file'
    el.innerHTML = item.isDirectory
      ? `<span class="tree-arrow">▸</span><span class="tree-icon">📁</span><span>${item.name}</span>`
      : `<span class="tree-spacer"></span><span class="tree-icon">${getFileIcon(item.name)}</span><span>${item.name}</span>`

    if (item.isDirectory) {
      let open = false
      const children = document.createElement('div')
      children.className = 'tree-children'
      children.style.display = 'none'

      el.addEventListener('click', async () => {
        open = !open
        children.style.display = open ? 'block' : 'none'
        el.querySelector('.tree-arrow').textContent = open ? '▾' : '▸'
        if (open && children.children.length === 0) {
          const subItems = await cipherAPI.readDirectory(item.path)
          renderItems(subItems, children)
        }
      })

      container.appendChild(el)
      container.appendChild(children)
    } else {
      el.addEventListener('click', () => openFile(item.path, item.name))
      container.appendChild(el)
    }
  })
}

async function openFile(filePath, fileName, lineNumber = 0) {
  if (openTabs.has(filePath)) {
    activateTab(filePath)
    if (lineNumber > 0 && window.editor) {
      window.editor.setPosition({ lineNumber: lineNumber + 1, column: 1 })
      window.editor.revealLine(lineNumber + 1)
    }
    return
  }

  const content = await cipherAPI.readFile(filePath)
  const lang = getLanguage(fileName)
  const model = monaco.editor.createModel(content, lang)

  model.onDidChangeContent(() => {
    const tab = openTabs.get(filePath)
    if (tab && !tab.tabEl.querySelector('.tab-name').textContent.includes(' ●')) {
      tab.tabEl.querySelector('.tab-name').textContent += ' ●'
    }
  })

  createTab(filePath, fileName)
  openTabs.get(filePath).model = model
  activateTab(filePath)

  if (window.editor) {
    window.editor.setModel(model)
    if (lineNumber > 0) {
      window.editor.setPosition({ lineNumber: lineNumber + 1, column: 1 })
      window.editor.revealLine(lineNumber + 1)
    }
  }

  document.querySelector('.status-right .status-item:first-child').textContent = lang
}

// ════════════════════════════════════════════════════════
//  TERMINAL (xterm.js + node-pty)
// ════════════════════════════════════════════════════════

async function initTerminal() {
  cipherAPI.onTerminalData((ptyId, data) => {
    for (const [tabId, instance] of terminalInstances) {
      if (instance.ptyId === ptyId) {
        instance.term.write(data)
        break
      }
    }
  })

  cipherAPI.onTerminalExit((ptyId, exitCode) => {
    for (const [tabId, instance] of terminalInstances) {
      if (instance.ptyId === ptyId) {
        instance.term.writeln(`\r\n\x1b[38;5;240m[Proceso terminado con código ${exitCode}]\x1b[0m`)
        instance.dead = true
        break
      }
    }
  })

  await createTerminalTab()

  document.getElementById('terminal-new-btn').addEventListener('click', () => {
    createTerminalTab()
  })

  const toggleBtn = document.getElementById('terminal-toggle-btn')
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTerminalPanel)

  const statusToggleBtn = document.getElementById('status-terminal-toggle')
  if (statusToggleBtn) statusToggleBtn.addEventListener('click', toggleTerminalPanel)

  window.addEventListener('resize', () => {
    const active = terminalInstances.get(activeTerminalTab)
    if (active && active.fitAddon) {
      requestAnimationFrame(() => {
        try { active.fitAddon.fit() } catch (e) {}
      })
    }
  })

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault()
      toggleTerminalPanel()
    }
  })

  initTerminalResize()
}

async function createTerminalTab() {
  const tabId = ++terminalTabCounter
  const cwd = currentFolder || undefined
  const ptyId = await cipherAPI.terminalCreate(cwd)

  const panel = document.getElementById('terminal-panel')
  if (panel && panel.style.display === 'none') {
    panel.style.display = 'flex'
    terminalVisible = true
  }

  const Terminal = window.Terminal
  const FitAddon = window.FitAddon.FitAddon
  const WebLinksAddon = window.WebLinksAddon.WebLinksAddon

  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
    lineHeight: 1.35,
    letterSpacing: 0.5,
    scrollback: 5000,
    allowProposedApi: true,
    theme: {
      background: '#0a0a14',
      foreground: '#e0e0f0',
      cursor: '#7c4dff',
      cursorAccent: '#0a0a14',
      selectionBackground: '#7c4dff44',
      selectionForeground: '#ffffff',
      black: '#0d0d1a',
      red: '#ff6b6b',
      green: '#69f0ae',
      yellow: '#ffd740',
      blue: '#4fc3f7',
      magenta: '#7c4dff',
      cyan: '#4dd0e1',
      white: '#e0e0f0',
      brightBlack: '#4a4a6a',
      brightRed: '#ff8a80',
      brightGreen: '#b9f6ca',
      brightYellow: '#ffe57f',
      brightBlue: '#80d8ff',
      brightMagenta: '#b388ff',
      brightCyan: '#84ffff',
      brightWhite: '#ffffff',
    }
  })

  const fitAddon = new FitAddon()
  const webLinksAddon = new WebLinksAddon()
  term.loadAddon(fitAddon)
  term.loadAddon(webLinksAddon)

  const termContainer = document.createElement('div')
  termContainer.className = 'terminal-instance'
  termContainer.id = `terminal-${tabId}`
  termContainer.style.display = 'none'
  document.getElementById('terminal-container').appendChild(termContainer)

  term.open(termContainer)

  term.onData(data => {
    if (!terminalInstances.get(tabId)?.dead) {
      cipherAPI.terminalInput(ptyId, data)
    }
  })

  terminalInstances.set(tabId, { ptyId, term, fitAddon, dead: false })
  createTerminalTabUI(tabId)
  switchTerminalTab(tabId)

  return tabId
}

function createTerminalTabUI(tabId) {
  const listContainer = document.getElementById('terminal-tabs-list')
  const tabEl = document.createElement('div')
  tabEl.className = 'terminal-tab'
  tabEl.dataset.tabId = tabId
  tabEl.innerHTML = `
    <span class="terminal-tab-icon">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
    </span>
    <span class="terminal-tab-label">Terminal ${tabId}</span>
    <span class="terminal-tab-close" title="Cerrar terminal">×</span>
  `

  tabEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('terminal-tab-close')) {
      switchTerminalTab(tabId)
    }
  })

  tabEl.querySelector('.terminal-tab-close').addEventListener('click', (e) => {
    e.stopPropagation()
    closeTerminalTab(tabId)
  })

  listContainer.appendChild(tabEl)
}

function switchTerminalTab(tabId) {
  document.querySelectorAll('.terminal-tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.terminal-instance').forEach(t => t.style.display = 'none')

  const tabEl = document.querySelector(`.terminal-tab[data-tab-id="${tabId}"]`)
  if (tabEl) tabEl.classList.add('active')

  const container = document.getElementById(`terminal-${tabId}`)
  if (container) container.style.display = 'block'

  activeTerminalTab = tabId

  const instance = terminalInstances.get(tabId)
  if (instance && instance.fitAddon) {
    requestAnimationFrame(() => {
      try {
        instance.fitAddon.fit()
        const dims = instance.fitAddon.proposeDimensions()
        if (dims) cipherAPI.terminalResize(instance.ptyId, dims.cols, dims.rows)
      } catch (e) {}
    })
  }

  if (instance && instance.term) instance.term.focus()
}

async function closeTerminalTab(tabId) {
  const instance = terminalInstances.get(tabId)
  if (!instance) return

  await cipherAPI.terminalKill(instance.ptyId)
  instance.term.dispose()

  const container = document.getElementById(`terminal-${tabId}`)
  if (container) container.remove()

  const tabEl = document.querySelector(`.terminal-tab[data-tab-id="${tabId}"]`)
  if (tabEl) tabEl.remove()

  terminalInstances.delete(tabId)

  if (terminalInstances.size === 0) {
    const panel = document.getElementById('terminal-panel')
    terminalVisible = false
    panel.style.display = 'none'
    activeTerminalTab = null
    if (window.editor) window.editor.focus()
  } else {
    const remainingTabs = Array.from(terminalInstances.keys())
    const nextTabId = remainingTabs.includes(activeTerminalTab)
      ? activeTerminalTab
      : remainingTabs[remainingTabs.length - 1]
    switchTerminalTab(nextTabId)
  }
}

function toggleTerminalPanel() {
  const panel = document.getElementById('terminal-panel')
  terminalVisible = !terminalVisible
  panel.style.display = terminalVisible ? 'flex' : 'none'

  if (terminalVisible) {
    if (terminalInstances.size === 0) {
      createTerminalTab()
    } else {
      const instance = terminalInstances.get(activeTerminalTab)
      if (instance && instance.fitAddon) {
        requestAnimationFrame(() => {
          try {
            instance.fitAddon.fit()
            const dims = instance.fitAddon.proposeDimensions()
            if (dims) cipherAPI.terminalResize(instance.ptyId, dims.cols, dims.rows)
          } catch (e) {}
          instance.term.focus()
        })
      }
    }
  } else {
    if (window.editor) window.editor.focus()
  }
}

function initTerminalResize() {
  const handle = document.getElementById('terminal-resize-handle')
  const panel = document.getElementById('terminal-panel')
  let isDragging = false
  let startY, startHeight

  handle.addEventListener('mousedown', (e) => {
    isDragging = true
    startY = e.clientY
    startHeight = parseInt(document.defaultView.getComputedStyle(panel).height, 10)
    handle.classList.add('dragging')
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    const deltaY = startY - e.clientY
    let newHeight = startHeight + deltaY
    if (newHeight < 60) newHeight = 60
    if (newHeight > window.innerHeight - 150) newHeight = window.innerHeight - 150
    panel.style.height = `${newHeight}px`

    const active = terminalInstances.get(activeTerminalTab)
    if (active && active.fitAddon) {
      try {
        active.fitAddon.fit()
        const dims = active.fitAddon.proposeDimensions()
        if (dims) cipherAPI.terminalResize(active.ptyId, dims.cols, dims.rows)
      } catch (err) {}
    }
  })

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false
      handle.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  })
}

// ════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════

function getLanguage(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const map = {
    js: 'javascript', ts: 'typescript', html: 'html', css: 'css',
    json: 'json', md: 'markdown', py: 'python', rs: 'rust',
    go: 'go', cpp: 'cpp', c: 'c', cs: 'csharp', java: 'java',
    php: 'php', rb: 'ruby', sql: 'sql', yaml: 'yaml', yml: 'yaml',
    sh: 'shell', lua: 'lua', gd: 'plaintext', xml: 'xml',
    jsx: 'javascript', tsx: 'typescript', vue: 'html',
    svelte: 'html', toml: 'plaintext', ini: 'ini',
  }
  return map[ext] || 'plaintext'
}

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const name = fileName.toLowerCase()

  const icons = {
    js: '<i class="codicon codicon-symbol-method" style="color:#f7d154"></i>',
    ts: '<i class="codicon codicon-symbol-method" style="color:#3b82f6"></i>',
    jsx: '<i class="codicon codicon-symbol-method" style="color:#61dafb"></i>',
    tsx: '<i class="codicon codicon-symbol-method" style="color:#61dafb"></i>',
    html: '<i class="codicon codicon-globe" style="color:#e34c26"></i>',
    css: '<i class="codicon codicon-symbol-color" style="color:#264de4"></i>',
    scss: '<i class="codicon codicon-symbol-color" style="color:#cd6799"></i>',
    json: '<i class="codicon codicon-json" style="color:#f7d154"></i>',
    yaml: '<i class="codicon codicon-list-tree" style="color:#ff6b6b"></i>',
    yml: '<i class="codicon codicon-list-tree" style="color:#ff6b6b"></i>',
    md: '<i class="codicon codicon-markdown" style="color:#ffffff"></i>',
    txt: '<i class="codicon codicon-file-text" style="color:#cccccc"></i>',
    py: '<i class="codicon codicon-symbol-misc" style="color:#3572A5"></i>',
    rs: '<i class="codicon codicon-symbol-misc" style="color:#f74c00"></i>',
    go: '<i class="codicon codicon-symbol-misc" style="color:#00acd7"></i>',
    cpp: '<i class="codicon codicon-symbol-misc" style="color:#f34b7d"></i>',
    c: '<i class="codicon codicon-symbol-misc" style="color:#555555"></i>',
    cs: '<i class="codicon codicon-symbol-misc" style="color:#7c4dff"></i>',
    java: '<i class="codicon codicon-symbol-misc" style="color:#b07219"></i>',
    php: '<i class="codicon codicon-symbol-misc" style="color:#4F5D95"></i>',
    rb: '<i class="codicon codicon-symbol-misc" style="color:#701516"></i>',
    lua: '<i class="codicon codicon-symbol-misc" style="color:#000080"></i>',
    gd: '<i class="codicon codicon-symbol-misc" style="color:#355570"></i>',
    sql: '<i class="codicon codicon-database" style="color:#e38c00"></i>',
    sh: '<i class="codicon codicon-terminal" style="color:#89e051"></i>',
    png: '<i class="codicon codicon-file-media" style="color:#a074c4"></i>',
    jpg: '<i class="codicon codicon-file-media" style="color:#a074c4"></i>',
    jpeg: '<i class="codicon codicon-file-media" style="color:#a074c4"></i>',
    gif: '<i class="codicon codicon-file-media" style="color:#a074c4"></i>',
    svg: '<i class="codicon codicon-file-media" style="color:#ffb13b"></i>',
    ico: '<i class="codicon codicon-file-media" style="color:#a074c4"></i>',
  }

  if (name === 'package.json') return '<i class="codicon codicon-package" style="color:#f7d154"></i>'
  if (name === 'readme.md') return '<i class="codicon codicon-book" style="color:#4fc3f7"></i>'
  if (name === '.gitignore') return '<i class="codicon codicon-source-control" style="color:#f14e32"></i>'

  return icons[ext] || '<i class="codicon codicon-file" style="color:#cccccc"></i>'
}

function getTabIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const icons = {
    js: 'JS', ts: 'TS', html: 'HTML', css: 'CSS',
    py: 'PY', rs: 'RS', go: 'GO', cpp: 'C++',
    cs: 'C#', lua: 'LUA', gd: 'GD', md: 'MD'
  }
  return icons[ext] || '📄'
}

// ════════════════════════════════════════════════════════
//  AI AGENT
// ════════════════════════════════════════════════════════

const aiChatHistory = []
let currentAIMode = 'chat'
let currentPlan = null
let aiAbortController = null

function initAI() {
  const modelSelect = document.getElementById('ai-model-select')
  const devModelSelect = document.getElementById('ai-dev-model-select')
  const apiKeyInput = document.getElementById('ai-api-key')
  const apiKeySave = document.getElementById('ai-key-save')
  const sendBtn = document.getElementById('ai-send-btn')
  const stopBtn = document.getElementById('ai-stop-btn')
  const aiInput = document.getElementById('ai-input')
  const messagesContainer = document.getElementById('ai-messages')
  const devModelRow = document.getElementById('ai-dev-model-row')
  const planActions = document.getElementById('ai-plan-actions')
  const approvePlanBtn = document.getElementById('ai-approve-plan-btn')

  // ── Modelos personalizados ──
  function loadCustomModels() {
    const saved = JSON.parse(localStorage.getItem('cipher-custom-models') || '[]')
    const group = document.getElementById('custom-models-group')
    const groupDev = document.getElementById('custom-models-group-dev')
    const listEl = document.getElementById('custom-models-list')

    if (group) group.innerHTML = ''
    if (groupDev) groupDev.innerHTML = ''
    if (listEl) listEl.innerHTML = ''

    saved.forEach((model, index) => {
      const value = `custom:${index}`

      if (group) {
        const opt = document.createElement('option')
        opt.value = value
        opt.textContent = model.name
        group.appendChild(opt)
      }

      if (groupDev) {
        const opt = document.createElement('option')
        opt.value = value
        opt.textContent = model.name
        groupDev.appendChild(opt)
      }

      if (listEl) {
        const item = document.createElement('div')
        item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1e1e3a;font-size:12px;color:#e0e0f0;'
        item.innerHTML = `
          <span>${model.name} <span style="color:#6b6b8a;font-size:10px;">(${model.provider})</span></span>
          <button data-index="${index}" style="background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:16px;">×</button>
        `
        item.querySelector('button').addEventListener('click', () => {
          saved.splice(index, 1)
          localStorage.setItem('cipher-custom-models', JSON.stringify(saved))
          loadCustomModels()
        })
        listEl.appendChild(item)
      }
    })
  }

  // Abrir modal
  document.getElementById('ai-add-model-btn').addEventListener('click', () => {
    document.getElementById('ai-custom-model-modal').style.display = 'block'
    loadCustomModels()
  })

  // Cerrar modal
  document.getElementById('ai-close-modal-btn').addEventListener('click', () => {
    document.getElementById('ai-custom-model-modal').style.display = 'none'
  })

  // Mostrar URL si es compatible OpenAI
  document.getElementById('custom-model-provider').addEventListener('change', (e) => {
    const urlInput = document.getElementById('custom-model-url')
    urlInput.style.display = e.target.value === 'openai-compatible' ? 'block' : 'none'
  })

  // Guardar modelo personalizado
  document.getElementById('ai-save-custom-model-btn').addEventListener('click', () => {
    const name = document.getElementById('custom-model-name').value.trim()
    const provider = document.getElementById('custom-model-provider').value
    const modelId = document.getElementById('custom-model-id').value.trim()
    const url = document.getElementById('custom-model-url').value.trim()
    const key = document.getElementById('custom-model-key').value.trim()

    if (!name || !modelId) {
      alert('El nombre y el ID del modelo son obligatorios.')
      return
    }

    const saved = JSON.parse(localStorage.getItem('cipher-custom-models') || '[]')
    saved.push({ name, provider, modelId, url, key })
    localStorage.setItem('cipher-custom-models', JSON.stringify(saved))

    if (key) localStorage.setItem(`cipher-api-key-custom:${saved.length - 1}`, key)

    document.getElementById('custom-model-name').value = ''
    document.getElementById('custom-model-id').value = ''
    document.getElementById('custom-model-url').value = ''
    document.getElementById('custom-model-key').value = ''

    loadCustomModels()
    alert(`✅ Modelo "${name}" guardado correctamente.`)
  })

  loadCustomModels()

  // Cargar API key guardada
  const savedKey = localStorage.getItem(`cipher-api-key-${modelSelect.value}`)
  if (savedKey) apiKeyInput.value = savedKey

  modelSelect.addEventListener('change', () => {
    const saved = localStorage.getItem(`cipher-api-key-${modelSelect.value}`)
    apiKeyInput.value = saved || ''
  })

  apiKeySave.addEventListener('click', () => {
    const key = apiKeyInput.value.trim()
    if (key) {
      localStorage.setItem(`cipher-api-key-${modelSelect.value}`, key)
      apiKeySave.textContent = '✅'
      setTimeout(() => apiKeySave.textContent = '💾', 1500)
    }
  })

  // MODO TABS
  document.getElementById('btn-mode-chat').addEventListener('click', () => setMode('chat'))
  document.getElementById('btn-mode-plan').addEventListener('click', () => setMode('plan'))
  document.getElementById('btn-mode-dev').addEventListener('click', () => setMode('dev'))

  function setMode(mode) {
    currentAIMode = mode
    document.querySelectorAll('.ai-mode-btn').forEach(b => b.classList.remove('active'))
    document.getElementById(`btn-mode-${mode}`).classList.add('active')

    const modelLabel = document.getElementById('ai-model-label-text')

    if (mode === 'chat') {
      devModelRow.style.display = 'none'
      planActions.style.display = 'none'
      modelLabel.textContent = 'Modelo'
      aiInput.placeholder = 'Escríbele al agente...'
    } else if (mode === 'plan') {
      devModelRow.style.display = 'flex'
      planActions.style.display = 'none'
      modelLabel.textContent = 'Plan IA'
      aiInput.placeholder = 'Describe qué quieres construir o analizar...'
    } else if (mode === 'dev') {
      devModelRow.style.display = 'flex'
      planActions.style.display = 'none'
      modelLabel.textContent = 'Plan IA'
      aiInput.placeholder = 'Describe qué quieres desarrollar...'
    }
  }

  // BOTÓN DETENER
  stopBtn.addEventListener('click', () => {
    if (aiAbortController) {
      aiAbortController.abort()
      aiAbortController = null
    }
    stopBtn.style.display = 'none'
    sendBtn.style.display = 'flex'
    sendBtn.disabled = false
    appendMessage('error', 'Sistema', 'Respuesta detenida.')
  })

  // APROBAR PLAN
  approvePlanBtn.addEventListener('click', async () => {
    if (!currentPlan) return
    planActions.style.display = 'none'
    appendMessage('assistant', 'Sistema', '✅ Plan aprobado. Iniciando modo desarrollo...')
    setMode('dev')
    await startDevelopment(currentPlan)
  })

  // Enviar con Enter
  aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  sendBtn.addEventListener('click', sendMessage)

  async function sendMessage() {
    const text = aiInput.value.trim()
    if (!text) return

    const model = modelSelect.value
    const apiKey = apiKeyInput.value.trim()

    if (!apiKey && !model.startsWith('ollama:') && !model.startsWith('lmstudio:')) {
      appendMessage('error', 'Sistema', 'Agrega tu API key para este modelo.')
      return
    }

    appendMessage('user', 'Tú', text)
    aiChatHistory.push({ role: 'user', content: text })
    aiInput.value = ''
    sendBtn.style.display = 'none'
    stopBtn.style.display = 'flex'

    let context = null
    const useContext = document.getElementById('ai-use-context').checked
    if (useContext && window.editor) {
      const code = window.editor.getValue()
      const fileName = window.currentFilePath
        ? window.currentFilePath.split('\\').pop()
        : 'sin título'
      if (code && code.trim()) {
        context = `Archivo: ${fileName}\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\``
      }
    }

    const thinkingEl = appendThinking()

    // Resolver modelo personalizado
    let resolvedModel = model
    let resolvedApiKey = apiKey
    if (model.startsWith('custom:')) {
      const index = parseInt(model.replace('custom:', ''))
      const saved = JSON.parse(localStorage.getItem('cipher-custom-models') || '[]')
      const custom = saved[index]
      if (!custom) {
        appendMessage('error', 'Error', 'Modelo personalizado no encontrado.')
        return
      }
      resolvedModel = `${custom.provider}:${custom.modelId}`
      resolvedApiKey = custom.key || apiKey
      if (custom.url) resolvedModel = `openai-compatible:${custom.url}:${custom.modelId}`
    }

    try {
      let systemPrompt = 'Eres un asistente de código experto.'

      if (currentAIMode === 'plan') {
        systemPrompt = `Eres un arquitecto de software experto. Tu tarea es analizar lo que el usuario quiere construir y generar un PLAN DETALLADO con:
1. Descripción general
2. Estructura de archivos y carpetas
3. Tecnologías a usar
4. Pasos de desarrollo en orden
5. Consideraciones importantes

Genera el plan en formato Markdown claro y estructurado.`
      } else if (currentAIMode === 'dev') {
        systemPrompt = `Eres un desarrollador experto ejecutando un plan. Escribe código real, completo y funcional. Cuando necesites crear un archivo indícalo con:
[CREAR ARCHIVO: nombre_archivo.ext]
\`\`\`
código aquí
\`\`\`
[FIN ARCHIVO]

Cuando necesites ejecutar un comando indícalo con:
[EJECUTAR: comando aquí]`
      }

      if (context) systemPrompt += `\n\nContexto del proyecto:\n${context}`

      aiAbortController = new AbortController()

      const result = await cipherAPI.aiChat({
        model: resolvedModel,
        apiKey: resolvedApiKey,
        messages: aiChatHistory,
        context: null,
        systemPrompt
      })

      thinkingEl.remove()
      aiAbortController = null
      stopBtn.style.display = 'none'
      sendBtn.style.display = 'flex'
      sendBtn.disabled = false

      if (result.error) {
        appendMessage('error', 'Error', result.error)
      } else {
        aiChatHistory.push({ role: 'assistant', content: result.text })

        if (currentAIMode === 'plan') {
          currentPlan = result.text
          appendPlanMessage(result.text)
          document.getElementById('ai-plan-actions').style.display = 'block'
        } else if (currentAIMode === 'dev') {
          appendMessage('assistant', 'Cipher Dev', result.text)
          await processDeveloperResponse(result.text)
        } else {
          appendMessage('assistant', 'Cipher IA', result.text)
        }
      }
    } catch (e) {
      thinkingEl.remove()
      stopBtn.style.display = 'none'
      sendBtn.style.display = 'flex'
      sendBtn.disabled = false
      if (e.name !== 'AbortError') {
        appendMessage('error', 'Error', e.message)
      }
    }

    aiInput.focus()
  }

  async function startDevelopment(plan) {
    const devModel = devModelSelect.value
    const apiKey = apiKeyInput.value.trim()

    const devMessages = [{
      role: 'user',
      content: `Ejecuta este plan de desarrollo paso a paso:\n\n${plan}\n\nEmpieza con el primer archivo o paso.`
    }]

    const thinkingEl = appendThinking()

    try {
      const result = await cipherAPI.aiChat({
        model: devModel,
        apiKey,
        messages: devMessages,
        context: null,
        systemPrompt: `Eres un desarrollador experto ejecutando un plan. Escribe código real y completo. Para crear archivos usa:
[CREAR ARCHIVO: nombre.ext]
\`\`\`
código
\`\`\`
[FIN ARCHIVO]
Para ejecutar comandos usa: [EJECUTAR: comando]`
      })

      thinkingEl.remove()

      if (result.error) {
        appendMessage('error', 'Error Dev', result.error)
      } else {
        appendMessage('assistant', 'Cipher Dev', result.text)
        await processDeveloperResponse(result.text)
      }
    } catch (e) {
      thinkingEl.remove()
      appendMessage('error', 'Error', e.message)
    }
  }

  async function processDeveloperResponse(text) {
    const fileRegex = /\[CREAR ARCHIVO: (.+?)\]\n```[\w]*\n([\s\S]+?)\n```\n\[FIN ARCHIVO\]/g
    const cmdRegex = /\[EJECUTAR: (.+?)\]/g

    let fileMatch
    while ((fileMatch = fileRegex.exec(text)) !== null) {
      const fileName = fileMatch[1]
      const fileContent = fileMatch[2]

      if (currentFolder) {
        const filePath = `${currentFolder}\\${fileName}`
        await cipherAPI.saveFile(filePath, fileContent)
        appendMessage('assistant', 'Sistema', `📄 Archivo creado: ${fileName}`)
        await renderFileTree(currentFolder)
        await openFile(filePath, fileName)
      }
    }

    let cmdMatch
    while ((cmdMatch = cmdRegex.exec(text)) !== null) {
      const command = cmdMatch[1]
      appendMessage('assistant', 'Sistema', `⚡ Ejecutando: ${command}`)
      const active = terminalInstances.get(activeTerminalTab)
      if (active && active.term) {
        cipherAPI.terminalInput(active.ptyId, command + '\r')
      }
    }
  }

  function appendPlanMessage(text) {
    const msgEl = document.createElement('div')
    msgEl.className = 'ai-message assistant'
    msgEl.innerHTML = `
      <div class="ai-message-role">📋 Plan generado — edítalo si quieres</div>
      <textarea class="ai-plan-editor">${escapeHtml(text)}</textarea>
    `
    msgEl.querySelector('.ai-plan-editor').addEventListener('input', (e) => {
      currentPlan = e.target.value
    })
    messagesContainer.appendChild(msgEl)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  function appendMessage(type, role, content) {
    const msgEl = document.createElement('div')
    msgEl.className = `ai-message ${type}`
    msgEl.innerHTML = `
      <div class="ai-message-role">${role}</div>
      <div class="ai-message-content">${escapeHtml(content)}</div>
    `
    messagesContainer.appendChild(msgEl)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    return msgEl
  }

  function appendThinking() {
    const el = document.createElement('div')
    el.className = 'ai-thinking'
    el.innerHTML = `
      <span>Cipher IA está pensando</span>
      <div class="ai-thinking-dots">
        <span></span><span></span><span></span>
      </div>
    `
    messagesContainer.appendChild(el)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    return el
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
  }
}

// ════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ════════════════════════════════════════════════════════

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
      e.preventDefault()
      togglePanel('btn-search')
      document.getElementById('search-input').focus()
    }

    if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') {
      e.preventDefault()
      togglePanel('btn-git')
    }

    if (e.ctrlKey && e.code === 'KeyB') {
      e.preventDefault()
      togglePanel('btn-files')
    }

    if (e.ctrlKey && e.code === 'KeyP') {
      e.preventDefault()
      if (window.editor) window.editor.trigger('', 'workbench.action.quickOpen')
    }

    if (e.ctrlKey && e.code === 'KeyG') {
      e.preventDefault()
      if (window.editor) window.editor.trigger('', 'editor.action.gotoLine')
    }

    // Ctrl+W - Cerrar pestaña activa
    if (e.ctrlKey && e.code === 'KeyW') {
      e.preventDefault()
      if (activeTabPath) closeTab(activeTabPath)
    }
  })
}