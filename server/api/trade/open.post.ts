import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { getOkxLastPrice } from '../../utils/okx'
import { logBuy } from '../../utils/supa-log'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncPositionToSupabase, syncTradeToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne, supaUpdate, supaUpsert } from '../../utils/supabase'
import { getLiquidationRoe } from '../../utils/system-settings'

const FEE_RATE = 0.04

const BodySchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['long', 'short']),
  // 사용자가 투입하려는 금액(gross). 여기서 4%를 떼고(net) 포지션이 시작됩니다.
  margin: z.number().positive(),
  leverage: z.number().int().min(1).max(100),
  // 체결가(데모): 값이 오면 그 가격으로 즉시 체결된 것으로 처리
  // (요구사항: 버튼을 누른 순간의 가격으로 서버에도 동일하게 반영)
  price: z.number().positive().optional()
})

function round2(n: number) {
  return Math.floor(Number(n) * 100) / 100
}

function netMarginFromGross(gross: number) {
  const g = Number(gross)
  if (!Number.isFinite(g) || g <= 0) return 0
  return g * (1 - FEE_RATE)
}

function clampPnlToLiquidation(pnl: number, netMargin: number, liquidationTriggerRoe: number) {
  if (!Number.isFinite(pnl) || !Number.isFinite(netMargin) || netMargin <= 0) return 0
  const roeRaw = (pnl / netMargin) * 100
  if (roeRaw <= liquidationTriggerRoe) return -netMargin
  return pnl
}

function calcSettlementAfterSellFee(grossMargin: number, pnl: number) {
  const gross = Number(grossMargin)
  const net = netMarginFromGross(gross)
  const settlementBeforeSellFee = Math.max(0, net + Number(pnl))
  const sellFee = gross > 0 ? gross * FEE_RATE : 0
  return {
    settlementBeforeSellFee,
    sellFee,
    settlementAfterFee: Math.max(0, settlementBeforeSellFee - sellFee)
  }
}

function calcQty(netMargin: number, leverage: number, price: number) {
  const net = Number(netMargin)
  const lev = Number(leverage)
  const p = Number(price)
  if (![net, lev, p].every(Number.isFinite) || net <= 0 || lev <= 0 || p <= 0) return 0
  return (net * lev) / p
}

function weightedEntry(oldEntry: number, oldQty: number, addEntry: number, addQty: number) {
  const oq = Number(oldQty)
  const aq = Number(addQty)
  const total = oq + aq
  if (!Number.isFinite(total) || total <= 0) return Number(addEntry)
  return (Number(oldEntry) * oq + Number(addEntry) * aq) / total
}

function computeOpenAmounts(balanceUsdt: number, wantGross: number) {
  let usedGross = Math.min(Number(wantGross), Number(balanceUsdt))
  usedGross = round2(usedGross)
  const openFee = usedGross * FEE_RATE
  const usedNet = round2(usedGross - openFee)
  if (!Number.isFinite(usedGross) || usedGross <= 0 || !Number.isFinite(usedNet) || usedNet <= 0) {
    throw createError({ statusCode: 400, statusMessage: '잔고가 부족합니다.' })
  }
  return { usedGross, usedNet, openFee }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()
  const liquidationTriggerRoe = await getLiquidationRoe()

  const symbol = body.symbol.toUpperCase()
  const entry = body.price ?? (await getOkxLastPrice(symbol)).last

  if (useSupa) {
    const supa = getSupabaseAdminClient()

    const balRow = await supaSelectOne<{ usdt: number }>('trae_balances', { user_id: user.id })
    let usdt = Number(balRow?.usdt ?? 0)

    // 기존 포지션(현재 심볼 1개 기준)
    const existing = await supaSelectOne<any>('trae_positions', { user_id: user.id, symbol })

    // 1) 반대 방향이면: 기존 포지션을 클릭 순간 가격(entry)으로 먼저 청산 후 새 포지션 오픈
    if (existing && String(existing.side) !== String(body.side)) {
      const exit = entry
      const pnlRaw = (exit - Number(existing.entry_price)) * Number(existing.qty)
      const pnlUnclamped = String(existing.side) === 'long' ? pnlRaw : -pnlRaw
      const gross0 = Number(existing.margin)
      const net0 = netMarginFromGross(gross0)
      const pnl = clampPnlToLiquidation(pnlUnclamped, net0, liquidationTriggerRoe)
      const { settlementAfterFee } = calcSettlementAfterSellFee(gross0, pnl)

      // 포지션 제거
      await supa.from('trae_positions').delete().eq('id', existing.id).eq('user_id', user.id)

      // 거래 내역 저장(bigint PK 직접 생성)
      const tradeId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
      await supaUpsert(
        'trae_trades',
        {
          id: tradeId,
          user_id: user.id,
          symbol,
          side: existing.side,
          qty: Number(existing.qty),
          entry_price: Number(existing.entry_price),
          exit_price: exit,
          leverage: Number(existing.leverage),
          // 수수료는 pnl/roe에 포함하지 않음(요구사항)
          pnl,
          created_at: new Date().toISOString()
        },
        ['id'] as any
      )

      // 잔고 반영(정산금 - 매도 수수료)
      usdt = usdt + settlementAfterFee
      await supaUpsert('trae_balances', { user_id: user.id, usdt }, ['user_id'] as any)
    }

    // 현재 포지션(같은 방향 합산용)
    const current = await supaSelectOne<any>('trae_positions', { user_id: user.id, symbol })
    const { usedGross, usedNet } = computeOpenAmounts(usdt, Number(body.margin))
    const newUsdt = usdt - usedGross

    if (current && String(current.side) === String(body.side)) {
      const lev = Number(current.leverage || body.leverage || 1)
      const qtyNew = calcQty(usedNet, lev, entry)
      const oldQty = Number(current.qty || 0)
      const newQtyTotal = oldQty + qtyNew
      const newEntry = weightedEntry(Number(current.entry_price || 0), oldQty, entry, qtyNew)
      const newGrossMargin = Number(current.margin || 0) + usedGross

      await supaUpdate(
        'trae_positions',
        { id: current.id, user_id: user.id },
        {
          qty: newQtyTotal,
          entry_price: newEntry,
          margin: newGrossMargin,
          leverage: lev
        }
      )

      await supaUpsert('trae_balances', { user_id: user.id, usdt: newUsdt }, ['user_id'] as any)
      await supaUpdate('trae_user_settings', { user_id: user.id }, { updated_at: new Date().toISOString() })

      await logBuy({
        userId: user.id,
        symbol,
        side: body.side,
        buy_price: entry,
        qty: qtyNew,
        // 로그/표시용: 사용자가 투입한 금액(gross)
        margin: usedGross,
        leverage: lev
      })

      return { ok: true, entryPrice: newEntry, qty: newQtyTotal, usedMargin: usedGross }
    }

    // 신규 포지션 생성
    const qty = calcQty(usedNet, body.leverage, entry)
    const posId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    await supaUpsert(
      'trae_positions',
      {
        id: posId,
        user_id: user.id,
        symbol,
        side: body.side,
        qty,
        entry_price: entry,
        leverage: body.leverage,
        margin: usedGross,
        created_at: new Date().toISOString()
      },
      ['id'] as any
    )

    await supaUpsert('trae_balances', { user_id: user.id, usdt: newUsdt }, ['user_id'] as any)
    await supaUpdate('trae_user_settings', { user_id: user.id }, { updated_at: new Date().toISOString() })

    await logBuy({
      userId: user.id,
      symbol,
      side: body.side,
      buy_price: entry,
      qty,
      margin: usedGross,
      leverage: body.leverage
    })

    return { ok: true, entryPrice: entry, qty, usedMargin: usedGross }
  }

  // SQLite 모드(로컬) - 동일 정책 적용 후 Supabase로 동기화(옵션)
  const db = getDb()
  await db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(user.id, 0)

  const bal0 = await db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as { usdt: number }
  let usdt = Number(bal0?.usdt ?? 0)

  const existing = await db
    .prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? ORDER BY id DESC LIMIT 1')
    .get(user.id, symbol) as any

  if (existing && String(existing.side) !== String(body.side)) {
    const exit = entry
    const pnlRaw = (exit - Number(existing.entry_price)) * Number(existing.qty)
    const pnlUnclamped = String(existing.side) === 'long' ? pnlRaw : -pnlRaw
    const gross0 = Number(existing.margin)
    const net0 = netMarginFromGross(gross0)
    const pnl = clampPnlToLiquidation(pnlUnclamped, net0, liquidationTriggerRoe)
    const { settlementAfterFee } = calcSettlementAfterSellFee(gross0, pnl)

    await db.prepare('UPDATE balances SET usdt = usdt + ? WHERE user_id = ?').run(settlementAfterFee, user.id)
    await db.prepare('DELETE FROM positions WHERE id = ? AND user_id = ?').run(existing.id, user.id)
    await db.prepare(
      'INSERT INTO trades (user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, liquidation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      user.id,
      symbol,
      existing.side,
      Number(existing.qty),
      Number(existing.entry_price),
      exit,
      Number(existing.leverage),
      pnl,
      0,
      new Date().toISOString()
    )
  }

  // 잔고 재조회(반대 포지션 청산 후 반영된 값)
  const bal1 = await db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as { usdt: number }
  usdt = Number(bal1?.usdt ?? 0)

  const current = await db
    .prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? ORDER BY id DESC LIMIT 1')
    .get(user.id, symbol) as any

  const { usedGross, usedNet } = computeOpenAmounts(usdt, Number(body.margin))
  const newUsdt = usdt - usedGross

  if (current && String(current.side) === String(body.side)) {
    const lev = Number(current.leverage || body.leverage || 1)
    const qtyNew = calcQty(usedNet, lev, entry)
    const oldQty = Number(current.qty || 0)
    const newQtyTotal = oldQty + qtyNew
    const newEntry = weightedEntry(Number(current.entry_price || 0), oldQty, entry, qtyNew)
    const newGrossMargin = Number(current.margin || 0) + usedGross

    await db.prepare('UPDATE balances SET usdt = ? WHERE user_id = ?').run(newUsdt, user.id)
    await db.prepare('UPDATE positions SET qty = ?, entry_price = ?, margin = ?, leverage = ? WHERE id = ? AND user_id = ?').run(
      newQtyTotal,
      newEntry,
      newGrossMargin,
      lev,
      current.id,
      user.id
    )

    const updated = await db.prepare('SELECT * FROM positions WHERE id = ? AND user_id = ?').get(current.id, user.id) as any
    const lastTrade = await db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id) as any
    await syncPositionToSupabase(updated)
    await syncBalanceToSupabase(user.id, Number(newUsdt))
    if (lastTrade) await syncTradeToSupabase(lastTrade)

    await logBuy({
      userId: user.id,
      symbol,
      side: body.side,
      buy_price: entry,
      qty: qtyNew,
      margin: usedGross,
      leverage: lev
    })

    return { ok: true, entryPrice: newEntry, qty: newQtyTotal, usedMargin: usedGross }
  }

  const qty = calcQty(usedNet, body.leverage, entry)
  await db.prepare('UPDATE balances SET usdt = ? WHERE user_id = ?').run(newUsdt, user.id)
  await db.prepare(
    'INSERT INTO positions (user_id, symbol, side, qty, entry_price, leverage, margin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(user.id, symbol, body.side, qty, entry, body.leverage, usedGross, new Date().toISOString())

  const newPos = await db.prepare('SELECT * FROM positions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id) as any
  await syncPositionToSupabase(newPos)
  await syncBalanceToSupabase(user.id, Number(newUsdt))

  await logBuy({
    userId: user.id,
    symbol,
    side: body.side,
    buy_price: entry,
    qty,
    margin: usedGross,
    leverage: body.leverage
  })

  return { ok: true, entryPrice: entry, qty, usedMargin: usedGross }
})
