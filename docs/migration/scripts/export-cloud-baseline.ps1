param(
  [string]$OutputDir = "docs/migration/exports"
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param([string]$Message)

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code $LASTEXITCODE). Supabase CLI db dump needs a reachable Docker daemon on this machine. Start Docker Desktop or run docs/migration/scripts/export-cloud-baseline-on-raspberry.ps1."
  }
}

function Assert-NonEmptyFile {
  param(
    [string]$Path,
    [string]$Message
  )

  if (-not (Test-Path $Path)) {
    throw "$Message. File was not created: $Path"
  }

  if ((Get-Item $Path).Length -eq 0) {
    throw "$Message. File is empty: $Path"
  }
}

function Export-StoragePolicies {
  param(
    [string]$SourceFile,
    [string]$DestinationFile
  )

  $capturing = $false
  $policyLines = New-Object System.Collections.Generic.List[string]

  foreach ($line in Get-Content $SourceFile) {
    if ($line -match '^CREATE POLICY .+ ON "storage"\.') {
      $capturing = $true
    }

    if ($capturing) {
      $policyLines.Add($line)
    }

    if ($capturing -and $line -match ';\s*$') {
      $policyLines.Add("")
      $capturing = $false
    }
  }

  if ($policyLines.Count -eq 0) {
    throw "No Storage policies were found in $SourceFile"
  }

  Set-Content -Path $DestinationFile -Value $policyLines -Encoding UTF8
}

if (-not $env:NEXUS_PROD_DB_URL) {
  throw "NEXUS_PROD_DB_URL is required. Set it only in the current shell; do not commit it."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$schemaFile = Join-Path $OutputDir "cloud_schema_public.sql"
$storageSchemaFile = Join-Path $OutputDir "cloud_schema_storage.tmp.sql"
$storagePoliciesFile = Join-Path $OutputDir "cloud_storage_policies.sql"
$rolesFile = Join-Path $OutputDir "cloud_roles.sql"

Remove-Item -Force -ErrorAction SilentlyContinue $schemaFile, $storageSchemaFile, $storagePoliciesFile, $rolesFile

docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker is not reachable from this shell. Supabase CLI db dump needs Docker locally. Start Docker Desktop or run docs/migration/scripts/export-cloud-baseline-on-raspberry.ps1."
}

Write-Host "Dumping schemas from remote database..."
npx supabase db dump `
  --db-url "$env:NEXUS_PROD_DB_URL" `
  --schema public `
  --file "$schemaFile"
Assert-LastExitCode "Schema dump failed"
Assert-NonEmptyFile -Path $schemaFile -Message "Schema dump failed"

Write-Host "Dumping Storage schema to extract custom policies..."
npx supabase db dump `
  --db-url "$env:NEXUS_PROD_DB_URL" `
  --schema storage `
  --file "$storageSchemaFile"
Assert-LastExitCode "Storage schema dump failed"
Assert-NonEmptyFile -Path $storageSchemaFile -Message "Storage schema dump failed"

Export-StoragePolicies -SourceFile $storageSchemaFile -DestinationFile $storagePoliciesFile
Assert-NonEmptyFile -Path $storagePoliciesFile -Message "Storage policy extraction failed"
Remove-Item -Force -ErrorAction SilentlyContinue $storageSchemaFile

Write-Host "Dumping roles from remote database..."
npx supabase db dump `
  --db-url "$env:NEXUS_PROD_DB_URL" `
  --role-only `
  --file "$rolesFile"
Assert-LastExitCode "Role dump failed"
Assert-NonEmptyFile -Path $rolesFile -Message "Role dump failed"

Write-Host "Schema baseline written to $schemaFile"
Write-Host "Storage policies written to $storagePoliciesFile"
Write-Host "Role dump written to $rolesFile"
