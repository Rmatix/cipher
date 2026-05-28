# Cipher Code Editor

Cipher es un editor de codigo open source para Windows, construido con Electron, React, TypeScript, Monaco Editor y un panel de agente IA multi-proveedor.

> Estado: primera version oficial temprana (`v0.1.0`). La build publicada es oficial, pero no esta firmada digitalmente todavia.

## Caracteristicas

- Editor Monaco con tema oscuro Cipher, minimapa, ajuste de linea, formato y atajos de guardado.
- Explorador de archivos, busqueda de proyecto, panel Git y terminal integrada.
- Panel inferior con `Problems`, `Output`, `Debug Console`, `Terminal`, `Ports` y `Azure`.
- `Problems` analiza el archivo activo para detectar conflictos Git, `TODO/FIXME`, `console.log`, lineas largas y JSON invalido.
- Agente IA con modo Chat, Plan y Dev.
- Soporte para OpenRouter, NVIDIA NIM, Ollama, LM Studio, Anthropic, OpenAI, Google Gemini, DeepSeek y modelos compatibles con OpenAI.
- Compatibilidad inicial con Claude Code y OpenAI Codex CLI.
- Configuracion de API keys por proveedor y por modelo.
- Interfaz Electron sin marco, splash screen y controles tipo editor profesional.

## Descargar

La primera build oficial se publica como ZIP para Windows en la seccion de GitHub Releases.

Como esta version aun no esta firmada, Windows SmartScreen puede mostrar una advertencia al ejecutar `Cipher.exe`. Esto no significa automaticamente que el archivo sea peligroso; significa que el ejecutable no tiene certificado de firma de codigo ni reputacion publica acumulada. Puedes revisar y compilar el codigo fuente de este repositorio si prefieres verificarlo por tu cuenta.

## Requisitos

- Windows 10 o Windows 11.
- Node.js 20 o superior.
- pnpm 11 o superior.
- Git.
- Visual Studio 2022 Build Tools o Visual Studio Community con componentes C++ para empaquetar la app.

Componentes recomendados de Visual Studio Installer:

```text
MSVC v143 - VS 2022 C++ x64/x86 build tools
MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs
Windows 10 SDK o Windows 11 SDK
```

La terminal integrada usa `node-pty`, una dependencia nativa que compila partes en C++. Si falta el componente Spectre, `pnpm dist` puede fallar con `MSB8040`.

## Compilar desde codigo fuente

Clona el repositorio:

```bash
git clone https://github.com/Rmatix/cipher.git
cd cipher
```

Instala dependencias:

```bash
pnpm install
pnpm approve-builds electron-winstaller
```

Ejecuta en desarrollo:

```bash
pnpm dev
```

Compila el renderer:

```bash
pnpm build
```

Empaqueta para Windows:

```bash
pnpm dist
```

Los artefactos generados quedan en `release/`. Esa carpeta no se sube al repositorio.

## Build sin firma

La build oficial `v0.1.0` se distribuye sin firma digital. Para generar una build ZIP sin firma desde tu maquina puedes usar:

```bash
pnpm build
pnpm exec electron-builder --win zip --x64 --config.directories.output=release-build-nosign --config.win.signAndEditExecutable=false
```

Nota: `signAndEditExecutable=false` evita problemas de permisos con `winCodeSign`, pero tambien puede impedir que Electron Builder inserte correctamente el icono del `.exe`. Para un release final con icono embebido y metadata completa, usa `pnpm dist` con Modo de programador activo o una terminal con permisos adecuados.

## Firma digital

Firmar el ejecutable sirve para reducir advertencias de Windows SmartScreen y demostrar que el archivo viene del publicador original.

Para firmar builds de Windows necesitas:

- Un certificado de firma de codigo emitido por una autoridad certificadora, por ejemplo SSL.com, DigiCert o Sectigo.
- Configurar Electron Builder con el certificado (`CSC_LINK` y `CSC_KEY_PASSWORD`) o firmar manualmente con `signtool.exe`.
- Mantener protegida la clave privada del certificado.

Mientras Cipher no tenga certificado, las releases pueden publicarse como builds oficiales sin firma, indicando claramente esta condicion.

## Comandos disponibles

```bash
pnpm install       # Instala dependencias
pnpm dev           # Vite + Electron en modo desarrollo
pnpm start         # Ejecuta Electron con build existente
pnpm build         # Compila el renderer de produccion
pnpm pack          # Genera app desempaquetada con electron-builder
pnpm dist          # Genera instalador y ZIP de Windows
pnpm lint          # Revisa el renderer con ESLint
pnpm preview       # Preview local del renderer
```

## Estructura

```text
cipher/
  src/
    main/              Proceso principal de Electron e IPC
  renderer/
    src/               Aplicacion React + TypeScript
    public/            Assets publicos del renderer
    vite.config.ts     Build del renderer hacia src/renderer-dist
```

## Configuracion IA

- OpenRouter, NVIDIA NIM, Anthropic, OpenAI, Google, DeepSeek, Kimi y Qwen requieren API key.
- Ollama requiere el servicio local en `http://localhost:11434`.
- LM Studio requiere el servidor local compatible con OpenAI en `http://localhost:1234/v1`.
- Los modelos personalizados permiten guardar proveedor, ID, URL base opcional y API key.
- Claude Code se comprueba con `claude --version` y puede ejecutarse en modo Dev con `claude -p`.
- Codex CLI se comprueba con `codex --version` y puede ejecutarse en modo Dev con `codex exec`.

## Contribuir

Las contribuciones son bienvenidas. Puedes ayudar reportando bugs, probando builds, mejorando la interfaz, agregando integraciones o proponiendo nuevas funciones.

Antes de abrir un pull request:

```bash
pnpm lint
pnpm build
```

Lee [CONTRIBUTING.md](CONTRIBUTING.md) para mas detalles.

## Donar

Si Cipher te parece util y quieres apoyar su crecimiento, puedes donar o contactarme desde mi portafolio de GitHub:

[Rmatix/Rmatix](https://github.com/Rmatix/Rmatix)

Los donativos ayudan a mejorar el proyecto con mejores builds, firma digital, pruebas en mas equipos, diseno, documentacion, nuevas funciones de IA y mas tiempo de desarrollo.

## Repositorio

Repositorio oficial: [Rmatix/cipher](https://github.com/Rmatix/cipher)

## Licencia

MIT
