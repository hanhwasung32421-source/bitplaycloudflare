import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { getOkxLastPrice } from '../../utils/okx'
import { createProfitEvent } from '../../utils/profit-events'
import { getLiquidationRoe } from '../../utils/system-settings'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectWhere, supaUpsert } from '../../utils/supabase'

const FEE_RATE = 0.04

const BodySchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['up', 'down']),
  // 몇 % 움직일지(0.1~90)
  percent: z.coerce.number().min(0.1).max(90),
  // 몇 초에 걸쳐 움직일지(0.1~10초), 몇 틱으로 나눠 움직일지(1~20틱)
  durationSeconds: z.coerce.number().min(0.1).max(10).optional(),
  tickCount: z.coerce.number().int().min(1).max(20).optional(),
  // 목표가에 도달한 뒤 몇 초 동안 그 상태를 유지할지(0.1~120초)
  holdSeconds: z.coerce.number().min(0.1).max(120).optional()
})

function calcLiqPrice(side: string, entry: number, lev: number, liquidationRoe: number) {
  if (!Number.isFinite(entry) || !Number.isFinite(lev) || lev <= 0) return 0
  const fraction = Math.abs(liquidationRoe) / 100
  return side === 'short' ? entry * (1 + fraction / lev) : entry * (1 - fraction / lev)
}

function isCrossed(side: string, shockedPrice: number, liqPrice: number) {
  if (!Number.isFinite(liqPrice) || liqPrice <= 0) return false
  return side === 'short' ? shockedPrice >= liqPrice : shockedPrice <= liqPrice
}

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const symbol = body.symbol.toUpperCase()
  const useSupa = supabaseAppDbEnabled()

  const { last } = await getOkxLastPrice(symbol)
  const basePrice = Number(last)
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw createError({ statusCode: 400, statusMessage: '현재가를 불러오지 못했습니다.' })
  }
  const shockedPrice = body.direction === 'up' ? basePrice * (1 + body.percent / 100) : basePrice * (1 - body.percent / 100)

  const liquidationRoe = await getLiquidationRoe()
  let liquidatedCount = 0

  if (useSupa) {
    const positions = await supaSelectWhere<any>({ table: 'trae_positions', where: { symbol } })
    const supa = getSupabaseAdminClient()
    for (const pos of positions) {
      const entry = Number(pos.entry_price)
      const lev = Number(pos.leverage || 1)
      const margin = Number(pos.margin || 0)
      const liqPrice = calcLiqPrice(String(pos.side), entry, lev, liquidationRoe)
      if (!isCrossed(String(pos.side), shockedPrice, liqPrice)) continue

      const net = margin * (1 - FEE_RATE)
      const pnl = -net
      const tradeId = Date.now() * 1000 + Math.floor(Math.random() * 1000) + liquidatedCount

      await supa.from('trae_positions').delete().eq('id', pos.id)
      await supaUpsert(
        'trae_trades',
        {
          id: tradeId,
          user_id: Number(pos.user_id),
          symbol,
          side: pos.side,
          qty: Number(pos.qty),
          entry_price: entry,
          exit_price: liqPrice,
          leverage: lev,
          pnl,
          liquidation: 1,
          created_at: new Date().toISOString()
        },
        'id'
      )
      liquidatedCount += 1
    }
  } else {
    const db = getDb()
    const positions = db.prepare('SELECT * FROM positions WHERE symbol = ?').all(symbol) as any[]
    for (const pos of positions) {
      const entry = Number(pos.entry_price)
      const lev = Number(pos.leverage || 1)
      const margin = Number(pos.margin || 0)
      const liqPrice = calcLiqPrice(String(pos.side), entry, lev, liquidationRoe)
      if (!isCrossed(String(pos.side), shockedPrice, liqPrice)) continue

      const net = margin * (1 - FEE_RATE)
      const pnl = -net

      db.prepare('DELETE FROM positions WHERE id = ?').run(pos.id)
      db.prepare(
        'INSERT INTO trades (user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, liquidation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(pos.user_id, symbol, pos.side, pos.qty, entry, liqPrice, lev, pnl, 1, new Date().toISOString())
      liquidatedCount += 1
    }
  }

  try {
    const profitEvent = await createProfitEvent({
      symbol,
      direction: body.direction,
      percent: body.percent,
      basePrice,
      shockedPrice,
      durationMs: body.durationSeconds ? Math.round(body.durationSeconds * 1000) : undefined,
      tickCount: body.tickCount,
      holdMs: body.holdSeconds ? Math.round(body.holdSeconds * 1000) : undefined
    })
    return { ok: true, event: profitEvent, liquidatedCount }
  } catch (e: any) {
    // 청산 자체는 이미 위에서 실제로 처리됨. 이벤트 기록/공유만 실패한 경우 원인을 명확히 알려준다.
    throw createError({
      statusCode: 500,
      statusMessage:
        'Supabase에 trae_profit_events 테이블이 없어 수익/손실 기록 저장에 실패했습니다. SUPABASE_TRAE_DB_patch_profit_events.sql을 Supabase SQL Editor에서 먼저 실행해주세요. (해당 구간의 강제청산 처리 자체는 이미 반영되었습니다.)'
    })
  }
})
