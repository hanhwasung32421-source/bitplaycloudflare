import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, supaInsertStrict, supaSelectWhere } from './supabase'

const T_DEPOSIT_REQUESTS = 'trae_deposit_requests'

export type TransferRequestType = 'deposit' | 'withdrawal'

export type DepositRequest = {
  id: number
  userId: number
  type: TransferRequestType
  krwAmount: number
  status: 'pending' | 'rejected' | 'completed'
  usdtAmount: number | null
  rateUsed: number | null
  createdAt: string
  resolvedAt: string | null
}

function rowToDepositRequest(row: any): DepositRequest {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    type: row.type === 'withdrawal' ? 'withdrawal' : 'deposit',
    krwAmount: Number(row.krw_amount),
    status: (row.status as any) || 'pending',
    usdtAmount: row.usdt_amount === null || row.usdt_amount === undefined ? null : Number(row.usdt_amount),
    rateUsed: row.rate_used === null || row.rate_used === undefined ? null : Number(row.rate_used),
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null
  }
}

export async function createDepositRequest(
  userId: number,
  krwAmount: number,
  type: TransferRequestType = 'deposit'
): Promise<DepositRequest> {
  const createdAt = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    await supaInsertStrict(T_DEPOSIT_REQUESTS, {
      id,
      user_id: userId,
      type,
      krw_amount: krwAmount,
      status: 'pending',
      created_at: createdAt
    })
    return { id, userId, type, krwAmount, status: 'pending', usdtAmount: null, rateUsed: null, createdAt, resolvedAt: null }
  }

  const db = getDb()
  const result = await db
    .prepare('INSERT INTO deposit_requests (user_id, type, krw_amount, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, type, krwAmount, 'pending', createdAt)
  return {
    id: Number(result.lastInsertRowid),
    userId,
    type,
    krwAmount,
    status: 'pending',
    usdtAmount: null,
    rateUsed: null,
    createdAt,
    resolvedAt: null
  }
}

// 입금/출금 내역 화면용: 지정된 유저들의 요청 전체(건당 1행), 최신 신청 순으로 정렬
export async function listDepositRequests(userIds: number[]): Promise<DepositRequest[]> {
  if (!userIds.length) return []

  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_DEPOSIT_REQUESTS, orderBy: 'id', ascending: false })
    return rows.filter((row) => userIds.includes(Number(row.user_id))).map(rowToDepositRequest)
  }

  const db = getDb()
  const placeholders = userIds.map(() => '?').join(',')
  const rows = await db
    .prepare(`SELECT * FROM deposit_requests WHERE user_id IN (${placeholders}) ORDER BY id DESC`)
    .all(...userIds) as any[]
  return rows.map(rowToDepositRequest)
}

export async function getDepositRequest(id: number): Promise<DepositRequest | null> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from(T_DEPOSIT_REQUESTS).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToDepositRequest(data) : null
  }
  const db = getDb()
  const row = await db.prepare('SELECT * FROM deposit_requests WHERE id = ?').get(id) as any
  return row ? rowToDepositRequest(row) : null
}

export async function resolveDepositRequest(
  id: number,
  status: 'completed' | 'rejected',
  extra?: { usdtAmount?: number; rateUsed?: number }
): Promise<void> {
  const resolvedAt = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const patch: any = { status, resolved_at: resolvedAt }
    if (extra?.usdtAmount !== undefined) patch.usdt_amount = extra.usdtAmount
    if (extra?.rateUsed !== undefined) patch.rate_used = extra.rateUsed
    const { error } = await supa.from(T_DEPOSIT_REQUESTS).update(patch).eq('id', id)
    if (error) throw error
    return
  }

  const db = getDb()
  await db.prepare('UPDATE deposit_requests SET status = ?, usdt_amount = COALESCE(?, usdt_amount), rate_used = COALESCE(?, rate_used), resolved_at = ? WHERE id = ?').run(
    status,
    extra?.usdtAmount ?? null,
    extra?.rateUsed ?? null,
    resolvedAt,
    id
  )
}
