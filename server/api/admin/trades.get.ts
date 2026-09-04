import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne } from '../../utils/supabase'
import { canViewMenu } from '../../utils/menu-permissions'
import { fetchDownlineUsernames } from '../../utils/referral'

const FEE_RATE = 0.04

function calcTotalFee(entryPrice: number, qty: number, leverage: number) {
  // qty = net * leverage / entryPrice  => net = qty*entryPrice/leverage
  if (![entryPrice, qty, leverage].every(Number.isFinite) || entryPrice <= 0 || qty <= 0 || leverage <= 0) return 0
  const net = (entryPrice * qty) / leverage
  const gross = net / (1 - FEE_RATE)
  return gross * FEE_RATE * 2 // 매수+매도
}

function isAdminRole(role: string) {
  return role !== 'user' && role !== 'super_admin' && role !== ''
}

// liquidation 플래그가 없어도(예: 청산가 도달 후 자동감지보다 먼저 수동으로 닫힌 경우),
// 증거금을 전액 이상 잃었으면 결과적으로 강제청산과 동일하므로 같은 방식으로 표기한다.
function isFullMarginLoss(entryPrice: number, qty: number, leverage: number, pnl: number) {
  if (![entryPrice, qty, leverage].every(Number.isFinite) || entryPrice <= 0 || qty <= 0 || leverage <= 0) return false
  const margin = (entryPrice * qty) / leverage
  return margin > 0 && Number(pnl || 0) <= -margin * 0.999
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const q = getQuery(event)
  const limit = Math.min(200, Math.max(1, Number(q.limit ?? 50)))
  const offset = Math.max(0, Number(q.offset ?? 0))
  const userId = Number(q.userId ?? 0)

  if (userId > 0) {
    // 특정 회원의 거래내역 보기(회원목록에서 진입): 부관리자는 자기 하부 조직(팀장/팀원의 하부 포함)만 가능
    if (admin.role !== 'super_admin') {
      const targetUsername = supabaseAppDbEnabled()
        ? String((await supaSelectOne<any>('trae_users', { id: userId }))?.username || '')
        : String((getDb().prepare('SELECT username FROM users WHERE id = ?').get(userId) as any)?.username || '')
      const downline = await fetchDownlineUsernames(admin.username)
      if (!downline.has(targetUsername)) {
        throw createError({ statusCode: 403, statusMessage: '이 회원의 거래내역을 볼 권한이 없습니다.' })
      }
    }
  } else if (!canViewMenu(admin, 'trades')) {
    // 전체 거래내역(거래내역 메뉴)은 별도 view 권한으로 통제
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const selectBase = 'id, user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, created_at'
    const runQuery = async (select: string) => {
      let query = supa
        .from('trae_trades')
        .select(select)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (userId > 0) query = query.eq('user_id', userId)
      const { data, error } = await query
      return { data, error }
    }

    // 거래내역 본체는 liquidation 컬럼 없이 먼저 안전하게 읽는다.
    // (배포/마이그레이션 타이밍에 liquidation 컬럼 호환 문제로 전체 500이 나는 것을 방지)
    const { data: trades, error: e1 } = await runQuery(selectBase)
    if (e1) throw e1

    // 특정 회원의 거래내역이 비어 있으면 users/sessions in([]) 조회를 타지 않고 바로 빈 결과 반환
    if (!trades || trades.length === 0) {
      return { items: [], hasMore: false }
    }

    // liquidation 컬럼은 부가 정보로만 취급하고, 실패해도 전체 응답은 유지한다.
    const liquidationMap = new Map<number, boolean>()
    try {
      const { data: liquidationRows, error: liqErr } = await runQuery('id, liquidation')
      if (!liqErr) {
        for (const row of liquidationRows || []) {
          liquidationMap.set(Number((row as any).id), Boolean((row as any).liquidation))
        }
      }
    } catch {
      // ignore
    }

    const userIds = Array.from(new Set((trades || []).map((t: any) => Number(t.user_id)).filter(Boolean)))
    if (userIds.length === 0) {
      const items = (trades || []).map((t: any) => {
        const entry = Number(t.entry_price || 0)
        const qty = Number(t.qty || 0)
        const lev = Number(t.leverage || 1)
        const pnl = Number(t.pnl || 0)
        const forced = (liquidationMap.get(Number(t.id)) ?? false) || isFullMarginLoss(entry, qty, lev, pnl)
        return {
          id: Number(t.id),
          created_at: String(t.created_at || ''),
          user_id: Number(t.user_id || 0),
          username: '—',
          name: '—',
          affiliateName: '—',
          symbol: String(t.symbol || ''),
          orderType: forced ? '강제청산' : '청산',
          positionSide: String(t.side || '').toUpperCase(),
          leverage: lev,
          price: Number(t.exit_price || 0),
          qty,
          pnl,
          liquidation: forced,
          fee: calcTotalFee(entry, qty, lev),
          online: false
        }
      })
      return { items, hasMore: (trades || []).length === limit }
    }

    const nowIso = new Date().toISOString()
    let userMap = new Map<number, any>()
    let onlineSet = new Set<number>()
    try {
      const { data: users, error: e2 } = await supa.from('trae_users').select('id, username, role').in('id', userIds)
      if (!e2) userMap = new Map((users || []).map((u: any) => [Number(u.id), u]))
    } catch {
      // ignore
    }
    try {
      const { data: sessions, error: e3 } = await supa
        .from('trae_sessions')
        .select('user_id, expires_at')
        .in('user_id', userIds)
        .gt('expires_at', nowIso)
      if (!e3) onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))
    } catch {
      // ignore
    }

    const items = (trades || []).map((t: any) => {
      const uid = Number(t.user_id)
      const u = userMap.get(uid)
      const entry = Number(t.entry_price || 0)
      const qty = Number(t.qty || 0)
      const lev = Number(t.leverage || 1)
      const pnl = Number(t.pnl || 0)
      const forced = (liquidationMap.get(Number(t.id)) ?? false) || isFullMarginLoss(entry, qty, lev, pnl)
      return {
        id: Number(t.id),
        created_at: String(t.created_at || ''),
        user_id: uid,
        username: String(u?.username || `user${uid}`),
        name: String(u?.username || `user${uid}`),
        affiliateName: isAdminRole(String(u?.role || '')) ? String(u?.username || '') : '—',
        symbol: String(t.symbol || ''),
        orderType: forced ? '강제청산' : '청산',
        positionSide: String(t.side || '').toUpperCase(),
        leverage: lev,
        price: Number(t.exit_price || 0),
        qty,
        pnl,
        liquidation: forced,
        fee: calcTotalFee(entry, qty, lev),
        online: onlineSet.has(uid)
      }
    })

    return { items, hasMore: (trades || []).length === limit }
  }

  const db = getDb()
  const rows = db
    .prepare(
      `
      SELECT t.id, t.user_id, t.symbol, t.side, t.qty, t.entry_price, t.exit_price, t.leverage, t.pnl, t.liquidation, t.created_at, u.username, u.role
      FROM trades t
      LEFT JOIN users u ON u.id = t.user_id
      ${userId > 0 ? 'WHERE t.user_id = ?' : ''}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...(userId > 0 ? [userId, limit, offset] : [limit, offset])) as any[]

  const items = rows.map((t) => {
    const entry = Number(t.entry_price || 0)
    const qty = Number(t.qty || 0)
    const lev = Number(t.leverage || 1)
    const pnl = Number(t.pnl || 0)
    const forced = Boolean(t.liquidation) || isFullMarginLoss(entry, qty, lev, pnl)
    return {
      id: Number(t.id),
      created_at: String(t.created_at || ''),
      user_id: Number(t.user_id),
      username: String(t.username || `user${t.user_id}`),
      name: String(t.username || `user${t.user_id}`),
      affiliateName: isAdminRole(String(t.role || '')) ? String(t.username || '') : '—',
      symbol: String(t.symbol || ''),
      orderType: forced ? '강제청산' : '청산',
      positionSide: String(t.side || '').toUpperCase(),
      leverage: lev,
      price: Number(t.exit_price || 0),
      qty,
      pnl,
      liquidation: forced,
      fee: calcTotalFee(entry, qty, lev),
      online: false
    }
  })

  return { items, hasMore: items.length === limit }
})
