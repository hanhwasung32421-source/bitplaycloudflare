param(
  [ValidateSet('production','preview','development')]
  [string]$Target = 'production',
  [string]$EnvFile = ".\\vercel.env.local"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Env 파일이 없습니다: $EnvFile  (예: vercel.env.local.example 를 복사해서 vercel.env.local 생성)"
}

function Parse-DotEnv([string]$path) {
  $map = @{}
  Get-Content -LiteralPath $path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $k = $line.Substring(0, $idx).Trim()
    $v = $line.Substring($idx + 1).Trim()
    $map[$k] = $v
  }
  return $map
}

$vars = Parse-DotEnv $EnvFile
if ($vars.Count -eq 0) { throw "Env 파일에 설정이 없습니다: $EnvFile" }

Write-Host "Target: $Target"
Write-Host "EnvFile: $EnvFile"
Write-Host "Keys: $($vars.Keys -join ', ')"

# vercel CLI 필요
$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
  throw "vercel CLI가 없습니다. 먼저 설치: npm i -g vercel"
}

# 프로젝트 연결(처음 1회): vercel link
Write-Host "Vercel 프로젝트 연결 확인(vercel link)..."
& vercel link | Out-Null

foreach ($k in $vars.Keys) {
  $v = $vars[$k]
  if (-not $v) { continue }

  # 기존 값 삭제(있으면) 후 새로 추가
  Write-Host "Set $k ($Target)"
  try { & vercel env rm $k $Target --yes | Out-Null } catch { }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($v)
  $ms = New-Object System.IO.MemoryStream
  $ms.Write($bytes, 0, $bytes.Length)
  $ms.Position = 0
  $sr = New-Object System.IO.StreamReader($ms, [System.Text.Encoding]::UTF8)

  # PowerShell에서 stdin 파이프를 확실히 주기 위해 cmdlet 사용
  $v | & vercel env add $k $Target | Out-Null
}

Write-Host "완료. 이제 Vercel에서 Redeploy 하세요."

