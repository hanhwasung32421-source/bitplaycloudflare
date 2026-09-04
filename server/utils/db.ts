import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import os from 'node:os'
import bcrypt from 'bcryptjs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let _db: any = null
let _DatabaseSync: any = null

function nowIso() {
  return new Date().toISOString()
}

export function getDb() {
  if (_db) return _db

  if (!_DatabaseSync) {
    // 중요:
    // Vercel/서버리스에서는 Supabase만 쓰는 요청도 많은데,
    // node:sqlite를 모듈 로드시점에 바로 import하면 런타임이 해당 모듈을 평가하다가
    // 요청 시작 전에 500이 날 수 있습니다.
    // 따라서 실제로 SQLite가 필요한 순간에만 동기 로드합니다.
    _DatabaseSync = require('node:sqlite').DatabaseSync
  }

  // 중요:
  // - "푸시/재배포 때 데이터가 초기화"되는 원인은 보통 컨테이너 파일시스템이 ephemeral이기 때문입니다.
  // - 해결: 배포 환경에서 지속 디스크(Volume)를 붙이고 SQLITE_DIR을 그 경로로 지정해야 합니다.
  // 기본값:
  // - Windows(로컬): 프로젝트/data
  // - Linux(Docker/서버): /data (VOLUME로 마운트 권장)
  const preferredDir =
    process.env.SQLITE_DIR || (process.platform === 'win32' ? join(process.cwd(), 'data') : '/data')

  const tryOpenDb = (dir: string) => {
    mkdirSync(dir, { recursive: true })
    const dbPath = join(dir, 'app.db')
    mkdirSync(dirname(dbPath), { recursive: true })
    const db = new _DatabaseSync(dbPath)
    // 서버리스/배포 환경에서 WAL이 파일 잠금/권한 문제를 만드는 경우가 있어 안전하게 기본값을 사용
    if (process.env.NODE_ENV !== 'production') {
      try {
        db.exec('PRAGMA journal_mode=WAL;')
      } catch {
        // ignore
      }
    }
    return db
  }

  let db: DatabaseSync
  try {
    // /data가 "존재는 하지만 쓰기 불가"인 환경이 있어, open 실패 시 tmpdir로 안전하게 fallback
    db = tryOpenDb(preferredDir)
  } catch {
    const fallbackDir = join(os.tmpdir(), 'exchange-demo-data')
    db = tryOpenDb(fallbackDir)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      bank_name TEXT NOT NULL DEFAULT '',
      bank_account TEXT NOT NULL DEFAULT '',
      account_holder TEXT NOT NULL DEFAULT '',
      referral_code TEXT NOT NULL DEFAULT '',
      terms_agreed_at TEXT NULL,
      password_reset_required INTEGER NOT NULL DEFAULT 0,
      password_reset_notice_dismissed_at TEXT NULL,
      role TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS balances (
      user_id INTEGER PRIMARY KEY,
      usdt REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      entry_price REAL NOT NULL,
      leverage INTEGER NOT NULL,
      margin REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL NOT NULL,
      leverage INTEGER NOT NULL,
      pnl REAL NOT NULL,
      liquidation INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trade_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      trade_percent INTEGER NOT NULL DEFAULT 50,
      trade_leverage INTEGER NOT NULL DEFAULT 100,
      chart_prefs TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      thread_key TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      read_at TEXT NULL,
      created_at TEXT NOT NULL
    );

    -- 비회원(가입 전 방문자)이 첫화면의 "실시간 상담"에서 admin과 나누는 대화.
    -- guest_id는 방문자 브라우저에 저장된 임의 코드(로그인 계정과 무관)로 대화를 구분한다.
    CREATE TABLE IF NOT EXISTS guest_chats (
      id INTEGER PRIMARY KEY,
      guest_id TEXT NOT NULL,
      ip TEXT NULL,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      read_at TEXT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY,
      liquidation_roe REAL NOT NULL DEFAULT -40,
      telegram_url TEXT NOT NULL DEFAULT '',
      krw_per_usdt REAL NOT NULL DEFAULT 0,
      loss_settlement_percent REAL NOT NULL DEFAULT 0,
      referral_settlement_percent REAL NOT NULL DEFAULT 0,
      krw_auto_rate REAL NOT NULL DEFAULT 0,
      krw_auto_rate_day TEXT NOT NULL DEFAULT '',
      krw_auto_rate_updated_at TEXT NULL,
      menu_order TEXT NOT NULL DEFAULT '',
      main_nav_order TEXT NOT NULL DEFAULT '',
      main_nav_hidden TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deposit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'deposit',
      krw_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      usdt_amount REAL,
      rate_used REAL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_roles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      menus TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      tier INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kill_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      percent REAL NOT NULL,
      base_price REAL NOT NULL,
      shocked_price REAL NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 1000,
      tick_count INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      percent REAL NOT NULL,
      base_price REAL NOT NULL,
      shocked_price REAL NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 1000,
      tick_count INTEGER NOT NULL DEFAULT 3,
      hold_ms INTEGER NOT NULL DEFAULT 3000,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username_snapshot TEXT NOT NULL,
      requested_name TEXT NOT NULL DEFAULT '',
      requested_birth_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by INTEGER NULL,
      message_id INTEGER NULL,
      requested_at TEXT NOT NULL,
      approved_at TEXT NULL
    );
  `)

  // 마이그레이션: trades.liquidation 컬럼 추가(강제청산 표시용)
  try {
    const cols = db.prepare("PRAGMA table_info('trades')").all() as any[]
    const hasLiquidation = cols.some((c) => String(c?.name) === 'liquidation')
    if (!hasLiquidation) {
      db.exec('ALTER TABLE trades ADD COLUMN liquidation INTEGER NOT NULL DEFAULT 0;')
    }
  } catch {
    // ignore
  }

  // 마이그레이션: kill_events.duration_ms/tick_count 컬럼 추가(킬 애니메이션 속도 조절용)
  try {
    const killCols = (db.prepare("PRAGMA table_info('kill_events')").all() as any[]).map((c) => String(c?.name))
    if (!killCols.includes('duration_ms')) {
      db.exec('ALTER TABLE kill_events ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 1000;')
    }
    if (!killCols.includes('tick_count')) {
      db.exec('ALTER TABLE kill_events ADD COLUMN tick_count INTEGER NOT NULL DEFAULT 3;')
    }
  } catch {
    // ignore
  }

  // 마이그레이션: system_settings에 텔레그램/환율/정산 비율 컬럼 추가
  try {
    const sysCols = (db.prepare("PRAGMA table_info('system_settings')").all() as any[]).map((c) => String(c?.name))
    if (!sysCols.includes('telegram_url')) db.exec("ALTER TABLE system_settings ADD COLUMN telegram_url TEXT NOT NULL DEFAULT '';")
    if (!sysCols.includes('krw_per_usdt')) db.exec('ALTER TABLE system_settings ADD COLUMN krw_per_usdt REAL NOT NULL DEFAULT 0;')
    if (!sysCols.includes('loss_settlement_percent')) db.exec('ALTER TABLE system_settings ADD COLUMN loss_settlement_percent REAL NOT NULL DEFAULT 0;')
    if (!sysCols.includes('referral_settlement_percent')) db.exec('ALTER TABLE system_settings ADD COLUMN referral_settlement_percent REAL NOT NULL DEFAULT 0;')
    if (!sysCols.includes('krw_auto_rate')) db.exec('ALTER TABLE system_settings ADD COLUMN krw_auto_rate REAL NOT NULL DEFAULT 0;')
    if (!sysCols.includes('krw_auto_rate_day')) db.exec("ALTER TABLE system_settings ADD COLUMN krw_auto_rate_day TEXT NOT NULL DEFAULT '';")
    if (!sysCols.includes('krw_auto_rate_updated_at')) db.exec('ALTER TABLE system_settings ADD COLUMN krw_auto_rate_updated_at TEXT NULL;')
    if (!sysCols.includes('menu_order')) db.exec("ALTER TABLE system_settings ADD COLUMN menu_order TEXT NOT NULL DEFAULT '';")
    if (!sysCols.includes('main_nav_order')) db.exec("ALTER TABLE system_settings ADD COLUMN main_nav_order TEXT NOT NULL DEFAULT '';")
    if (!sysCols.includes('main_nav_hidden')) db.exec("ALTER TABLE system_settings ADD COLUMN main_nav_hidden TEXT NOT NULL DEFAULT '';")
  } catch {
    // ignore
  }

  // 마이그레이션: deposit_requests에 type(deposit/withdrawal) 컬럼 추가
  try {
    const depositReqCols = (db.prepare("PRAGMA table_info('deposit_requests')").all() as any[]).map((c) => String(c?.name))
    if (!depositReqCols.includes('type')) db.exec("ALTER TABLE deposit_requests ADD COLUMN type TEXT NOT NULL DEFAULT 'deposit';")
  } catch {
    // ignore
  }

  // 마이그레이션: admin_roles에 sort_order(화면 표시 순서), tier(실제 권한 등급) 컬럼 추가
  // tier는 sort_order와 달리 여러 역할이 같은 값을 가질 수 있다(같은 등급끼리는 서로 역할을 부여할 수 없음).
  try {
    const adminRoleCols = (db.prepare("PRAGMA table_info('admin_roles')").all() as any[]).map((c) => String(c?.name))
    if (!adminRoleCols.includes('sort_order')) db.exec('ALTER TABLE admin_roles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;')
    if (!adminRoleCols.includes('tier')) {
      db.exec('ALTER TABLE admin_roles ADD COLUMN tier INTEGER NOT NULL DEFAULT 0;')
      db.exec('UPDATE admin_roles SET tier = sort_order;')
    }
  } catch {
    // ignore
  }

  // 경량 마이그레이션
  const userCols = (db.prepare(`PRAGMA table_info(users)`).all() as any[]).map((r) => String(r.name))
  if (!userCols.includes('name')) db.exec(`ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''`)
  if (!userCols.includes('birth_date')) db.exec(`ALTER TABLE users ADD COLUMN birth_date TEXT NOT NULL DEFAULT ''`)
  if (!userCols.includes('bank_name')) db.exec(`ALTER TABLE users ADD COLUMN bank_name TEXT NOT NULL DEFAULT ''`)
  if (!userCols.includes('bank_account')) db.exec(`ALTER TABLE users ADD COLUMN bank_account TEXT NOT NULL DEFAULT ''`)
  if (!userCols.includes('account_holder')) db.exec(`ALTER TABLE users ADD COLUMN account_holder TEXT NOT NULL DEFAULT ''`)
  if (!userCols.includes('referral_code')) db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT NOT NULL DEFAULT ''`)
  if (!userCols.includes('terms_agreed_at')) db.exec(`ALTER TABLE users ADD COLUMN terms_agreed_at TEXT NULL`)
  if (!userCols.includes('password_reset_required')) db.exec(`ALTER TABLE users ADD COLUMN password_reset_required INTEGER NOT NULL DEFAULT 0`)
  if (!userCols.includes('password_reset_notice_dismissed_at')) db.exec(`ALTER TABLE users ADD COLUMN password_reset_notice_dismissed_at TEXT NULL`)
  if (!userCols.includes('updated_at')) db.exec(`ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`)

  // 과거 UI에서 이름칸에 아이디를 보여주던 데이터는 빈값으로 정리
  try {
    db.exec(`UPDATE users SET name = '' WHERE COALESCE(name, '') = COALESCE(username, '')`)
  } catch {
    // ignore
  }

  const userSettingsCols = (db.prepare(`PRAGMA table_info(user_settings)`).all() as any[]).map((r) => String(r.name))
  if (!userSettingsCols.includes('chart_prefs')) {
    db.exec(`ALTER TABLE user_settings ADD COLUMN chart_prefs TEXT NOT NULL DEFAULT '{}'`)
  }

  // 강제청산 기준(%) 기본값 시드: 관리자 설정이 없으면 -40%
  const sysRow = db.prepare('SELECT id FROM system_settings WHERE id = 1').get() as { id?: number } | undefined
  if (!sysRow?.id) {
    db.prepare('INSERT INTO system_settings (id, liquidation_roe, updated_at) VALUES (1, -40, ?)').run(nowIso())
  }

  // 총관리자 기본 계정 생성: admin / 1121
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as
    | { id?: number }
    | undefined

  if (!existing?.id) {
    const passwordHash = bcrypt.hashSync('1121', 10)
    db.prepare(
      'INSERT INTO users (username, password_hash, name, birth_date, bank_name, bank_account, account_holder, referral_code, terms_agreed_at, password_reset_required, password_reset_notice_dismissed_at, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('admin', passwordHash, '', '', '', '', '', '', nowIso(), 0, null, 'super_admin', JSON.stringify({ all: true, canCredit: true }), nowIso(), nowIso())

    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number }
    db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(admin.id, 0)
  }

  // 데모 기본값: 총관리자(admin) USDT를 최소 10000으로 유지
  // (배포 환경에서 SQLite 파일이 초기화되더라도 admin이 항상 거래 가능한 상태가 되도록)
  // Supabase를 단일 진실 소스로 사용할 때(배포/서버리스)에는 이 시드가 "매번 10000으로 보임" 문제를 유발할 수 있어 비활성화합니다.
  const appDbEnabled = String(process.env.SUPABASE_APP_DB_ENABLED || '').toLowerCase()
  const shouldSeedAdmin =
    !(appDbEnabled === '1' || appDbEnabled === 'true') && process.env.NODE_ENV !== 'production'
  if (shouldSeedAdmin) {
    const seedAdminUsdt = Number(process.env.SEED_ADMIN_USDT ?? '10000')
    if (Number.isFinite(seedAdminUsdt) && seedAdminUsdt > 0) {
      const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number } | undefined
      if (admin?.id) {
        db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(admin.id, seedAdminUsdt)
        db.prepare('UPDATE balances SET usdt = CASE WHEN usdt < ? THEN ? ELSE usdt END WHERE user_id = ?').run(
          seedAdminUsdt,
          seedAdminUsdt,
          admin.id
        )
      }
    }
  }

  _db = db
  return db
}

export function isoPlusDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString()
}
