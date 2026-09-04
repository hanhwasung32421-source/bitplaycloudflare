param(
  [int]$IntervalSeconds = 10
)

$ErrorActionPreference = "Continue"

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
  git remote add origin 'https://github.com/hanhwasung32421-source/usdetrade.git'
}

Write-Host "자동 푸시 감시 시작. 중지하려면 Ctrl + C"

while ($true) {
  $status = git status --porcelain
  if ($status) {
    $ver = $null
    try {
      $ver = & node ".\\bump_version.mjs"
    } catch {
      $ver = $null
    }

    git add -A
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    if ($ver) {
      git commit -m "auto watch update v$ver"
    } else {
      git commit -m "auto watch update $stamp"
    }
    git push -u origin main
  }
  Start-Sleep -Seconds $IntervalSeconds
}
