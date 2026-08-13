param(
  [string]$HostName = "192.168.100.10",
  [string]$UserName = "hannah",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$DataFile = "docs/migration/exports/cloud_data_auth_public_storage.sql"
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

if (-not (Test-Path $DataFile)) {
  throw "Data file not found: $DataFile"
}

if (-not $env:NEXUS_RASPBERRY_SSH_PASSWORD) {
  throw "NEXUS_RASPBERRY_SSH_PASSWORD is required in the current shell."
}

$confirmation = Read-Host "Type APPLY_DATA_AFTER_BASELINE_PASSED to continue"
if ($confirmation -ne "APPLY_DATA_AFTER_BASELINE_PASSED") {
  throw "Cancelled. Schema baseline and parity checks must pass before data import."
}

$remoteFile = "$ProjectDir/cloud_data_auth_public_storage.sql"

& $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$DataFile" "$UserName@$HostName`:$remoteFile" | Out-Host
Assert-LastExitCode "Failed to copy data dump to Raspberry"

& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "docker exec -i supabase_db_nexusplanner-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1 < '$remoteFile'"
Assert-LastExitCode "Failed to apply data import"

Write-Host "Data import applied. Run domain and storage checks before frontend cutover."
