param(
  [string]$HostName = "192.168.100.10",
  [string]$UserName = "hannah",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$SchemaFile = "docs/migration/exports/cloud_schema_public.sql",
  [string]$StoragePoliciesFile = "docs/migration/exports/cloud_storage_policies.sql"
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param([string]$Message)

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code $LASTEXITCODE)"
  }
}

$plink = "C:\Progra~1\PuTTY\plink.exe"
$pscp = "C:\Progra~1\PuTTY\pscp.exe"

if (-not (Test-Path $SchemaFile)) {
  throw "Schema file not found: $SchemaFile"
}

if (-not (Test-Path $StoragePoliciesFile)) {
  throw "Storage policy file not found: $StoragePoliciesFile"
}

if (-not $env:NEXUS_RASPBERRY_SSH_PASSWORD) {
  throw "NEXUS_RASPBERRY_SSH_PASSWORD is required in the current shell."
}

$remoteFile = "$ProjectDir/cloud_schema_public.sql"
$remoteStoragePoliciesFile = "$ProjectDir/cloud_storage_policies.sql"

& $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$SchemaFile" "$UserName@$HostName`:$remoteFile" | Out-Host
Assert-LastExitCode "Failed to copy public schema to Raspberry"

& $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$StoragePoliciesFile" "$UserName@$HostName`:$remoteStoragePoliciesFile" | Out-Host
Assert-LastExitCode "Failed to copy Storage policies to Raspberry"

Write-Host "Applying public schema baseline..."
& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "docker exec -i supabase_db_nexusplanner-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1 < '$remoteFile'"
Assert-LastExitCode "Failed to apply public schema baseline"

Write-Host "Applying custom Storage policies..."
& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "docker exec -i supabase_db_nexusplanner-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1 < '$remoteStoragePoliciesFile'"
Assert-LastExitCode "Failed to apply custom Storage policies"

Write-Host "Baseline schema applied. Run docs/migration/scripts/run-raspberry-sql-checks.ps1 next."
