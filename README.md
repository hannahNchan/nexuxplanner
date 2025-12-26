# Nexux Planner

Planeador tipo Monday / Trello / Jira construido con React, TypeScript y Vite.

## Stack

- React 18 + Vite
- TypeScript
- Material UI
- @hello-pangea/dnd
- Axios
- Quill 2

## Estructura (Feature-Based)

```
src/
  app/               # Composición de la app
  features/
    api/             # Clientes HTTP y servicios
    board/           # Tablero y drag & drop
    editor/          # Editor WYSIWYG
  shared/
    types/           # Tipos compartidos
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Notas

- El editor WYSIWYG usa `quill@2.0.3`.
- El tablero usa `@hello-pangea/dnd` para drag & drop.
