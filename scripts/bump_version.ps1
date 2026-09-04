$ErrorActionPreference = "Stop"

$versionFile = Join-Path (Get-Location) "version.json"

function Get-TodayStamp {
  return (Get-Date).ToString("yyMMdd")
}

if (-not (Test-Path $versionFile)) {
  $obj = @{ date = (Get-TodayStamp); build = 1 }
} else {
  $raw = Get-Content $versionFile -Raw -Encoding UTF8
  $raw = $raw -replace "^\uFEFF", ""
  $obj = $raw | ConvertFrom-Json

  $today = Get-TodayStamp
  if ($obj.date -ne $today) {
    $obj.date = $today
    $obj.build = 1
  } else {
    $obj.build = [int]$obj.build + 1
  }
}

$json = $obj | ConvertTo-Json -Depth 5
if ($json -is [System.Array]) {
  $json = $json -join "`n"
}
$json = [string]$json

# Windows PowerShell(5.x)의 -Encoding UTF8은 BOM이 붙어서
# Nuxt 쪽 JSON.parse가 실패할 수 있으므로 BOM 없는 UTF-8로 저장
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
[System.IO.File]::WriteAllBytes($versionFile, $bytes)

Write-Output ("{0}.{1}" -f $obj.date, $obj.build)
