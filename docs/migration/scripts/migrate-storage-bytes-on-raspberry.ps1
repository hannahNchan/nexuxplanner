param(
  [string]$HostName = "192.168.100.10",
  [string]$UserName = "hannah",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$CloudStorageBaseUrl = "https://cucqyupaaqnrzblkpsrz.supabase.co/storage/v1/object/public",
  [string]$RaspberryStorageBaseUrl = "http://127.0.0.1:54321/storage/v1"
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param([string]$Message)

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code $LASTEXITCODE)"
  }
}

if (-not $env:NEXUS_RASPBERRY_SSH_PASSWORD) {
  throw "NEXUS_RASPBERRY_SSH_PASSWORD is required for SSH transfer."
}

$plink = "C:\Progra~1\PuTTY\plink.exe"
$pscp = "C:\Progra~1\PuTTY\pscp.exe"

if (-not (Test-Path $plink)) {
  throw "PuTTY plink.exe not found at $plink"
}

if (-not (Test-Path $pscp)) {
  throw "PuTTY pscp.exe not found at $pscp"
}

$remoteScript = "$ProjectDir/migrate-storage-bytes.tmp.sh"
$localScript = Join-Path $env:TEMP ("nexusplanner-migrate-storage-bytes-" + [guid]::NewGuid().ToString("N") + ".sh")

$scriptContent = @"
#!/usr/bin/env bash
set -euo pipefail

cd "$ProjectDir"

SERVICE_ROLE_KEY="`$(/home/hannah/.supabase/bin/supabase status -o env 2>/dev/null | awk -F= '/^SERVICE_ROLE_KEY=/{print `$2; exit}' | sed -e 's/^"//' -e 's/"`$//')"
if [[ -z "`$SERVICE_ROLE_KEY" ]]; then
  echo "SERVICE_ROLE_KEY was not found in supabase status output" >&2
  exit 1
fi

CLOUD_STORAGE_BASE_URL="$CloudStorageBaseUrl"
RASPBERRY_STORAGE_BASE_URL="$RaspberryStorageBaseUrl"
WORK_DIR="`$(mktemp -d)"
trap 'rm -rf "`$WORK_DIR"' EXIT

objects=(
  'avatars|233e89ba-df18-4740-a948-beec0574e529/avatar.jpg|image/jpeg|114684'
  'avatars|b2ca6d8a-25c2-4141-903e-156e78404daa/avatar.jpg|image/jpeg|114684'
  'avatars|edfe50b4-4244-465d-beff-cbde751693ec/avatar.jpeg|image/jpeg|1758080'
  'project-assets|organization-logos/86776042-93ca-43ce-8954-9f80f9b15d91/logo.webp|image/webp|24864'
  'project-assets|organization-logos/88c7e9fe-875f-469d-ac04-f31cdbc21376/logo.png|image/png|599'
  'project-assets|project-banners/1055ca0b-bc5c-45b2-916f-76c9866563df/banner.jpg|image/jpeg|141499'
)

for item in "`$`{objects[@]`}" ; do
  IFS='|' read -r bucket object_path content_type expected_bytes <<< "`$item"
  local_file="`$WORK_DIR/`$(printf '%s' "`$bucket/`$object_path" | tr '/' '_')"
  source_url="`$CLOUD_STORAGE_BASE_URL/`$bucket/`$object_path"
  upload_url="`$RASPBERRY_STORAGE_BASE_URL/object/`$bucket/`$object_path"
  public_url="`$RASPBERRY_STORAGE_BASE_URL/object/public/`$bucket/`$object_path"

  echo "Downloading `$bucket/`$object_path"
  curl -fsS "`$source_url" -o "`$local_file"
  downloaded_bytes="`$(wc -c < "`$local_file" | tr -d ' ')"
  if [[ "`$downloaded_bytes" != "`$expected_bytes" ]]; then
    echo "Downloaded byte mismatch for `$bucket/`$object_path: expected `$expected_bytes, got `$downloaded_bytes" >&2
    exit 1
  fi

  echo "Uploading `$bucket/`$object_path"
  curl -fsS -X POST "`$upload_url" \
    -H "apikey: `$SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer `$SERVICE_ROLE_KEY" \
    -H "Content-Type: `$content_type" \
    -H "x-upsert: true" \
    --data-binary "@`$local_file" >/dev/null

  verified_bytes="`$(curl -fsS "`$public_url" | wc -c | tr -d ' ')"
  if [[ "`$verified_bytes" != "`$expected_bytes" ]]; then
    echo "Raspberry public read mismatch for `$bucket/`$object_path: expected `$expected_bytes, got `$verified_bytes" >&2
    exit 1
  fi
done

echo "Storage object bytes migrated and verified."
"@

try {
  Set-Content -Path $localScript -Value $scriptContent -Encoding UTF8

  Write-Host "Copying temporary Storage migration script to Raspberry..."
  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$localScript" "$UserName@${HostName}:$remoteScript"
  Assert-LastExitCode "Failed to copy temporary script to Raspberry"

  Write-Host "Migrating Storage bytes from Cloud to Raspberry..."
  & $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "bash '$remoteScript'; code=`$?; rm -f '$remoteScript'; exit `$code"
  Assert-LastExitCode "Storage byte migration failed"
} finally {
  Remove-Item -Force -ErrorAction SilentlyContinue $localScript
}
