# Nexus Planner AI Context

Last reviewed: 2026-07-13

This document is the main onboarding file for ChatGPT/Codex or any other AI agent working on Nexus Planner. It is intentionally more detailed than a human-facing README because the project has product rules, Supabase schema behavior, and visual roadmap interactions that are easy to break without context.

## Documentation Strategy

OpenAI's Codex guidance recommends keeping `AGENTS.md` practical and using it to point agents toward the project-specific context they need before editing. This repo follows that pattern:

- `AGENTS.md` is the short operational entry point for agents.
- `CHATGPT.md` is the complete project map and product/engineering reference.
- Feature code remains colocated under `src/features/*`; update this document when a feature's behavior, schema, or workflow changes materially.

Useful references:

- OpenAI Codex custom instructions: https://developers.openai.com/codex/guides/agents-md
- OpenAI Codex best practices: https://developers.openai.com/codex/learn/best-practices.md

## Product Summary

Nexus Planner is a Jira/Notion/Trello-inspired planning app. It currently behaves as a mini Jira clone with:

- Project selection and project settings.
- Scrum/Kanban board.
- Backlog.
- Epics.
- Sprints.
- Roadmap/timeline with draggable bars and dependency connectors.
- Rich text notes/editor.
- User profile/preferences.
- Light, dark, and Solarized themes.

The product language is Spanish in most UI surfaces, while some roadmap settings still use English text by design.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Material UI 5
- MUI X Data Grid and Date Pickers
- Supabase Auth, Database, Storage
- `@hello-pangea/dnd` for board drag and drop
- `@xyflow/react` for roadmap dependency edge rendering
- `date-fns` and `dayjs`
- Quill 2 for rich text editing

## Commands

Install:

```bash
npm install
```

Development:

```bash
npm run dev
```

Verification:

```bash
npm run typecheck
npm run lint
npm run build
```

Combined check:

```bash
npm run check
```

`npm run build` runs `tsc -b` and `vite build`. A Vite warning about large chunks may appear; that warning is not currently a failing error.

## Environment Variables

The Supabase client supports either Vite or Next-style public variable names:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

or:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Client setup lives in `src/lib/supabase.ts`.

Never expose a Supabase service role key in frontend code.

## Repository Structure

```text
src/
  app/
    App.tsx                 # Router and route composition
    Layout.tsx              # App shell: header, sidebar, tabs, account menu
    ThemeContext.tsx        # MUI theme modes and persisted preferences
  features/
    api/                    # Supabase service functions
    auth/                   # Auth gate and auth form
    backlog/                # Backlog table and menus
    board/                  # Scrum board, task cards, task editor, epics table
    editor/                 # Quill editor
    projects/               # Project selector/settings/catalogs
    roadmap/                # Roadmap timeline, bars, dependency lines
    sprints/                # Sprint creation/status/task assignment UI
    users/                  # User profile/settings hooks and pages
  lib/
    supabase.ts             # Supabase client
    imageUpload.ts          # Task image storage helper
  shared/
    contexts/               # Cross-feature contexts
    types/                  # Shared TypeScript types
    ui/                     # Shared UI utilities
supabase/
  migrations/               # Local SQL migrations
```

## App Routing

Routes are declared in `src/app/App.tsx` inside `BrowserRouter`, `AuthGate`, and `Layout`.

Current routes:

- `/` redirects to `/tablero`.
- `/tablero`: Scrum board.
- `/epicas`: epics table.
- `/backlog`: backlog.
- `/roadmap`: roadmap timeline.
- `/editor`: notes editor.
- `/ajustes`: user settings.
- unknown paths redirect to `/tablero`.

`Layout.tsx` provides:

- Header with app name, theme selector, avatar/account menu.
- Persistent sidebar with project selector.
- Main tabs for Tablero, Epicas, Backlog, Roadmap, Editor.
- Resizable/collapsible sidebar.

## Core Contexts

### `ProjectContext`

File: `src/shared/contexts/ProjectContext.tsx`

Holds the currently selected project:

- `currentProject`
- `setCurrentProject`
- `updateCurrentProject`

Many feature hooks assume a selected project. If `currentProject` is null, data hooks usually return empty state.

### `ThemeContext`

File: `src/app/ThemeContext.tsx`

Supports:

- `light`
- `dark`
- `solarized`

Theme preference is saved in both:

- `localStorage["theme-mode"]`
- `user_profiles.preferences.themeMode` when authenticated

The Solarized theme uses the classic Solarized palette and applies MUI component overrides globally. When adding UI, prefer `theme.palette.*`, `background.paper`, `background.default`, `text.primary`, `text.secondary`, `divider`, and `action.*` over hardcoded light/dark colors.

## Supabase Overview

Project ref used during development:

```text
cucqyupaaqnrzblkpsrz
```

Important tables used by the app:

- `projects`
- `project_members`
- `project_tags`
- `boards`
- `columns`
- `column_order`
- `tasks`
- `epics`
- `epic_tasks`
- `sprints`
- `epic_dependencies`
- `task_dependencies`
- `roadmap_settings`
- `user_profiles`
- `issue_types`
- `priorities`
- `epic_phases`
- `point_systems`
- `point_values`
- `editor_notes`

Important storage buckets used by code:

- `avatars`
- `task-images`
- `project-assets`

### Migration Rules

When changing database schema:

1. Create a local migration:

```bash
npx supabase migration new descriptive_name
```

2. Put SQL in `supabase/migrations/<timestamp>_descriptive_name.sql`.
3. Apply the change to the remote database through the Supabase connector when available.
4. Verify with SQL queries.
5. Keep RLS enabled for any public table exposed to the client.
6. Grant the required operations to `authenticated` if the frontend uses the Data API.

Existing local migrations:

- `20260713130000_create_roadmap_settings.sql`
- `20260713230522_create_task_dependencies.sql`

### RLS Patterns

This is a client-side Supabase app, so RLS matters. Existing policies generally authorize by:

- `projects.user_id = auth.uid()`
- ownership through `tasks.project_id`
- ownership through `tasks.column_id -> columns.project_id -> projects.user_id`
- `epics.user_id = auth.uid()`

When adding new tables, do not use `TO authenticated` alone. Add ownership predicates.

## Data Model Notes

### Projects

Table: `projects`

Important fields:

- `id`
- `user_id`
- `title`
- `description`
- `project_key`
- `task_sequence`
- `epic_sequence`
- `issue_sequence`
- `allow_board_task_creation`
- `banner_url`

Creating a project also:

- inserts the owner into `project_members`
- creates default columns:
  - `Por hacer`
  - `En progreso`
  - `En revision`
  - `Hecho`
- persists column order in `column_order`

The project key is important because ticket IDs are displayed as `<KEY>-<N>`, such as `ALGOR-2`.

### Tasks

Table: `tasks`

Important fields:

- `id`
- `project_id`
- `column_id`
- `title`
- `subtitle`
- `description`
- `position`
- `issue_type_id`
- `priority_id`
- `story_points`
- `assignee_id`
- `task_id_display`
- `in_backlog`
- `epic_id`
- `sprint_id`
- `planned_start_date`
- `planned_end_date`

Rules:

- Backlog tasks have `in_backlog = true` and usually `column_id = null`.
- Board tasks have `in_backlog = false` and a `column_id`.
- Roadmap task bars use `planned_start_date`/`planned_end_date` when present.
- If roadmap child scheduling is enabled and a task has no planned dates, the UI may fall back to sprint dates or visual default dates.
- Tasks can be connected to epics by `tasks.epic_id` and by the join table `epic_tasks`; current code reads both and de-duplicates by task id.

### Epics

Table: `epics`

Important fields:

- `id`
- `user_id`
- `project_id`
- `name`
- `color`
- `owner_id`
- `phase_id`
- `estimated_effort`
- `epic_id_display`
- `start_date`
- `end_date`

Rules:

- Epics are project-level planning containers.
- Epics can have arbitrary start/end dates independent of sprint dates.
- Moving/resizing an epic bar in roadmap updates only the epic dates.
- Moving/resizing an epic should not shift child task dates.
- Epic colors are used for roadmap epic bars and dependency lines originating from that epic.

### Sprints

Table: `sprints`

Important fields:

- `id`
- `project_id`
- `name`
- `goal`
- `status`: `future`, `active`, `closed`
- `start_date`
- `end_date`

Rules:

- Backlog can create future sprints.
- Board shows the active sprint if one exists, otherwise the first future sprint.
- Tasks are assigned to a sprint through `tasks.sprint_id`.
- Starting a sprint sets `status = active`.
- Closing a sprint sets `status = closed`.

### Epic-Task Relationship

Table: `epic_tasks`

Fields:

- `epic_id`
- `task_id`

Current code also writes `tasks.epic_id`. Be careful when changing this. `fetchEpics` reads both direct `tasks.epic_id` and `epic_tasks`, then de-duplicates.

### Dependencies

There are two dependency tables by design.

#### Epic Dependencies

Table: `epic_dependencies`

Fields:

- `id`
- `epic_id`
- `depends_on_epic_id`
- `dependency_type`
- `lag_days`
- `created_at`

Interpretation:

- `depends_on_epic_id` is the source/predecessor.
- `epic_id` is the target/dependent item.
- A line from A to B means B depends on A.

#### Task Dependencies

Table: `task_dependencies`

Fields:

- `id`
- `task_id`
- `depends_on_task_id`
- `dependency_type`
- `lag_days`
- `created_at`

Interpretation:

- `depends_on_task_id` is the source/predecessor.
- `task_id` is the target/dependent task.
- A line from task A to task B means B depends on A.

Rules:

- Only task -> task is supported.
- Epic -> task and task -> epic are intentionally blocked.
- Self-dependencies are blocked by DB check.
- The DB unique constraint blocks duplicate exact pairs.
- Multiple outgoing dependencies are allowed: A can connect to B and C.
- Multiple incoming dependencies are allowed: B and C can both connect to A.
- Reverse pairs are allowed by the current product decision: A -> C and C -> A can coexist. This may represent a cycle; the app does not yet run cycle validation.

### Roadmap Settings

Table: `roadmap_settings`

Fields:

- `user_id`
- `project_id`
- `child_level_issue_scheduling`

Rules:

- One row per user/project.
- When `child_level_issue_scheduling` is off, roadmap shows only epics.
- When on, roadmap shows epics and child tasks.

### User Profiles

Table: `user_profiles`

Important fields:

- `id`
- `full_name`
- `job_title`
- `skills`
- `organization`
- `avatar_url`
- `preferences`

`preferences` is JSONB and currently stores theme preference:

```json
{
  "themeMode": "solarized"
}
```

Prefer adding future user preferences inside this JSON object unless a preference must be queried relationally.

## Feature Map

### Auth

Files:

- `src/features/auth/AuthGate.tsx`
- `src/features/auth/AuthForm.tsx`

`AuthGate` controls whether app routes render. Routes receive `session.user.id` and `session.user.email`.

### Projects

Files:

- `src/features/projects/components/ProjectSelector.tsx`
- `src/features/projects/components/ProjectSettingsModal.tsx`
- `src/features/api/projectService.ts`
- `src/features/projects/hooks/useProjects.ts`
- `src/features/projects/hooks/useProjectCatalogs.ts`

Responsibilities:

- Create/read/update/delete projects.
- Manage project tags.
- Manage project members.
- Upload/remove project banners.
- Configure issue types, priorities, epic phases, and point values.
- Toggle project settings such as `allow_board_task_creation`.

Important rule:

- `project_key` cannot be changed once a project has tasks or epics.

### Board

Files:

- `src/features/board/components/Board.tsx`
- `src/features/board/components/Column.tsx`
- `src/features/board/components/TaskCard.tsx`
- `src/features/board/components/TaskEditorModal.tsx`
- `src/features/board/hooks/useBoardManager.ts`
- `src/features/api/boardService.ts`

Responsibilities:

- Render Scrum/Kanban columns.
- Create columns.
- Create tasks in columns.
- Edit task details.
- Drag columns and tasks using `@hello-pangea/dnd`.
- Persist `column_order` and task `position`/`column_id`.
- Use active sprint or future sprint to decide which sprint's tasks are shown.

Important behavior:

- If there is an active sprint, board loads tasks for that sprint.
- If there is no active sprint, board may show the first future sprint.
- If no sprint is provided, board service filters against the zero UUID sentinel:

```text
00000000-0000-0000-0000-000000000000
```

Be careful with this sentinel when changing sprint behavior.

### Backlog

Files:

- `src/features/backlog/components/BacklogTable/BacklogTable.tsx`
- `src/features/backlog/hooks/useBacklogTable.ts`
- `src/features/api/backlogService.ts`

Responsibilities:

- Display tasks where `tasks.in_backlog = true`.
- Create backlog tasks.
- Edit backlog task fields.
- Assign tasks to a sprint through sprint drop zones.
- Move tasks between backlog and board.

Product rule:

- Backlog task creation should not include epic as an issue type option. Epics are created in the Epics section.

### Epics

Files:

- `src/features/board/components/EpicsTable/EpicsTable.tsx`
- `src/features/board/components/EpicsTable/columns.tsx`
- `src/features/board/components/EpicsTable/menus/*`
- `src/features/board/components/EpicsTable/TaskConnectDialog.tsx`
- `src/features/api/epicService.ts`

Responsibilities:

- Create, edit, delete epics.
- Set color, phase, owner, estimated effort.
- Set start/end dates.
- Connect and disconnect tasks.
- Show tasks connected to each epic.

Important modal behavior:

- In `TaskConnectDialog`, tasks already assigned to a different epic should appear disabled only inside this modal.
- Roadmap has separate rules and can move tasks between epics visually.

### Sprints

Files:

- `src/features/sprints/components/CreateSprintModal.tsx`
- `src/features/sprints/components/SprintDropZone.tsx`
- `src/features/sprints/components/SprintTasksTable.tsx`
- `src/features/sprints/hooks/useSprintManager.ts`
- `src/features/api/sprintService.ts`

Responsibilities:

- Create sprints.
- Start/close/delete sprints.
- Assign tasks to sprint.
- Fetch sprint tasks.

Product rules:

- Sprints can be fixed-range or open-ended.
- If a sprint is open-ended, `end_date` can be null.
- If it is fixed-range, the UI should clearly show the end date.

### Roadmap

Files:

- `src/features/roadmap/components/Roadmap.tsx`
- `src/features/roadmap/hooks/useRoadmap.ts`
- `src/features/roadmap/components/TimelineGrid.tsx`
- `src/features/roadmap/components/TimelineBar.tsx`
- `src/features/roadmap/components/EpicBar.tsx`
- `src/features/roadmap/components/RoadmapDependencyLayer.tsx`
- `src/features/api/dependencyService.ts`
- `src/features/api/roadmapSettingsService.ts`

Roadmap is the most visually complex feature. Treat it carefully.

#### Timeline Modes

Current modes:

- `weeks`
- `months`
- `quarters` disabled

Weeks:

- Starts on Monday of the current week.
- Renders daily columns.
- Week blocks alternate shading.
- Horizontal overflow is expected and scrollable.
- Top-level roadmap controls show scroll arrows only when the timeline overflows.

Months:

- Renders three months from the current quarter-ish window used by the grid.
- Month column widths are proportional to visible days (`MONTH_DAY_WIDTH * visibleDays`).
- Do not force equal month widths; otherwise dates visually land in the wrong month.

Quarters:

- Present in the UI as disabled.

#### Bars

All roadmap bars are rendered by `TimelineBar`.

Epic bars:

- Rendered by `EpicBar`.
- Use `epics.start_date` and `epics.end_date`.
- If no dates are present, fallback to a short range from timeline start.
- Use epic color from `epics.color` or phase color.
- Can be dragged/resized horizontally.

Task bars:

- Rendered by `TimelineGrid.renderTaskRow`.
- Only visible when `roadmap_settings.child_level_issue_scheduling = true`.
- Use `tasks.planned_start_date` and `tasks.planned_end_date`.
- Fall back to sprint dates or default generated dates if needed.
- Can be dragged/resized horizontally.
- Can be dragged vertically between epic rows using `dataTransfer` with `application/x-roadmap-task`.

#### Left Panel

The left panel is sticky and should not be transparent. It must cover the timeline grid behind it. Keep its background explicit (`theme.palette.background.paper` or equivalent) and maintain a high z-index.

The left header is currently only:

```text
EPICA
```

Do not reintroduce the older `ICON / KEY / SUMMARY / ASSIGNEE / START / END / PTS` columns unless the product direction changes.

#### Roadmap Settings

The Settings button opens a modal.

Current setting:

```text
Child level issue scheduling
```

When off:

- show epic rows/bars only.

When on:

- show epic rows/bars and task rows/bars.
- allow adding tasks below an epic through the `+` button on the epic row.
- allow task bars to be moved between epic rows.

#### Dependency Connectors

Connectors are small circular handles shown only when hovering a roadmap bar.

Current supported dependency types in UI:

- finish-to-start only

Current supported object pairs:

- epic -> epic
- task -> task

Blocked pairs:

- task -> epic
- epic -> task
- start -> start
- same item -> same item

Interaction:

1. Hover a bar.
2. Drag from the end connector.
3. While dragging, other compatible bars can be targeted.
4. Drop on another compatible bar to create the dependency.
5. A preview line follows the cursor while dragging.

Do not implement click-first/click-second dependency creation. The expected interaction is drag from connector and release on target.

#### Dependency Rendering

`RoadmapDependencyLayer` uses `@xyflow/react`.

Important details:

- Bars expose DOM markers through `data-roadmap-bar` and `data-roadmap-bar-type`.
- The layer measures bar rectangles relative to the scroll container.
- It creates hidden React Flow nodes for each bar.
- Edges are routed by a custom edge type `roadmapDependency`.
- The route tries to pass through gaps between rows and avoids source/target bars.
- Delete button appears only on edge hover.
- Edge color comes from the source bar:
  - epic source: epic color
  - task source: task blue/default primary color

When bars move/resize, dispatch:

```ts
window.dispatchEvent(new Event("roadmap-bars-change"));
```

This forces the dependency layer to remeasure positions.

#### Dependency Direction Naming

The service methods use `from` and `to` names in the UI, but database columns use dependent/predecessor names.

For epic dependencies:

```ts
createDependency(epicId, dependsOnEpicId)
```

means:

```text
epicId depends on dependsOnEpicId
```

For task dependencies:

```ts
createTaskDependency(taskId, dependsOnTaskId)
```

means:

```text
taskId depends on dependsOnTaskId
```

In the visual line:

```text
source = depends_on_*_id
target = *_id
```

### Editor

Files:

- `src/features/editor/QuillEditor.tsx`
- `src/features/api/editorService.ts`

Responsibilities:

- Rich text note editing with Quill 2.
- Save/load notes from `editor_notes`.
- Support snapshots/manual saves.
- Image upload helpers are in `src/lib/imageUpload.ts`.

### Users

Files:

- `src/features/users/components/UserSettingsPage.tsx`
- `src/features/users/hooks/useUserProfile.ts`
- `src/features/users/hooks/useUserProfiles.ts`
- `src/features/api/userService.ts`

Responsibilities:

- User profile data.
- Avatar upload through Supabase Storage.
- Shared avatar component: `src/shared/ui/UserAvatar.tsx`.

## Service Layer Map

Services under `src/features/api` are thin Supabase wrappers. They should remain the canonical place for database access.

- `projectService.ts`: projects, members, tags, project banners, default columns.
- `boardService.ts`: columns, tasks, board state, DnD persistence.
- `backlogService.ts`: backlog tasks and moving between backlog/board.
- `epicService.ts`: epics, phases, epic-task relation, roadmap task dates.
- `sprintService.ts`: sprints and sprint task assignment.
- `dependencyService.ts`: epic and task dependencies.
- `roadmapSettingsService.ts`: roadmap per-user/project settings.
- `catalogService.ts`: issue types, priorities, epic phases, point systems.
- `editorService.ts`: Quill notes.
- `userService.ts`: profiles and avatar URLs.

Do not put direct Supabase table access inside visual components unless there is a strong reason. Prefer a service plus a feature hook.

## Product Rules Captured From Current Work

### Issue IDs

The visible issue ID format is:

```text
PROJECTKEY-N
```

Examples:

- `ALGOR-1`
- `ROBO-2`

The code relies on Supabase/database behavior to populate `task_id_display` and `epic_id_display`; frontend creation usually inserts the domain data and reads the generated display ID back.

### Epics vs Tasks

- Epics are higher-level planning containers.
- Tasks/stories/bugs are executable work.
- Epics should not be dragged into sprints as normal sprint tasks.
- Tasks can be placed in backlog, sprint, board columns, and optionally under epics.
- Roadmap can show only epics or epics plus child tasks depending on setting.

### Sprint vs Epic Dates

- Sprint dates and epic dates are independent.
- Task planned dates are independent from epic dates.
- A task can extend beyond its epic date range.
- Moving/resizing an epic should not automatically move child tasks.

### Roadmap Range

- Week mode starts on Monday of the current week.
- Month mode uses visible day counts to calculate month widths.
- Avoid equal-width month columns because date-to-position mapping breaks at month boundaries.

## Styling Guidelines

- Prefer Material UI components and theme tokens.
- Avoid raw white (`#fff`) unless a component specifically requires it.
- Use the central theme rather than page-local palettes.
- Test all three themes for modal/background/input contrast.
- Use `alpha(theme.palette.*)` for overlays and subtle backgrounds.
- Keep dense productivity UI restrained; this is not a marketing landing page.
- Avoid nested cards where a full-width section or table is more appropriate.

## Frontend Interaction Guidelines

- For DnD on the board, use `@hello-pangea/dnd`.
- For roadmap dependency curves, use `@xyflow/react` and the existing `RoadmapDependencyLayer`.
- For roadmap bars, keep using `TimelineBar` as the single source of resize/drag behavior.
- For task movement between epics in roadmap, keep the existing `dataTransfer` approach unless replacing the whole timeline interaction model.
- When adding new modals, check light/dark/Solarized surfaces.

## Testing and Verification Checklist

Before handing off meaningful changes:

```bash
npm run typecheck
npm run lint
npm run build
```

Manual checks by feature:

- Auth: app loads only after session, logout works.
- Theme: light/dark/Solarized apply globally, including dialogs and editors.
- Projects: select project, create project, verify default columns.
- Backlog: create task, edit task, assign to sprint.
- Board: move tasks between columns, open task modal, save/delete task.
- Epics: create epic, connect/disconnect tasks, check disabled tasks in connect modal.
- Roadmap:
  - switch Weeks/Months.
  - scroll timeline with buttons/arrow keys when overflow exists.
  - resize/move epic bars.
  - enable child scheduling.
  - resize/move task bars.
  - move task between epic rows.
  - create epic->epic dependency.
  - create task->task dependency.
  - verify mixed task/epic dependency is blocked.
  - delete dependency on edge hover.
  - refresh page and verify dependencies persist.

## Known Risks and Technical Debt

- Some older files contain debug `console.log` calls and comments with emojis. Clean carefully in scoped refactors only.
- Board sprint filtering uses a zero UUID sentinel when no sprint is selected. This is fragile and should be revisited if sprint logic changes.
- `epic_tasks` and `tasks.epic_id` both represent epic assignment. Current code supports both; removing one requires a migration and service cleanup.
- Dependency cycles are allowed. If the product later uses dependencies to block closing tasks, add cycle detection and validation.
- Roadmap dependency routing is custom and visual. Test with multiple rows between source and target before changing route math.
- `react-archer` remains in dependencies but roadmap now uses `@xyflow/react`.
- Some UI labels are English in Roadmap settings while most app copy is Spanish.

## How To Add A Feature Safely

1. Identify the feature folder and service file.
2. Read related hook/component/service before editing.
3. If the change touches Supabase:
   - inspect current table columns and RLS.
   - create a migration.
   - apply and verify remotely.
   - update the service layer.
4. Keep UI state optimistic only when rollback is simple.
5. Preserve theme compatibility.
6. Run typecheck, lint, and build.
7. Update `CHATGPT.md` if product rules, schema, routes, or major flows changed.

## Naming and Language

- User-facing labels are mostly Spanish.
- Route names are Spanish:
  - `/tablero`
  - `/epicas`
  - `/backlog`
  - `/roadmap`
  - `/editor`
  - `/ajustes`
- Internal code names are mostly English.
- Keep new internal names descriptive and aligned with nearby files.

## Quick File Pointers

If you need to work on:

- Theme contrast: `src/app/ThemeContext.tsx`
- App navigation: `src/app/Layout.tsx`, `src/app/App.tsx`
- Project behavior: `src/features/projects/*`, `src/features/api/projectService.ts`
- Board DnD: `src/features/board/hooks/useBoardManager.ts`, `src/features/board/components/Board.tsx`
- Task modal: `src/features/board/components/TaskEditorModal.tsx`
- Backlog: `src/features/backlog/*`, `src/features/api/backlogService.ts`
- Epics table: `src/features/board/components/EpicsTable/*`, `src/features/api/epicService.ts`
- Sprints: `src/features/sprints/*`, `src/features/api/sprintService.ts`
- Roadmap bars: `src/features/roadmap/components/TimelineBar.tsx`, `TimelineGrid.tsx`
- Roadmap dependency lines: `src/features/roadmap/components/RoadmapDependencyLayer.tsx`
- Roadmap data loading: `src/features/roadmap/hooks/useRoadmap.ts`
- Dependency persistence: `src/features/api/dependencyService.ts`
- Supabase migrations: `supabase/migrations/*`

