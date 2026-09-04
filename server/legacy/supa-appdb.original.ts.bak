import { DatabaseSync } from 'node:sqlite'
import { isMissingColumnError, supaCount, supaSelectAll, supaUpsert, supaUpsertStrict, supaInsert, supaUpsertUserSettings } from './supabase'

// Supabase 테이블명 (요구사항: trae_ prefix)
const T_USERS = 'trae_users'
const T_BALANCES = 'trae_balances'
const T_POSITIONS = 'trae_positions'
const T_TRADES = 'trae_trades'
const T_PROFIT_CARDS = 'trae_profit_cards'
const T_USER_SETTINGS = 'trae_user_settings'
const T_MESSAGES = 'trae_messages'

export function supabaseAppDbEnabled() {
  const cfg = useRuntimeConfig()
  return String(cfg.supabaseAppDbEnabled || '').toLowerCase() === '1' || String(cfg.supabaseAppDbEnabled || '').toLowerCase() === 'true'
}

function parsePerm(v: any) {
  if (!v) return {}
  if (typeof v === 'object') return v
  try {
    return JSON.parse(String(v))
  } catch {
    return {}
  }
}

export async function syncUserToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(
    T_USERS,
    {
      id: Number(row.id),
      username: String(row.username),
      password_hash: String(row.password_hash),
      name: String(row.name || ''),
      birth_date: String(row.birth_date || ''),
      bank_name: String(row.bank_name || ''),
      bank_account: String(row.bank_account || ''),
      account_holder: String(row.account_holder || ''),
      referral_code: String(row.referral_code || ''),
      terms_agreed_at: row.terms_agreed_at ? String(row.terms_agreed_at) : null,
      password_reset_required: Boolean(row.password_reset_required),
      password_reset_notice_dismissed_at: row.password_reset_notice_dismissed_at ? String(row.password_reset_notice_dismissed_at) : null,
      role: String(row.role),
      permissions: parsePerm(row.permissions),
      created_at: row.created_at,
      updated_at: String(row.updated_at || row.created_at || '')
    },
    'id'
  )
}

export async function syncBalanceToSupabase(userId: number, usdt: number) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(T_BALANCES, { user_id: Number(userId), usdt: Number(usdt) }, 'user_id')
}

export async function syncUserSettingsToSupabase(userId: number, percent: number, leverage: number, updatedAt: string, chartPrefs: any = {}) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsertUserSettings({
    user_id: Number(userId),
    trade_percent: Number(percent),
    trade_leverage: Number(leverage),
    chart_prefs: chartPrefs || {},
    updated_at: updatedAt
  })
}

export async function syncPositionToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(
    T_POSITIONS,
    {
      id: Number(row.id),
      user_id: Number(row.user_id),
      symbol: String(row.symbol),
      side: String(row.side),
      qty: Number(row.qty),
      entry_price: Number(row.entry_price),
      leverage: Number(row.leverage),
      margin: Number(row.margin),
      created_at: row.created_at
    },
    'id'
  )
}

export async function syncTradeToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  const payload: any = {
    id: Number(row.id),
    user_id: Number(row.user_id),
    symbol: String(row.symbol),
    side: String(row.side),
    qty: Number(row.qty),
    entry_price: Number(row.entry_price),
    exit_price: Number(row.exit_price),
    leverage: Number(row.leverage),
    pnl: Number(row.pnl),
    liquidation: Number(row.liquidation || 0),
    created_at: row.created_at
  }
  try {
    await supaUpsertStrict(T_TRADES, payload, 'id')
  } catch (e: any) {
    if (isMissingColumnError(e, 'liquidation')) {
      delete payload.liquidation
      await supaUpsertStrict(T_TRADES, payload, 'id')
      return
    }
    // 기존 동기화 실패로 전체 흐름을 막지 않음
  }
}

export async function syncProfitCardToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  // 단순 insert(중복 방지는 운영에서 unique constraint 추가 권장)
  await supaInsert(T_PROFIT_CARDS, {
    user_id: Number(row.user_id),
    trade_id: Number(row.trade_id),
    title: String(row.title),
    note: String(row.note || ''),
    created_at: row.created_at
  })
}

export async function syncMessageToSupabase(row: any) {
  if (!supabaseAppDbEnabled()) return
  await supaUpsert(
    T_MESSAGES,
    {
      id: Number(row.id),
      thread_key: String(row.thread_key || ''),
      sender_id: Number(row.sender_id),
      recipient_id: Number(row.recipient_id),
      subject: String(row.subject || ''),
      body: String(row.body || ''),
      read_at: row.read_at ? String(row.read_at) : null,
      created_at: String(row.created_at || '')
    },
    'id'
  )
}

export async function bootstrapSupabaseAppDb(db: DatabaseSync) {
  if (!supabaseAppDbEnabled()) return

  // 1) Supabase가 비어있으면(SQLite -> Supabase) 초기 업로드
  const supaUsers = await supaCount(T_USERS).catch(() => 0)
  const sqliteUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c ?? 0

  if (supaUsers === 0 && sqliteUsers > 0) {
    const users = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as any[]
    if (users.length) await supaUpsert(T_USERS, users.map((u) => ({ ...u, permissions: parsePerm(u.permissions) })), 'id')

    const balances = db.prepare('SELECT * FROM balances').all() as any[]
    if (balances.length) await supaUpsert(T_BALANCES, balances, 'user_id')

    const settings = db.prepare('SELECT * FROM user_settings').all() as any[]
    if (settings.length) {
      for (const s of settings) {
        await supaUpsertUserSettings({
          user_id: Number(s.user_id),
          trade_percent: Number(s.trade_percent),
          trade_leverage: Number(s.trade_leverage),
          chart_prefs: (() => {
            try {
              return typeof s.chart_prefs === 'string' ? JSON.parse(s.chart_prefs || '{}') : s.chart_prefs || {}
            } catch {
              return {}
            }
          })(),
          updated_at: String(s.updated_at)
        })
      }
    }

    const positions = db.prepare('SELECT * FROM positions').all() as any[]
    if (positions.length) await supaUpsert(T_POSITIONS, positions, 'id')

    const trades = db.prepare('SELECT * FROM trades').all() as any[]
    if (trades.length) {
      try {
        await supaUpsertStrict(T_TRADES, trades, 'id')
      } catch (e: any) {
        if (isMissingColumnError(e, 'liquidation')) {
          await supaUpsertStrict(
            T_TRADES,
            trades.map((t) => {
              const { liquidation, ...rest } = t
              return rest
            }),
            'id'
          )
        }
      }
    }

    const messages = db.prepare('SELECT * FROM messages').all() as any[]
    if (messages.length) await supaUpsert(T_MESSAGES, messages, 'id')
  }

  // 2) "무조건 Supabase에서 불러오기" 모드:
  // Supabase가 존재하면 매 서버 시작마다 Supabase -> SQLite로 전체 동기화(덮어쓰기).
  // (세션 테이블은 로컬 유지)
  if (supaUsers > 0) {
    const users = await supaSelectAll<any>(T_USERS, 'id').catch(() => [])
    const balances = await supaSelectAll<any>(T_BALANCES, 'user_id').catch(() => [])
    const settings = await supaSelectAll<any>(T_USER_SETTINGS, 'user_id').catch(() => [])
    const positions = await supaSelectAll<any>(T_POSITIONS, 'id').catch(() => [])
    const trades = await supaSelectAll<any>(T_TRADES, 'id').catch(() => [])
    const messages = await supaSelectAll<any>(T_MESSAGES, 'id').catch(() => [])

    // 덮어쓰기: 기존 데이터 제거 후 재삽입
    db.exec('BEGIN;')
    try {
      db.exec('DELETE FROM users;')
      db.exec('DELETE FROM balances;')
      db.exec('DELETE FROM user_settings;')
      db.exec('DELETE FROM positions;')
      db.exec('DELETE FROM trades;')
      db.exec('DELETE FROM messages;')
      // profit_cards는 앱에서 저장하지만, 화면 핵심 데이터는 아니라서 여기서는 생략(원하면 추가 가능)

      for (const u of users) {
        db.prepare(
          'INSERT OR REPLACE INTO users (id, username, password_hash, name, birth_date, bank_name, bank_account, account_holder, referral_code, terms_agreed_at, password_reset_required, password_reset_notice_dismissed_at, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          u.id,
          u.username,
          u.password_hash,
          u.name || '',
          u.birth_date || '',
          u.bank_name || '',
          u.bank_account || '',
          u.account_holder || '',
          u.referral_code || '',
          u.terms_agreed_at || null,
          u.password_reset_required ? 1 : 0,
          u.password_reset_notice_dismissed_at || null,
          u.role,
          JSON.stringify(u.permissions || {}),
          new Date(u.created_at).toISOString(),
          new Date(u.updated_at || u.created_at).toISOString()
        )
      }
      for (const b of balances) {
        db.prepare('INSERT OR REPLACE INTO balances (user_id, usdt) VALUES (?, ?)').run(b.user_id, b.usdt)
      }
      for (const s of settings) {
        db.prepare('INSERT OR REPLACE INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at) VALUES (?, ?, ?, ?, ?)').run(
          s.user_id,
          s.trade_percent,
          s.trade_leverage,
          JSON.stringify(s.chart_prefs || {}),
          new Date(s.updated_at).toISOString()
        )
      }
      for (const p of positions) {
        db.prepare(
          'INSERT OR REPLACE INTO positions (id, user_id, symbol, side, qty, entry_price, leverage, margin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(p.id, p.user_id, p.symbol, p.side, p.qty, p.entry_price, p.leverage, p.margin, new Date(p.created_at).toISOString())
      }
      for (const t of trades) {
        db.prepare(
          'INSERT OR REPLACE INTO trades (id, user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, liquidation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          t.id,
          t.user_id,
          t.symbol,
          t.side,
          t.qty,
          t.entry_price,
          t.exit_price,
          t.leverage,
          t.pnl,
          Number((t as any).liquidation || 0),
          new Date(t.created_at).toISOString()
        )
      }
      for (const m of messages) {
        db.prepare(
          'INSERT OR REPLACE INTO messages (id, thread_key, sender_id, recipient_id, subject, body, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          m.id,
          m.thread_key,
          m.sender_id,
          m.recipient_id,
          m.subject || '',
          m.body || '',
          m.read_at || null,
          new Date(m.created_at).toISOString()
        )
      }

      db.exec('COMMIT;')
    } catch (e) {
      db.exec('ROLLBACK;')
      throw e
    }
  }
}
