param(
  [switch]$IncludeDevelopment
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $projectRoot '.env'
$vercelProjectPath = Join-Path $projectRoot '.vercel\project.json'
$vercelRepoPath = Join-Path $projectRoot '.vercel\repo.json'
$vercelCmd = Get-Command 'vercel.cmd' -ErrorAction SilentlyContinue

if (-not (Test-Path $envPath)) {
  throw ".env 파일이 없습니다. 프로젝트 루트에 .env를 먼저 준비하세요."
}

if (-not $vercelCmd) {
  throw "vercel.cmd 를 찾지 못했습니다. 먼저 Vercel CLI가 설치되어 있는지 확인하세요."
}

if ((-not (Test-Path $vercelProjectPath)) -and (-not (Test-Path $vercelRepoPath))) {
  throw ".vercel\project.json 또는 .vercel\repo.json 이 없습니다. 먼저 프로젝트 루트에서 vercel.cmd link 를 1회 실행하세요."
}

function Read-DotEnv([string]$path) {
  $map = @{}
  foreach ($line in Get-Content -Path $path -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith('#')) { continue }
    $idx = $trimmed.IndexOf('=')
    if ($idx -lt 0) { continue }
    $key = $trimmed.Substring(0, $idx).Trim()
    $value = $trimmed.Substring($idx + 1).Trim()
    $map[$key] = $value
  }
  return $map
}

$envMap = Read-DotEnv $envPath
$required = @(
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_APP_DB_ENABLED',
  'SESSION_SECRET'
)

foreach ($name in $required) {
  if (-not $envMap.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($envMap[$name])) {
    throw ".env 에 필수 키가 없습니다: $name"
  }
}

$targets = @('production', 'preview')
if ($IncludeDevelopment) {
  $targets += 'development'
}

foreach ($target in $targets) {
  Write-Host "Vercel env 적용 중: $target" -ForegroundColor Cyan
  foreach ($name in $required) {
    $value = $envMap[$name]
    & vercel.cmd env add $name $target --force --yes --value $value
    if ($LASTEXITCODE -ne 0) {
      throw "Vercel env 등록 실패: $name ($target)"
    }
  }
}

Write-Host "완료: .env 값을 Vercel 환경변수에 등록했습니다." -ForegroundColor Green
