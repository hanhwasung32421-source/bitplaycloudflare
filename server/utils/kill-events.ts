import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, isMissingColumnError, supaDelete, supaSelectWhere } from './supabase'

const T_KILL_EVENTS = 'trae_kill_events'
const DEFAULT_DURATION_MS = 1000
const DEFAULT_TICK_COUNT = 3

export type KillEvent = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs: number
  tickCount: number
  createdAt: string
}

function rowToKillEvent(row: any): KillEvent {
  return {
    id: Number(row.id),
    symbol: String(row.symbol).toUpperCase(),
    direction: row.direction === 'up' ? 'up' : 'down',
    percent: Number(row.percent),
    basePrice: Number(row.base_price),
    shockedPrice: Number(row.shocked_price),
    durationMs: Number.isFinite(Number(row.duration_ms)) && Number(row.duration_ms) > 0 ? Number(row.duration_ms) : DEFAULT_DURATION_MS,
    tickCount: Number.isFinite(Number(row.tick_count)) && Number(row.tick_count) > 0 ? Number(row.tick_count) : DEFAULT_TICK_COUNT,
    createdAt: String(row.created_at)
  }
}

export async function createKillEvent(input: {
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs?: number
  tickCount?: number
}): Promise<KillEvent> {
  const createdAt = new Date().toISOString()
  const symbol = input.symbol.toUpperCase()
  const durationMs = input.durationMs && input.durationMs > 0 ? Math.round(input.durationMs) : DEFAULT_DURATION_MS
  const tickCount = input.tickCount && input.tickCount > 0 ? Math.round(input.tickCount) : DEFAULT_TICK_COUNT

  if (supabaseAppDbEnabled()) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const supa = getSupabaseAdminClient()
    const payload: any = {
      id,
      symbol,
      direction: input.direction,
      percent: input.percent,
      base_price: input.basePrice,
      shocked_price: input.shockedPrice,
      duration_ms: durationMs,
      tick_count: tickCount,
      created_at: createdAt
    }
    let { error } = await supa.from(T_KILL_EVENTS).insert(payload)
    if (error && (isMissingColumnError(error, 'duration_ms') || isMissingColumnError(error, 'tick_count'))) {
      // SUPABASE_TRAE_DB_patch_kill_events_duration.sql 미적용: 새 컬럼 없이 재시도
      delete payload.duration_ms
      delete payload.tick_count
      const retry = await supa.from(T_KILL_EVENTS).insert(payload)
      error = retry.error
    }
    if (error) throw error
    return { id, symbol, direction: input.direction, percent: input.percent, basePrice: input.basePrice, shockedPrice: input.shockedPrice, durationMs, tickCount, createdAt }
  }

  const db = getDb()
  const result = db
    .prepare(
      'INSERT INTO kill_events (symbol, direction, percent, base_price, shocked_price, duration_ms, tick_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(symbol, input.direction, input.percent, input.basePrice, input.shockedPrice, durationMs, tickCount, createdAt)
  return {
    id: Number(result.lastInsertRowid),
    symbol,
    direction: input.direction,
    percent: input.percent,
    basePrice: input.basePrice,
    shockedPrice: input.shockedPrice,
    durationMs,
    tickCount,
    createdAt
  }
}

export async function latestKillEvent(symbol: string): Promise<KillEvent | null> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_KILL_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit: 1 })
    return rows[0] ? rowToKillEvent(rows[0]) : null
  }
  const db = getDb()
  const row = db.prepare('SELECT * FROM kill_events WHERE symbol = ? ORDER BY id DESC LIMIT 1').get(sym) as any
  return row ? rowToKillEvent(row) : null
}

// 새로고침 후에도 킬로 생긴 봉의 고가/저가(꼬리)를 다시 그려 넣기 위해 과거 이벤트 목록이 필요하다.
export async function listKillEvents(symbol: string, limit = 200): Promise<KillEvent[]> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_KILL_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit })
    return rows.map(rowToKillEvent)
  }
  const db = getDb()
  const rows = db.prepare('SELECT * FROM kill_events WHERE symbol = ? ORDER BY id DESC LIMIT ?').all(sym, limit) as any[]
  return rows.map(rowToKillEvent)
}

// 관리자 대시보드에서 심볼 구분 없이 전체 킬 이력을 보여주기 위함
export async function listAllKillEvents(limit = 100): Promise<KillEvent[]> {
  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_KILL_EVENTS, orderBy: 'id', ascending: false, limit })
    return rows.map(rowToKillEvent)
  }
  const db = getDb()
  const rows = db.prepare('SELECT * FROM kill_events ORDER BY id DESC LIMIT ?').all(limit) as any[]
  return rows.map(rowToKillEvent)
}

export async function deleteKillEvent(id: number): Promise<void> {
  if (supabaseAppDbEnabled()) {
    await supaDelete(T_KILL_EVENTS, { id })
    return
  }
  const db = getDb()
  db.prepare('DELETE FROM kill_events WHERE id = ?').run(id)
}
