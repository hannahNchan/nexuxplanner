# Raspberry Frontend Cutover Runbook

Goal: run NexusPlanner against the Raspberry Supabase backend without consulting Supabase Cloud.

Do not use this as the final product verification until schema, data, Auth, Storage, Edge Functions, Realtime and cron are migrated. This file prepares the frontend switch and the anti-Cloud checks.

## Environment Files

The Supabase browser client is created in `src/lib/supabase.ts`. It reads these variables:

- `NEXT_PUBLIC_SUPABASE_URL` or `VITE_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, or `VITE_SUPABASE_ANON_KEY`

Use the tracked template:

```text
.env.raspberry.example
```

Create a local ignored file:

```powershell
Copy-Item .env.raspberry.example .env.raspberry.local
```

Then replace `<RASPBERRY_PUBLISHABLE_OR_ANON_KEY>` with the local publishable/anon key from the Raspberry Supabase stack. Do not commit `.env.raspberry.local`.

Expected local values:

```text
VITE_SUPABASE_URL=http://192.168.100.10:54321
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<local Raspberry publishable/anon key>
VITE_AUTH_REDIRECT_URL=http://localhost:5173
```

`VITE_AUTH_REDIRECT_URL` must match one of the additional redirect URLs in `/home/hannah/nexusplanner-supabase/supabase/config.toml`.

## Running Against Raspberry

Vite automatically loads `.env`, `.env.local` and mode-specific files. To avoid accidentally mixing Cloud variables from existing `.env` files, run with an explicit copied env only after backing up or temporarily moving Cloud env files.

Safer manual approach:

1. Save the current `.env.local` somewhere outside Git if it points to Cloud.
2. Copy `.env.raspberry.local` to `.env.local`.
3. Start Vite:

```powershell
npm run dev
```

4. Restore the original `.env.local` when done testing.

Alternative PowerShell session-only approach:

```powershell
$env:VITE_SUPABASE_URL = "http://192.168.100.10:54321"
$env:VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "<local Raspberry publishable/anon key>"
$env:VITE_AUTH_REDIRECT_URL = "http://localhost:5173"
npm run dev
```

## Anti-Cloud Checks

Before logging in:

```powershell
rg -n "cucqyupaaqnrzblkpsrz|supabase.co|4nexusplanner.netlify.app" .env .env.local .env.raspberry.local
```

The active local env file used for Raspberry testing must not contain:

- `https://cucqyupaaqnrzblkpsrz.supabase.co`
- `supabase.co`
- `https://4nexusplanner.netlify.app`

Browser Network tab expectations while testing Raspberry:

- Supabase REST/Auth/Storage/Functions requests go to `http://192.168.100.10:54321`.
- Realtime WebSocket goes to `ws://192.168.100.10:54321/realtime/v1/...`.
- No request goes to `https://cucqyupaaqnrzblkpsrz.supabase.co`.

Terminal check:

```powershell
Invoke-WebRequest -Uri "http://192.168.100.10:54321/auth/v1/health" -UseBasicParsing
Invoke-WebRequest -Uri "http://192.168.100.10:54321/rest/v1/" -UseBasicParsing
```

Expected result: both endpoints respond from the Raspberry gateway.

## OAuth Redirects

The Raspberry local config already includes:

```text
site_url = "http://localhost:5173"
external_url = "http://192.168.100.10:54321/auth/v1"
additional_redirect_urls = ["http://localhost:5173", "http://192.168.100.30:5173", "http://192.168.100.10:3000"]
```

Apply those Auth URLs with:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\configure-raspberry-auth.ps1
```

For Google OAuth to work locally, the local Supabase Auth provider must also have Google client credentials configured:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
$env:NEXUS_GOOGLE_CLIENT_ID = "<Google OAuth client id>"
$env:NEXUS_GOOGLE_CLIENT_SECRET = "<Google OAuth client secret>"
.\docs\migration\scripts\configure-raspberry-auth.ps1
```

After changing Auth config, restart the Raspberry Supabase stack from `/home/hannah/nexusplanner-supabase`. If Google returns `redirect_uri_mismatch`, add `http://192.168.100.10:54321/auth/v1/callback` to the Google OAuth client's authorized redirect URIs.

Do not point production Google OAuth redirect URIs at the Raspberry unless the Raspberry is meant to be externally reachable. For LAN testing, use the local Supabase Auth settings and browser URL from this runbook.

## Smoke Test Gate

Run this frontend cutover only after backend phases pass:

1. Open the app with Raspberry env loaded.
2. Authenticate locally.
3. Confirm organizations/projects load from Raspberry data.
4. Create a throwaway organization/project.
5. Create an epic.
6. Create a task.
7. Assign a user.
8. Move the task between board columns.
9. Create a sprint and move a task into it.
10. Complete the sprint.
11. Open roadmap.
12. Confirm notification/realtime updates.
13. Confirm automation rule execution history.

After the smoke test, run `docs/migration/sql/domain_data_counts.sql` and `docs/migration/sql/domain_integrity_checks.sql` against Raspberry again. New test rows may change counts, but integrity failures must remain `0`.
