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

$schemaFile = Join-Path $OutputDir "cloud_schema_public.sql"
$storagePoliciesFile = Join-Path $OutputDir "cloud_storage_policies.sql"
$rolesFile = Join-Path $OutputDir "cloud_roles.sql"
$remoteScript = "$ProjectDir/export-cloud-baseline.tmp.sh"
$remoteSchemaFile = "$ProjectDir/$RemoteExportDir/cloud_schema_public.sql"
$remoteStoragePoliciesFile = "$ProjectDir/$RemoteExportDir/cloud_storage_policies.sql"
$remoteRolesFile = "$ProjectDir/$RemoteExportDir/cloud_roles.sql"
$localScript = Join-Path $env:TEMP ("nexusplanner-export-cloud-baseline-" + [guid]::NewGuid().ToString("N") + ".sh")
$encodedDbUrl = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($env:NEXUS_PROD_DB_URL))

Remove-Item -Force -ErrorAction SilentlyContinue $schemaFile, $storagePoliciesFile, $rolesFile

$scriptContent = @"
#!/usr/bin/env bash
set -euo pipefail
cd "$ProjectDir"
mkdir -p "$RemoteExportDir"
rm -f "$RemoteExportDir/cloud_schema_public.sql" "$RemoteExportDir/cloud_schema_storage.tmp.sql" "$RemoteExportDir/cloud_storage_policies.sql" "$RemoteExportDir/cloud_roles.sql"
export NEXUS_PROD_DB_URL="`$(printf '%s' '$encodedDbUrl' | base64 -d)"
echo "Dumping schemas from remote database on Raspberry..."
/home/hannah/.supabase/bin/supabase db dump --db-url "`$NEXUS_PROD_DB_URL" --schema public --file "$RemoteExportDir/cloud_schema_public.sql"
test -s "$RemoteExportDir/cloud_schema_public.sql"
echo "Extracting custom Storage policies from remote database on Raspberry..."
/home/hannah/.supabase/bin/supabase db dump --db-url "`$NEXUS_PROD_DB_URL" --schema storage --file "$RemoteExportDir/cloud_schema_storage.tmp.sql"
test -s "$RemoteExportDir/cloud_schema_storage.tmp.sql"
awk 'BEGIN { capture=0 } /^CREATE POLICY .* ON "storage"\./ { capture=1 } capture { print } capture && /;$/ { print ""; capture=0 }' "$RemoteExportDir/cloud_schema_storage.tmp.sql" > "$RemoteExportDir/cloud_storage_policies.sql"
test -s "$RemoteExportDir/cloud_storage_policies.sql"
rm -f "$RemoteExportDir/cloud_schema_storage.tmp.sql"
echo "Dumping roles from remote database on Raspberry..."
/home/hannah/.supabase/bin/supabase db dump --db-url "`$NEXUS_PROD_DB_URL" --role-only --file "$RemoteExportDir/cloud_roles.sql"
test -s "$RemoteExportDir/cloud_roles.sql"
unset NEXUS_PROD_DB_URL
"@

try {
  Set-Content -Path $localScript -Value $scriptContent -Encoding UTF8

  Write-Host "Copying temporary dump script to Raspberry..."
  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$localScript" "$UserName@${HostName}:$remoteScript"
  Assert-LastExitCode "Failed to copy temporary script to Raspberry"

  Write-Host "Running schema export from Raspberry..."
  & $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "bash '$remoteScript'; code=`$?; rm -f '$remoteScript'; exit `$code"
  Assert-LastExitCode "Raspberry schema export failed"

  Write-Host "Copying dump files back to Windows..."
  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$UserName@${HostName}:$remoteSchemaFile" "$schemaFile"
  Assert-LastExitCode "Failed to copy schema dump back to Windows"

  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$UserName@${HostName}:$remoteStoragePoliciesFile" "$storagePoliciesFile"
  Assert-LastExitCode "Failed to copy Storage policy dump back to Windows"

  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$UserName@${HostName}:$remoteRolesFile" "$rolesFile"
  Assert-LastExitCode "Failed to copy role dump back to Windows"

  Assert-NonEmptyFile -Path $schemaFile -Message "Schema dump failed"
  Assert-NonEmptyFile -Path $storagePoliciesFile -Message "Storage policy dump failed"
  Assert-NonEmptyFile -Path $rolesFile -Message "Role dump failed"

  Write-Host "Schema baseline written to $schemaFile"
  Write-Host "Storage policies written to $storagePoliciesFile"
  Write-Host "Role dump written to $rolesFile"
} finally {
  Remove-Item -Force -ErrorAction SilentlyContinue $localScript
}
