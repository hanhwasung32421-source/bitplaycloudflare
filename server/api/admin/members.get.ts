import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { canViewMenu } from '../../utils/menu-permissions'
import { computeDownlineUsernames } from '../../utils/referral'
import { listRoles } from '../../utils/roles'

const FEE_RATE = 0.04

function calcTotalFee(entryPrice: number, qty: number, leverage: number) {
  if (![entryPrice, qty, leverage].every(Number.isFinite) || entryPrice <= 0 || qty <= 0 || leverage <= 0) return 0
  const net = (entryPrice * qty) / leverage
  const gross = net / (1 - FEE_RATE)
  return gross * FEE_RATE * 2
}

// 추천코드 체인을 끝까지 따라 올라가서 가장 위에 있는 코드(=최상위 총판)를 찾는다.
// referralOf: username -> 그 유저를 추천한 사람의 username(=추천코드)
function resolveTopCode(username: string, referralOf: Map<string, string>): string {
  let code = referralOf.get(username) || ''
  if (!code) return ''
  const seen = new Set<string>([username])
  let depth = 0
  while (depth < 50) {
    if (seen.has(code)) break // 순환 참조 방지
    seen.add(code)
    const next = referralOf.get(code)
    if (next === undefined) break // code가 알 수 없는 유저 → 여기까지가 확인 가능한 최상위
    if (!next) break // code인 유저는 추천인이 없음 → code가 곧 최상위
    code = next
    depth++
  }
  return code
}

export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)
  if (!canViewMenu(me, 'members')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }
  // 부관리자(총판/기타 커스텀 역할)는 자기 추천코드(=아이디)로 가입한 하부 조직만 볼 수 있음
  const scopeToReferral = me.role !== 'super_admin' ? me.username : null

  // 역할 이름은 역할 관리에서 설정한 라벨을 그대로 쓴다(회원목록/역할드롭다운 등 어디서나 동일하게 보이도록).
  const roleLabelMap = new Map((await listRoles()).map((r) => [r.id, r.label]))
  function roleText(role: string) {
    if (role === 'super_admin') return '관리자'
    if (role === 'user') return '회원'
    return roleLabelMap.get(role) || role
  }
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const nowIso = new Date().toISOString()

    const { data: users, error: e1 } = await supa
      .from('trae_users')
      .select('id, username, name, birth_date, bank_name, bank_account, account_holder, referral_code, role, permissions, created_at')
      .order('id', { ascending: false })
    if (e1) throw e1

    const ids = (users || []).map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return { items: [] }

    const { data: sessions, error: e2 } = await supa
      .from('trae_sessions')
      .select('user_id, expires_at')
      .in('user_id', ids)
      .gt('expires_at', nowIso)
    if (e2) throw e2
    const onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))

    const { data: balances, error: eBalance } = await supa.from('trae_balances').select('user_id, usdt').in('user_id', ids)
    if (eBalance) throw eBalance
    const balanceMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))

    const { data: events, error: e3 } = await supa
      .from('app_login_events')
      .select('local_user_id, ip, created_at')
      .in('local_user_id', ids)
      .order('created_at', { ascending: false })
      .limit(300)
    if (e3) throw e3
    const ipMap = new Map<number, string>()
    const lastLoginMap = new Map<number, string>()
    for (const ev of events || []) {
      const uid = Number((ev as any).local_user_id)
      const ip = (ev as any).ip ? String((ev as any).ip) : ''
      if (!uid) continue
      // created_at 내림차순이라 각 유저의 첫 등장이 가장 최근 로그인이다.
      if (!lastLoginMap.has(uid) && (ev as any).created_at) lastLoginMap.set(uid, String((ev as any).created_at))
      if (ip && !ipMap.has(uid)) ipMap.set(uid, ip)
    }

    // 누적수익(실현손익 - 총수수료)
    const { data: trades, error: e4 } = await supa
      .from('trae_trades')
      .select('user_id, pnl, entry_price, qty, leverage')
      .in('user_id', ids)
      .limit(5000)
    if (e4) throw e4
    const profitMap = new Map<number, number>()
    for (const t of trades || []) {
      const uid = Number((t as any).user_id)
      const pnl = Number((t as any).pnl ?? 0)
      const entry = Number((t as any).entry_price ?? 0)
      const qty = Number((t as any).qty ?? 0)
      const lev = Number((t as any).leverage ?? 1)
      const fee = calcTotalFee(entry, qty, lev)
      if (!uid || !Number.isFinite(pnl)) continue
      profitMap.set(uid, (profitMap.get(uid) ?? 0) + pnl - fee)
    }

    const referralOf = new Map<string, string>((users || []).map((u: any) => [String(u.username || ''), String(u.referral_code || '')]))

    const rows = (users || []).map((u: any) => {
      const id = Number(u.id)
      const role = String(u.role || 'user')
      const username = String(u.username || '')
      return {
        id,
        role: roleText(role),
        roleId: role,
        approved: true,
        username,
        name: String(u.name || ''),
        birthDate: String(u.birth_date || ''),
        bankName: String(u.bank_name || ''),
        bankAccount: String(u.bank_account || ''),
        accountHolder: String(u.account_holder || ''),
        referralCode: String(u.referral_code || ''),
        topCode: resolveTopCode(username, referralOf),
        balanceUsdt: balanceMap.get(id) ?? 0,
        cumulativeProfit: profitMap.get(id) ?? 0,
        created_at: String(u.created_at || ''),
        online: onlineSet.has(id),
        last_ip: ipMap.get(id) ?? null,
        last_login: lastLoginMap.get(id) ?? null
      }
    })

    const scoped = scopeToReferral
      ? (() => {
          const downline = computeDownlineUsernames(
            scopeToReferral,
            rows.map((r) => ({ username: r.username, referralCode: r.referralCode }))
          )
          return rows.filter((r) => downline.has(r.username))
        })()
      : rows
    return { items: scoped }
  }

  const db = getDb()
  const users = await db.prepare('SELECT id, username, name, birth_date, bank_name, bank_account, account_holder, referral_code, role, permissions, created_at FROM users ORDER BY id DESC').all() as any[]
  const balances = await db.prepare('SELECT user_id, usdt FROM balances').all() as any[]
  const trades = await db.prepare('SELECT user_id, pnl, entry_price, qty, leverage FROM trades').all() as any[]
  const balanceMap = new Map(balances.map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))
  const profitMap = new Map<number, number>()
  for (const t of trades) {
    const uid = Number(t.user_id)
    const pnl = Number(t.pnl ?? 0)
    const entry = Number(t.entry_price ?? 0)
    const qty = Number(t.qty ?? 0)
    const lev = Number(t.leverage ?? 1)
    const fee = calcTotalFee(entry, qty, lev)
    if (!uid || !Number.isFinite(pnl)) continue
    profitMap.set(uid, (profitMap.get(uid) ?? 0) + pnl - fee)
  }
  const referralOf = new Map<string, string>(users.map((u) => [String(u.username || ''), String(u.referral_code || '')]))

  const rows = users.map((u) => {
    const role = String(u.role || 'user')
    const username = String(u.username || '')
    return {
      id: Number(u.id),
      role: roleText(role),
      roleId: role,
      approved: true,
      username,
      name: String(u.name || ''),
      birthDate: String(u.birth_date || ''),
      bankName: String(u.bank_name || ''),
      bankAccount: String(u.bank_account || ''),
      accountHolder: String(u.account_holder || ''),
      referralCode: String(u.referral_code || ''),
      topCode: resolveTopCode(username, referralOf),
      balanceUsdt: balanceMap.get(Number(u.id)) ?? 0,
      cumulativeProfit: profitMap.get(Number(u.id)) ?? 0,
      created_at: String(u.created_at || ''),
      online: false,
      last_ip: null,
      last_login: null
    }
  })

  const scoped = scopeToReferral
    ? (() => {
        const downline = computeDownlineUsernames(
          scopeToReferral,
          rows.map((r) => ({ username: r.username, referralCode: r.referralCode }))
        )
        return rows.filter((r) => downline.has(r.username))
      })()
    : rows

  return { items: scoped }
})
