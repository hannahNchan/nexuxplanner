# NexusPlanner FE: Guía Operativa Para LLMs

Última revisión: 2026-09-26

## Propósito Y Alcance

Este documento es el mapa de trabajo del frontend de NexusPlanner. Explica cómo recorrer el repositorio, dónde vive cada capacidad, qué capa es responsable de cada decisión y qué verificaciones debe hacer un agente antes de editar.

La fuente de verdad siempre es el código actual. Esta guía orienta la lectura, pero no sustituye revisar el componente, hook, servicio, migración o Edge Function involucrados en un cambio.

Este repositorio contiene cuatro superficies relacionadas:

1. La aplicación React en `src/`.
2. La capa de servicios cliente en `src/features/api/`.
3. Los contratos backend versionados en `supabase/`.
4. El CLI para humanos y agentes en `packages/cli/`.

El backend desplegado puede ejecutarse desde un repositorio independiente. No asumas que editar una migración o Edge Function aquí la despliega automáticamente en una Raspberry Pi o en otra instancia.

## Ruta De Lectura Obligatoria

Antes de cambiar código:

1. Lee `AGENTS.md`.
2. Lee este archivo.
3. Busca la regla global relacionada en `CHATGPT.md` y `CODEX.md`.
4. Lee el `CODEX.md` más cercano al feature.
5. Lee el componente completo, su hook, el servicio y sus tipos.
6. Si toca datos, permisos, Auth, Storage, Realtime, RPCs o Edge Functions, lee `supabase/CODEX.md` y las migraciones relacionadas.
7. Usa `rg` para encontrar todos los consumidores antes de cambiar una firma o un tipo.

Para una corrección visual localizada todavía hay que identificar de dónde vienen los datos. Para una corrección de comportamiento hay que seguir el flujo completo hasta el backend.

## Modelo Mental De La Aplicación

```text
App.tsx
  ThemeProvider
    ProjectProvider
      BrowserRouter
        AuthGate
          Layout
            route page
              feature component
                feature hook
                  src/features/api service
                    Supabase client
                      Data API / RPC / Storage / Realtime / Edge Function
```

Responsabilidades:

- Los componentes presentan estado y capturan intención del usuario.
- Los hooks coordinan carga, estados de UI, actualizaciones optimistas y rollback.
- Los servicios construyen consultas y comandos remotos.
- Supabase RLS y las RPCs validan autorización e invariantes persistentes.
- Las migraciones son la evidencia de schema y reglas de base de datos.

No muevas lógica de autorización a componentes. Una condición visual puede mejorar UX, pero la seguridad debe permanecer en la base o en una función backend autorizada.

## Arranque, Entorno Y Persistencia Local

El cliente se crea en `src/lib/supabase.ts`. Acepta estas combinaciones públicas:

- URL: `VITE_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_URL`.
- Clave: `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `VITE_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Redirect OAuth: `VITE_AUTH_REDIRECT_URL`.

Variables de navegador nunca deben contener `service_role`, secret keys, passwords de Postgres o secretos del worker.

Estado persistido en `localStorage`:

- `active-organization-id`: organización seleccionada.
- `theme-mode`: tema visual.
- `nexusplanner.boardView.<projectId>`: layout del tablero por proyecto.

El proyecto activo vive en `ProjectContext`. Cambiar de organización limpia el proyecto activo para impedir que una vista conserve un proyecto de otra organización.

## Rutas Y Pantallas

Las rutas se declaran en `src/app/App.tsx` y se renderizan dentro de `Layout` después de `AuthGate`.

| Ruta | Capacidad | Entrada principal |
| --- | --- | --- |
| `/` | Redirección al tablero | `src/app/App.tsx` |
| `/tablero` | Sprint activo y cinco layouts de tareas | `src/features/board/components/Board.tsx` |
| `/epicas` | Tabla de épicas, filtros y tareas relacionadas | `src/features/board/components/EpicsTable/EpicsTable.tsx` |
| `/backlog` | Backlog y planificación de sprints | `src/features/backlog/components/BacklogTable/BacklogTable.tsx` |
| `/roadmap` | Timeline de épicas/tareas y dependencias | `src/features/roadmap/components/Roadmap.tsx` |
| `/reportes` | Reportes persistidos de sprints cerrados | `src/features/reports/components/ReportsPage.tsx` |
| `/editor` | Notas enriquecidas del proyecto | `src/features/editor` |
| `/ajustes` | Perfil, preferencias y organización | `src/features/users/components/UserSettingsPage.tsx` |

Una ruta desconocida vuelve a `/tablero`.

## Shell Global

### Autenticación

`AuthGate` obtiene la sesión, garantiza el perfil con `ensureSessionProfile` y escucha cambios de Auth. Sin sesión renderiza `AuthForm`.

`AuthForm` soporta OAuth de Google y login por correo/contraseña. El repositorio no incluye una pantalla de registro por correo. No añadas una sin decidir primero el flujo de alta, confirmación y configuración de proveedores.

### Layout

`src/app/Layout.tsx` controla navegación, selector de organización/proyecto, invitaciones y notificaciones. También monta suscripciones Realtime para:

- Invitaciones de organización del usuario.
- Invitaciones de proyecto del usuario.
- Notificaciones del usuario.

Los nombres y limpieza de canales deben usar las utilidades de `src/shared/realtime/realtimeChannels.ts`. Evita canales inline duplicados o sin filtro.

### Contextos

- `ProjectContext`: organizaciones, organización activa y proyecto actual.
- `ThemeContext`: temas light, dark y Solarized y sus tokens CSS/MUI.

Los features no deben duplicar estas fuentes de estado en stores paralelos.

## Frontera De Datos

`src/features/api/` es la frontera cliente para datos de producto. Un componente no debe construir consultas Supabase de negocio por conveniencia.

Reglas de acceso:

- Toda tabla con `project_id` se consulta con el proyecto activo.
- Las operaciones de organización usan el `organization_id` explícito.
- Las filas del usuario se filtran por el usuario autenticado cuando aplica.
- Un resultado vacío por RLS no debe confundirse automáticamente con “no existe”.
- Los errores recuperables se convierten con `src/shared/utils/errorHandling.ts` y se muestran con componentes MUI.

Servicios principales:

| Servicio | Responsabilidad |
| --- | --- |
| `boardViewService.ts` | Read model y commands de scope/ubicación Backlog-Kanban-Sprint |
| `boardService.ts` | Edición visual, columnas, orden y campos de tareas |
| `backlogService.ts` | Tareas con `in_backlog`, edición y planificación |
| `sprintService.ts` | Ciclo de vida, tareas y capacidad del sprint |
| `epicService.ts` | Épicas, fechas planeadas y vínculo tarea-épica |
| `dependencyService.ts` | Dependencias de épicas y tareas |
| `projectService.ts` | Proyectos, miembros, tags y assets |
| `organizationService.ts` | Organizaciones, miembros, invitaciones y logo |
| `catalogService.ts` | Tipos, prioridades, fases y sistemas de puntos |
| `editorService.ts` | Nota activa, autosave y snapshots |
| `notificationService.ts` | Lectura, marcado y realtime de notificaciones |
| `reportService.ts` | Snapshots de reportes cerrados |
| `automationService.ts` | Configuración y lectura de reglas/ejecuciones |
| `taskCommandService.ts` | Commands transaccionales de tareas y sprint |
| `workspaceCommandService.ts` | Commands de organización, proyecto, invitaciones y miembros |

## Commands Backend Y Autorización

Las acciones críticas no son secuencias libres de inserts y updates desde el navegador. Deben pasar por RPCs o por sus wrappers de Edge Functions:

- Crear tarea.
- Asignar responsable.
- Mover tarea entre columnas/estados.
- Completar sprint y disponer tareas incompletas.
- Crear organización o proyecto.
- Invitar, aceptar, rechazar o modificar membresías.
- Eliminar una organización.

La capa canónica de permisos vive en funciones SQL como `can_view_project`, `can_mutate_project`, `can_manage_project`, `can_view_organization` y `can_manage_organization`. No sustituyas estas reglas con comparaciones ad hoc de roles en React.

Las claves secretas y `service_role` solo pertenecen a servicios backend. El frontend usa JWT de usuario y clave publicable; RLS sigue siendo obligatoria.

## Features Por Funcionalidad

### Organizaciones Y Proyectos

Jerarquía principal:

```text
usuario
  organización
    proyecto
      catálogos, miembros, columnas, tareas, épicas, sprints, roadmap, notas
```

Las organizaciones tienen roles `owner`, `admin` y `member`. Los proyectos pueden ser visibles para la organización o privados según los contratos actuales.

Entradas relevantes:

- `src/features/organizations/components/OrganizationSettingsModal.tsx`
- `src/features/projects/components/ProjectSelector.tsx`
- `src/features/projects/components/CreateProjectModal.tsx`
- `src/features/projects/components/ProjectSettingsModal.tsx`
- `src/features/projects/hooks/useProjects.ts`
- `src/features/projects/hooks/useProjectCatalogs.ts`

Crear proyectos debe usar el command que también crea defaults y membresía. Borrar una organización usa el command backend; Storage no se elimina con deletes directos sobre tablas internas.

### Tablero

`Board.tsx` usa una sola instancia de `useBoardManager`. `board-view` devuelve el scope efectivo, capacidades, sprint activo, columnas y tareas ya filtradas. El usuario cambia entre Kanban continuo y Sprint desde la cabecera; `board-commands` guarda la preferencia por usuario/proyecto. Sin sprint activo el backend usa Kanban y el tablero sigue siendo utilizable.

React no decide qué tareas pertenecen a cada scope. `boardViewService` transforma el DTO a `BoardState`, pero no consulta tareas adicionales ni vuelve a filtrar por `sprint_id`. La preferencia de scope no vive en `localStorage`; solo la preferencia de layout lista/tablero/calendario/tabla/timeline se guarda allí.

Layouts soportados:

| Layout | Archivo | Comportamiento clave |
| --- | --- | --- |
| Tablero | `Board.tsx`, `Column.tsx` | Kanban por columnas y drag and drop |
| Lista | `BoardTaskListView.tsx` | Lectura compacta y agrupación visual |
| Calendario | `BoardTaskCalendarView.tsx` | FullCalendar; mover/redimensionar persiste fechas |
| Tabla | `BoardTaskTableView.tsx` | Datos densos, filtros y edición estructurada |
| Timeline | `BoardTaskTimelineView.tsx` | Barras de tareas; mover o redimensionar persiste fechas |

Calendario y timeline usan `planned_start_date` y `planned_end_date`. Para visualización, una tarea sin inicio puede caer en `created_at`; al editar fechas se deben persistir fechas planeadas. El timeline del tablero no dibuja dependencias: los conectores pertenecen al Roadmap.

Los badges de estado obtienen color de la columna. La paleta permitida se configura en settings y se persiste mediante `updateColumnBadgeColor`; no codifiques colores por nombre de estado.

`TaskEditorModal` es la superficie común para ver y editar una tarea. Antes de modificarla revisa sus subcomponentes en `src/features/board/components/TaskEditor/`, porque descripción, miembros y borrado tienen ciclos separados.

### Backlog

Una tarea está en backlog cuando `in_backlog = true`. El backlog no es una columna visual del tablero.

`useBacklogTable` coordina búsqueda, filtros, orden, columnas visibles y edición. La tabla vive arriba y la planificación de sprints debajo. Las tareas se arrastran o asignan a un sprint futuro mediante servicios de backlog/sprint.

No supongas que una tarea asignada a épica también pertenece a un sprint. Épica y sprint son dimensiones independientes.

### Sprints

Estados válidos:

```text
future -> active -> closed
```

Solo puede existir un sprint activo por proyecto. Iniciar otro debe fallar tanto en servicio como en base de datos.

Al cerrar un sprint, cada tarea incompleta necesita disposición explícita hacia backlog u otro sprint. `complete_sprint_command` valida, mueve, cierra, registra actividad, genera reporte y encola trabajo relacionado dentro de la frontera backend.

Los sprints futuros se presentan ordenados por fecha y pueden reordenarse visualmente mediante el selector de la pantalla. No uses `created_at` como orden cronológico del plan.

### Épicas

La relación canónica es `tasks.epic_id`. Una épica agrupa tareas, color, fase, puntos y rango planeado.

La tabla de épicas tiene filtros, orden, ocultamiento de columnas y menús de edición. Las tareas pueden conectarse o desconectarse de una épica sin cambiar automáticamente su sprint.

### Roadmap

Roadmap representa épicas y, según settings, tareas hijas. Soporta escalas `weeks`, `months` y `quarters`.

Entradas críticas:

- `Roadmap.tsx`: cabecera, modo y settings.
- `useRoadmap.ts`: carga y mutaciones coordinadas.
- `TimelineGrid.tsx`: filas, unidades y callbacks.
- `EpicBar.tsx` y `TimelineBar.tsx`: interacción con rangos.
- `RoadmapDependencyLayer.tsx`: conectores medidos contra el DOM.
- `timelineRange.ts`: rango compartido entre cabecera y grid.

Dependencias:

- Épica a épica en `epic_dependencies`.
- Tarea a tarea en `task_dependencies`.
- Mismo proyecto obligatorio.
- Ciclos prohibidos en servicio y SQL.

La dirección visual trata `depends_on_*` como origen. Cambiar source/target sin revisar esta convención invierte flechas. La carga de dependencias de tareas se divide en chunks para evitar URLs PostgREST excesivas; si falla solo esa carga, las épicas deben seguir visibles sin conectores.

En `quarters`, el rango se deriva de fechas reales de épicas, tareas y sprints relacionados; no es una etiqueta estática sobre el rango mensual.

### Reportes

La pantalla lee `sprint_reports`, snapshots generados al completar un sprint. El panel de sprints cerrados permanece independiente del scroll del detalle.

No reconstruyas un reporte histórico consultando tareas vivas: después del cierre, las tareas incompletas pueden estar en backlog u otro sprint. El snapshot conserva el estado del momento de cierre.

### Editor

Las notas son por proyecto. `editorService` maneja nota activa, autosave, snapshots, restauración y borrado. El editor usa Quill 2.

No compartas una nota entre proyectos por omitir `project_id`. Mantén sanitización y tipos de contenido al tocar HTML enriquecido.

### Perfil Y Usuarios

`ensureSessionProfile` garantiza `user_profiles` al iniciar sesión. `useUserProfile` y `userService` cargan/actualizan perfil, preferencias y avatar.

Los avatares viven en Storage y usan `UserAvatar` como representación común. Para asignaciones, carga miembros del proyecto; no expongas una búsqueda global de usuarios.

### Notificaciones

El frontend:

- Lee notificaciones propias.
- Escucha inserts por Realtime.
- Marca una o todas como leídas.

El backend genera notificaciones de asignación, acceso, invitaciones y estado de sprint. No insertes `user_notifications` desde componentes o hooks.

### Automatizaciones

Project Settings permite configurar reglas y consultar ejecuciones. La evaluación ocurre después de eventos de actividad en backend.

Las acciones actuales notifican o encolan trabajo. Cualquier automatización que mutara tareas o sprints necesitaría commands idempotentes y protección contra loops antes de agregarse.

### CLI Y Planes De Agentes

El CLI vive en `packages/cli` y puede consumir las mismas fronteras HTTP/RPC que la UI. Sus variables incluyen URL, clave publicable, token de acceso, organización y proyecto activos.

`agent validate-plan` valida estructura y reglas del plan. `agent apply-plan` aplica una jerarquía organización -> proyectos -> sprints/épicas/tareas y resuelve referencias temporales después de recibir IDs reales.

Lee `docs/cli/README.md` y `docs/cli/AGENT_PLANS.md` antes de editar comandos.

## Realtime, Eventos Y Trabajo Asíncrono

Realtime refresca UI; no reemplaza autorización ni commands.

Los eventos de actividad se generan detrás de `record_activity_event`. El cliente no escribe `activity_events` directamente.

`command_jobs` es una cola backend con claim, locks, reintentos y finalización. El worker usa credenciales de servidor. Los componentes React no deben conocer ni publicar directamente en esa cola.

Cron realiza mantenimiento de locks y escaneo de deadlines. Un sprint vencido genera avisos; no se cierra automáticamente.

## Catálogo De Datos Consumidos Por El Frontend

Tablas y vistas importantes, agrupadas por capacidad:

- Identidad: `user_profiles` y `auth.users` a través de Auth.
- Organización: `organizations`, `organization_members`, `organization_invitations`.
- Proyecto: `projects`, `project_members`, `project_invitations`, `project_tags`.
- Catálogos: `issue_types`, `priorities`, `epic_phases`, `point_systems`, `point_values`.
- Trabajo: `boards`, `columns`, `column_order`, `tasks`, `epics`, `sprints`.
- Roadmap: `roadmap_settings`, `epic_dependencies`, `task_dependencies`.
- Contenido: `editor_notes` y sus snapshots según servicio.
- Operación: `activity_events`, `user_notifications`, `command_jobs`.
- Analítica: `sprint_reports`.
- Automatización: `automation_rules`, `automation_runs`.

Esta lista describe consumo y contratos conocidos; no prueba que todas las tablas base puedan crearse desde cero con las migraciones presentes. Consulta la sección de riesgos.

## Flujos Críticos

### Crear Una Tarea

```text
modal/vista
  -> hook valida entrada y proyecto
  -> taskCommandService.createTaskCommand
  -> create_task_command RPC
  -> valida permisos y catálogos
  -> inserta tarea
  -> registra actividad/notificación/job según corresponda
  -> UI recarga o aplica resultado
```

### Mover Estado De Tarea

```text
drag, tabla o editor
  -> actualización optimista
  -> moveTaskColumnCommand
  -> RPC valida proyecto/columna/permisos
  -> persiste columna y orden
  -> éxito conserva UI; error hace rollback y muestra mensaje
```

### Completar Sprint

```text
CompleteSprintDialog
  -> usuario decide destino de incompletas
  -> completeSprintCommand
  -> backend bloquea y valida sprint
  -> genera snapshot de reporte
  -> mueve incompletas
  -> cierra sprint, registra actividad y encola trabajo
  -> backend normaliza el scope guardado a Kanban
  -> tablero recarga el read model
```

### Cambiar Fechas En Calendario O Timeline

```text
drag/resize
  -> calcula planned_start_date/planned_end_date
  -> actualización optimista
  -> board service persiste tarea acotada por proyecto
  -> error restaura rango anterior
```

## Trampas Conocidas

- La carpeta `supabase/migrations` no contiene necesariamente el origen completo de todas las tablas base. Varias migraciones modifican objetos preexistentes. No pruebes un bootstrap destructivo sobre datos personales.
- El backend desplegado y este checkout no se sincronizan solos. Versionar una migración no equivale a aplicarla.
- El tablero necesita columnas, pero no necesita un sprint activo: sin sprint usa el scope Kanban continuo.
- No filtres tareas por `sprint_id` en React. `board-view` es la fuente de verdad del scope y de las tareas visibles.
- Backlog, épica y sprint son relaciones diferentes.
- Un usuario puede ser owner en UI y aun fallar si una RPC/policy no autoriza el mismo flujo; inspecciona el error real.
- Storage se administra mediante su API y policies; no borres directamente filas de tablas internas de Storage.
- FullCalendar trata el `end` como exclusivo; revisa conversiones al persistir rangos inclusivos.
- Los conectores del roadmap dependen de mediciones DOM y scroll. Cambios de tamaño o ids pueden desalinearlos.
- No uses `service_role` para resolver errores RLS del navegador.
- No uses `alert()`. Usa `Alert`, `Snackbar` o diálogos MUI.
- No conviertas errores recuperables en `console.error` aislados; usa las utilidades compartidas.

## Estrategia De Cambios

Para cualquier feature:

1. Localiza ruta, componente, hook, servicio, tipos y migraciones con `rg`.
2. Escribe la regla observable antes de editar.
3. Identifica autorización, scope de proyecto/organización y estados vacíos.
4. Conserva actualizaciones optimistas con rollback donde ya existan.
5. Reutiliza componentes y helpers locales.
6. Añade pruebas proporcionales al riesgo.
7. Ejecuta `npm run typecheck`, `npm run lint` y `npm run build` después de cambios de código.
8. Ejecuta pruebas de integración solo con credenciales y entorno de prueba controlados.
9. Actualiza `CHATGPT.md`, `CODEX.md` global o el `CODEX.md` del feature si cambió un contrato.

## Checklist De Revisión Para LLMs

Antes de entregar:

- El cambio está acotado al feature solicitado.
- No se revirtieron cambios ajenos.
- No hay queries de producto nuevas dentro de componentes.
- Todas las queries tienen scope correcto.
- Los commands críticos siguen pasando por backend.
- Los estados loading, empty, read-only y error siguen visibles.
- Los tres temas conservan contraste y no hay estilos hardcoded innecesarios.
- No hay secretos en código, documentación ni variables públicas.
- Typecheck, lint y build están verdes o el fallo está reportado con precisión.
- La documentación refleja el comportamiento nuevo.

## Deuda Y Preguntas Abiertas

- Falta una migración local única que demuestre la creación desde cero de todas las tablas base. La historia local contiene extensiones y hardening sobre parte de un schema anterior.
- Los handlers `email.*`, `report.*`, `automation.email` y `automation.webhook` dependen de proveedores/configuración backend y algunos pueden operar como no-op hasta configurarlos.
- El registro por correo no tiene pantalla dedicada en frontend.

Si una afirmación no puede verificarse en código o migraciones, añádela aquí como pregunta; no la conviertas en regla inventada.
