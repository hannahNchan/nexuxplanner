# Raspberry Supabase Data Migration Runbook

Goal: migrate NexusPlanner data after the Raspberry schema baseline already matches production.

Do not run this phase until `docs/migration/sql/baseline_parity_counts.sql` passes against the Raspberry.

## Production Counts To Match

Use `docs/migration/sql/domain_data_counts.sql` on production and Raspberry after import. The production inventory currently expects:

| Table | Rows |
| --- | ---: |
| `auth.users` | 2 |
| `auth.identities` | 2 |
| `storage.buckets` | 2 |
| `storage.objects` | 6 |
| `public.organizations` | 1 |
| `public.organization_members` | 2 |
| `public.organization_invitations` | 1 |
| `public.projects` | 1 |
| `public.project_members` | 2 |
| `public.project_invitations` | 0 |
| `public.user_profiles` | 2 |
| `public.boards` | 0 |
| `public.columns` | 4 |
| `public.column_order` | 1 |
| `public.tasks` | 9 |
| `public.epics` | 1 |
| `public.sprints` | 2 |
| `public.epic_dependencies` | 0 |
| `public.task_dependencies` | 5 |
| `public.roadmap_settings` | 1 |
| `public.editor_notes` | 2 |
| `public.activity_events` | 4 |
| `public.user_notifications` | 1 |
| `public.command_jobs` | 1 |
| `public.automation_rules` | 1 |
| `public.automation_runs` | 1 |
| `public.sprint_reports` | 0 |
| `public.issue_types` | 5 |
| `public.priorities` | 5 |
| `public.epic_phases` | 7 |
| `public.point_systems` | 1 |
| `public.point_values` | 7 |
| `public.project_tags` | 1 |

## Auth Strategy

Public NexusPlanner rows reference users by UUID in columns such as `created_by`, `user_id`, `assignee_id`, `actor_id`, `recipient_id`, and membership rows. Migrating domain data without preserving or remapping those UUIDs will break ownership, membership, assignments, notifications, preferences and audit history.

Preferred lab-fidelity path:

1. Copy `auth.users` and `auth.identities` for the small known production user set.
2. Do not copy active sessions or refresh tokens.
3. Configure local OAuth providers and redirect URLs.
4. Let users log in again locally; verify the local auth user IDs match the migrated rows.

Fallback path:

1. Let users log in fresh on the Raspberry.
2. Build an explicit old-user-id to new-user-id mapping.
3. Rewrite every public user reference during import.

Do not mix the two approaches. If UUIDs are preserved, import public data as-is. If users are recreated, every dependent public table must be transformed consistently.

## Data Load Order

The following order is derived from production foreign keys.

1. Auth identities needed by public ownership rows: `auth.users`, then `auth.identities`.
2. Independent catalogs: `issue_types`, `priorities`, `epic_phases`, `point_systems`, then `point_values`.
3. Organization root: `organizations`.
4. Organization access: `organization_members`, `organization_invitations`.
5. Project root: `projects`.
6. Project access and configuration: `project_members`, `project_invitations`, `project_tags`, `roadmap_settings`.
7. Board structure: `boards`, `columns`, `column_order`.
8. Planning structure: `sprints`, `epics`.
9. Work items: `tasks`.
10. Dependency edges: `task_dependencies`, `epic_dependencies`.
11. Project content: `editor_notes`.
12. Activity and async system state: `activity_events`, `command_jobs`, `user_notifications`.
13. Automation and reports: `automation_rules`, `automation_runs`, `sprint_reports`.
14. Storage metadata: `storage.buckets`, `storage.objects`.
15. Storage files on disk or through the Storage API.

If using `pg_dump --data-only`, let `pg_dump` produce restore order where possible, but still validate it against this dependency order. If using table-by-table exports, use this order.

## Data Export Shape

The preferred export is the wrapper after the schema baseline path is working. It runs `supabase db dump --data-only --use-copy` and applies the required excludes for volatile/internal Auth and Storage tables.

```powershell
$env:NEXUS_PROD_DB_URL = "postgresql://postgres:[PASSWORD]@db.cucqyupaaqnrzblkpsrz.supabase.co:5432/postgres?sslmode=require"
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\export-cloud-data-on-raspberry.ps1
```

The Windows-local variant uses the same excludes but requires Docker Desktop:

```powershell
.\docs\migration\scripts\export-cloud-data.ps1
```

The wrappers intentionally exclude volatile/internal tables: Auth sessions, refresh tokens, one-time tokens, MFA transient tables, Auth schema migrations, Storage migrations, Storage multipart uploads, analytics/vector bucket internals, and vector index metadata. The target data set is `auth.users`, `auth.identities`, NexusPlanner `public` rows, `storage.buckets`, and `storage.objects`.

The Windows wrapper requires Docker Desktop to be reachable. If it fails with a Docker pipe error such as `npipe:////./pipe/dockerDesktopLinuxEngine`, the dump did not succeed and any generated file from that run should be treated as invalid. Either start Docker Desktop and rerun the wrapper, or use the Raspberry wrapper.

The Raspberry wrapper runs `supabase db dump` on the Raspberry and copies `cloud_data_auth_public_storage.sql` back into `docs/migration/exports`.

Review the dump before applying. Exclude volatile auth session tables if they appear. The migration goal is users and identities, not live sessions.

Apply to Raspberry only after schema parity:

```bash
cd /home/hannah/nexusplanner-supabase
psql "postgresql://postgres:[LOCAL_DB_PASSWORD]@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f cloud_data_auth_public_storage.sql
```

From Windows, the transfer and apply step is wrapped by:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\apply-raspberry-data.ps1
```

The data wrapper asks for an explicit confirmation phrase before applying the dump.

## Storage Files

Storage has two layers:

1. Metadata in `storage.buckets` and `storage.objects`.
2. Actual object bytes.

Do not count Storage as migrated until object bytes are reachable through:

```text
http://192.168.100.10:54321/storage/v1/object/public/<bucket>/<object>
```

Production buckets:

- `avatars`
- `project-assets`

Expected production object count: `6`.

Follow `docs/migration/raspberry-supabase-storage-runbook.md` for the dedicated Storage byte migration and verification. The data import can migrate metadata, but the Storage phase must prove that object bytes are reachable from the Raspberry gateway.

## Post-Import Verification

Run these SQL files against Raspberry:

```text
docs/migration/sql/domain_data_counts.sql
docs/migration/sql/domain_integrity_checks.sql
```

Expected integrity result:

- every `failures` value must be `0`;
- the active-sprint query must return no rows;
- the cross-project task-epic query must return no rows.

The same checks were run against production before the Raspberry import phase. Production currently returns `0` failures for orphaned critical relations, multiple active sprints per project, and cross-project task-epic links. After import, Raspberry must match that clean result.

Then verify feature-specific state:

```sql
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;

select jobid, schedule, command, active
from cron.job
order by jobid;
```

Expected realtime publication includes at least:

- `public.activity_events`
- `public.automation_rules`
- `public.automation_runs`
- `public.organization_invitations`
- `public.project_invitations`
- `public.tasks`
- `public.user_notifications`

Expected cron jobs:

- `select public.run_command_job_maintenance(300);`
- `select public.scan_sprint_deadlines(current_date);`

If the realtime publication or cron jobs are empty after data import, apply:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\configure-raspberry-realtime-cron.ps1
```

## Stop Conditions

Stop the migration if any integrity check returns failures.

Stop before frontend testing if Auth user IDs are not aligned with `user_profiles`, `organization_members`, `project_members`, task assignments or notifications.

Stop before calling Edge Functions if command RPCs are missing or if `JOB_WORKER_SECRET` is not configured.

After data, Auth, Storage, Realtime and Edge Function configuration pass, continue with `docs/migration/raspberry-frontend-cutover-runbook.md`.
