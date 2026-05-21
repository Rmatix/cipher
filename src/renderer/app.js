const cipherAPI = window.cipher

let currentFolder = null

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen')
    const app = document.getElementById('app')
    splash.style.transition = 'opacity 0.8s ease'
    splash.style.opacity = '0'
    setTimeout(() => {
      splash.style.display = 'none'
      app.style.display = 'flex'
      initMonaco()
      initSidebar()
      initFolder()
    }, 800)
  }, 2500)
})

function initMonaco() {
  require.config({
    paths: {
      vs: 'C:/Users/Janus/Desktop/Proyectos/cipher/node_modules/monaco-editor/min/vs'
    }
  })

  require(['vs/editor/editor.main'], function() {
    window.editor = monaco.editor.create(
      document.getElementById('editor-container'), {
        value: '// Bienvenido a Cipher Code Editor\n// Abre una carpeta para empezar\n\nconsole.log("Hello from Cipher!")',
        language: 'javascript',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: 'Consolas, monospace',
        minimap: { enabled: true },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        roundedSelection: true,
        cursorStyle: 'line',
      }
    )

    window.editor.onDidChangeCursorPosition(e => {
      document.querySelector('.status-right .status-item:last-child').textContent =
        `Ln ${e.position.lineNumber}, Col ${e.position.column}`
    })

    // Guardar con Ctrl+S — DENTRO del require
    window.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      if (window.currentFilePath) {
        const content = window.editor.getValue()
        await cipherAPI.saveFile(window.currentFilePath, content)
        const tabName = document.querySelector('.tab-name')
        tabName.textContent = tabName.textContent.replace(' ●', '')
      }
    })
  })
}

function initSidebar() {
  const icons = document.querySelectorAll('.sidebar-icon')
  const panel = document.getElementById('panel')
  const panelHeader = document.getElementById('panel-header')

  const panels = {
    'btn-files': 'EXPLORADOR',
    'btn-search': 'BUSCAR',
    'btn-git': 'CONTROL DE VERSIONES',
    'btn-ai': 'AGENTE IA',
  }

  icons.forEach(icon => {
    if (icon.id === 'btn-settings') return
    icon.addEventListener('click', () => {
      const isActive = icon.classList.contains('active')
      icons.forEach(i => i.classList.remove('active'))
      if (isActive) {
        panel.classList.remove('visible')
      } else {
        icon.classList.add('active')
        panel.classList.add('visible')
        panelHeader.textContent = panels[icon.id] || 'PANEL'
      }
    })
  })
}

function initFolder() {
  document.getElementById('btn-open-folder').addEventListener('click', async () => {
    const folderPath = await cipherAPI.openFolder()
    if (!folderPath) return
    currentFolder = folderPath
    await renderFileTree(folderPath)
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

async function openFile(filePath, fileName) {
  window.currentFilePath = filePath
  const content = await cipherAPI.readFile(filePath)
  const lang = getLanguage(fileName)

  if (window.editor) {
    const model = monaco.editor.createModel(content, lang)
    window.editor.setModel(model)

    window.editor.onDidChangeModelContent(() => {
      const tabName = document.querySelector('.tab-name')
      if (!tabName.textContent.includes(' ●')) {
        tabName.textContent = tabName.textContent + ' ●'
      }
    })
  }

  document.querySelector('.tab-name').textContent = fileName
  document.querySelector('.tab-icon').textContent = getTabIcon(fileName)
  document.querySelector('.status-right .status-item:first-child').textContent = lang
}

function getLanguage(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const map = {
    js: 'javascript', ts: 'typescript', html: 'html', css: 'css',
    json: 'json', md: 'markdown', py: 'python', rs: 'rust',
    go: 'go', cpp: 'cpp', c: 'c', cs: 'csharp', java: 'java',
    php: 'php', rb: 'ruby', sql: 'sql', yaml: 'yaml', yml: 'yaml',
    sh: 'shell', lua: 'lua', gd: 'plaintext'
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