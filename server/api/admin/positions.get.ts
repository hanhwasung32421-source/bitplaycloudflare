import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { getOkxLastPrice } from '../../utils/okx'
import { getLiquidationRoe } from '../../utils/system-settings'
import { canViewMenu } from '../../utils/menu-permissions'

function calcLiqPrice(side: string, entry: number, lev: number, liquidationRoe: number) {
  if (!Number.isFinite(entry) || !Number.isFinite(lev) || lev <= 0) return 0
  const fraction = Math.abs(liquidationRoe) / 100
  return side === 'short' ? entry * (1 + fraction / lev) : entry * (1 - fraction / lev)
}

function calcPnlRoe(side: string, entry: number, mark: number, qty: number, margin: number, liquidationRoe: number) {
  if (![entry, mark, qty, margin].every(Number.isFinite)) return { pnl: 0, roe: 0 }
  if (entry <= 0 || mark <= 0 || qty <= 0 || margin <= 0) return { pnl: 0, roe: 0 }
  const raw = (mark - entry) * qty
  const pnl = side === 'short' ? -raw : raw
  const roeRaw = (pnl / margin) * 100
  const hitLiquidation = roeRaw <= liquidationRoe
  const pnlClamped = hitLiquidation ? -margin : pnl
  const roe = hitLiquidation ? liquidationRoe : roeRaw
  return { pnl: pnlClamped, roe }
}

function roleToAffiliate(role: string) {
  if (role === 'super_admin') return '본사'
  if (role === 'user') return '직영'
  return '총판' // 그 외 모든 커스텀 관리자 역할
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'positions')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }
  const liquidationRoe = await getLiquidationRoe()

  let positions: any[] = []
  let users: any[] = []

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const nowIso = new Date().toISOString()

    const { data: posRows, error: e1 } = await supa
      .from('trae_positions')
      .select('id, user_id, symbol, side, qty, entry_price, leverage, margin, created_at')
      .order('created_at', { ascending: false })
    if (e1) throw e1

    const { data: userRows, error: e2 } = await supa
      .from('trae_users')
      .select('id, username, role')
    if (e2) throw e2

    const userIds = (userRows || []).map((u: any) => Number(u.id)).filter(Boolean)
    const { data: sessions, error: e3 } = await supa
      .from('trae_sessions')
      .select('user_id, expires_at')
      .in('user_id', userIds)
      .gt('expires_at', nowIso)
    if (e3) throw e3

    positions = posRows || []
    const onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))
    users = (userRows || []).map((u: any) => ({ ...u, online: onlineSet.has(Number(u.id)) }))
  } else {
    const db = getDb()
    positions = await db
      .prepare('SELECT id, user_id, symbol, side, qty, entry_price, leverage, margin, created_at FROM positions ORDER BY created_at DESC')
      .all()
    users = (await db.prepare('SELECT id, username, role FROM users').all()).map((u: any) => ({ ...u, online: false }))
  }

  const userMap = new Map(users.map((u: any) => [Number(u.id), u]))
  const symbols = Array.from(new Set(positions.map((p: any) => String(p.symbol || '').toUpperCase()).filter(Boolean)))
  const priceEntries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const { last } = await getOkxLastPrice(symbol)
        return [symbol, Number(last)] as const
      } catch {
        return [symbol, 0] as const
      }
    })
  )
  const priceMap = new Map(priceEntries)

  const rows = positions.map((p: any) => {
    const uid = Number(p.user_id)
    const user = userMap.get(uid)
    const symbol = String(p.symbol || '').toUpperCase()
    const entry = Number(p.entry_price || 0)
    const qty = Number(p.qty || 0)
    const lev = Number(p.leverage || 1)
    const margin = Number(p.margin || 0)
    const mark = Number(priceMap.get(symbol) || 0)
    const { pnl, roe } = calcPnlRoe(String(p.side || 'long'), entry, mark, qty, margin, liquidationRoe)
    const fee = Number.isFinite(margin) && margin > 0 ? margin * 0.04 : 0
    return {
      id: Number(p.id),
      user_id: uid,
      username: String(user?.username || `user${uid}`),
      affiliate: roleToAffiliate(String(user?.role || 'user')),
      symbol,
      orderType: 'MARKET',
      position: String(p.side || 'long').toUpperCase(),
      margin,
      leverage: lev,
      entryPrice: entry,
      qty,
      liqPrice: calcLiqPrice(String(p.side || 'long'), entry, lev, liquidationRoe),
      pnl,
      roe,
      // 현재는 매수 수수료(4%)만 표시. (정산 수수료는 청산 시에만 발생)
      fee,
      online: Boolean(user?.online),
      created_at: String(p.created_at || '')
    }
  })

  return {
    items: rows,
    serverTime: new Date().toISOString()
  }
})
