import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { canViewMenu, settlementTypesOf, type SettlementType } from '../../utils/menu-permissions'
import { getSystemSettingsExtra, resolveKrwPerUsdtRate } from '../../utils/system-settings'
import { computeDownlineUsernames } from '../../utils/referral'

const FEE_RATE = 0.04

function calcTotalFee(entryPrice: number, qty: number, leverage: number) {
  if (![entryPrice, qty, leverage].every(Number.isFinite) || entryPrice <= 0 || qty <= 0 || leverage <= 0) return 0
  const net = (entryPrice * qty) / leverage
  const gross = net / (1 - FEE_RATE)
  return gross * FEE_RATE * 2
}

function defaultWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=일 ~ 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'settlement')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }

  const allowedTypes = settlementTypesOf(admin)
  const q = getQuery(event)
  const type = (String(q.type || 'loss') as SettlementType)
  if (type !== 'loss' && type !== 'referral') {
    throw createError({ statusCode: 400, statusMessage: 'type은 loss 또는 referral 이어야 합니다.' })
  }
  if (!allowedTypes.includes(type)) {
    throw createError({ statusCode: 403, statusMessage: '이 정산 유형에 대한 조회 권한이 없습니다.' })
  }

  const { from: defFrom, to: defTo } = defaultWeekRange()
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(q.from || '')) ? String(q.from) : defFrom
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(q.to || '')) ? String(q.to) : defTo
  const fromIso = `${from}T00:00:00.000Z`
  const toIso = `${to}T23:59:59.999Z`

  const extra = await getSystemSettingsExtra()
  // 총관리자는 전역 기본 비율을 쓰고, 부관리자는 총관리자가 개별로 지정한 비율이 있으면 그걸 우선한다.
  const ownPercent = admin.role !== 'super_admin' ? admin.permissions?.settlementPercent : undefined
  const percent = typeof ownPercent === 'number' ? ownPercent : type === 'loss' ? extra.lossSettlementPercent : extra.referralSettlementPercent
  const krwPerUsdt = await resolveKrwPerUsdtRate()

  const scopeToReferral = admin.role !== 'super_admin' ? admin.username : null

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()

    // 하부 조직(팀장/팀원 아래까지) 범위를 구하려면 역할과 무관하게 전체 유저의 추천 관계가 필요하다.
    const { data: allUsers, error: e0 } = await supa.from('trae_users').select('id, username, name, referral_code, role')
    if (e0) throw e0

    const downline = scopeToReferral
      ? computeDownlineUsernames(scopeToReferral, (allUsers || []).map((u: any) => ({ username: u.username, referralCode: u.referral_code })))
      : null
    const users = (allUsers || []).filter((u: any) => String(u.role) === 'user' && (!downline || downline.has(String(u.username))))

    const ids = users.map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return { items: [], total: 0, percent, from, to, krwPerUsdt }

    const { data: balances, error: e2 } = await supa.from('trae_balances').select('user_id, usdt').in('user_id', ids)
    if (e2) throw e2
    const balanceMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))

    const { data: trades, error: e3 } = await supa
      .from('trae_trades')
      .select('user_id, pnl, entry_price, qty, leverage, created_at')
      .in('user_id', ids)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .limit(20000)
    if (e3) throw e3

    const feeMap = new Map<number, number>()
    const netPnlMap = new Map<number, number>()
    for (const t of trades || []) {
      const uid = Number((t as any).user_id)
      const pnl = Number((t as any).pnl ?? 0)
      const fee = calcTotalFee(Number((t as any).entry_price ?? 0), Number((t as any).qty ?? 0), Number((t as any).leverage ?? 1))
      feeMap.set(uid, (feeMap.get(uid) ?? 0) + fee)
      netPnlMap.set(uid, (netPnlMap.get(uid) ?? 0) + pnl - fee)
    }

    const items = users.map((u: any) => {
      const id = Number(u.id)
      const feeSum = feeMap.get(id) ?? 0
      const netPnl = netPnlMap.get(id) ?? 0
      const baseAmount = type === 'loss' ? (netPnl < 0 ? -netPnl : 0) : feeSum
      const settlementAmount = (baseAmount * percent) / 100
      return {
        id,
        username: String(u.username || ''),
        name: String(u.name || ''),
        balanceUsdt: balanceMap.get(id) ?? 0,
        baseAmount,
        settlementAmount
      }
    })

    const total = items.reduce((sum, it) => sum + it.settlementAmount, 0)
    return { items, total, percent, from, to, krwPerUsdt }
  }

  const db = getDb()
  const allUsers = await db.prepare('SELECT id, username, name, referral_code, role FROM users').all() as any[]
  const downline = scopeToReferral
    ? computeDownlineUsernames(scopeToReferral, allUsers.map((u) => ({ username: u.username, referralCode: u.referral_code })))
    : null
  const users = allUsers.filter((u) => String(u.role) === 'user' && (!downline || downline.has(String(u.username))))

  const ids = users.map((u: any) => Number(u.id))
  if (!ids.length) return { items: [], total: 0, percent, from, to, krwPerUsdt }

  const balances = await db.prepare('SELECT user_id, usdt FROM balances').all() as any[]
  const balanceMap = new Map(balances.map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))

  const placeholders = ids.map(() => '?').join(',')
  const trades = await db
    .prepare(
      `SELECT user_id, pnl, entry_price, qty, leverage, created_at FROM trades
       WHERE user_id IN (${placeholders}) AND created_at >= ? AND created_at <= ?`
    )
    .all(...ids, fromIso, toIso) as any[]

  const feeMap = new Map<number, number>()
  const netPnlMap = new Map<number, number>()
  for (const t of trades) {
    const uid = Number(t.user_id)
    const pnl = Number(t.pnl ?? 0)
    const fee = calcTotalFee(Number(t.entry_price ?? 0), Number(t.qty ?? 0), Number(t.leverage ?? 1))
    feeMap.set(uid, (feeMap.get(uid) ?? 0) + fee)
    netPnlMap.set(uid, (netPnlMap.get(uid) ?? 0) + pnl - fee)
  }

  const items = users.map((u: any) => {
    const id = Number(u.id)
    const feeSum = feeMap.get(id) ?? 0
    const netPnl = netPnlMap.get(id) ?? 0
    const baseAmount = type === 'loss' ? (netPnl < 0 ? -netPnl : 0) : feeSum
    const settlementAmount = (baseAmount * percent) / 100
    return {
      id,
      username: String(u.username || ''),
      name: String(u.name || ''),
      balanceUsdt: balanceMap.get(id) ?? 0,
      baseAmount,
      settlementAmount
    }
  })

  const total = items.reduce((sum, it) => sum + it.settlementAmount, 0)
  return { items, total, percent, from, to, krwPerUsdt }
})
