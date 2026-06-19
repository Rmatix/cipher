# Cipher v2.8.0 — Release Notes
*Lanzamiento programado: 25 de Junio 2026 · 20:00 UTC*

---

## ✨ Novedades Principales

### Tres Ediciones Independientes
Cipher ahora se distribuye en tres productos independientes, cada uno optimizado para un perfil de usuario distinto:

- **Cipher Lite** — Editor de código esencial para usuarios finales. Incluye explorador de archivos, búsqueda, historial de cambios y notas. Sin dependencias de IA en segundo plano ni terminal integrada.
- **Cipher Dev** — Experiencia completa de desarrollo con agente IA conversacional, terminal integrada, soporte Git, sistema de Workflows y gestión de memoria de proyecto. Ideal para desarrolladores individuales.
- **Cipher Studio** — Edición profesional que agrega el SQL Viewer multi-motor (SQLite, PostgreSQL, MySQL, MSSQL), el Composer Multi-archivo y acceso completo a todas las capacidades del agente. Pensado para equipos y proyectos complejos.

---

## 🔒 Seguridad

- **DOMPurify** actualizado a `>=3.4.9` — Corrige vulnerabilidad de XSS crítica.
- **form-data** actualizado a `^4.0.6` — Corrige vulnerabilidad de inyección de encabezados HTTP.

---

## 🚀 Mejoras

### Instalador Renovado
- Instalador NSIS silencioso: registra automáticamente el perfil del producto, agrega al PATH del sistema y registra el menú contextual "Abrir con Cipher".
- Tres instaladores separados e independientes, con su propio icono y metadatos de registro.

### Auto-Updater con Delta
- Integración de `electron-updater` con soporte de `.blockmap` para actualizaciones incrementales.
- Notificación no bloqueante al renderer cuando hay una actualización lista.

### Panel de Agentes IA (AIPanel)
- Nuevas secciones: **MCP (Model Context Protocol)**, **Skills**, **Sub-agentes** y **System Prompts dinámicos**.
- Visualización del estado de servidores MCP conectados en tiempo real.

### Sidebar Adaptativo
- La barra lateral muestra únicamente los paneles disponibles para la edición instalada:
  - **Lite**: Explorador, Búsqueda, Notas, Historial
  - **Dev**: Todos excepto SQL Viewer
  - **Studio**: Sin restricciones

---

## 🐛 Correcciones

- **Pantalla negra al iniciar**: lecturas de archivos y registry ahora son completamente asíncronas.
- **TypeScript TS6133**: variables internas renombradas para cumplir con `noUnusedLocals`.
- **NSIS `${End}`**: corregido a `${EndIf}`.
- **NSIS warning 6001/6010**: eliminadas declaraciones `Var` globales y hooks no soportados.

---

## 🔧 Infraestructura

- **`scripts/build-all.js`**: convierte PNG→ICO y ejecuta electron-builder para los tres perfiles.
- **`src/main/updater.js`**: módulo dedicado para `electron-updater`, solo activo en producción.
- **`.github/workflows/release.yml`**: pipeline actualizado para publicar los tres instaladores. Lanzamiento automático: **25 de Junio 20:00 UTC**.
- Nuevos scripts npm: `dist:lite`, `dist:dev`, `dist:studio`, `dist:all`.

---

*Cipher Engineering Team · Generado con changelog-generator*
