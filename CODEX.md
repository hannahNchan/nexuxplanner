# NexusPlanner Agent Entry Point

NexusPlanner es una app React para planear trabajo por organización, proyecto, backlog, sprint, tablero, épicas, roadmap y notas; las rutas principales se declaran en `src/app/App.tsx:23` y montan Tablero, Épicas, Backlog, Roadmap, Editor y Ajustes bajo `AuthGate`. El estado activo de organización/proyecto vive en `ProjectProvider`, que expone `activeOrganization` y `currentProject` y limpia el proyecto cuando cambia la organización (`src/shared/contexts/ProjectContext.tsx:5`, `src/shared/contexts/ProjectContext.tsx:23`). La persistencia usa Supabase desde `src/lib/supabase.ts:1`, con servicios por dominio en `src/features/api`.

## Stack

El paquete se llama `nexuxplanner`, es privado, versión `0.1.0` y usa módulos ESM (`package.json:1`, `package.json:3`, `package.json:5`). Las dependencias declaradas son React `^18.3.1`, React DOM `^18.3.0`, Vite `^5.4.1`, TypeScript `^5.5.4`, Supabase JS `^2.110.7`, MUI Material `^5.15.20`, MUI X Data Grid/Date Pickers `^8.23.0`, React Router DOM `^7.11.0`, `@hello-pangea/dnd` `^16.6.0`, `@xyflow/react` `^12.11.2`, Quill `2.0.3`, Vitest `^2.1.9` y Supabase CLI package `^2.109.1` (`package.json:12`, `package.json:17`, `package.json:21`, `package.json:22`, `package.json:24`, `package.json:26`, `package.json:27`, `package.json:31`, `package.json:32`, `package.json:34`, `package.json:48`, `package.json:51`, `package.json:55`).

## Commands

`npm run dev` arranca Vite, `npm run build` ejecuta `tsc -b && vite build`, `npm run lint` ejecuta ESLint, `npm run typecheck` ejecuta `tsc --noEmit`, `npm run test:integration` ejecuta Vitest con `vitest.integration.config.ts`, y `npm run check` combina typecheck y lint (`package.json:7`, `package.json:8`, `package.json:10`, `package.json:11`, `package.json:12`, `package.json:13`).

## Domain Model

Una organización tiene `organizations` y miembros en `organization_members`; los roles verificados por schema son `owner`, `admin` y `member` (`supabase/migrations/20260717081648_add_organizations.sql:1`, `supabase/migrations/20260717081648_add_organizations.sql:10`, `supabase/migrations/20260717081648_add_organizations.sql:14`). Una organización puede contener proyectos porque `projects.organization_id` referencia `organizations` y luego se hace `not null` (`supabase/migrations/20260717081648_add_organizations.sql:161`, `supabase/migrations/20260717081648_add_organizations.sql:224`). Los proyectos tienen visibilidad `organization` o `private`, y `can_view_project` permite verlos si el usuario es miembro del proyecto o si el proyecto es visible para miembros de la organización (`supabase/migrations/20260717195219_organization_invitations_project_visibility.sql:1`, `supabase/migrations/20260717195219_organization_invitations_project_visibility.sql:5`).

Un proyecto agrupa `project_members`, `project_tags`, `columns`, `column_order`, `tasks`, `epics`, `sprints`, `roadmap_settings` y `editor_notes`; las funciones de proyecto crean miembro owner, tags, columnas y orden de columnas (`src/features/api/projectService.ts:146`, `src/features/api/projectService.ts:156`, `src/features/api/projectService.ts:169`, `supabase/migrations/20260717041858_create_project_with_defaults_rpc.sql:73`, `supabase/migrations/20260717041858_create_project_with_defaults_rpc.sql:93`, `supabase/migrations/20260717041858_create_project_with_defaults_rpc.sql:114`). Las tareas se muestran como backlog cuando `in_backlog = true` y como tablero cuando tienen columna y sprint activo; el servicio de backlog filtra `.eq("in_backlog", true)` y el servicio de tablero filtra por `column_id` y `sprint_id` (`src/features/api/backlogService.ts:104`, `src/features/api/boardService.ts:174`). Las épicas se relacionan con tareas por `tasks.epic_id`, no por tabla intermedia, porque `fetchEpics` consulta `tasks` con `.eq("epic_id", epic.id)` (`src/features/api/epicService.ts:106`, `src/features/api/epicService.ts:122`).

## Read These Files

Lee `src/app/CODEX.md` antes de tocar providers, rutas, layout o tema.
Lee `src/lib/CODEX.md` antes de tocar Supabase client o helpers de storage.
Lee `src/shared/CODEX.md` antes de tocar contextos, componentes compartidos o reglas de error.
Lee `src/features/auth/CODEX.md` antes de tocar login, sesión u OAuth redirect.
Lee `src/features/api/CODEX.md` antes de tocar cualquier servicio Supabase.
Lee `src/features/projects/CODEX.md` antes de tocar organizaciones, proyectos, settings, miembros o assets.
Lee `src/features/board/CODEX.md` antes de tocar tablero, columnas, cards, TaskEditorModal o colaboradores.
Lee `src/features/backlog/CODEX.md` antes de tocar backlog, tablas o drag a sprint.
Lee `src/features/sprints/CODEX.md` antes de tocar sprints, duración, cierre o sprint stats.
Lee `src/features/roadmap/CODEX.md` antes de tocar timeline, barras o dependencias; los conectores dependen de mediciones DOM.
Lee `src/features/editor/CODEX.md` antes de tocar notas Quill.
Lee `src/features/users/CODEX.md` antes de tocar perfiles, avatar o ajustes de usuario.
Lee `supabase/CODEX.md` antes de tocar migraciones, RLS, triggers, RPCs, realtime o storage policies.

## Invariants

No hagas queries de datos de producto sin scope de proyecto cuando la tabla tenga `project_id`; los servicios existentes suelen recibir `projectId` y aplican `.eq("project_id", projectId)`, por ejemplo sprints, backlog, epics y editor (`src/features/api/sprintService.ts:82`, `src/features/api/backlogService.ts:104`, `src/features/api/epicService.ts:97`, `src/features/api/editorService.ts:21`). Un proyecto debe tener exactamente una organización activa en el modelo de datos porque `projects.organization_id` se vuelve `not null` (`supabase/migrations/20260717081648_add_organizations.sql:224`). Un proyecto no puede tener más de un sprint activo porque el servicio bloquea otro activo antes de iniciar y la base crea índice parcial único (`src/features/api/sprintService.ts:153`, `supabase/migrations/20260722002522_enforce_single_active_sprint.sql:21`). Las dependencias de roadmap no pueden cruzar proyectos ni formar ciclos; se valida en servicio y en triggers SQL (`src/features/api/dependencyService.ts:80`, `src/features/api/dependencyService.ts:116`, `supabase/migrations/20260717030110_prevent_roadmap_dependency_cycles.sql:38`). Los errores recuperables de UI deben pasar por superficies MUI; `AuthForm` ya usa `Alert` para errores (`src/features/auth/AuthForm.tsx:147`).

## Maintenance Rules

Cuando cambies schema, RLS, RPC, triggers, storage policies, rutas, servicios de dominio, lifecycle de entidades, permisos, realtime o flujos cross-feature, actualiza el `CODEX.md` raíz si cambia una regla global y el `CODEX.md` del módulo afectado. Cada afirmación nueva debe citar archivo y línea de código o migración. Si no puedes verificar una regla leyendo el repo, escríbela en `## Preguntas abiertas` en vez de inventarla. Mantén `CODEX.md` raíz como índice corto; mueve los detalles al módulo.

## Preguntas abiertas

No hay una migración local que cree desde cero todas las tablas base `projects`, `tasks`, `epics`, `sprints`, `boards`, `columns`, `project_members`, `project_tags`, `issue_types`, `priorities`, `point_systems` y `user_profiles`; varias migraciones locales las modifican, pero el origen completo no está en el repo (`supabase/migrations/20260717081648_add_organizations.sql:161`, `supabase/migrations/20260717041858_create_project_with_defaults_rpc.sql:55`).
