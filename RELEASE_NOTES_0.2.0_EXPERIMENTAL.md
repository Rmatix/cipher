# Cipher v0.2.0 experimental

Estado: experimental e incompleto.

## Cambios principales

- Se corrigio el contrato TypeScript de `aiStreamStart` para aceptar las opciones `webSearch` y `thinking`.
- Se conectaron esas opciones en el proceso principal de Electron para que no queden como toggles visuales sin efecto.
- OpenRouter ahora envia la herramienta `openrouter:web_search` cuando la busqueda web esta activa.
- Los proveedores sin herramienta web nativa reciben una instruccion clara indicando que la busqueda web no esta disponible desde Cipher.
- Se corrigieron los acordeones de razonamiento en el panel IA y el debugger IA para pasar ESLint con React 19.
- Se ajusto el Debugger IA para mostrar solo errores y advertencias accionables; las sugerencias de TypeScript ya no llenan el panel.
- Se sincronizan y limpian los diagnostics del archivo activo al cambiar el contenido para evitar problemas viejos atascados en el Debugger IA.
- El toggle de busqueda web ahora queda limitado visual y logicamente a modelos OpenRouter.
- Se corrigio un bloqueo critico donde el splash screen podia quedar como overlay invisible y evitar manipular la app despues de la carga.
- Se corrigio la opcion "Usar archivo activo como contexto": ahora inyecta el contenido actual de Monaco, incluso si no esta guardado, y no se pierde cuando existe un system prompt.
- Se corrigio el cursor visual de "Razonamiento (Thinking)" para que no parezca deshabilitado.
- Se agregaron iconos SVG de Material Icon Theme para archivos y carpetas del explorador, con mapeo por nombre de archivo, extension y carpeta.
- Se agrego soporte de vista previa para imagenes, audios y videos desde el editor sin leer esos archivos como texto.
- Se agrego un canal seguro `read-file-data-url` en Electron para abrir medios dentro de las rutas permitidas del proyecto.
- Se corrigio el panel de historial: ahora existe la vista `HistoryPanel`, el store acepta `history`, y el menu superior puede abrirla.
- Se rediseno el panel inferior con una terminal mas completa: perfiles de shell, nuevo terminal, split terminal, limpiar, matar proceso y menu de acciones.
- Se agrego `Ports` funcional para detectar puertos locales en escucha y abrir/copiar URLs `localhost`.
- Se reemplazo el panel exclusivo `Azure` por `Cloud`, con deteccion de CLI para Azure, GCP y AWS.
- Se agregaron acciones rapidas `Worktree`, `Open Changes` y `Split Editor Down`.
- Se preparo configuracion de empaquetado experimental para macOS y Linux, ademas de Windows.
- Se actualizo la version del proyecto a `0.2.0`.
- Se actualizo el README para describir esta entrega como experimental/incompleta.

## Verificacion

- `pnpm lint`
- `pnpm build`

## Notas pendientes

- El bundle del renderer supera 500 kB despues de minificar; Vite solo lo marca como advertencia. Conviene dividir codigo con imports dinamicos en una iteracion futura.
- La busqueda web real esta implementada para OpenRouter. En otros proveedores el control queda deshabilitado porque el modelo/proveedor no expone esa herramienta desde Cipher.
- Esta version todavia necesita pruebas manuales amplias antes de tratarse como release estable.
