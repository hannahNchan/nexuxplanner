param(
  [string]$HostName = "192.168.100.10",
  [string]$UserName = "hannah",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$SqlDir = "docs/migration/sql",
  [string[]]$Checks = @(
    "raspberry_capability_check.sql",
    "baseline_parity_counts.sql",
    "domain_data_counts.sql",
    "domain_integrity_checks.sql",
    "storage_inventory_check.sql"
  )
)

$ErrorActionPreference = "Stop"

$plink = "C:\Progra~1\PuTTY\plink.exe"
$pscp = "C:\Progra~1\PuTTY\pscp.exe"

if (-not (Test-Path $plink)) {
  throw "PuTTY plink not found at $plink"
}

if (-not (Test-Path $pscp)) {
  throw "PuTTY pscp not found at $pscp"
}

if (-not $env:NEXUS_RASPBERRY_SSH_PASSWORD) {
  throw "NEXUS_RASPBERRY_SSH_PASSWORD is required in the current shell."
}

$remoteSqlDir = "$ProjectDir/migration-sql-checks"

& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "mkdir -p '$remoteSqlDir'"

foreach ($check in $Checks) {
  $localPath = Join-Path $SqlDir $check
  if (-not (Test-Path $localPath)) {
    throw "Missing SQL check file: $localPath"
  }

  & $pscp -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -hostkey "$HostKey" "$localPath" "$UserName@$HostName`:$remoteSqlDir/$check" | Out-Host

  Write-Host ""
  Write-Host "== $check =="
  & $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch "docker exec -i supabase_db_nexusplanner-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1 < '$remoteSqlDir/$check'"
}
