'use strict'

const { URL } = require('url')

function isPrivateIP(hostname) {
  const parts = hostname.split('.')
  if (parts.length === 4) {
    const o1 = parseInt(parts[0], 10)
    const o2 = parseInt(parts[1], 10)
    const o3 = parseInt(parts[2], 10)
    const o4 = parseInt(parts[3], 10)
    if (!isNaN(o1) && !isNaN(o2) && !isNaN(o3) && !isNaN(o4)) {
      if (o1 === 127) return true
      if (o1 === 10) return true
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return true
      if (o1 === 192 && o2 === 168) return true
    }
  }
  const cleanHost = hostname.toLowerCase()
  if (
    cleanHost === '::1' ||
    cleanHost === '0:0:0:0:0:0:0:1' ||
    cleanHost.startsWith('fe80:') ||
    cleanHost.startsWith('fc00:') ||
    cleanHost.startsWith('fd00:')
  ) {
    return true
  }
  return false
}

function requireValidAIUrl(urlStr) {
  if (!urlStr) return urlStr
  try {
    let toParse = urlStr
    if (!/^[a-zA-Z]+:\/\//.test(toParse)) {
      toParse = 'http://' + toParse
    }
    const parsed = new URL(toParse)
    const protocol = parsed.protocol
    const hostname = parsed.hostname

    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error('Protocol must be http: or https:')
    }

    if (protocol === 'http:') {
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]') {
        throw new Error('HTTP protocol is only allowed for localhost')
      }
    }

    if (isPrivateIP(hostname)) {
      if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')) {
        // Allowed loopback
      } else {
        throw new Error('Access to private IP is blocked')
      }
    }

    return urlStr
  } catch (e) {
    throw new Error(`URL invalida: ${e.message}`)
  }
}

function getSafeEnv(additionalEnv = {}) {
  const safeKeys = [
    'PATH', 'HOME', 'USER', 'LANG', 'SHELL', 'TERM', 'PWD', 'LOGNAME', 'TMPDIR', 'DISPLAY',
    'SYSTEMROOT', 'SYSTEM32', 'TEMP', 'TMP', 'USERNAME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
    'APPDATA', 'LOCALAPPDATA', 'COMPUTERNAME', 'COMSPEC', 'PATHEXT', 'OS', 'NUMBER_OF_PROCESSORS',
    'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'PROCESSOR_LEVEL', 'PROCESSOR_REVISION',
    'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMDATA', 'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)',
    'PUBLIC', 'ALLUSERSPROFILE', 'NODE_ENV', 'LANG', 'LC_ALL', 'LC_CTYPE'
  ]
  const safeEnv = {}
  const combined = { ...process.env, ...additionalEnv }
  for (const [key, val] of Object.entries(combined)) {
    const upperKey = key.toUpperCase()
    if (upperKey.includes('TOKEN') || upperKey.includes('KEY') || upperKey.includes('SECRET')) {
      continue
    }
    if (safeKeys.includes(upperKey) || upperKey.startsWith('LC_') || upperKey.startsWith('npm_config_')) {
      safeEnv[key] = val
    }
  }
  return safeEnv
}

module.exports = {
  requireValidAIUrl,
  getSafeEnv
}
