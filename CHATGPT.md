# Nexus Planner AI Context

Last reviewed: 2026-07-17

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
- Organization/company workspaces above projects.
- Project invitations between registered users.
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
npm run test:integration
```

Combined check:

```bash
npm run check
```

`npm run build` runs `tsc -b` and `vite build`. A Vite warning about large chunks may appear; that warning is not currently a failing error.

`npm run test:integration` runs Vitest service-level integration tests. Tests that touch Supabase require either `NEXUS_TEST_USER_EMAIL`/`NEXUS_TEST_USER_PASSWORD` or OAuth session tokens through `NEXUS_TEST_ACCESS_TOKEN`/`NEXUS_TEST_REFRESH_TOKEN`; without credentials, the suite is skipped instead of mutating shared data anonymously.

## Code Hygiene

- Do not leave temporary `console.log` calls, debug emojis, or status-check comments in committed code.
- Route recoverable errors through `src/shared/utils/errorHandling.ts` with a clear context key instead of scattering raw `console.error` calls.
- Avoid `any` in services, hooks, modals, and tables. Prefer small local row/payload types when Supabase returns joined or partial records.
- Product emoji data in tag/icon helpers is intentional and should not be treated as debug noise.

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

- Sobria topbar with current section, theme selector, notifications, and avatar/account menu.
- Persistent sidebar with product navigation and project selector.
- Main navigation for Tablero, Epicas, Backlog, Roadmap, and Editor lives in the sidebar, not in horizontal MUI Tabs.
- Resizable/collapsible sidebar.

Layout scroll rule:

- The app shell owns the full viewport height and does not let `body` scroll.
- Header, sidebar, tabs, and footer remain fixed inside the shell.
- Only the main route content area should scroll vertically.
- Route content starts with shared top spacing below the tabs; avoid adding route-specific top hacks unless the screen has a fixed internal toolbar.
- Sidebar content may scroll internally when it overflows.
- The footer lives in the sidebar, not below the main content, so it never reduces the route workspace height.
- Scrollbars should remain visually hidden while preserving wheel/trackpad scrolling.

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

- `organizations`
- `organization_members`
- `organization_invitations`
- `projects`
- `project_members`
- `project_invitations`
- `user_notifications`
- `project_tags`
- `boards`
- `columns`
- `column_order`
- `tasks`
- `epics`
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
- `20260714002940_enforce_project_scoped_roadmap_relations.sql`
- `20260714015509_allow_open_sprints_with_start_date.sql`
- `20260714020248_cascade_project_epics_on_delete.sql`
- `20260714020302_link_editor_notes_to_projects.sql`
- `20260714020812_cascade_project_roadmap_settings_on_delete.sql`
- `20260717025138_unify_task_epic_relation.sql`
- `20260717030110_prevent_roadmap_dependency_cycles.sql`
- `20260717041858_create_project_with_defaults_rpc.sql`
- `20260717042200_fix_project_rpc_column_order_jsonb.sql`
- `20260717051841_project_invitations_realtime.sql`
- `20260717052115_allow_invitees_view_invited_projects.sql`
- `20260717053123_fix_project_membership_rls_recursion.sql`
- `20260717054718_task_assignment_notifications.sql`
- `20260717055906_fix_task_assignment_realtime_notifications.sql`

### RLS Patterns

This is a client-side Supabase app, so RLS matters. Existing policies generally authorize by:

- `projects.user_id = auth.uid()`
- ownership through `tasks.project_id`
- ownership through `tasks.column_id -> columns.project_id -> projects.user_id`
- `epics.user_id = auth.uid()`

When adding new tables, do not use `TO authenticated` alone. Add ownership predicates.

### Project Isolation Rules

Project-scoped product data must never be read or mutated by bare row id alone. Services and hooks that touch tasks, epics, sprints, dependencies, columns, roadmap settings, notes, members, or project assets should either:

- receive the active `projectId` and include `.eq("project_id", projectId)` in the Supabase query, or
- validate the related destination row belongs to the active project before writing, such as `column_id`, `epic_id`, or `sprint_id`.

Allowed exceptions are global/catalog/auth queries, such as profiles, issue type catalogs, priority catalogs, point systems, and project listing. UI-side filtering is not enough; the service query must be project-scoped so Roadmap, Backlog, Board, and Epics cannot leak or cross-link records from another project.

### Supabase Error Handling

Use `src/shared/utils/errorHandling.ts` for Supabase-facing errors:

- `getErrorMessage(error, fallback)` converts Supabase/PostgREST errors into user-facing messages.
- `logError(context, error)` keeps technical context in the console without leaking raw objects to the UI.
- UI code should show errors through MUI components such as `Snackbar`/`Alert`, not browser alerts.
- If a UI change is optimistic, keep a previous-state snapshot and roll it back when the Supabase write fails.
- Avoid `catch { console.error(...) }` as the only behavior for user-triggered actions.

### Supabase Service Boundary

Feature hooks and components should not call Supabase tables/storage directly. Put database-backed reads and writes in `src/features/api/*Service.ts`, then import those service functions from hooks/components. Auth-only surfaces such as `AuthGate`, `AuthForm`, and app shell account handling may use the auth client directly, but product data should stay behind services.

## Data Model Notes

### Projects

Table: `projects`

Important fields:

- `id`
- `user_id`
- `organization_id`
- `visibility`: `organization` or `private`
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

Project creation must be all-or-nothing. The frontend service should call `create_project_with_defaults`, which creates the project, owner membership, tags, default columns, and `column_order` inside one Postgres transaction. If the RPC is not available in an environment, the fallback path must delete the partially created project when any setup step fails.

The project key is important because ticket IDs are displayed as `<KEY>-<N>`, such as `ALGOR-2`.

Projects belong to exactly one organization. Project lists should be scoped by the active organization when the UI is operating inside an organization workspace. Existing development data was backfilled under the organization `Lufthansa`.

Project visibility:

- `organization`: every organization member can see/open the project.
- `private`: only explicit `project_members` can see/open the project.

Visibility is not edit permission. A user can view an organization-visible project without being a project collaborator. To create, edit, delete, move, assign, plan, or otherwise mutate project work, the user must be in `project_members`. UI should show a read-only notice and disable mutation actions when `currentProject.can_edit` is false.

Deleting a project must delete its project-scoped data instead of leaving hidden leftovers. Current schema expects cascade cleanup for epics, tasks, sprints, project members/tags, roadmap settings, and project notes. The frontend delete path must also verify that the `projects` row was actually deleted, because Supabase can return success with zero affected rows when RLS blocks or no row matches.

### Organization Invitations And Project Access

Invitations to a workspace are stored in `organization_invitations` and delivered through Supabase Realtime.

Rules:

- A new user starts with no organizations and can create an organization plus one or more projects.
- A user can belong to many organizations.
- Users cannot see organizations created by other users unless they are invited and accept.
- Organization owner/admin can invite registered NexusPlanner users to the organization.
- The user menu shows pending organization invitations in real time and lets the invited user accept or reject.
- Accepting an organization invitation calls `accept_organization_invitation`, which atomically marks the invitation accepted and inserts the user into `organization_members` as `member`.
- Once accepted, the user can see all `organization` visibility projects in that organization.
- Seeing a project does not mean editing it. To mutate project data, the user must be added to `project_members`.
- Adding a user to a project is not a new invitation flow; it is an owner action that adds an existing organization member to `project_members`.
- Project members can be assigned to tickets.
- Private projects (`projects.visibility = 'private'`) are visible only to explicit project members.
- Membership RLS uses `is_project_member(project_id)`, `is_project_owner(project_id)`, `is_organization_member(organization_id)`, `is_organization_admin(organization_id)`, and `can_view_project(project_id)` helpers to avoid recursive policies and separate read access from edit access.
- `project_invitations` may still exist for legacy compatibility, but the intended product flow is organization invitation first, project membership second.
- Do not use browser alerts for invitation feedback; use MUI menu/alert surfaces.

### User Notifications

Task assignment notifications are stored in `user_notifications` and delivered through Supabase Realtime.

Rules:

- When `tasks.assignee_id` changes to a user different from the acting user, the database trigger creates a `task_assigned` notification.
- Assigning a task to yourself should not notify yourself.
- The header notification menu shows unread task assignment notifications and pending project invitations together.
- Users can mark task assignment notifications as read.
- `tasks` and `user_notifications` are in the `supabase_realtime` publication so board cards and the notification badge can update without a page refresh.
- `tasks` and `user_notifications` use `REPLICA IDENTITY FULL` so update events have enough row data for Realtime clients.
- The Board screen subscribes to project task changes and reloads the active sprint board state in the background.

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
- Tasks are connected to epics only by `tasks.epic_id`. Do not reintroduce a join table for task-epic assignment.
- Tasks created from Roadmap under an epic are backlog tasks by default: `in_backlog = true`, `column_id = null`, and `epic_id` set. They should appear in Backlog and Roadmap until assigned to a sprint/board column.

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
- Board shows only the active sprint. Future sprints stay in Backlog/Sprint planning until they are started.
- Tasks are assigned to a sprint through `tasks.sprint_id`.
- Starting a sprint sets `status = active`.
- Closing a sprint sets `status = closed`.

### Epic-Task Relationship

The canonical relationship is `tasks.epic_id`.

Project isolation is mandatory:

- An epic and its connected tasks must belong to the same `project_id`.
- `fetchEpics` must return an empty list when no project is selected; do not fall back to all user epics.
- `fetchEpics` must filter `tasks.epic_id` tasks by the selected project.
- `connectTaskToEpic`, `moveTaskToEpic`, and roadmap task creation must reject cross-project assignments.
- The database has a trigger preventing cross-project `tasks.epic_id` values.

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
- Epic -> epic dependencies must stay within one project.
- Task -> task dependencies must stay within one project.
- Self-dependencies are blocked by DB check.
- The DB unique constraint blocks duplicate exact pairs.
- Multiple outgoing dependencies are allowed: A can connect to B and C.
- Multiple incoming dependencies are allowed: B and C can both connect to A.
- Reverse pairs that create a dependency cycle are blocked.
- A dependency cannot make an epic or task depend directly or indirectly on itself.
- The service layer validates cycles before insert so the UI can show a friendly warning.
- The database has triggers preventing cross-project epic/task dependencies and dependency cycles.

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

### Organizations

Tables:

- `organizations`
- `organization_members`
- `organization_invitations`

Rules:

- A user can belong to many organizations.
- Users cannot see or switch to organizations where they are not members.
- An organization can have many projects.
- A project belongs to one and only one organization.
- The active organization controls which projects appear in project selection.
- Organization branding is shown in the sidebar as a square logo plus organization name.
- The top app header keeps the product brand: `NexusPlanner` and `Planning Software`.
- Organization logos are stored in the `project-assets` bucket under `organization-logos/{organizationId}/logo.ext`.
- Users may upload any image for an organization logo. The UI opens a crop modal and generates a square logo file before upload; do not reject images only because their original dimensions are not square.
- New users with no organization create one from the project creation modal or user settings.
- Creating a project while an organization is active uses that organization and does not let the user switch organization inside the project modal.
- Users with more than one organization can switch from the account menu.
- Owner/admin can invite registered users to the organization from user settings.
- Invited users receive a pending organization notification in the account menu; accepting adds them to the organization.
- Organization members can view organization-visible projects by default, but they cannot change project data unless they are added as project members.
- Project owners add organization members to a project from the Board collaborators control.

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
- Use only the active sprint to decide which sprint's tasks are shown.

Important behavior:

- If there is an active sprint, board loads tasks for that sprint.
- If there is no active sprint, board shows an empty state and directs the user to Backlog to create or start a sprint.
- If no sprint is provided to the board service, it filters board tasks with `sprint_id is null`. Do not use fake UUID sentinel values for missing sprints.
- In the Board screen, the title/actions header and the board toolbar are fixed. Only the columns area scrolls vertically/horizontally.

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
- If a sprint is open-ended, `start_date` is set and `end_date` can be null.
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

Roadmap data is project-scoped. It must only render the currently selected project's epics, child tasks, and dependencies. A missing `currentProject` means no roadmap data should be loaded; this prevents stale "all projects" responses from appearing while the project selector is initializing or switching projects.

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
- tasks created with the `+` button are created in Backlog, linked to the epic, and remain visible in Roadmap.

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
- Notes are scoped to the active project via `editor_notes.project_id`.
- If no project is selected, the editor must not create or show a document.
- If a project has no note yet, show a `Crear documento` action and create the first active note for that project.
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
- Task assignment member lists should load from `project_members`. Missing rows in `user_profiles` must not break assignment; fall back to the authenticated user's email/name where possible.
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
- Nexus visual tokens live in `src/app/visualTokens.ts`; use them for radii, shadows, borders, spacing, density, semantic colors, and component states.
- The active MUI redesign is inspired by ThemeWagon Aurora Free: light dashboard canvas, clean white/elevated surfaces, soft borders, restrained shadows, 8px radii, polished buttons/inputs/menus/tables, and less stock-MUI visual weight.
- Aurora is a reference, not a dependency. Keep the implementation in the local MUI theme and adapt it to Nexus Planner's productivity UI.
- Avoid raw white (`#fff`) unless a component specifically requires it.
- Avoid new raw radii, shadows, border colors, or repeated layout heights unless there is a component-local reason.
- Keep work surfaces closer to Jira/Linear/Notion: flatter panels, subtle borders, low radii, no generic promotional shadows or decorative gradient cards.
- Reserve noticeable shadows for overlays such as menus/dialogs and rare drag states; normal cards and tables should mostly rely on borders and state color.
- Use the central theme rather than page-local palettes.
- Test all three themes for modal/background/input contrast.
- Use `alpha(theme.palette.*)` for overlays and subtle backgrounds.
- Keep dense productivity UI restrained; this is not a marketing landing page.
- Avoid nested cards where a full-width section or table is more appropriate.

## Frontend Interaction Guidelines

- For DnD on the board, use `@hello-pangea/dnd`.
- For roadmap dependency curves, use `@xyflow/react` and the existing `RoadmapDependencyLayer`.
- For roadmap bars, keep using `TimelineBar` as the single source of resize/drag behavior.
- `TimelineGrid.tsx` delegates repeated visual grid pieces to `TimelineGridParts.tsx`; keep dependency math, connector drag state, and `RoadmapDependencyLayer` integration inside the grid unless doing a dedicated connector refactor.
- For task movement between epics in roadmap, keep the existing `dataTransfer` approach unless replacing the whole timeline interaction model.
- When adding new modals, check light/dark/Solarized surfaces.
- Do not use browser `alert()` dialogs. Use native MUI `Alert`, `Snackbar`, or confirmation dialogs for validation, errors, and feedback.

## Testing and Verification Checklist

Before handing off meaningful changes:

```bash
npm run typecheck
npm run lint
npm run build
```

For cross-feature data-flow changes, also run:

```bash
npm run test:integration
```

Current integration coverage creates isolated temporary data for project -> epic -> roadmap task -> backlog -> sprint, validates project isolation, moves the sprint task to `Hecho`, checks sprint stats, and deletes the temporary projects afterward. The suite requires password credentials or OAuth session tokens.

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
- Board sprint filtering uses `sprint_id is null` when no sprint is selected. Keep missing-sprint state represented as `null`, not as a fake UUID.
- Task-epic assignment is intentionally single-source through `tasks.epic_id`.
- Dependency cycles are blocked in the service layer and database triggers. Keep both layers in sync when changing dependency behavior.
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
- Visual tokens: `src/app/visualTokens.ts`
- App navigation: `src/app/Layout.tsx`, `src/app/App.tsx`
- Project behavior: `src/features/projects/*`, `src/features/api/projectService.ts`
- Board DnD: `src/features/board/hooks/useBoardManager.ts`, `src/features/board/components/Board.tsx`
- Task modal: `src/features/board/components/TaskEditorModal.tsx`
- Backlog: `src/features/backlog/*`, `src/features/api/backlogService.ts`
- Epics table: `src/features/board/components/EpicsTable/*`, `src/features/api/epicService.ts`
- Sprints: `src/features/sprints/*`, `src/features/api/sprintService.ts`
- Roadmap bars: `src/features/roadmap/components/TimelineBar.tsx`, `TimelineGrid.tsx`
- Roadmap grid visuals: `src/features/roadmap/components/TimelineGridParts.tsx`
- Roadmap dependency lines: `src/features/roadmap/components/RoadmapDependencyLayer.tsx`
- Roadmap data loading: `src/features/roadmap/hooks/useRoadmap.ts`
- Dependency persistence: `src/features/api/dependencyService.ts`
- Task editor internals: `src/features/board/components/TaskEditor/*`
- Supabase migrations: `supabase/migrations/*`
