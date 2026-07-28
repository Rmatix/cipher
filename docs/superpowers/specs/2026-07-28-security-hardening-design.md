# Phase 1: Security Hardening

**Date:** 2026-07-28
**Status:** Approved — implementation pending
**Covers:** Dependabot vulnerabilities, CSP, SSRF prevention, MCP hardening, SQL injection fixes, IPC hardening, env leak

---

## Section 1: Content Security Policy (CSP)

**Current state:** No CSP anywhere — no meta tag in renderer HTML, no header injection from main process.

**Fix:**
1. Inject CSP via `session.defaultSession.webRequest.onHeadersReceived` in `src/main/index.js`:
   - `default-src 'self'`
   - `script-src 'self'`
   - `style-src 'self' 'unsafe-inline'`
   - `connect-src 'self' http://localhost:* https://api.openai.com https://api.anthropic.com https://api.groq.com https://api.deepseek.com https://api.moonshot.cn https://dashscope.aliyuncs.com https://api.nvidia.com https://generativelanguage.googleapis.com`
   - `img-src 'self' data: https://*`
   - `font-src 'self' data:`
2. CSP meta tag in `renderer/index.html` as defense-in-depth fallback.
3. In development, loosen `connect-src` to allow `http://localhost:*` but keep script-src strict.

---

## Section 2: Dependabot Vulnerabilities — Dependency Overrides

| Dependency | Vulnerability | CWE | Severity | Fix |
|---|---|---|---|---|
| `shell-quote` (1.8.4) | Quadratic-complexity DoS in `parse()` | CWE-407 | High | Override to `^1.8.6` |
| `brace-expansion` (1.1.15) | DoS via exponential-time expansion | — | High | Override to `brace-expansion@^5.0.6` (already in tree) + pin transitive old versions |
| `fast-uri` (3.1.2) | Host confusion via failed IDN canonicalization | — | High | Override to `>=3.1.3` |
| `fast-uri` (3.1.2) | Host confusion via literal backslash authority delimiter | — | High | Same override `>=3.1.3` |
| `tar` (7.5.16) | Process crash via PAX numeric path type confusion | — | Moderate | Override to `>=7.5.17` |
| `DOMPurify` (3.4.11) | Bypass `afterSanitizeElements` for custom elements | — | Low | Override to `>=3.4.12` or latest |

All overrides added to `package.json → overrides` block, then `pnpm install` to regenerate lockfile.

---

## Section 3: SSRF Prevention — AI Provider URLs

**Problem:** `baseUrl` (OpenAI-compatible), `url` (Ollama), `host` (LMStudio), and `serverConfig.url` (MCP-SSE) are accepted from the renderer without validation — SSRF primitive that can leak API keys.

**Fix:** Create a shared helper in `src/main/url-validator.js`:
- `requireValidAIUrl(url)` — allows `https://` always, `http://localhost` only, blocks private IPs (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Apply in: `ai-stream-start`, `ai-chat`, `ai-complete`, `ollama-list`, `lmstudio-list`
- Apply in MCP: `mcp:connect` (SSE), `mcp:test-server`

---

## Section 4: MCP stdio Process Hardening

**Problem dual:**
1. `mcp:add-server` persists `command`+`args` without validation → arbitrary binary execution
2. Auto-start on app ready executes any persisted config

**Fix:**
1. On `mcp:add-server`: validate `command` resolves to a real binary via `which` (macOS/Linux) or `where` (Windows)
2. Sanitize `args`: strip shell metacharacters, block path-injection patterns
3. On auto-start: re-validate loaded servers before spawning
4. Add `trusted: true/false` field to server config; untrusted servers skip auto-connect

---

## Section 5: DevTools Exposure

**Problem:** F2 opens DevTools in production; `open-devtools` IPC handler has no environment guard.

**Fix:**
1. `src/main/index.js`: Remove F2 from the DevTools shortcut list
2. `open-devtools` IPC handler: guard with `if (!app.isPackaged)` — only accessible in development

---

## Section 6: SQL Injection + SQLite Path Injection in db-bridge

**Problem:**
1. `quote()`/`quoteTable()` in `src/main/db-bridge.js` don't escape embedded quotes → SQL injection via renderer-supplied column/table names
2. `db:create-sqlite` creates SQLite files at any disk path — no `allowedRoots` check
3. `openSQLite` opens any SQLite file path

**Fix:**
1. `quote()` — dialect-aware escaping:
   - SQLite/PostgreSQL/MSSQL: `"col"` → recreate with `""` → `""col""`; or use dialect-native escaping
   - MSSQL: `[name]` → escape `]` by doubling
   - MySQL: `` `name` `` → escape `` ` `` by doubling
2. `quoteTable()` — same dialect-aware logic
3. `db:create-sqlite` and `openSQLite`: validate `filePath` against `allowedRoot` using the existing `requireAllowedPath` helper

---

## Section 7: AI CLI Runner Hardening

**Problem:** `ai-cli-run` executes `execFileSync(cli.command, args)` where `prompt` comes from renderer with no validation.

**Fix:**
1. Validate `cwd` is within `allowedRoots`
2. Sanitize prompt: max 10,000 chars, trim
3. Timeout: 60 seconds maximum
4. Log executed commands to audit log (`~/.cipher/cli-audit.log`)

---

## Section 8: Info Leakage — Terminal environment, Git, DuckDuckGo

**Problems:**
1. `node-pty.spawn` passes entire `process.env` to shell children — leaks API keys
2. `git-commit` message passed unsanitized
3. `searchDuckDuckGo` scrapes HTML; output goes into AI context without full sanitization

**Fix:**
1. Filter `env` before passing to `node-pty.spawn` and MCP stdio processes: whitelist only safe env vars (PATH, HOME, USER, LANG, etc.), exclude anything containing `TOKEN`, `KEY`, `SECRET`
2. `git-commit`: sanitize message — strip leading dashes, max 500 chars, trim whitespace
3. `searchDuckDuckGo`: apply `decodeHtmlEntities` + strip residual HTML tags from title and snippet before passing to LLM context

---

## Files affected

| File | Sections |
|---|---|
| `src/main/index.js` | 1 (CSP injection), 3 (SSRF via AI URLs), 5 (F2 + DevTools guard), 7 (CLI runner hardening), 8 (terminal env, git, DDG) |
| `src/main/preload.js` | 5 (DevTools IPC guard) |
| `src/main/mcp.js` | 3 (SSRF via MCP-SSE), 4 (server validation, trusted flag) |
| `src/main/db-bridge.js` | 6 (SQL injection fixes, SQLite path validation) |
| `src/main/url-validator.js` | 3 (New file — AI URL validation helper) |
| `renderer/index.html` | 1 (CSP meta tag) |
| `package.json` | 2 (Dependabot overrides) |
| `pnpm-lock.yaml` | 2 (Regenerated by `pnpm install`) |

---

## What is NOT in this phase

|Deferred to future phase|Reason|
|---|---|
|Hardcoded colors / light theme fix|Phase: Visual + Design|
|MCP `tools/call` broken response dispatch|Phase: Functional bugs|
|MCP initialize `id===1` reconnectBug| Phase: Functional bugs|
|`zoomFactor: 1.08` hardcoded| Phase: Functional bugs|
|Duplicated components (parseMarkdown etc.)| Phase: Code cleanup|
|12 panels rendered simultaneously| Phase: Performance|
|MSSQL empty schema result| Phase: Functional bugs|
|Dead code removal (`httpGetJson`, etc.)| Phase: Code cleanup|
|Unsigned auto-updates| Phase: Build/infra (needs cert setup)|