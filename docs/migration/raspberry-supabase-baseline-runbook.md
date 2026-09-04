# Raspberry Supabase Baseline Runbook

Goal: create a trustworthy NexusPlanner schema baseline on the Raspberry Pi Supabase instance before any business data is imported.

Current state:

- Raspberry Supabase is already running at `192.168.100.10`.
- Production project is `cucqyupaaqnrzblkpsrz`.
- The local repo does not contain the earliest production migrations that created the base NexusPlanner tables.
- Supabase CLI commands using `--linked` cannot currently dump, query, pull, or fetch production migrations because the CLI fails while preparing its temporary login role.
- The Supabase connector can read production metadata, but reconstructing the full schema manually should be the fallback path, not the first choice.

## Preferred Path: Direct Production Dump

Use this path when a direct production Postgres connection string is available from Supabase Dashboard.

The connection string should be taken from the production project database settings. Use a temporary shell variable instead of committing it to the repo.

PowerShell:

```powershell
$env:NEXUS_PROD_DB_URL = "postgresql://postgres:[PASSWORD]@db.cucqyupaaqnrzblkpsrz.supabase.co:5432/postgres?sslmode=require"
```

Then export the schema required for NexusPlanner product data:

```powershell
npx supabase db dump --db-url "$env:NEXUS_PROD_DB_URL" --schema public --file ".\docs\migration\exports\cloud_schema_public.sql"
```

Do not apply a full `storage` schema dump to the Raspberry. Self-hosted Supabase already creates and owns internal Storage tables, types and functions. The migration only needs NexusPlanner's custom Storage policies from production, written by the wrappers to:

```text
docs/migration/exports/cloud_storage_policies.sql
```

Export roles separately if needed:

```powershell
npx supabase db dump --db-url "$env:NEXUS_PROD_DB_URL" --role-only --file ".\docs\migration\exports\cloud_roles.sql"
```

Do not put the DB URL, database password, service role key, or generated local Supabase secrets into any tracked file.

The same export is wrapped by:

```powershell
.\docs\migration\scripts\export-cloud-baseline.ps1
```

That Windows wrapper requires Docker Desktop to be reachable. If it fails with a Docker pipe error such as `npipe:////./pipe/dockerDesktopLinuxEngine`, the dump did not succeed and any generated files from that run should be treated as invalid. Either start Docker Desktop and rerun the wrapper, or use the Raspberry wrapper below.

Because the Raspberry already has Docker and the Supabase CLI installed, Windows can also send a temporary dump script to the Raspberry, run `supabase db dump` there, and copy the generated SQL back:

```powershell
$env:NEXUS_PROD_DB_URL = "postgresql://postgres:[PASSWORD]@db.cucqyupaaqnrzblkpsrz.supabase.co:5432/postgres?sslmode=require"
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\export-cloud-baseline-on-raspberry.ps1
```

The Raspberry wrapper writes the temporary production DB URL only into an ignored shell script on the Raspberry while the dump runs, removes that temporary script, and copies `cloud_schema_public.sql`, `cloud_storage_policies.sql`, and `cloud_roles.sql` back into `docs/migration/exports`.

## Apply Baseline To Raspberry

The Raspberry project directory is:

```text
/home/hannah/nexusplanner-supabase
```

The local Postgres endpoint verified from Windows is:

```text
192.168.100.10:54322
```

Before applying the baseline, verify the Raspberry is disposable or backed up. The current Raspberry public schema has no NexusPlanner tables, so the expected first baseline operation is additive.

The Raspberry already has the production-required extensions enabled for the baseline step: `pg_cron`, `pg_graphql`, `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`, and `pg_net`. Re-run `docs/migration/sql/raspberry_capability_check.sql` after any Supabase stack restart or reset.

Copy the schema export to the Raspberry, then apply it with `psql` against the local Supabase database. Use the local database password from `supabase status` on the Raspberry; do not store it in the repo.

Example shape:

```powershell
scp .\docs\migration\exports\cloud_schema_public.sql hannah@192.168.100.10:/home/hannah/nexusplanner-supabase/cloud_schema_public.sql
```

On Raspberry:

```bash
cd /home/hannah/nexusplanner-supabase
psql "postgresql://postgres:[LOCAL_DB_PASSWORD]@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f cloud_schema_public.sql
psql "postgresql://postgres:[LOCAL_DB_PASSWORD]@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f cloud_storage_policies.sql
```

From Windows, the same transfer and apply step is wrapped by:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\apply-raspberry-baseline.ps1
```

The wrapper uses SSH plus `docker exec psql` on the Raspberry, so it does not need the local Postgres password.

## Baseline Verification

After applying the baseline, compare Raspberry counts against the production inventory with:

```text
docs/migration/sql/baseline_parity_counts.sql
```

The local verification wrapper can copy and run all SQL checks on the Raspberry:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\run-raspberry-sql-checks.ps1
```

The wrapper was verified with `raspberry_capability_check.sql` against the Raspberry. Full checks should only be run after the baseline exists, because schema/data checks intentionally reference NexusPlanner tables that are not present yet.

The query currently checks:

- object counts for tables, columns, constraints, indexes, policies, triggers, functions and enums;
- storage policy count;
- existence of core NexusPlanner command/report/cron functions.

Expected production values:

| Kind | Expected |
| --- | ---: |
| `public_columns` | 255 |
| `public_constraints` | 125 |
| `public_enums` | 0 |
| `public_functions` | 74 |
| `public_indexes` | 103 |
| `public_policies` | 102 |
| `public_tables` | 29 |
| `public_triggers` | 30 |
| `storage_policies` | 5 |

## Fallback Path: Reconstruct Baseline From Metadata

Use this only if no direct production Postgres dump or dashboard backup can be obtained.

The connector can query enough metadata to reconstruct the baseline, but the work must be split into deterministic extraction files:

1. Tables, columns, defaults, generated expressions and identity metadata.
2. Primary keys, foreign keys, unique constraints and checks.
3. Indexes from `pg_get_indexdef`.
4. Function definitions from `pg_get_functiondef`.
5. Triggers from `pg_get_triggerdef`.
6. RLS enabled/forced state and policies from `pg_policies`.
7. Grants from `information_schema.role_table_grants` and function ACLs.
8. Realtime publication membership.
9. Cron jobs from `cron.job`.
10. Storage buckets and storage policies.

This path is more fragile because restore order matters and because dumped function/policy definitions may depend on earlier objects. If used, generate the SQL in multiple ordered files and apply each file to a fresh Raspberry database with `ON_ERROR_STOP=1`.

## Edge Functions Checkpoint

The repo functions are mirrored to the Raspberry at:

```text
/home/hannah/nexusplanner-supabase/supabase/functions
```

Re-sync from Windows after changing function source:

```powershell
C:\Progra~1\PuTTY\pscp.exe -r -pw [RASPBERRY_PASSWORD] supabase\functions\* hannah@192.168.100.10:/home/hannah/nexusplanner-supabase/supabase/functions/
```

Verify checksums by comparing local `Get-FileHash` against Raspberry `sha256sum` for:

- `supabase/functions/_shared/cors.ts`
- `supabase/functions/task-commands/index.ts`
- `supabase/functions/sprint-commands/index.ts`
- `supabase/functions/workspace-commands/index.ts`
- `supabase/functions/job-worker/index.ts`

Verify runtime discovery without leaving a long-running server:

```bash
cd /home/hannah/nexusplanner-supabase
timeout 20 /home/hannah/.supabase/bin/supabase functions serve --no-verify-jwt
```

The expected output lists:

- `/functions/v1/job-worker`
- `/functions/v1/sprint-commands`
- `/functions/v1/task-commands`
- `/functions/v1/workspace-commands`

Do not treat discovery as functional parity. `task-commands`, `sprint-commands`, and `workspace-commands` call SQL RPCs that do not exist until the schema baseline is applied. `job-worker` also requires `JOB_WORKER_SECRET` and service-role environment configuration before real invocation.

## Next Phase

After schema parity passes, continue with `docs/migration/raspberry-supabase-data-runbook.md`. Keep the phases separate: schema import proves object parity, data import proves row and relationship parity.

## Stop Conditions

Do not migrate business data until the schema baseline verification passes.

Do not point the frontend to Raspberry as the primary backend until Auth, Storage buckets, Edge Functions, Realtime publication, cron, and command-job worker secrets are configured.

Do not run repo migrations directly against an empty Raspberry database until the missing base schema is present.
