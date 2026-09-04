import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { logAdminCredit } from '../../../utils/supa-log'
import { supabaseAppDbEnabled, syncBalanceToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne } from '../../../utils/supabase'

const BodySchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().positive()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (admin.role !== 'super_admin' && !admin.permissions?.canCredit) {
    throw createError({ statusCode: 403, statusMessage: '이 계정에는 입금 권한이 없습니다.' })
  }

  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const supa = getSupabaseAdminClient()
    const prev = await supaSelectOne<any>('trae_balances', { user_id: body.userId })
    const next = Number(prev?.usdt ?? 0) + Number(body.amount)
    const { error } = await supa.from('trae_balances').upsert({ user_id: body.userId, usdt: next }, { onConflict: 'user_id' })
    if (error) throw error
    await logAdminCredit({ adminUserId: admin.id, userId: body.userId, amount: body.amount })
    return { ok: true }
  }

  const db = getDb()

  db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(body.userId, 0)
  db.prepare('UPDATE balances SET usdt = usdt + ? WHERE user_id = ?').run(body.amount, body.userId)

  await logAdminCredit({ adminUserId: admin.id, userId: body.userId, amount: body.amount })
  const bal = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(body.userId) as any
  await syncBalanceToSupabase(body.userId, Number(bal?.usdt ?? 0))
  return { ok: true }
})
