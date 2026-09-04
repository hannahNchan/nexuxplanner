param(
  [string]$HostName = "192.168.100.10",
  [string]$UserName = "hannah",
  [string]$ProjectDir = "/home/hannah/nexusplanner-supabase",
  [string]$HostKey = "SHA256:ZCxCKmh6x+mVN9DWIVGYRrI4fGfSHCOSfJxj6yIPtus",
  [string]$SiteUrl = "http://localhost:5173",
  [string]$AuthExternalUrl = "http://192.168.100.10:54321/auth/v1",
  [string[]]$RedirectUrls = @(
    "http://localhost:5173",
    "http://192.168.100.30:5173",
    "http://192.168.100.10:3000"
  )
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param([string]$Message)

  if ($LASTEXITCODE -ne 0) {
    throw "$Message (exit code $LASTEXITCODE)"
  }
}

$plink = "C:\Progra~1\PuTTY\plink.exe"

if (-not (Test-Path $plink)) {
  throw "PuTTY plink not found at $plink"
}

if (-not $env:NEXUS_RASPBERRY_SSH_PASSWORD) {
  throw "NEXUS_RASPBERRY_SSH_PASSWORD is required in the current shell."
}

$googleClientId = $env:NEXUS_GOOGLE_CLIENT_ID
$googleClientSecret = $env:NEXUS_GOOGLE_CLIENT_SECRET
$redirectJson = ($RedirectUrls | ConvertTo-Json -Compress)

$python = @"
import json
import os
from pathlib import Path

project_dir = Path(os.environ["PROJECT_DIR"])
config_path = project_dir / "supabase" / "config.toml"
text = config_path.read_text()

site_url = os.environ["SITE_URL"]
auth_external_url = os.environ["AUTH_EXTERNAL_URL"]
redirect_urls = json.loads(os.environ["REDIRECT_URLS_JSON"])
redirect_toml = "[" + ", ".join(f'"{url}"' for url in redirect_urls) + "]"

def replace_or_insert_auth_setting(source: str, key: str, value: str) -> str:
    lines = source.splitlines()
    auth_start = next(i for i, line in enumerate(lines) if line.strip() == "[auth]")
    auth_end = next(
        (
            i
            for i, line in enumerate(lines[auth_start + 1 :], start=auth_start + 1)
            if line.strip().startswith("[") and line.strip().endswith("]")
        ),
        len(lines),
    )
    setting_line = f"{key} = {value}"

    for i in range(auth_start + 1, auth_end):
        stripped = lines[i].strip()
        if stripped.startswith(f"{key} =") or stripped.startswith(f"# {key} ="):
            lines[i] = setting_line
            return "\n".join(lines) + "\n"

    lines.insert(auth_end, setting_line)
    return "\n".join(lines) + "\n"

text = replace_or_insert_auth_setting(text, "site_url", f'"{site_url}"')
text = replace_or_insert_auth_setting(text, "external_url", f'"{auth_external_url}"')
text = replace_or_insert_auth_setting(text, "additional_redirect_urls", redirect_toml)

google_client_id = os.environ.get("NEXUS_GOOGLE_CLIENT_ID", "")
google_client_secret = os.environ.get("NEXUS_GOOGLE_CLIENT_SECRET", "")

if google_client_id and google_client_secret:
    section = f'''[auth.external.google]
enabled = true
client_id = "{google_client_id}"
secret = "{google_client_secret}"
redirect_uri = ""
skip_nonce_check = true
email_optional = false
'''
    marker = "[auth.external.google]"
    start = text.find(marker)
    if start == -1:
        text = text.rstrip() + "\n\n" + section
    else:
        next_section = text.find("\n[", start + 1)
        if next_section == -1:
            text = text[:start] + section
        else:
            text = text[:start] + section + text[next_section + 1:]

config_path.write_text(text)
"@

$encodedPython = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($python))
$remoteCommand = @"
cd '$ProjectDir' && \
export PROJECT_DIR='$ProjectDir' && \
export SITE_URL='$SiteUrl' && \
export AUTH_EXTERNAL_URL='$AuthExternalUrl' && \
export REDIRECT_URLS_JSON='$redirectJson' && \
export NEXUS_GOOGLE_CLIENT_ID='$googleClientId' && \
export NEXUS_GOOGLE_CLIENT_SECRET='$googleClientSecret' && \
python3 - <<'PY'
import base64
exec(base64.b64decode('$encodedPython').decode())
PY
sed -n '156,166p' supabase/config.toml
if grep -q '\[auth.external.google\]' supabase/config.toml; then
  awk '/\[auth.external.google\]/{flag=1} flag{print} flag && /^email_optional/{exit}' supabase/config.toml | sed -E 's/(client_id = ).*/\1REDACTED/; s/(secret = ).*/\1REDACTED/'
else
  echo 'Google OAuth section not written because NEXUS_GOOGLE_CLIENT_ID/NEXUS_GOOGLE_CLIENT_SECRET were not provided.'
fi
"@

& $plink -ssh "$UserName@$HostName" -hostkey "$HostKey" -pw "$env:NEXUS_RASPBERRY_SSH_PASSWORD" -batch $remoteCommand
Assert-LastExitCode "Failed to configure Raspberry Auth"
