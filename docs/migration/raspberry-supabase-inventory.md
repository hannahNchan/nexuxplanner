# Raspberry Supabase Migration Inventory

Goal: migrate the NexusPlanner backend from Supabase Cloud project `cucqyupaaqnrzblkpsrz` to the Raspberry Pi Supabase instance at `192.168.100.10`.

This file is the checkpoint after phase 1: inventory only. No production data, Raspberry schema, or Raspberry data was modified during this phase.

## Verified Endpoints

Raspberry Supabase is running from `/home/hannah/nexusplanner-supabase`.

| Capability | Raspberry LAN endpoint | Verification |
| --- | --- | --- |
| Studio | `http://192.168.100.10:54323` | TCP OK; HTTP redirects to `/project/default` |
| API gateway | `http://192.168.100.10:54321` | TCP OK |
| Auth | `http://192.168.100.10:54321/auth/v1/health` | HTTP 200 |
| REST | `http://192.168.100.10:54321/rest/v1/` | HTTP 200 |
| Postgres | `192.168.100.10:54322` | TCP OK |
| Mailpit | `http://192.168.100.10:54324` | Container exposed |

Security note: the local Supabase CLI stack reports that services bind to `0.0.0.0` and Studio, pgMeta, and analytics have no authentication. Keep this instance LAN-only while it is a lab backend.

## Production Project

| Field | Value |
| --- | --- |
| Project ref | `cucqyupaaqnrzblkpsrz` |
| Name | `nexusplanner` |
| Region | `us-west-2` |
| Status | `ACTIVE_HEALTHY` |
| Postgres | `17.6.1.063` |
| Engine | Postgres 17 |

## Raspberry Stack

| Component | Version / state |
| --- | --- |
| OS | Debian GNU/Linux 13 `trixie`, aarch64 |
| Kernel | Raspberry Pi kernel `6.18.34+rpt-rpi-2712` |
| RAM | About 8 GiB |
| Root disk free | About 51 GiB |
| Docker | `26.1.5+dfsg1` |
| Docker Compose | `2.26.1-4` |
| Supabase CLI | `2.111.0` |
| Supabase DB image | Postgres `17.6.1.156` |

Stopped optional local services: `supabase_imgproxy_nexusplanner-supabase`, `supabase_pooler_nexusplanner-supabase`.

## Production Edge Functions

| Function | Status | JWT | Version |
| --- | --- | --- | --- |
| `task-commands` | ACTIVE | enabled | 1 |
| `sprint-commands` | ACTIVE | enabled | 1 |
| `workspace-commands` | ACTIVE | enabled | 1 |
| `job-worker` | ACTIVE | enabled | 4 |

Local repo has matching function directories:

- `supabase/functions/task-commands/index.ts`
- `supabase/functions/sprint-commands/index.ts`
- `supabase/functions/workspace-commands/index.ts`
- `supabase/functions/job-worker/index.ts`

Raspberry Edge Function source status:

| Function | Source synced to Raspberry | SHA-256 verified | Runtime discovery |
| --- | --- | --- | --- |
| `_shared/cors.ts` | yes | yes | shared import |
| `task-commands` | yes | yes | detected by `supabase functions serve` |
| `sprint-commands` | yes | yes | detected by `supabase functions serve` |
| `workspace-commands` | yes | yes | detected by `supabase functions serve` |
| `job-worker` | yes | yes | detected by `supabase functions serve` |

The Raspberry source path is `/home/hannah/nexusplanner-supabase/supabase/functions`. A short `supabase functions serve --no-verify-jwt` run detected all four functions and reported local routes under `/functions/v1/<function-name>`. The long-running function server is not currently left running, because the schema baseline, command RPCs, and `JOB_WORKER_SECRET` are not configured yet.

## Production Storage

| Bucket | Public | Limit | MIME types |
| --- | --- | --- | --- |
| `avatars` | true | 5 MiB | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| `project-assets` | true | 10 MiB | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

Production object count: `6`.

Raspberry bucket count: `0`.
Raspberry object count: `0`.

Storage byte migration is tracked separately in `docs/migration/raspberry-supabase-storage-runbook.md`. The production object inventory is small: `avatars` has 3 objects totaling 1,987,448 bytes; `project-assets` has 3 objects totaling 166,962 bytes. After migration, `docs/migration/sql/storage_inventory_check.sql` must match those values and public object URLs must resolve through the Raspberry API gateway.

## Production Data Counts

| Table | Rows |
| --- | ---: |
| `auth.users` | 2 |
| `auth.identities` | 2 |
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
| `storage.buckets` | 2 |
| `storage.objects` | 6 |

Raspberry data counts:

| Table | Rows |
| --- | ---: |
| `auth.users` | 0 |
| `auth.identities` | 0 |
| `storage.buckets` | 0 |
| `storage.objects` | 0 |

Raspberry has no NexusPlanner public tables yet.

Production data integrity checkpoint:

- Foreign-key inventory was extracted from production and used to define the data import order in `docs/migration/raspberry-supabase-data-runbook.md`.
- `docs/migration/sql/domain_data_counts.sql` runs successfully against production and reproduces the row counts in this inventory.
- `docs/migration/sql/domain_integrity_checks.sql` runs successfully against production. Production currently has `0` orphan failures for the checked critical relations.
- Production currently has `0` projects with more than one active sprint.
- Production currently has `0` cross-project task-epic links.

## Production Extensions

| Extension | Version | Schema |
| --- | --- | --- |
| `pg_cron` | `1.6.4` | `pg_catalog` |
| `pg_graphql` | `1.5.11` | `graphql` |
| `pg_stat_statements` | `1.11` | `extensions` |
| `pgcrypto` | `1.3` | `extensions` |
| `plpgsql` | `1.0` | `pg_catalog` |
| `supabase_vault` | `0.3.1` | `vault` |
| `uuid-ossp` | `1.1` | `extensions` |

Raspberry extensions:

| Extension | Version | Schema |
| --- | --- | --- |
| `pg_cron` | `1.6.4` | `pg_catalog` |
| `pg_graphql` | `1.6.1` | `graphql` |
| `pg_net` | `0.20.4` | `extensions` |
| `pg_stat_statements` | `1.11` | `extensions` |
| `pgcrypto` | `1.3` | `extensions` |
| `plpgsql` | `1.0` | `pg_catalog` |
| `supabase_vault` | `0.3.1` | `vault` |
| `uuid-ossp` | `1.1` | `extensions` |

Gaps to handle before feature parity:

- Production has `pg_graphql` `1.5.11`; Raspberry has `pg_graphql` `1.6.1`. This is a version difference to keep in the verification notes.
- Raspberry has `pg_net`; production did not show it in the current extension list.

`pg_cron` and `pg_graphql` were available in `pg_available_extensions` and have now been enabled on the Raspberry. `cron.job` exists and currently has `0` jobs. The Raspberry still has `0` NexusPlanner public tables.

## Production Realtime Publications

Publication `supabase_realtime` includes:

- `public.activity_events`
- `public.automation_rules`
- `public.automation_runs`
- `public.organization_invitations`
- `public.project_invitations`
- `public.tasks`
- `public.user_notifications`

Publication `supabase_realtime_messages_publication` includes partitioned `realtime.messages_*` tables generated by Supabase.

## Production Cron Jobs

| Job | Schedule | Command | Active |
| --- | --- | --- | --- |
| 1 | `*/5 * * * *` | `select public.run_command_job_maintenance(300);` | true |
| 2 | `15 8 * * *` | `select public.scan_sprint_deadlines(current_date);` | true |

## Migration History Gap

Remote production has 39 applied migrations. The repo has 35 local migration files. The histories are not directly identical.

Production migrations that are not present as local files:

| Version | Name |
| --- | --- |
| `20260706032634` | `add_google_auth_profiles_and_project_members` |
| `20260713030703` | `add_task_subtitle_and_epic_color` |
| `20260713032025` | `use_unified_project_issue_sequence` |
| `20260713034527` | `add_user_profile_preferences` |
| `20260713040859` | `add_task_planned_dates` |

Local migration present in repo but not reported in production migration history:

| Version | Name |
| --- | --- |
| `20260721195139` | `invite_organization_by_email` |

Migrations with matching names but different versions:

| Name | Production version | Local version |
| --- | --- | --- |
| `create_roadmap_settings` | `20260713191023` | `20260713130000` |
| `create_task_dependencies` | `20260713230644` | `20260713230522` |
| `create_project_with_defaults_rpc` | `20260717042129` | `20260717041858` |
| `fix_project_rpc_column_order_jsonb` | `20260717042247` | `20260717042200` |
| `project_invitations_realtime` | `20260717052038` | `20260717051841` |
| `allow_invitees_view_invited_projects` | `20260717052104` | `20260717052115` |
| `fix_project_membership_rls_recursion` | `20260717053214` | `20260717053123` |
| `task_assignment_notifications` | `20260717054807` | `20260717054718` |
| `fix_task_assignment_realtime_notifications` | `20260717060023` | `20260717055906` |
| `add_organizations` | `20260717083007` | `20260717081648` |
| `allow_organization_logos_storage` | `20260717084900` | `20260717084823` |
| `organization_invitations_project_visibility` | `20260717195442` | `20260717195219` |
| `enforce_single_active_sprint` | `20260722003056` | `20260722002522` |
| `enrich_task_created_event_payload` | `20260730061955` | `20260730061644` |

## Immediate Conclusion

Do not run the repo migrations directly against the Raspberry yet. The first local migration assumes pre-existing NexusPlanner tables, and production contains earlier base migrations that are missing from the repo.

Additional verification:

- `npx supabase db dump --linked --schema public --dry-run` against production fails before dump generation because the Supabase CLI cannot prepare its temporary login role. The error is a `LegacyDbConfigLoginRoleStatusError` with `permission denied to alter role`.
- `npx supabase db pull ... --linked` and `npx supabase db query ... --linked` fail through the same login-role path, so the local CLI cannot currently produce a production schema dump.
- `npx supabase migration fetch --linked` also fails through the same login-role path, so the missing base migration files cannot currently be recovered from production history through the linked CLI workflow.
- `git log --all --name-status -- supabase/migrations` shows no deleted or historical copies of the five missing base migrations. The repo history starts with later migrations such as `create_roadmap_settings`, which references existing NexusPlanner tables instead of creating them.
- The Supabase connector can query production metadata. A compact inventory reports 29 public tables, 255 public columns, 125 public constraints, 103 public indexes, 102 public RLS policies, 30 public triggers, 74 public functions, and 5 storage policies.
- Production has no public enums.

The next safe step is to recover a complete schema baseline from production, then apply it to the Raspberry before migrating data. Options, in preferred order:

1. Use a proper production schema dump through a working database connection or Supabase dashboard backup.
2. Pull the missing migration files from the source that originally created production.
3. Reconstruct a clean baseline migration from production metadata and then apply later incremental migrations.

Current decision: use option 1 if a direct Postgres connection string or dashboard backup can be obtained. Use option 3 only if option 1 is unavailable, because reconstructing 74 functions, 102 policies, 30 triggers, grants, indexes, publications, cron jobs, and storage policies from metadata is possible but riskier than importing an official dump.

The baseline migration must be treated as a one-time starting point for Raspberry. After it is applied and verified, later repo migrations can be reconciled by marking equivalent production migrations as applied or by creating a fresh squashed local migration history for the self-hosted environment.

After the Raspberry has schema parity, verify:

- all expected public tables exist;
- core functions like `create_task_command`, `assign_task_command`, `move_task_column_command`, `complete_sprint_command`, and workspace commands exist;
- RLS/policy counts match the production inventory;
- realtime publication includes the same NexusPlanner tables;
- storage buckets exist with matching limits and MIME types.
