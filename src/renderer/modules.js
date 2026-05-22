// ════════════════════════════════════════════════════════
//  MENUBAR & DIALOGS
// ════════════════════════════════════════════════════════

function initMenubar() {
  const menuItems = document.querySelectorAll('.menu-item')
  
  // Cerrar todos los submenús cuando se hace click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-item')) {
      menuItems.forEach(item => {
        const submenu = item.querySelector('.submenu')
        if (submenu) {
          submenu.style.display = 'none'
        }
      })
    }
  })

  // Manejar hover y clicks en items del menú
  menuItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      // Cerrar otros submenús
      menuItems.forEach(otherItem => {
        if (otherItem !== item) {
          const submenu = otherItem.querySelector('.submenu')
          if (submenu) {
            submenu.style.display = 'none'
          }
        }
      })
      // Mostrar el submenu actual
      const submenu = item.querySelector('.submenu')
      if (submenu) {
        submenu.style.display = 'block'
      }
    })

    item.addEventListener('click', (e) => {
      e.stopPropagation()
    })
  })

  // Menubar actions
  const actions = {
    'new-file': () => createNewFile(),
    'open-folder': async () => {
      const folder = await cipherAPI.openFolder()
      if (folder) {
        currentFolder = folder
        await renderFileTree(folder)
      }
    },
    'save-file': async () => {
      if (window.currentFilePath) {
        const content = window.editor.getValue()
        await cipherAPI.saveFile(window.currentFilePath, content)
        document.querySelector('.tab-name').textContent = 
          document.querySelector('.tab-name').textContent.replace(' ●', '')
      }
    },
    'save-all': () => saveAllFiles(),
    'exit': () => cipherAPI.closeWindow(),
    'undo': () => window.editor?.trigger('', 'undo'),
    'redo': () => window.editor?.trigger('', 'redo'),
    'cut': () => window.editor?.trigger('', 'editor.action.clipboardCutAction'),
    'copy': () => window.editor?.trigger('', 'editor.action.clipboardCopyAction'),
    'paste': () => window.editor?.trigger('', 'editor.action.clipboardPasteAction'),
    'select-all': () => window.editor?.trigger('', 'editor.action.selectAll'),
    'select-line': () => window.editor?.trigger('', 'editor.action.smartSelect.expand'),
    'toggle-explorer': () => togglePanel('btn-files'),
    'toggle-search': () => togglePanel('btn-search'),
    'toggle-git': () => togglePanel('btn-git'),
    'toggle-terminal': () => toggleTerminalPanel(),
    'zoom-in': () => adjustZoom(1),
    'zoom-out': () => adjustZoom(-1),
    'go-to-line': () => {
      if (!window.editor) return
      // Usar confirm en lugar de prompt para Electron
      const response = confirm('Ir a línea (ej: 42)')
      if (response) {
        const lineNum = 42 // default
        window.editor.setPosition({ lineNumber: lineNum, column: 1 })
        window.editor.revealLine(lineNum)
      }
    },
    'go-to-file': () => {
      if (!currentFolder) {
        alert('Abre una carpeta primero')
        return
      }
      togglePanel('btn-search')
      document.getElementById('search-input').focus()
    },
    'new-terminal': () => createTerminalTab(),
    'clear-terminal': () => clearTerminal(),
    'about': () => showAbout(),
    'documentation': () => window.open('https://github.com/Rmatix/cipher')
  }

  document.querySelectorAll('.submenu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      const action = item.dataset.action
      if (actions[action]) {
        actions[action]()
        // Cerrar submenú después de hacer click
        menuItems.forEach(menuItem => {
          const submenu = menuItem.querySelector('.submenu')
          if (submenu) {
            submenu.style.display = 'none'
          }
        })
      }
    })
  })
}

function createNewFile() {
  // Crear nuevo archivo sin prompt() (no soportado en Electron/Chrome moderno)
  const fileName = 'sin título.js'
  
  if (window.editor) {
    const model = monaco.editor.createModel('', 'plaintext')
    window.editor.setModel(model)
    document.querySelector('.tab-name').textContent = fileName
    window.newFileName = fileName
  }
}

function saveAllFiles() {
  const tabs = document.querySelectorAll('.tab')
  tabs.forEach(tab => {
    const fileName = tab.querySelector('.tab-name').textContent.replace(' ●', '')
    if (window.currentFilePath) {
      const content = window.editor.getValue()
      cipherAPI.saveFile(window.currentFilePath, content)
    }
  })
}

function adjustZoom(direction) {
  if (!window.editor) return
  const currentSize = window.editor.getOption(monaco.editor.EditorOption.fontSize)
  const newSize = currentSize + direction * 2
  if (newSize >= 8 && newSize <= 28) {
    window.editor.updateOptions({ fontSize: newSize })
  }
}

function showAbout() {
  alert('Cipher v0.1.0\nOpen source code editor with multi-model AI agent\n\nAutor: Rmatix\nLicencia: MIT')
}

// ════════════════════════════════════════════════════════
//  SEARCH FUNCTIONALITY
// ════════════════════════════════════════════════════════

let openedFiles = new Map()

function initSearch() {
  const searchInput = document.getElementById('search-input')
  const replaceInput = document.getElementById('replace-input')
  const replaceToggle = document.getElementById('search-replace-toggle')
  const replaceAllBtn = document.getElementById('replace-all-btn')
  const searchResults = document.getElementById('search-results')

  // Validar que todos los elementos existen
  if (!searchInput || !searchResults) {
    console.warn('Search elements not found in DOM')
    return
  }

  if (replaceToggle) {
    replaceToggle.addEventListener('click', () => {
      const box = document.getElementById('replace-input-box')
      if (box) {
        box.style.display = box.style.display === 'none' ? 'flex' : 'none'
      }
    })
  }

  searchInput.addEventListener('input', async () => {
    const query = searchInput.value
    if (query.length < 2) {
      searchResults.innerHTML = ''
      return
    }
    
    if (!currentFolder) {
      searchResults.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b6b8a;">Abre una carpeta primero</div>'
      return
    }

    searchResults.innerHTML = '<div style="padding: 20px; text-align: center; color: #7c4dff;">Buscando...</div>'
    const results = await searchInFolder(currentFolder, query)
    displaySearchResults(results, searchResults)
  })

  if (replaceAllBtn) {
    replaceAllBtn.addEventListener('click', () => {
      const searchTerm = searchInput.value
      if (searchTerm && window.editor) {
        window.editor.trigger('', 'editor.action.startFindReplaceAction')
      }
    })
  }
}

async function searchInFolder(folderPath, query, results = []) {
  try {
    const items = await cipherAPI.readDirectory(folderPath)
    
    for (const item of items) {
      // Ignorar carpetas y archivos ocultos
      if (item.name.startsWith('.')) continue
      
      // Ignorar node_modules y otros directorios pesados
      if (item.isDirectory && ['node_modules', '.git', '.vscode', 'dist', 'build'].includes(item.name)) {
        continue
      }
      
      if (item.isDirectory) {
        await searchInFolder(item.path, query, results)
      } else {
        try {
          const content = await cipherAPI.readFile(item.path)
          const lines = content.split('\n')
          const matches = []
          
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              // Limitar a 100 caracteres y escapar HTML
              let displayText = line.trim()
              if (displayText.length > 100) {
                displayText = displayText.substring(0, 100) + '...'
              }
              displayText = displayText.replace(/</g, '&lt;').replace(/>/g, '&gt;')
              matches.push({ line: idx + 1, text: displayText })
            }
          })
          
          if (matches.length > 0) {
            results.push({ file: item.path, matches })
          }
        } catch (e) {
          // Ignorar archivos que no se pueden leer
        }
      }
    }
  } catch (e) {
    console.error('Error searching folder:', e)
  }
  
  return results
}

function displaySearchResults(results, container) {
  container.innerHTML = ''
  
  if (results.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b6b8a;">Sin resultados</div>'
    return
  }

  results.forEach(result => {
    const fileEl = document.createElement('div')
    fileEl.className = 'search-result-file'
    fileEl.textContent = result.file.split('\\').pop()
    container.appendChild(fileEl)

    result.matches.forEach(match => {
      const matchEl = document.createElement('div')
      matchEl.className = 'search-result-item search-result-match'
      matchEl.innerHTML = `
        <span class="search-match-line">${match.line}</span>
        <span>${match.text}</span>
      `
      matchEl.addEventListener('click', () => {
        openFile(result.file, result.file.split('\\').pop(), match.line - 1)
      })
      container.appendChild(matchEl)
    })
  })
}

// ════════════════════════════════════════════════════════
//  GIT INTEGRATION
// ════════════════════════════════════════════════════════

async function initGit() {
  const commitBtn = document.getElementById('btn-commit')
  const pushBtn = document.getElementById('btn-push')
  const pullBtn = document.getElementById('btn-pull')
  const logBtn = document.getElementById('btn-git-log')

  commitBtn?.addEventListener('click', handleCommit)
  pushBtn?.addEventListener('click', handlePush)
  pullBtn?.addEventListener('click', handlePull)
  logBtn?.addEventListener('click', handleLog)
}

async function refreshGitStatus() {
  if (!currentFolder) return

  try {
    const [status, branch] = await Promise.all([
      cipherAPI.gitStatus(currentFolder),
      cipherAPI.gitBranch(currentFolder)
    ])

    document.getElementById('git-branch-name').textContent = branch

    const changesList = document.getElementById('git-changes-list')
    changesList.innerHTML = ''

    const statusMap = { M: 'modified', A: 'added', D: 'deleted', U: 'unmerged' }

    status.forEach(item => {
      const el = document.createElement('div')
      el.className = 'git-file-item'
      
      const statusType = statusMap[item.status[0]] || item.status
      el.innerHTML = `
        <span class="git-status-badge git-status-${statusType}">${item.status}</span>
        <span>${item.file}</span>
      `
      changesList.appendChild(el)
    })
  } catch (e) {
    console.error('Error refreshing git status:', e)
  }
}

async function handleCommit() {
  if (!currentFolder) return

  const message = document.getElementById('git-commit-message').value
  if (!message.trim()) {
    alert('Escribe un mensaje de commit')
    return
  }

  const result = await cipherAPI.gitCommit(currentFolder, message)
  if (result.success) {
    document.getElementById('git-commit-message').value = ''
    alert('Commit realizado exitosamente')
    refreshGitStatus()
  } else {
    alert('Error: ' + result.error)
  }
}

async function handlePush() {
  if (!currentFolder) return
  const result = await cipherAPI.gitPush(currentFolder)
  alert(result.success ? 'Push realizado' : 'Error: ' + result.error)
  refreshGitStatus()
}

async function handlePull() {
  if (!currentFolder) return
  const result = await cipherAPI.gitPull(currentFolder)
  alert(result.success ? 'Pull realizado' : 'Error: ' + result.error)
  refreshGitStatus()
}

async function handleLog() {
  if (!currentFolder) return
  const log = await cipherAPI.gitLog(currentFolder)
  alert('Últimos commits:\n\n' + log)
}

// ════════════════════════════════════════════════════════
//  PANEL SWITCHING
// ════════════════════════════════════════════════════════

function togglePanel(panelId) {
  const icons = document.querySelectorAll('.sidebar-icon')
  const panel = document.getElementById('panel')

  icons.forEach(icon => {
    if (icon.id === 'btn-settings') return
    icon.classList.remove('active')
  })

  const panelMap = {
    'btn-files': { view: 'panel-files', header: 'EXPLORADOR' },
    'btn-search': { view: 'panel-search', header: 'BUSCAR' },
    'btn-git': { view: 'panel-git', header: 'CONTROL DE VERSIONES' }
  }

  const config = panelMap[panelId]
  if (!config) return

  document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'))
  document.getElementById(config.view)?.classList.add('active')
  document.getElementById('panel-header').textContent = config.header

  const icon = document.getElementById(panelId)
  if (icon) {
    if (panel.classList.contains('visible') && icon.classList.contains('active')) {
      panel.classList.remove('visible')
      icon.classList.remove('active')
    } else {
      panel.classList.add('visible')
      icon.classList.add('active')
      
      if (panelId === 'btn-git') {
        refreshGitStatus()
      }
    }
  }
}

// ════════════════════════════════════════════════════════
//  PROJECT DOCUMENTATION
// ════════════════════════════════════════════════════════

async function generateProjectMD() {
  if (!currentFolder) return

  const projectName = currentFolder.split('\\').pop()
  const stats = { files: 0, directories: 0, languages: {} }

  async function walkDir(path) {
    const items = await cipherAPI.readDirectory(path)
    for (const item of items) {
      if (item.name.startsWith('.')) continue
      if (item.isDirectory) {
        stats.directories++
        await walkDir(item.path)
      } else {
        stats.files++
        const ext = item.name.split('.').pop()
        stats.languages[ext] = (stats.languages[ext] || 0) + 1
      }
    }
  }

  await walkDir(currentFolder)

  const mdContent = `# ${projectName}

## Información del Proyecto

- **Archivos**: ${stats.files}
- **Directorios**: ${stats.directories}
- **Lenguajes**: ${Object.entries(stats.languages).map(([lang, count]) => `${lang}: ${count}`).join(', ')}

## Estructura

\`\`\`
${projectName}/
${Array.from(Array(Math.min(5, stats.directories))).map(() => '├── [carpeta]').join('\n')}
${Array.from(Array(Math.min(3, stats.files))).map(() => '├── [archivo]').join('\n')}
\`\`\`

---

*Generado con Cipher v0.1.0*
`

  return mdContent
}

function clearTerminal() {
  const activeInstance = terminalInstances.get(activeTerminalTab)
  if (activeInstance?.term) {
    activeInstance.term.write('\x1b[H\x1b[J')
  }
}
