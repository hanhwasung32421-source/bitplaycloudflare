import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export function isMissingColumnError(error: any, column: string) {
  const msg = String(error?.message || error || '')
  return msg.includes(`Could not find the '${column}' column`)
}

// 테이블 자체가 아직 생성되지 않은 경우(SQL 패치 미실행). 42P01 = Postgres "relation does not exist",
// PGRST205 = PostgREST 스키마 캐시에서 테이블을 찾지 못함(방금 생성했거나 아예 없을 때 둘 다 발생 가능).
export function isMissingTableError(error: any) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') return true
  const msg = String(error?.message || error || '')
  return /relation .* does not exist/i.test(msg) || /could not find the table/i.test(msg)
}

export function getSupabaseAdminClient() {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const serviceRole = (config.supabaseServiceRoleKey as string) || ''
  const anon = config.public.supabaseAnonKey as string
  // service role 우선(서버 전용). 없으면 anon으로 fallback (데모용)
  const key = serviceRole || anon
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function supaInsert(table: string, payload: any) {
  try {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(table).insert(payload as any)
    if (error) {
      console.warn('[supabase]', table, error.message)
    }
  } catch (e: any) {
    console.warn('[supabase]', table, e?.message || e)
  }
}

export async function supaInsertStrict(table: string, payload: any) {
  const supa = getSupabaseAdminClient()
  const { error } = await supa.from(table).insert(payload as any)
  if (error) throw error
}

export async function supaUpsert(table: string, payload: any, onConflict: string) {
  try {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(table).upsert(payload as any, { onConflict })
    if (error) console.warn('[supabase]', table, error.message)
  } catch (e: any) {
    console.warn('[supabase]', table, e?.message || e)
  }
}

export async function supaUpsertStrict(table: string, payload: any, onConflict: string) {
  const supa = getSupabaseAdminClient()
  const { error } = await supa.from(table).upsert(payload as any, { onConflict })
  if (error) throw error
}

export async function supaUpsertUserSettings(payload: {
  user_id: number
  trade_percent: number
  trade_leverage: number
  chart_prefs?: any
  updated_at: string
}) {
  const supa = getSupabaseAdminClient()
  const fullPayload = {
    user_id: Number(payload.user_id),
    trade_percent: Number(payload.trade_percent),
    trade_leverage: Number(payload.trade_leverage),
    chart_prefs: payload.chart_prefs || {},
    updated_at: payload.updated_at
  }

  const { error } = await supa.from('trae_user_settings').upsert(fullPayload as any, { onConflict: 'user_id' })
  if (!error) return

  // 구버전 스키마 호환: chart_prefs 컬럼이 아직 없으면 해당 컬럼 없이 재시도
  if (isMissingColumnError(error, 'chart_prefs')) {
    const fallbackPayload = {
      user_id: Number(payload.user_id),
      trade_percent: Number(payload.trade_percent),
      trade_leverage: Number(payload.trade_leverage),
      updated_at: payload.updated_at
    }
    const retry = await supa.from('trae_user_settings').upsert(fallbackPayload as any, { onConflict: 'user_id' })
    if (retry.error) throw retry.error
    return
  }

  throw error
}

export async function ensureAdminExists() {
  // Supabase에 admin이 없을 때만 생성 (기존 admin/잔고/설정은 절대 덮어쓰지 않음)
  const cfg = useRuntimeConfig()
  if (!String(cfg.supabaseServiceRoleKey || '')) return

  const existing = await supaSelectOne<any>('trae_users', { username: 'admin' }).catch(() => null)
  if (existing) return

  const supa = getSupabaseAdminClient()
  const now = new Date().toISOString()
  const adminId = 1053
  const passwordHash = bcrypt.hashSync('1234', 10)

  const { error } = await supa.from('trae_users').insert({
    id: adminId,
    username: 'admin',
    password_hash: passwordHash,
    name: '',
    birth_date: '',
    bank_name: '',
    bank_account: '',
    account_holder: '',
    referral_code: '',
    terms_agreed_at: now,
    password_reset_required: false,
    password_reset_notice_dismissed_at: null,
    role: 'super_admin',
    permissions: { all: true, canCredit: true },
    created_at: now,
    updated_at: now
  })
  if (error) throw error

  // 잔고/설정은 없을 때만 생성
  const bal = await supaSelectOne<any>('trae_balances', { user_id: adminId }).catch(() => null)
  if (!bal) {
    const { error: e2 } = await supa.from('trae_balances').insert({ user_id: adminId, usdt: 10000 })
    if (e2) throw e2
  }
  const settings = await supaSelectOne<any>('trae_user_settings', { user_id: adminId }).catch(() => null)
  if (!settings) {
    await supaUpsertUserSettings({
      user_id: adminId,
      trade_percent: 50,
      trade_leverage: 100,
      chart_prefs: {},
      updated_at: now
    })
  }
}

export async function supaDelete(table: string, where: Record<string, any>) {
  try {
    const supa = getSupabaseAdminClient()
    let q: any = supa.from(table).delete()
    for (const [k, v] of Object.entries(where)) q = q.eq(k, v)
    const { error } = await q
    if (error) console.warn('[supabase]', table, error.message)
  } catch (e: any) {
    console.warn('[supabase]', table, e?.message || e)
  }
}

export async function supaCount(table: string) {
  const supa = getSupabaseAdminClient()
  const { count, error } = await supa.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function supaSelectAll<T = any>(table: string, orderBy: string) {
  const supa = getSupabaseAdminClient()
  const out: T[] = []
  let from = 0
  const step = 1000
  while (true) {
    const { data, error } = await supa.from(table).select('*').order(orderBy, { ascending: true }).range(from, from + step - 1)
    if (error) throw error
    const rows = (data || []) as T[]
    out.push(...rows)
    if (rows.length < step) break
    from += step
  }
  return out
}

export async function supaSelectWhere<T = any>(args: {
  table: string
  where?: Record<string, any>
  orderBy?: string
  ascending?: boolean
  limit?: number
}) {
  const supa = getSupabaseAdminClient()
  let q: any = supa.from(args.table).select('*')
  if (args.where) {
    for (const [k, v] of Object.entries(args.where)) q = q.eq(k, v)
  }
  if (args.orderBy) q = q.order(args.orderBy, { ascending: args.ascending ?? false })
  if (args.limit) q = q.limit(args.limit)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as T[]
}

export async function supaSelectOne<T = any>(table: string, where: Record<string, any>) {
  const rows = await supaSelectWhere<T>({ table, where, limit: 1 })
  return rows[0] ?? null
}

export async function supaUpdate(table: string, where: Record<string, any>, values: Record<string, any>) {
  try {
    const supa = getSupabaseAdminClient()
    let q: any = supa.from(table).update(values)
    for (const [k, v] of Object.entries(where)) q = q.eq(k, v)
    const { error } = await q
    if (error) console.warn('[supabase]', table, error.message)
  } catch (e: any) {
    console.warn('[supabase]', table, e?.message || e)
  }
}

export async function supaSelectIn<T = any>(args: {
  table: string
  column: string
  values: any[]
  orderBy?: string
  ascending?: boolean
}) {
  const supa = getSupabaseAdminClient()
  if (!args.values?.length) return [] as T[]
  let q: any = supa.from(args.table).select('*').in(args.column, args.values)
  if (args.orderBy) q = q.order(args.orderBy, { ascending: args.ascending ?? false })
  const { data, error } = await q
  if (error) throw error
  return (data || []) as T[]
}
