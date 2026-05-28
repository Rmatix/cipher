# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands
- Start Electron app: `pnpm start` (from root)
- Install root dependencies: `pnpm install`
- Start Renderer dev server: `cd renderer && pnpm dev`
- Build Renderer: `cd renderer && pnpm build`
- Install Renderer dependencies: `cd renderer && pnpm install`

## Architecture
Cipher is an Electron-based code editor featuring a multi-model AI agent.

### Process Structure
- **Main Process**: `src/main/index.js`
  - Handles window management and system-level APIs.
  - Manages terminal sessions using `node-pty`.
  - Implements file system operations and Git integration via `child_process.execSync`.
  - Coordinates AI API calls to multiple providers.
- **Preload Script**: `src/main/preload.js`
  - Bridges the main and renderer processes via a secure IPC API.
- **Renderer Process**: Located in `renderer/` (React + TypeScript + Vite).
  - **State Management**: Uses `zustand` in `renderer/src/store/useStore.ts`.
  - **Components**: Organized in `renderer/src/components/` (ai, editor, layout, sidebar, terminal).
  - **Entry Point**: `renderer/src/main.tsx` and `renderer/src/App.tsx`.

### Key Components
- **Editor**: Powered by `@monaco-editor/react` for a VS Code-like experience.
- **Terminal**: Integrated terminal using `xterm` (frontend) and `node-pty` (backend).
- **AI Integration**: Supports a wide range of models including:
  - Cloud: Claude, GPT, Gemini, DeepSeek, Kimi, Qwen, OpenRouter, NVIDIA NIM.
  - Local: Ollama, LM Studio.
- **Git Integration**: Provides basic version control features (status, branch, commit, push, pull, log).
- **Project Memory**: Persistent memory implemented per project.
