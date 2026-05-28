export function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    js: 'javascript', ts: 'typescript', tsx: 'typescript',
    jsx: 'javascript', html: 'html', css: 'css', scss: 'css',
    json: 'json', md: 'markdown', py: 'python', rs: 'rust',
    go: 'go', cpp: 'cpp', c: 'c', cs: 'csharp', java: 'java',
    php: 'php', rb: 'ruby', sql: 'sql', yaml: 'yaml', yml: 'yaml',
    sh: 'shell', lua: 'lua', gd: 'plaintext', xml: 'xml',
    toml: 'plaintext', ini: 'ini',
  }
  return map[ext] || 'plaintext'
}

export function getTabIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const icons: Record<string, string> = {
    js: 'JS', ts: 'TS', tsx: 'TSX', jsx: 'JSX',
    html: 'HTML', css: 'CSS', py: 'PY',
    rs: 'RS', go: 'GO', cpp: 'C++',
    cs: 'C#', lua: 'LUA', md: 'MD',
  }
  return icons[ext] || '•'
}

// Color por extensión para el icono
export function getFileIconColor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const name = fileName.toLowerCase()

  if (name === 'package.json') return '#8bdc65'
  if (name === '.gitignore') return '#f47067'
  if (name === 'readme.md') return '#4fc3f7'
  if (name.includes('vite.config')) return '#f6d365'
  if (name.includes('eslint')) return '#b180ff'
  if (name.includes('tsconfig')) return '#75beff'

  const colors: Record<string, string> = {
    js: '#f7df1e', ts: '#75beff', tsx: '#75beff', jsx: '#f7df1e',
    html: '#ff8a4c', css: '#5ea1ff', scss: '#cd6799',
    json: '#f6d365', md: '#4fc3f7', py: '#6dbbff',
    rs: '#f74c00', go: '#5ed6e8', cpp: '#f34b7d',
    c: '#555555', cs: '#9b4f96', java: '#b07219',
    php: '#4f5d95', rb: '#701516', lua: '#000080',
    gd: '#355570', sql: '#e38c00', sh: '#89e051',
    png: '#a074c4', jpg: '#a074c4', svg: '#ffb13b',
    yaml: '#d19a66', yml: '#d19a66', xml: '#5ea1ff',
    toml: '#d19a66', ini: '#6d8086',
  }
  return colors[ext] || '#cccccc'
}

// SVG icon path por extensión
export function getFileIconPath(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  // Archivo genérico con letra
  return ext.toUpperCase().slice(0, 2)
}
