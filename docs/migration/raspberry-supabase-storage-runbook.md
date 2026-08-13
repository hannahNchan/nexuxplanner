# Raspberry Supabase Storage Migration Runbook

Goal: migrate NexusPlanner Storage buckets, metadata and object bytes from Supabase Cloud to the Raspberry Supabase instance.

Storage is not complete when `storage.objects` rows exist. The bytes must also exist in the local Storage backend and be reachable through the Raspberry API gateway.

## Production Inventory

Production buckets:

| Bucket | Public | Limit | MIME types |
| --- | --- | ---: | --- |
| `avatars` | true | 5 MiB | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| `project-assets` | true | 10 MiB | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

Production object summary:

| Bucket | Objects | Total bytes |
| --- | ---: | ---: |
| `avatars` | 3 | 1,987,448 |
| `project-assets` | 3 | 166,962 |

Production object paths:

| Bucket | Object | Bytes | Content type |
| --- | --- | ---: | --- |
| `avatars` | `233e89ba-df18-4740-a948-beec0574e529/avatar.jpg` | 114,684 | `image/jpeg` |
| `avatars` | `b2ca6d8a-25c2-4141-903e-156e78404daa/avatar.jpg` | 114,684 | `image/jpeg` |
| `avatars` | `edfe50b4-4244-465d-beff-cbde751693ec/avatar.jpeg` | 1,758,080 | `image/jpeg` |
| `project-assets` | `organization-logos/86776042-93ca-43ce-8954-9f80f9b15d91/logo.webp` | 24,864 | `image/webp` |
| `project-assets` | `organization-logos/88c7e9fe-875f-469d-ac04-f31cdbc21376/logo.png` | 599 | `image/png` |
| `project-assets` | `project-banners/1055ca0b-bc5c-45b2-916f-76c9866563df/banner.jpg` | 141,499 | `image/jpeg` |

## Migration Strategy

Use one of these approaches after the schema baseline exists.

### Preferred: Storage API Copy

1. Create the Raspberry buckets with the same public flag, limits and MIME allowlist.
2. Download each production public object from:

```text
https://cucqyupaaqnrzblkpsrz.supabase.co/storage/v1/object/public/<bucket>/<object>
```

3. Upload each object to Raspberry with the same bucket/path/content-type through:

```text
http://192.168.100.10:54321/storage/v1/object/<bucket>/<object>
```

Use a local service-role/admin context for upload. Do not expose service-role keys in the frontend or in committed scripts.

The migration wrapper runs this API copy on the Raspberry, reads the local `SERVICE_ROLE_KEY` from `supabase status -o env`, uploads with `x-upsert: true`, and verifies public byte counts for all six objects:

```powershell
$env:NEXUS_RASPBERRY_SSH_PASSWORD = "<temporary Raspberry SSH password>"
.\docs\migration\scripts\migrate-storage-bytes-on-raspberry.ps1
```

### Fallback: Direct Volume Copy

Use only if API upload is blocked. Inspect the local Supabase Storage volume layout and copy bytes into the backend storage path that the local Storage service uses. This must be followed by `storage.objects` metadata verification and public URL checks.

Do not assume the Cloud object storage layout matches the Docker local volume layout.

## Verification

Run:

```text
docs/migration/sql/storage_inventory_check.sql
```

Expected after migration:

- bucket metadata matches production;
- `avatars` has 3 objects and 1,987,448 total bytes;
- `project-assets` has 3 objects and 166,962 total bytes;
- every object path from the production inventory exists with the same content type and byte size.

Then verify public reads from the Raspberry gateway. Example shape:

```powershell
Invoke-WebRequest -Uri "http://192.168.100.10:54321/storage/v1/object/public/avatars/233e89ba-df18-4740-a948-beec0574e529/avatar.jpg" -UseBasicParsing
```

The response must be HTTP 200 and the response length should match the stored object size.

## Stop Conditions

Stop if any object row exists without retrievable bytes.

Stop if public URLs still point to `https://cucqyupaaqnrzblkpsrz.supabase.co` after frontend cutover. Project logos, banners and user avatars must resolve through `http://192.168.100.10:54321/storage/v1/...` during Raspberry testing.

Stop if bucket limits or MIME allowlists differ from production. Upload behavior in profile/project settings depends on these constraints.
