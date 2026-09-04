param(
  [string]$HostName = "192.168.100.10",
  [string]$UserName = "hannah",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$SqlFile = "docs/migration/sql/configure_realtime_cron.sql"
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

if (-not (Test-Path $SqlFile)) {
  throw "SQL file not found: $SqlFile"
}

if (-not $env:NEXUS_RASPBERRY_SSH_PASSWORD) {
  throw "NEXUS_RASPBERRY_SSH_PASSWORD is required in the current shell."
}

$remoteFile = "$ProjectDir/configure_realtime_cron.sql"

& $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$SqlFile" "$UserName@$HostName`:$remoteFile" | Out-Host
Assert-LastExitCode "Failed to copy Realtime/Cron SQL to Raspberry"

& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "docker exec -i supabase_db_nexusplanner-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1 < '$remoteFile'"
Assert-LastExitCode "Failed to configure Realtime/Cron on Raspberry"
