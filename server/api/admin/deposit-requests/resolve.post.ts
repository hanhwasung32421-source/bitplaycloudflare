import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled, syncBalanceToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne } from '../../../utils/supabase'
import { canEditMenu } from '../../../utils/menu-permissions'
import { getDepositRequest, resolveDepositRequest } from '../../../utils/deposit-requests'
import { resolveKrwPerUsdtRate } from '../../../utils/system-settings'
import { fetchDownlineUsernames } from '../../../utils/referral'

const BodySchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(['completed', 'rejected'])
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canEditMenu(admin, 'deposits')) {
    throw createError({ statusCode: 403, statusMessage: '입금/출금 승인/거절 권한이 없습니다.' })
  }

  const body = BodySchema.parse(await readBody(event))
  const req = await getDepositRequest(body.requestId)
  if (!req) throw createError({ statusCode: 404, statusMessage: '요청을 찾을 수 없습니다.' })
  if (req.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: '이미 처리된 요청입니다.' })
  }

  const useSupa = supabaseAppDbEnabled()

  if (admin.role !== 'super_admin') {
    const targetUsername = useSupa
      ? String((await supaSelectOne<any>('trae_users', { id: req.userId }))?.username || '')
      : String((getDb().prepare('SELECT username FROM users WHERE id = ?').get(req.userId) as any)?.username || '')
    const downline = await fetchDownlineUsernames(admin.username)
    if (!downline.has(targetUsername)) {
      throw createError({ statusCode: 403, statusMessage: '이 회원의 요청을 처리할 권한이 없습니다.' })
    }
  }

  if (body.status === 'rejected') {
    await resolveDepositRequest(req.id, 'rejected')
    return { ok: true }
  }

  const rate = await resolveKrwPerUsdtRate()
  if (!(rate > 0)) {
    throw createError({ statusCode: 400, statusMessage: '원/USDT 환율을 확인할 수 없습니다. 관리자 설정에서 환율을 지정해주세요.' })
  }
  const usdtAmount = req.krwAmount / rate
  const delta = req.type === 'withdrawal' ? -usdtAmount : usdtAmount

  if (useSupa) {
    const supa = getSupabaseAdminClient()
    const prev = Number((await supaSelectOne<any>('trae_balances', { user_id: req.userId }))?.usdt ?? 0)
    if (req.type === 'withdrawal' && prev < usdtAmount) {
      throw createError({ statusCode: 400, statusMessage: '해당 회원의 잔고가 부족하여 출금을 완료할 수 없습니다.' })
    }
    const next = prev + delta
    const { error } = await supa.from('trae_balances').upsert({ user_id: req.userId, usdt: next }, { onConflict: 'user_id' })
    if (error) throw error
  } else {
    const db = getDb()
    db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(req.userId, 0)
    const bal = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(req.userId) as any
    const prev = Number(bal?.usdt ?? 0)
    if (req.type === 'withdrawal' && prev < usdtAmount) {
      throw createError({ statusCode: 400, statusMessage: '해당 회원의 잔고가 부족하여 출금을 완료할 수 없습니다.' })
    }
    db.prepare('UPDATE balances SET usdt = usdt + ? WHERE user_id = ?').run(delta, req.userId)
    const updated = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(req.userId) as any
    await syncBalanceToSupabase(req.userId, Number(updated?.usdt ?? 0))
  }

  await resolveDepositRequest(req.id, 'completed', { usdtAmount, rateUsed: rate })
  return { ok: true, usdtAmount, rateUsed: rate }
})
