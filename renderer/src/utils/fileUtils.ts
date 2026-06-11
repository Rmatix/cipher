export type FileKind = 'text' | 'image' | 'audio' | 'video'

const materialIconBase = './material-icons/'

const imageExtensions = new Set(['avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'webp'])
const audioExtensions = new Set(['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav'])
const videoExtensions = new Set(['avi', 'm4v', 'mkv', 'mov', 'mp4', 'ogv', 'webm'])

const extensionIcons: Record<string, string> = {
  c: 'cpp.svg',
  cpp: 'cpp.svg',
  cs: 'csharp.svg',
  css: 'css.svg',
  csv: 'database.svg',
  env: 'settings.svg',
  gif: 'image.svg',
  go: 'go.svg',
  h: 'cpp.svg',
  htm: 'html.svg',
  html: 'html.svg',
  ico: 'image.svg',
  ini: 'settings.svg',
  java: 'java.svg',
  jpeg: 'image.svg',
  jpg: 'image.svg',
  js: 'javascript.svg',
  json: 'json.svg',
  jsx: 'react.svg',
  lock: 'lock.svg',
  log: 'document.svg',
  m4a: 'audio.svg',
  md: 'markdown.svg',
  mp3: 'audio.svg',
  mp4: 'video.svg',
  pdf: 'pdf.svg',
  php: 'php.svg',
  png: 'image.svg',
  ps1: 'powershell.svg',
  py: 'python.svg',
  rb: 'ruby.svg',
  rs: 'rust.svg',
  scss: 'css.svg',
  sh: 'console.svg',
  sql: 'database.svg',
  svg: 'svg.svg',
  toml: 'settings.svg',
  ts: 'typescript.svg',
  tsx: 'react_ts.svg',
  txt: 'document.svg',
  wav: 'audio.svg',
  webm: 'video.svg',
  xml: 'xml.svg',
  yaml: 'yaml.svg',
  yml: 'yaml.svg',
};

// ── Supported languages for multi‑language workflows ──
export const SUPPORTED_LANGUAGES = ['python', 'cpp', 'rust'] as const;

const fileNameIcons: Record<string, string> = {
  '.env': 'settings.svg',
  '.eslintignore': 'eslint.svg',
  '.eslintrc': 'eslint.svg',
  '.eslintrc.cjs': 'eslint.svg',
  '.eslintrc.js': 'eslint.svg',
  '.gitattributes': 'git.svg',
  '.gitignore': 'git.svg',
  '.gitlab-ci.yml': 'gitlab.svg',
  'claude.md': 'markdown.svg',
  'docker-compose.yml': 'docker.svg',
  'dockerfile': 'docker.svg',
  'eslint.config.js': 'eslint.svg',
  'index.html': 'html.svg',
  'package-lock.json': 'npm.svg',
  'package.json': 'nodejs.svg',
  'pnpm-lock.yaml': 'lock.svg',
  'readme.md': 'readme.svg',
  'tsconfig.json': 'typescript-def.svg',
  'tsconfig.app.json': 'typescript-def.svg',
  'tsconfig.node.json': 'typescript-def.svg',
  'vite.config.js': 'vite.svg',
  'vite.config.ts': 'vite.svg',
}

const folderIcons: Record<string, string> = {
  '.github': 'folder-github.svg',
  '.vscode': 'folder-config.svg',
  assets: 'folder-images.svg',
  components: 'folder-components.svg',
  debug: 'folder-debug.svg',
  dist: 'folder-dist.svg',
  editor: 'folder-src.svg',
  history: 'folder-store.svg',
  layout: 'folder-layout.svg',
  memory: 'folder-store.svg',
  node_modules: 'folder-node.svg',
  public: 'folder-public.svg',
  renderer: 'folder-src.svg',
  settings: 'folder-config.svg',
  shared: 'folder-shared.svg',
  sidebar: 'folder-layout.svg',
  src: 'folder-src.svg',
  store: 'folder-store.svg',
  terminal: 'folder-debug.svg',
  types: 'folder-src.svg',
  utils: 'folder-utils.svg',
}

export function getFileExtension(fileName: string): string {
  const lowerName = fileName.toLowerCase()
  if (lowerName.startsWith('.') && !lowerName.includes('.', 1)) return lowerName.slice(1)
  return lowerName.split('.').pop() || ''
}

export function getFileKind(fileName: string): FileKind {
  const ext = getFileExtension(fileName)
  if (imageExtensions.has(ext)) return 'image'
  if (audioExtensions.has(ext)) return 'audio'
  if (videoExtensions.has(ext)) return 'video'
  return 'text'
}

export function getLanguage(fileName: string): string {
  const kind = getFileKind(fileName)
  if (kind !== 'text') return kind

  const ext = getFileExtension(fileName)
  const map: Record<string, string> = {
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    css: 'css',
    gd: 'plaintext',
    go: 'go',
    h: 'cpp',
    html: 'html',
    ini: 'ini',
    java: 'java',
    js: 'javascript',
    json: 'json',
    jsx: 'javascript',
    lua: 'lua',
    md: 'markdown',
    php: 'php',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    scss: 'css',
    sh: 'shellscript',
    bat: 'bat',
    cmd: 'bat',
    ps1: 'powershell',
    pl: 'perl',
    sql: 'sql',
    toml: 'plaintext',
    ts: 'typescript',
    tsx: 'typescript',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
  }

  return map[ext] || 'plaintext'
}

export function getTabIcon(fileName: string): string {
  const ext = getFileExtension(fileName)
  const icons: Record<string, string> = {
    c: 'C',
    cpp: 'C++',
    cs: 'C#',
    css: 'CSS',
    go: 'GO',
    html: 'HTML',
    js: 'JS',
    jsx: 'JSX',
    lua: 'LUA',
    md: 'MD',
    py: 'PY',
    rs: 'RS',
    ts: 'TS',
    tsx: 'TSX',
  }
  return icons[ext] || '*'
}

export function getFileIconColor(fileName: string): string {
  const ext = getFileExtension(fileName)
  const name = fileName.toLowerCase()

  if (name === 'package.json') return '#8bdc65'
  if (name === '.gitignore') return '#f47067'
  if (name === 'readme.md') return '#4fc3f7'
  if (name.includes('vite.config')) return '#f6d365'
  if (name.includes('eslint')) return '#b180ff'
  if (name.includes('tsconfig')) return '#75beff'

  const colors: Record<string, string> = {
    c: '#555555',
    cpp: '#f34b7d',
    cs: '#9b4f96',
    css: '#5ea1ff',
    go: '#5ed6e8',
    html: '#ff8a4c',
    java: '#b07219',
    js: '#f7df1e',
    jsx: '#f7df1e',
    lua: '#000080',
    md: '#4fc3f7',
    php: '#4f5d95',
    py: '#6dbbff',
    rb: '#701516',
    rs: '#f74c00',
    scss: '#cd6799',
    sh: '#89e051',
    sql: '#e38c00',
    ts: '#75beff',
    tsx: '#75beff',
    xml: '#5ea1ff',
    yaml: '#d19a66',
    yml: '#d19a66',
  }
  return colors[ext] || '#cccccc'
}

export function getMaterialFileIcon(fileName: string): string {
  const lowerName = fileName.toLowerCase()
  const ext = getFileExtension(fileName)
  const icon = fileNameIcons[lowerName] || extensionIcons[ext] || 'file.svg'
  return `${materialIconBase}${icon}`
}

export function getMaterialFolderIcon(folderName: string, open = false): string {
  const lowerName = folderName.toLowerCase()
  const icon = folderIcons[lowerName] || 'folder.svg'
  if (!open) return `${materialIconBase}${icon}`
  return `${materialIconBase}${icon.replace(/\.svg$/, '-open.svg')}`
}

export function isSupportedLanguage(fileName: string): boolean {
  const lang = getLanguage(fileName) as typeof SUPPORTED_LANGUAGES[number]
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)
}

export function getFileIconPath(fileName: string): string {
  return getMaterialFileIcon(fileName)
}
