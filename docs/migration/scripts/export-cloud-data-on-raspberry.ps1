param(
  [string]$HostName = "192.168.100.10",
  [string]$UserName = "hannah",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$OutputDir = "docs/migration/exports",
  [string]$RemoteExportDir = "migration-exports"
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param([string]$Message)

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code $LASTEXITCODE)"
  }
}

function Assert-NonEmptyFile {
  param(
    [string]$Path,
    [string]$Message
  )

  if (-not (Test-Path $Path)) {
    throw "$Message. File was not copied back: $Path"
  }

  if ((Get-Item $Path).Length -eq 0) {
    throw "$Message. File is empty: $Path"
  }
}

if (-not $env:NEXUS_PROD_DB_URL) {
  throw "NEXUS_PROD_DB_URL is required. Set it only in the current shell; do not commit it."
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

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$dataFile = Join-Path $OutputDir "cloud_data_auth_public_storage.sql"
$remoteScript = "$ProjectDir/export-cloud-data.tmp.sh"
$remoteDataFile = "$ProjectDir/$RemoteExportDir/cloud_data_auth_public_storage.sql"
$localScript = Join-Path $env:TEMP ("nexusplanner-export-cloud-data-" + [guid]::NewGuid().ToString("N") + ".sh")
$encodedDbUrl = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($env:NEXUS_PROD_DB_URL))
$excludeTables = @(
  "auth.audit_log_entries",
  "auth.flow_state",
  "auth.mfa_amr_claims",
  "auth.mfa_challenges",
  "auth.mfa_factors",
  "auth.one_time_tokens",
  "auth.refresh_tokens",
  "auth.saml_providers",
  "auth.saml_relay_states",
  "auth.schema_migrations",
  "auth.sessions",
  "auth.sso_domains",
  "storage.buckets_analytics",
  "storage.buckets_vectors",
  "storage.migrations",
  "storage.s3_multipart_uploads",
  "storage.s3_multipart_uploads_parts",
  "storage.vector_indexes"
) -join ","

Remove-Item -Force -ErrorAction SilentlyContinue $dataFile

$scriptContent = @"
#!/usr/bin/env bash
set -euo pipefail
cd "$ProjectDir"
mkdir -p "$RemoteExportDir"
rm -f "$RemoteExportDir/cloud_data_auth_public_storage.sql"
export NEXUS_PROD_DB_URL="`$(printf '%s' '$encodedDbUrl' | base64 -d)"
echo "Dumping data from remote database on Raspberry..."
/home/hannah/.supabase/bin/supabase db dump --db-url "`$NEXUS_PROD_DB_URL" --data-only --use-copy --exclude "$excludeTables" --schema auth,public,storage --file "$RemoteExportDir/cloud_data_auth_public_storage.sql"
test -s "$RemoteExportDir/cloud_data_auth_public_storage.sql"
unset NEXUS_PROD_DB_URL
"@

try {
  Set-Content -Path $localScript -Value $scriptContent -Encoding UTF8

  Write-Host "Copying temporary dump script to Raspberry..."
  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$localScript" "$UserName@${HostName}:$remoteScript"
  Assert-LastExitCode "Failed to copy temporary script to Raspberry"

  Write-Host "Running data export from Raspberry..."
  & $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "bash '$remoteScript'; code=`$?; rm -f '$remoteScript'; exit `$code"
  Assert-LastExitCode "Raspberry data export failed"

  Write-Host "Copying dump file back to Windows..."
  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$UserName@${HostName}:$remoteDataFile" "$dataFile"
  Assert-LastExitCode "Failed to copy data dump back to Windows"

  Assert-NonEmptyFile -Path $dataFile -Message "Data dump failed"

  Write-Host "Data dump written to $dataFile"
  Write-Host "Review the dump before applying it. Do not migrate active auth sessions or refresh tokens."
} finally {
  Remove-Item -Force -ErrorAction SilentlyContinue $localScript
}
