param(
  [Parameter(Mandatory = $true)]
  [string]$MigrationFile,
  [string]$HostName = "192.168.100.2",
  [string]$UserName = "hannah",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$DbContainer = "supabase_db_nexusplanner-supabase"
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

if (-not (Test-Path $plink)) {
  throw "PuTTY plink not found at $plink"
}

if (-not (Test-Path $pscp)) {
  throw "PuTTY pscp not found at $pscp"
}

if (-not (Test-Path $MigrationFile)) {
  throw "Migration file not found: $MigrationFile"
}

if (-not $env:NEXUS_RASPBERRY_SSH_PASSWORD) {
  throw "NEXUS_RASPBERRY_SSH_PASSWORD is required in the current shell."
}

$migrationName = Split-Path $MigrationFile -Leaf
$remoteDir = "$ProjectDir/manual-migrations"
$remoteFile = "$remoteDir/$migrationName"

& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "mkdir -p '$remoteDir'"
Assert-LastExitCode "Failed to create remote migration directory"

& $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" -batch "$MigrationFile" "$UserName@$HostName`:$remoteFile" | Out-Host
Assert-LastExitCode "Failed to copy migration to Raspberry"

Write-Host "Applying migration $migrationName on $HostName..."
& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "docker exec -i $DbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1 < '$remoteFile'"
Assert-LastExitCode "Failed to apply migration"

Write-Host "Migration applied."
