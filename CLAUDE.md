# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands
- Start application: `pnpm start`
- Install dependencies: `pnpm install`

## Architecture
Cipher is an Electron-based code editor featuring a multi-model AI agent.

### Process Structure
- **Main Process**: `src/main/index.js` handles system-level operations, window management, and native API access.
- **Preload Script**: `src/main/preload.js` bridges the main and renderer processes, providing a secure API for the frontend.
- **Renderer Process**: Located in `src/renderer/`, this is the frontend of the editor.
  - `app.js`: Primary logic for the renderer.
  - `index.html` / `styles.css`: The UI shell and styling.
  - `modules.js`: Core modular logic for editor features.

### Key Components
- **Editor**: Uses `monaco-editor` for a VS Code-like editing experience.
- **Terminal**: Integrated terminal powered by `xterm` and `node-pty`.
- **AI Integration**: Supports multiple models (Claude, GPT, Gemini, Qwen, Kimi, Grok) and local providers (Ollama, LM Studio).
- **Project Memory**: Implements persistent memory per project.
