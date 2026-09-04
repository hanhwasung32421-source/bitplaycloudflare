param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
  git remote add origin 'https://github.com/hanhwasung32421-source/usdetrade.git'
}

# 버전 증가 (yyMMdd.N)
$ver = $null
try {
  $ver = & node ".\\bump_version.mjs"
} catch {
  $ver = $null
}

git add -A
$status = git status --porcelain
if (-not $status) {
  Write-Host "변경사항 없음"
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  if ($ver) {
    $Message = "auto update v$ver"
  } else {
    $Message = "auto update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  }
}

git commit -m $Message
git push -u origin main
