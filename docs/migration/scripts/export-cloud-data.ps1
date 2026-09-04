param(
  [string]$OutputDir = "docs/migration/exports"
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param([string]$Message)

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code $LASTEXITCODE). Supabase CLI db dump needs a reachable Docker daemon on this machine. Start Docker Desktop or run docs/migration/scripts/export-cloud-data-on-raspberry.ps1."
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

if (-not $env:NEXUS_PROD_DB_URL) {
  throw "NEXUS_PROD_DB_URL is required. Set it only in the current shell; do not commit it."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$dataFile = Join-Path $OutputDir "cloud_data_auth_public_storage.sql"
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

docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker is not reachable from this shell. Supabase CLI db dump needs Docker locally. Start Docker Desktop or run docs/migration/scripts/export-cloud-data-on-raspberry.ps1."
}

Write-Host "Dumping data from remote database..."
npx supabase db dump `
  --db-url "$env:NEXUS_PROD_DB_URL" `
  --data-only `
  --use-copy `
  --exclude "$excludeTables" `
  --schema auth,public,storage `
  --file "$dataFile"
Assert-LastExitCode "Data dump failed"
Assert-NonEmptyFile -Path $dataFile -Message "Data dump failed"

Write-Host "Data dump written to $dataFile"
Write-Host "Review the dump before applying it. Do not migrate active auth sessions or refresh tokens."
