# NexusPlanner Raspberry Supabase Migration

Goal: move NexusPlanner backend state from Supabase Cloud project `cucqyupaaqnrzblkpsrz` to the Raspberry Pi Supabase stack at `192.168.100.10`.

This directory is the operational source of truth for the migration. Do not start by applying repo migrations to the Raspberry. The repo is missing early production migrations that created the base NexusPlanner tables, so a production schema baseline must be restored first.

## Current Gate

The next required input is a direct production Postgres connection string from Supabase Dashboard. The linked Supabase CLI path cannot currently dump, pull, query or fetch migrations from production because it fails while preparing the temporary `cli_login_postgres` role.

Set the production connection string only in the current shell:

```powershell
$env:NEXUS_PROD_DB_URL = "postgresql://postgres:[PASSWORD]@db.cucqyupaaqnrzblkpsrz.supabase.co:5432/postgres?sslmode=require"
```

Do not commit the DB URL, password, service role key, local anon key or generated Supabase local secrets.

## Runbooks In Order

1. `raspberry-supabase-inventory.md`

   Read first. It records Cloud vs Raspberry inventory, missing migrations, extension state, Edge Function source sync, Storage inventory and known blockers.

2. `raspberry-supabase-baseline-runbook.md`

   Use after the production DB URL is available. It exports the production schema baseline, applies it to the Raspberry and verifies schema object parity.

3. `raspberry-supabase-data-runbook.md`

   Use only after schema parity passes. It exports/imports Auth/public/storage metadata data and verifies row counts plus relationship integrity.

4. `raspberry-supabase-storage-runbook.md`

   Use after Storage metadata exists. It migrates actual object bytes and verifies public reads through the Raspberry API gateway.

5. `raspberry-frontend-cutover-runbook.md`

   Use after backend phases pass. It points Vite to the Raspberry and verifies no Cloud requests are made.

## Scripts

Schema export from Windows requires Docker Desktop because `supabase db dump` runs a Dockerized Postgres toolchain. If Docker Desktop is not running, use the Raspberry export wrapper instead; the Raspberry already has Docker available.

Schema export from Windows:

```powershell
.\docs\migration\scripts\export-cloud-baseline.ps1
```

Schema export from Raspberry, controlled from Windows:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\export-cloud-baseline-on-raspberry.ps1
```

This creates:

- `docs/migration/exports/cloud_schema_public.sql`
- `docs/migration/exports/cloud_storage_policies.sql`
- `docs/migration/exports/cloud_roles.sql`

Do not apply `cloud_schema_public_storage.sql` to the Raspberry. The Raspberry Supabase stack already owns the internal `storage` schema; only NexusPlanner's custom Storage policies should be applied on top of it.

Apply schema to Raspberry:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\apply-raspberry-baseline.ps1
```

Run Raspberry SQL checks:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\run-raspberry-sql-checks.ps1
```

Data export from Windows:

```powershell
.\docs\migration\scripts\export-cloud-data.ps1
```

Data export from Raspberry, controlled from Windows:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\export-cloud-data-on-raspberry.ps1
```

Apply data to Raspberry:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\apply-raspberry-data.ps1
```

Migrate Storage object bytes:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\migrate-storage-bytes-on-raspberry.ps1
```

Configure Realtime publication and Cron jobs:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\configure-raspberry-realtime-cron.ps1
```

Configure Raspberry Auth URLs before frontend cutover:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\configure-raspberry-auth.ps1
```

Google OAuth on the Raspberry also requires provider credentials. Set `NEXUS_GOOGLE_CLIENT_ID` and `NEXUS_GOOGLE_CLIENT_SECRET` in the current shell before running `configure-raspberry-auth.ps1`; otherwise the script updates Auth URLs only and leaves Google disabled.

## SQL Gates

Run these through `run-raspberry-sql-checks.ps1` when the relevant phase exists:

- `sql/raspberry_capability_check.sql`: safe before baseline; verifies extensions, cron, public table count and realtime publication.
- `sql/baseline_parity_counts.sql`: after schema baseline; verifies object counts and core functions.
- `sql/domain_data_counts.sql`: after data import; verifies row counts.
- `sql/domain_integrity_checks.sql`: after data import; verifies critical relationships, sprint invariant and task-epic project isolation.
- `sql/storage_inventory_check.sql`: after Storage metadata/bytes migration; verifies buckets and object metadata.

## State Already Verified

- Raspberry Supabase stack is reachable on LAN.
- Raspberry Postgres has `pg_cron`, `pg_graphql`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `supabase_vault` and `uuid-ossp`.
- Raspberry `cron.job` exists and has `0` jobs before baseline.
- Raspberry has `0` NexusPlanner public tables before baseline.
- Raspberry realtime publication is empty before baseline.
- Edge Function sources are copied to `/home/hannah/nexusplanner-supabase/supabase/functions`.
- `supabase functions serve --no-verify-jwt` detects `job-worker`, `sprint-commands`, `task-commands` and `workspace-commands`.
- Production metadata inventory reports 29 public tables, 255 public columns, 125 public constraints, 103 public indexes, 102 public policies, 30 public triggers, 74 public functions and 5 Storage policies.
- Production data integrity checks return `0` failures for critical relations.
- Production has no multiple-active-sprint violation and no cross-project task-epic links.
- Production Storage has 2 buckets and 6 objects.

## Stop Conditions

Stop immediately if:

- schema parity counts differ after baseline import;
- command RPCs such as `create_task_command`, `assign_task_command`, `move_task_column_command` or `complete_sprint_command` are missing;
- any domain integrity check returns failures;
- Storage object rows exist but bytes are not retrievable from `http://192.168.100.10:54321/storage/v1/...`;
- frontend Network tab shows requests to `https://cucqyupaaqnrzblkpsrz.supabase.co` during Raspberry testing.
