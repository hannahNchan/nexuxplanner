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
VITE_AUTH_REDIRECT_URL=
```

or:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Client setup lives in `src/lib/supabase.ts`.

OAuth redirect setup:

- `VITE_AUTH_REDIRECT_URL` is the public browser URL used by Google/Supabase OAuth after sign-in.
- Production Netlify builds use `.env.production` with `https://4nexusplanner.netlify.app`.
- Local development can omit it; auth falls back to `window.location.origin`.
- Supabase Auth URL Configuration must set Site URL to the production URL and include the same production URL in Redirect URLs. If Supabase falls back to `http://localhost:3000`, production login will redirect to localhost with tokens in the URL fragment.
- Netlify uses `netlify.toml` to rewrite SPA routes to `index.html`.

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

Task editor rule:

- `TaskEditorModal` supports two presentations. New task creation should open as a centered modal. Opening an existing ticket reference/card should open as a right-side drawer/panel, similar to Jira issue detail.
- New task creation requires explicit decisions for title, assignee state, issue type, priority, and story points when those catalogs are available. `Sin asignar` is allowed, but it must be chosen explicitly so task-created automations can tell intentional unassigned work from an unfinished form (`src/features/board/components/TaskEditorModal.tsx:119`, `src/features/board/components/TaskEditorModal.tsx:163`, `src/features/board/components/TaskEditorModal.tsx:168`, `src/features/board/components/TaskEditorModal.tsx:173`, `src/features/board/components/TaskEditorModal.tsx:178`, `src/features/board/components/TaskEditorModal.tsx:183`).
- The main pane focuses on title, subtitle, and rich description.
- The side pane holds task properties such as destination, assignee, status, type, priority, story points, and destructive actions.
- In the board drawer, changing the `Estado` selector persists immediately through `move_task_column_command` and moves the card locally; users should not need to press Guardar for a pure status change.
- Keep save/delete behavior compatible with both Board and Backlog callers.

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
- `activity_events`
- `command_jobs`
- `automation_rules`
- `automation_runs`
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
- `sprint_reports`

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

Critical product commands have a stricter boundary. Creating tasks, assigning task owners, moving tasks between board columns/statuses, completing sprints, creating organizations, creating projects, inviting users, accepting/declining invitations, and changing organization/project membership must go through backend commands, not through ad hoc frontend write sequences. Task/sprint commands live in `src/features/api/taskCommandService.ts`, and workspace commands live in `src/features/api/workspaceCommandService.ts`.

These RPCs validate project edit access, related project ownership, task assignment membership, sprint status, incomplete sprint task disposition, visible task ID generation, organization admin rights, project owner rights, membership invariants, activity events, and command outbox/queue handoff. The Edge Functions under `supabase/functions/task-commands`, `supabase/functions/sprint-commands`, and `supabase/functions/workspace-commands` are HTTP wrappers over the same RPCs; they must not duplicate or drift from the database rules.

SQL permissions are centralized in the `centralized_sql_permissions` migration. New authorization checks should be expressed as canonical permission functions such as `current_organization_role`, `current_project_role`, `can_view_organization`, `can_manage_organization`, `can_create_project_in_organization`, `can_view_project`, `can_mutate_project`, `can_manage_project`, `can_add_project_member`, `can_invite_to_organization`, `can_invite_to_project`, and `can_assign_project_user`, then consumed by policies and commands (`supabase/migrations/20260730034117_centralized_sql_permissions.sql:1`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:15`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:29`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:39`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:49`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:59`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:80`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:90`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:100`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:130`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:140`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:153`). Legacy helpers like `is_organization_member`, `is_organization_admin`, `is_project_member`, `is_project_owner`, and `can_edit_project` are compatibility wrappers over the canonical functions, not places to fork business rules (`supabase/migrations/20260730034117_centralized_sql_permissions.sql:172`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:182`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:192`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:202`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:212`).

Activity logging is centralized. New backend commands should call `record_activity_event` instead of inserting ad hoc rows into `activity_events`; existing direct inserts are guarded by `normalize_activity_event_before_insert`, which normalizes `event_type`, infers organization/project scope from related project/task/sprint rows, requires an actor, validates cross-entity consistency, and supports optional idempotency through `event_key` (`supabase/migrations/20260730035602_centralize_activity_events.sql:4`, `supabase/migrations/20260730035602_centralize_activity_events.sql:14`, `supabase/migrations/20260730035602_centralize_activity_events.sql:128`, `supabase/migrations/20260730035602_centralize_activity_events.sql:134`). Clients must not write activity events directly; `record_activity_event` is not executable by `anon` or `authenticated`, and RLS exposes project events through `can_view_project` plus organization-only events through `can_view_organization` (`supabase/migrations/20260730035602_centralize_activity_events.sql:183`, `supabase/migrations/20260730035602_centralize_activity_events.sql:187`).

Async work is centralized behind the command job outbox. Commands enqueue durable work with `enqueue_command_job`; `command_job_worker_foundation` adds idempotent `job_key`, worker locks, retry attempts, claim/complete/fail/reset RPCs, and keeps those worker RPCs closed to `anon`/`authenticated` (`supabase/migrations/20260730045659_command_job_worker_foundation.sql:1`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:24`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:73`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:118`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:158`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:200`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:114`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:154`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:196`, `supabase/migrations/20260730045659_command_job_worker_foundation.sql:227`). `supabase/functions/job-worker` is the server-side consumer for queued emails, reports, and processing jobs; it uses the service role key, requires `JOB_WORKER_SECRET`/`x-job-worker-secret`, resets stale locks, claims jobs, completes success, and retries failures (`supabase/functions/job-worker/index.ts:53`, `supabase/functions/job-worker/index.ts:54`, `supabase/functions/job-worker/index.ts:72`, `supabase/functions/job-worker/index.ts:83`, `supabase/functions/job-worker/index.ts:91`, `supabase/functions/job-worker/index.ts:107`, `supabase/functions/job-worker/index.ts:120`). Future feature: replace the underlying queue transport with a self-hosted open source Kafka-compatible broker. Keep the app contract as command -> outbox/event -> worker so React services do not learn broker topics, producer credentials, or consumer semantics.

Scheduled maintenance uses Supabase `pg_cron` for SQL-only jobs. `scheduled_maintenance_cron` creates `run_command_job_maintenance`, which calls `reset_stale_command_jobs`, creates `scan_sprint_deadlines`, which notifies project members about sprints due tomorrow or overdue, and schedules `nexusplanner-command-job-maintenance` every five minutes plus `nexusplanner-sprint-deadline-scan` daily (`supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:1`, `supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:19`, `supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:45`, `supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:179`, `supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:185`). Deadline cron creates `sprint_due_soon` and `sprint_overdue` notifications through `create_user_notification`, and `allow_sprint_deadline_notification_types` updates that function's allowlist while keeping execution revoked from `PUBLIC`, `anon`, and `authenticated` (`supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:80`, `supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:123`, `supabase/migrations/20260730054111_allow_sprint_deadline_notification_types.sql:42`, `supabase/migrations/20260730054111_allow_sprint_deadline_notification_types.sql:126`). Cron does not close overdue sprints; completion still belongs to `complete_sprint_command` so incomplete-task decisions and reports stay transactional.

Premium automations are server-side rules, not frontend conditionals. `automation_rules` stores one project-scoped rule per row with `trigger_event`, JSONB `conditions`, JSONB `actions`, `enabled`, creator and `last_run_at`; `automation_runs` stores execution history, counters and result/error (`supabase/migrations/20260730055853_premium_automation_rules.sql:1`, `supabase/migrations/20260730055853_premium_automation_rules.sql:21`). Project Settings renders a monday/Jira-inspired builder with `Cuando`, `Si` and `Entonces`, but it only calls `automationService` to create/update/delete rules and read runs (`src/features/projects/components/ProjectSettingsModal.tsx:631`, `src/features/projects/components/ProjectSettingsModal.tsx:765`, `src/features/projects/components/ProjectSettingsModal.tsx:872`, `src/features/projects/components/ProjectSettingsModal.tsx:957`, `src/features/api/automationService.ts:79`, `src/features/api/automationService.ts:112`). Execution happens after inserts in `activity_events`: `evaluate_automation_rules_after_activity_event` matches enabled rules with `automation_rule_matches_event`, inserts `automation_runs`, then `execute_automation_action` creates notifications or enqueues `automation.email`/`automation.webhook` jobs (`supabase/migrations/20260730055853_premium_automation_rules.sql:201`, `supabase/migrations/20260730055853_premium_automation_rules.sql:239`, `supabase/migrations/20260730055853_premium_automation_rules.sql:347`, `supabase/migrations/20260730055853_premium_automation_rules.sql:462`). `task.created` payload includes assignment, `is_unassigned`, issue type, priority, story points, column, sprint, epic and backlog state, so automation conditions can reason about the task's creation state without querying mutable task rows later (`supabase/migrations/20260730061644_enrich_task_created_event_payload.sql:172`, `supabase/migrations/20260730061644_enrich_task_created_event_payload.sql:177`, `supabase/migrations/20260730061644_enrich_task_created_event_payload.sql:180`, `supabase/migrations/20260730061644_enrich_task_created_event_payload.sql:181`, `supabase/migrations/20260730061644_enrich_task_created_event_payload.sql:182`, `supabase/migrations/20260730061644_enrich_task_created_event_payload.sql:183`, `supabase/migrations/20260730061644_enrich_task_created_event_payload.sql:184`). Do not add task-mutating automation actions without anti-loop and idempotency design, because automations are fed by `activity_events`.

Sprint reports are backend snapshots. `sprint_reports` stores totals, completion rates, story points, task/status snapshots and incomplete-task dispositions; authenticated users can only `select` rows they can view through project RLS (`supabase/migrations/20260730052854_backend_sprint_reports.sql:1`, `supabase/migrations/20260730052854_backend_sprint_reports.sql:22`, `supabase/migrations/20260730052854_backend_sprint_reports.sql:41`, `supabase/migrations/20260730052854_backend_sprint_reports.sql:50`). `complete_sprint_command` calls `generate_sprint_report` before moving incomplete tasks out of the sprint, then enqueues `report.sprint_completed` with an idempotent `job_key` for later export/email work (`supabase/migrations/20260730052854_backend_sprint_reports.sql:68`, `supabase/migrations/20260730052854_backend_sprint_reports.sql:455`, `supabase/migrations/20260730052854_backend_sprint_reports.sql:552`, `supabase/migrations/20260730052854_backend_sprint_reports.sql:554`). `normalize_sprint_report_before_write` sets persisted sprint report status to `closed` when `closed_at` exists, because the task snapshot is captured before `sprints.status` changes (`supabase/migrations/20260730053303_fix_sprint_report_closed_status.sql:1`, `supabase/migrations/20260730053303_fix_sprint_report_closed_status.sql:9`, `supabase/migrations/20260730053303_fix_sprint_report_closed_status.sql:10`). Frontend report screens should read `reportService`, not rebuild historical reports from mutable `tasks` rows (`src/features/api/reportService.ts:96`, `src/features/api/reportService.ts:107`).

Realtime channels are centralized in `src/shared/realtime/realtimeChannels.ts`. New frontend subscriptions should use `createRealtimeChannelName` for a scoped channel name, `createDebouncedRealtimeCallback` when a change causes a reload, and `removeRealtimeChannel` during cleanup. React-mounted channels should keep the default unique suffix to avoid reusing a subscribed Supabase topic; filters must stay scoped by `project_id`, `organization_id`, `user_id`, or `invitee_id` rather than listening to full tables.

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

Project creation must be all-or-nothing. The frontend service should call `createProjectCommand`, which calls `create_project_command`; that SQL command creates the project, owner membership, tags, default columns, `column_order`, activity event, and outbox job inside one Postgres transaction. Do not reintroduce the old frontend fallback that inserted `projects`, `project_members`, tags and columns in separate requests.

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
- Organization owner/admin can invite registered NexusPlanner users to the organization by exact email address.
- The user menu shows pending organization invitations in real time and lets the invited user accept or reject.
- Accepting an organization invitation calls `accept_organization_invitation`, which atomically marks the invitation accepted and inserts the user into `organization_members` as `member`.
- Once accepted, the user can see all `organization` visibility projects in that organization.
- Seeing a project does not mean editing it. To mutate project data, the user must be added to `project_members`.
- Adding a user to a project is not a new invitation flow; it is an owner action that adds an existing organization member to `project_members`.
- Project members can be assigned to tickets.
- Private projects (`projects.visibility = 'private'`) are visible only to explicit project members.
- Membership RLS and commands should use the centralized SQL permission layer. Canonical helpers are `can_view_project(project_id)` for read access, `can_mutate_project(project_id)` for edit access, `can_manage_project(project_id)` for owner-level project administration, `can_manage_organization(organization_id)` for owner/admin organization administration, and `can_add_project_member(project_id, user_id)` / `can_assign_project_user(project_id, user_id)` for membership-sensitive actions (`supabase/migrations/20260730034117_centralized_sql_permissions.sql:59`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:80`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:90`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:39`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:100`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:153`). Older helpers such as `is_project_member(project_id)`, `is_project_owner(project_id)`, `is_organization_member(organization_id)`, `is_organization_admin(organization_id)`, and `can_edit_project(project_id)` delegate to that layer (`supabase/migrations/20260730034117_centralized_sql_permissions.sql:192`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:202`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:172`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:182`, `supabase/migrations/20260730034117_centralized_sql_permissions.sql:212`).
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
- New tasks should be created through `create_task_command`, which owns `task_id_display` generation by incrementing `projects.task_sequence`.
- Assignments should be changed through `assign_task_command`, which keeps assignment validation, activity events, queue handoff, and notification triggers centralized.
- Board status changes from the task editor should be changed through `move_task_column_command`, which validates edit access, validates the destination column, updates `column_id`, clears backlog state, recalculates position when needed, and records `task.moved`.
- User notifications are created server-side through `create_user_notification` and trigger functions, not by React components. The database creates notifications for task assignment, project membership added, organization membership added, and sprint completion; `dedupe_key` prevents duplicate delivery for idempotent events (`supabase/migrations/20260730041047_server_side_notifications.sql:4`, `supabase/migrations/20260730041047_server_side_notifications.sql:36`, `supabase/migrations/20260730041047_server_side_notifications.sql:158`, `supabase/migrations/20260730041047_server_side_notifications.sql:198`, `supabase/migrations/20260730041047_server_side_notifications.sql:229`, `supabase/migrations/20260730041047_server_side_notifications.sql:272`, `supabase/migrations/20260730041047_server_side_notifications.sql:315`).
- Sprint deadline notifications are also server-side. `scan_sprint_deadlines` creates `sprint_due_soon` for active sprints ending tomorrow and `sprint_overdue` for active sprints past `end_date`; these are notification-only events and must not close the sprint (`supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:45`, `supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:80`, `supabase/migrations/20260730053934_scheduled_maintenance_cron.sql:123`).
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
- Sprint duration is fixed by product rule: 1 week is exactly 7 days, 15 days is exactly 15 days, and 1 month ends on the same calendar day of the next month. The UI must not create open-ended or custom-range sprints.
- A project must have at most one active sprint. UI/service code should block starting a future sprint while another sprint is active, and the database keeps a partial unique index on active sprints per project.
- Board shows only the active sprint. Future sprints stay in Backlog/Sprint planning until they are started.
- Board header shows the active sprint status and days remaining from the normalized sprint end date.
- Tasks are assigned to a sprint through `tasks.sprint_id`.
- Starting a sprint sets `status = active`.
- Closing/completing a sprint sets `status = closed` through `complete_sprint_command`.
- Completing a sprint opens a decision modal for incomplete tasks. Each incomplete task can be moved to backlog, moved to an existing future sprint, or moved to a newly created future sprint. The RPC requires a disposition for every incomplete task and applies all moves plus sprint closure in one transaction.

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
- Owner/admin can invite registered users to the organization from user settings by exact email address. Do not list all registered users or search globally by name.
- Project settings includes an `Organización` section for the active organization. It shows organization members, pending invitations, role changes, member removal, and email-based organization invites.
- Invited users receive a pending organization notification in the account menu; accepting adds them to the organization.
- Organization members can view organization-visible projects by default, but they cannot change project data unless they are added as project members.
- Project owners add organization members to a project from the Board collaborators control.

## Feature Map

### Auth

Files:

- `src/features/auth/AuthGate.tsx`
- `src/features/auth/AuthForm.tsx`
- `src/features/auth/authRedirect.ts`

`AuthGate` controls whether app routes render. Routes receive `session.user.id` and `session.user.email`.

`AuthForm` signs in with Google and passes `redirectTo: getAuthRedirectUrl()`. Keep this explicit; do not rely on Supabase's default Site URL for production redirects.

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
- Tasks created from the board must pass the active sprint id to the task command so they remain in the active board after reload.
- If there is no active sprint, board shows an empty state and directs the user to Backlog to create or start a sprint.
- If no sprint is provided to the board service, it filters board tasks with `sprint_id is null`. Do not use fake UUID sentinel values for missing sprints.
- In the Board screen, the title/actions header and the board toolbar are fixed. Only the columns area scrolls vertically/horizontally.
- Board realtime subscriptions use the shared realtime helper with unique channel names per mount/project/sprint. Reusing a channel topic and adding `postgres_changes` callbacks after subscription can throw Supabase's `cannot add postgres_changes callbacks after subscribe()` error.

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
- Backlog task creation should use the task command, even when the UI opens a draft modal. The database should not receive a real task until the user confirms creation.

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

- Sprints are fixed-duration only: 7 exact days, 15 exact days, or 1 exact month.
- `CreateSprintModal` calculates `end_date` automatically from `start_date` and the selected duration; users should not enter arbitrary end dates.
- Legacy sprints with invalid/custom end dates may be displayed using the closest valid duration, but new UI-created sprints should always store an exact allowed range.
- Board sprint actions show days remaining, status, and a complete action that closes the active sprint.
- Backlog shows sprint planning as a right-side panel grouped into active sprint, upcoming future sprints, and recently closed sprints. Future sprints can hold planned tasks before they start; closed sprints are read-only and do not accept drag-and-drop.
- Story points are human estimates and should not change automatically when roadmap dates or sprint duration change. Sprint cards can use story points for planning summaries: planned points, suggested capacity, available points, or overload. Suggested capacity is derived from closed sprint history when available; without history the UI should say that no historical capacity exists instead of inventing a default.

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
- Some non-command task movement paths still update `tasks` directly for drag ordering and backlog-to-sprint planning; do not expand that pattern into create/assign/status/complete flows.
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
