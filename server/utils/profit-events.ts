import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, isMissingColumnError, isMissingTableError, supaDelete, supaSelectWhere } from './supabase'

// 관리자 수익/손실 버튼: 킬UP/킬DOWN과 동일하게 목표가까지 움직이지만, 그 상태를
// hold_ms(유지 시간)만큼 유지한 뒤 복귀한다. kill-events.ts와 구조를 그대로 따른다.
const T_PROFIT_EVENTS = 'trae_profit_events'
const DEFAULT_DURATION_MS = 1000
const DEFAULT_TICK_COUNT = 3
const DEFAULT_HOLD_MS = 3000

export type ProfitEvent = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs: number
  tickCount: number
  holdMs: number
  createdAt: string
}

function rowToProfitEvent(row: any): ProfitEvent {
  return {
    id: Number(row.id),
    symbol: String(row.symbol).toUpperCase(),
    direction: row.direction === 'up' ? 'up' : 'down',
    percent: Number(row.percent),
    basePrice: Number(row.base_price),
    shockedPrice: Number(row.shocked_price),
    durationMs: Number.isFinite(Number(row.duration_ms)) && Number(row.duration_ms) > 0 ? Number(row.duration_ms) : DEFAULT_DURATION_MS,
    tickCount: Number.isFinite(Number(row.tick_count)) && Number(row.tick_count) > 0 ? Number(row.tick_count) : DEFAULT_TICK_COUNT,
    holdMs: Number.isFinite(Number(row.hold_ms)) && Number(row.hold_ms) > 0 ? Number(row.hold_ms) : DEFAULT_HOLD_MS,
    createdAt: String(row.created_at)
  }
}

export async function createProfitEvent(input: {
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs?: number
  tickCount?: number
  holdMs?: number
}): Promise<ProfitEvent> {
  const createdAt = new Date().toISOString()
  const symbol = input.symbol.toUpperCase()
  const durationMs = input.durationMs && input.durationMs > 0 ? Math.round(input.durationMs) : DEFAULT_DURATION_MS
  const tickCount = input.tickCount && input.tickCount > 0 ? Math.round(input.tickCount) : DEFAULT_TICK_COUNT
  const holdMs = input.holdMs && input.holdMs > 0 ? Math.round(input.holdMs) : DEFAULT_HOLD_MS

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
      hold_ms: holdMs,
      created_at: createdAt
    }
    let { error } = await supa.from(T_PROFIT_EVENTS).insert(payload)
    if (error && (isMissingColumnError(error, 'duration_ms') || isMissingColumnError(error, 'tick_count') || isMissingColumnError(error, 'hold_ms'))) {
      delete payload.duration_ms
      delete payload.tick_count
      delete payload.hold_ms
      const retry = await supa.from(T_PROFIT_EVENTS).insert(payload)
      error = retry.error
    }
    if (error) throw error
    return { id, symbol, direction: input.direction, percent: input.percent, basePrice: input.basePrice, shockedPrice: input.shockedPrice, durationMs, tickCount, holdMs, createdAt }
  }

  const db = getDb()
  const result = await db
    .prepare(
      'INSERT INTO profit_events (symbol, direction, percent, base_price, shocked_price, duration_ms, tick_count, hold_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(symbol, input.direction, input.percent, input.basePrice, input.shockedPrice, durationMs, tickCount, holdMs, createdAt)
  return {
    id: Number(result.lastInsertRowid),
    symbol,
    direction: input.direction,
    percent: input.percent,
    basePrice: input.basePrice,
    shockedPrice: input.shockedPrice,
    durationMs,
    tickCount,
    holdMs,
    createdAt
  }
}

export async function latestProfitEvent(symbol: string): Promise<ProfitEvent | null> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    try {
      const rows = await supaSelectWhere<any>({ table: T_PROFIT_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit: 1 })
      return rows[0] ? rowToProfitEvent(rows[0]) : null
    } catch (e: any) {
      // trae_profit_events 테이블이 아직 생성되지 않은 경우(SQL 패치 미실행): 이 엔드포인트는
      // 모든 접속자의 차트에서 1.5초마다 폴링되므로, 500으로 실패시키지 않고 조용히 "이벤트 없음"으로 처리한다.
      if (isMissingTableError(e)) return null
      throw e
    }
  }
  const db = getDb()
  const row = await db.prepare('SELECT * FROM profit_events WHERE symbol = ? ORDER BY id DESC LIMIT 1').get(sym) as any
  return row ? rowToProfitEvent(row) : null
}

// 새로고침 후에도 수익/손실로 생긴 봉의 고가/저가(꼬리)를 다시 그려 넣기 위해 과거 이벤트 목록이 필요하다.
export async function listProfitEvents(symbol: string, limit = 200): Promise<ProfitEvent[]> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    try {
      const rows = await supaSelectWhere<any>({ table: T_PROFIT_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit })
      return rows.map(rowToProfitEvent)
    } catch (e: any) {
      if (isMissingTableError(e)) return []
      throw e
    }
  }
  const db = getDb()
  const rows = await db.prepare('SELECT * FROM profit_events WHERE symbol = ? ORDER BY id DESC LIMIT ?').all(sym, limit) as any[]
  return rows.map(rowToProfitEvent)
}

// 관리자 대시보드에서 심볼 구분 없이 전체 수익/손실 이력을 보여주기 위함
export async function listAllProfitEvents(limit = 100): Promise<ProfitEvent[]> {
  if (supabaseAppDbEnabled()) {
    try {
      const rows = await supaSelectWhere<any>({ table: T_PROFIT_EVENTS, orderBy: 'id', ascending: false, limit })
      return rows.map(rowToProfitEvent)
    } catch (e: any) {
      if (isMissingTableError(e)) return []
      throw e
    }
  }
  const db = getDb()
  const rows = await db.prepare('SELECT * FROM profit_events ORDER BY id DESC LIMIT ?').all(limit) as any[]
  return rows.map(rowToProfitEvent)
}

export async function deleteProfitEvent(id: number): Promise<void> {
  if (supabaseAppDbEnabled()) {
    await supaDelete(T_PROFIT_EVENTS, { id })
    return
  }
  const db = getDb()
  await db.prepare('DELETE FROM profit_events WHERE id = ?').run(id)
}
