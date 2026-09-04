import fs from 'node:fs'
import path from 'node:path'

function todayStamp() {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

const versionFile = path.join(process.cwd(), 'version.json')
let prev = { date: '', build: 0 }

if (fs.existsSync(versionFile)) {
  const raw = fs.readFileSync(versionFile, 'utf8').replace(/^\uFEFF/, '')
  try {
    prev = JSON.parse(raw)
  } catch {
    prev = { date: '', build: 0 }
  }
}

const today = todayStamp()
// \uC608\uC804 \uBC84\uC804(\uB808\uAC70\uC2DC "version" \uBB38\uC790\uC5F4 \uB4F1) \uD544\uB4DC\uB294 \uBC84\uB9AC\uACE0 \uD56D\uC0C1 date/build\uB9CC \uB0A8\uAE34\uB2E4.
const obj = prev.date === today ? { date: today, build: Number(prev.build || 0) + 1 } : { date: today, build: 2 }

fs.writeFileSync(versionFile, JSON.stringify(obj, null, 2), 'utf8')
process.stdout.write(`${obj.date}.${obj.build}`)

