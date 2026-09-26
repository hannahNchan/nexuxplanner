# NexusPlanner Frontend

NexusPlanner es una aplicación de planificación de trabajo inspirada en Jira, Plane, Monday y Trello. Organiza el trabajo en organizaciones, proyectos, backlog, sprints, tablero, épicas, roadmap, reportes y notas.

Este repositorio contiene el frontend React y los contratos Supabase que necesita para desarrollo local: migraciones, Edge Functions, scripts de migración y el CLI de NexusPlanner. El despliegue self-hosted puede vivir en un repositorio backend separado, pero este repositorio sigue siendo la fuente de verdad de la interfaz y de los contratos que consume.

## Documentación Para Agentes

Un LLM debe leer estos archivos antes de editar:

1. `AGENTS.md`: reglas operativas obligatorias.
2. `docs/llm-frontend-guide.md`: mapa funcional y técnico del frontend.
3. `CHATGPT.md`: referencia amplia del producto, datos y reglas de negocio.
4. `CODEX.md`: invariantes globales y rutas hacia documentación por módulo.
5. El `CODEX.md` del feature que se vaya a modificar.

No deduzcas reglas de negocio por el aspecto de la UI. Verifica el componente, su hook, el servicio en `src/features/api` y, cuando corresponda, la migración o RPC que autoriza la operación.

## Stack

- React 18, TypeScript y Vite 5.
- React Router.
- Material UI 5, MUI X Data Grid y Date Pickers.
- Supabase Auth, Postgres/Data API, Realtime, Storage y Edge Functions.
- FullCalendar para calendario de tareas.
- `@hello-pangea/dnd` para drag and drop.
- `@xyflow/react` para conectores del roadmap.
- Quill 2 para notas y descripciones enriquecidas.
- Vitest para pruebas de integración.

## Requisitos

- Node.js compatible con las dependencias declaradas en `package.json`.
- npm.
- Una instancia Supabase accesible o el stack local iniciado desde el repositorio backend.

## Instalación

```bash
npm install
```

Crea `.env.local` sin subirlo al repositorio:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu_clave_publicable
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173
```

El navegador solo debe recibir una clave publicable. Nunca coloques `service_role`, una secret key ni credenciales de base de datos en variables `VITE_*` o `NEXT_PUBLIC_*`.

## Desarrollo

```bash
npm run dev
```

Comandos de verificación:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:integration
```

Las pruebas de integración que escriben datos requieren una sesión de prueba configurada. Consulta `CHATGPT.md` antes de ejecutarlas contra una instancia compartida.

## Estructura

```text
src/
  app/                 composición, rutas, layout y tema
  features/
    api/               única frontera de acceso a datos de producto
    auth/              sesión e inicio de sesión
    backlog/           tareas no planificadas y planificación de sprints
    board/             tablero y vistas lista/calendario/tabla/timeline
    editor/            notas enriquecidas por proyecto
    organizations/     configuración de organización
    projects/          selector, creación y configuración de proyectos
    reports/           snapshots de sprints cerrados
    roadmap/           timeline de épicas/tareas y dependencias
    sprints/           ciclo de vida de sprint
    users/             perfil, avatar y preferencias
  lib/                 cliente Supabase y utilidades de infraestructura
  shared/              contextos, componentes, realtime, tipos y errores
packages/cli/          CLI y comandos para agentes
supabase/              migraciones y Edge Functions contractuales
docs/                  arquitectura, CLI, migración, pruebas y guía para LLMs
```

## Reglas Esenciales

- Toda consulta de datos de proyecto debe quedar acotada por `project_id`.
- Las autorizaciones reales viven en RLS, funciones de permiso y RPCs; ocultar un botón no autoriza una operación.
- Crear, asignar o mover tareas, completar sprints y modificar workspaces usa commands backend transaccionales.
- El frontend puede leer notificaciones y marcarlas como leídas, pero no debe generarlas directamente.
- Los reportes históricos se leen desde `sprint_reports`; no se recalculan desde tareas actuales.
- Un proyecto solo puede tener un sprint activo.
- Las dependencias del roadmap deben pertenecer al mismo proyecto y no pueden formar ciclos.
- Después de cambios de código, ejecuta typecheck, lint y build. Después de cambios funcionales, actualiza la documentación afectada.

## CLI

El paquete CLI vive en `packages/cli`. Consulta `docs/cli/README.md` y `docs/cli/AGENT_PLANS.md` antes de cambiar comandos o planes de agentes.
