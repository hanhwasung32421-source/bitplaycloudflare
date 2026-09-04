import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { settlementTypeOf } from '../../utils/menu-permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data: users, error: e1 } = await supa
      .from('trae_users')
      .select('id, username, name, referral_code, bank_name, bank_account, account_holder, role, permissions, created_at')
      .order('id', { ascending: false })
    if (e1) throw e1

    const ids = (users || []).map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return { users: [] }

    const { data: balances, error: e2 } = await supa.from('trae_balances').select('user_id, usdt').in('user_id', ids)
    if (e2) throw e2
    const balMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))

    const { data: sessions, error: e3 } = await supa
      .from('trae_sessions')
      .select('user_id, expires_at')
      .in('user_id', ids)
      .gt('expires_at', now)
    if (e3) throw e3
    const onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))

    // 유저별 최근 접속 IP: 최근 이벤트 일부를 가져와서(최대 200개) 유저별 최신 1개만 매핑
    const { data: events, error: e4 } = await supa
      .from('app_login_events')
      .select('local_user_id, ip, created_at')
      .in('local_user_id', ids)
      .order('created_at', { ascending: false })
      .limit(200)
    if (e4) throw e4
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

    const rows = (users || []).map((u: any) => {
      const id = Number(u.id)
      return {
        id,
        username: String(u.username || ''),
        name: String(u.name || ''),
        referralCode: String(u.referral_code || ''),
        bankName: String(u.bank_name || ''),
        bankAccount: String(u.bank_account || ''),
        accountHolder: String(u.account_holder || ''),
        role: String(u.role || 'user'),
        created_at: String(u.created_at || ''),
        usdt: balMap.get(id) ?? 0,
        online: onlineSet.has(id),
        last_ip: ipMap.get(id) ?? null,
        last_login: lastLoginMap.get(id) ?? null,
        settlementType: settlementTypeOf({ role: String(u.role || 'user'), permissions: u.permissions || {} }),
        settlementPercent: typeof u.permissions?.settlementPercent === 'number' ? u.permissions.settlementPercent : null
      }
    })

    return { users: rows }
  }

  const db = getDb()

  const rows = db
    .prepare(
      `
      SELECT u.id, u.username, u.name, u.referral_code, u.bank_name, u.bank_account, u.account_holder, u.role, u.permissions, u.created_at, b.usdt
      FROM users u
      LEFT JOIN balances b ON b.user_id = u.id
      ORDER BY u.id DESC
      `
    )
    .all() as Array<{
    id: number
    username: string
    name: string
    referral_code: string
    bank_name: string
    bank_account: string
    account_holder: string
    role: string
    permissions: string
    created_at: string
    usdt: number
  }>

  return {
    users: rows.map((u) => {
      let permissions: any = {}
      try {
        permissions = JSON.parse(u.permissions || '{}')
      } catch {
        permissions = {}
      }
      return {
        id: u.id,
        username: u.username,
        name: u.name || '',
        referralCode: u.referral_code || '',
        bankName: u.bank_name || '',
        bankAccount: u.bank_account || '',
        accountHolder: u.account_holder || '',
        role: u.role,
        created_at: u.created_at,
        usdt: u.usdt,
        online: false,
        last_login: null,
        settlementType: settlementTypeOf({ role: u.role, permissions }),
        settlementPercent: typeof permissions?.settlementPercent === 'number' ? permissions.settlementPercent : null
      }
    })
  }
})
