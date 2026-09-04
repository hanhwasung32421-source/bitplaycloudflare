import { readBody } from 'h3'
import { z } from 'zod'
import { hashPassword, requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

const BodySchema = z.object({
  // 관리자 계정처럼 이름/생년월일/계좌정보가 아직 없는 경우에도(예: 총관리자 admin/1234)
  // 비밀번호만 바꿀 수 있어야 하므로 빈 값 저장을 허용한다.
  name: z.string().trim().max(40).optional().default(''),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional().default(''),
  bankName: z.string().trim().max(40).optional().default(''),
  bankAccount: z.string().trim().max(80).optional().default(''),
  accountHolder: z.string().trim().max(40).optional().default(''),
  newPassword: z.string().trim().min(4).max(50).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' })
  }
  const body = parsed.data
  const now = new Date().toISOString()

  const patch: any = {
    name: body.name.trim(),
    birth_date: body.birthDate,
    bank_name: body.bankName.trim(),
    bank_account: body.bankAccount.trim(),
    account_holder: body.accountHolder.trim(),
    updated_at: now
  }
  if (body.newPassword) {
    patch.password_hash = hashPassword(body.newPassword)
    patch.password_reset_required = false
    patch.password_reset_notice_dismissed_at = now
  }

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from('trae_users').update(patch).eq('id', user.id)
    if (error) throw error
    return { ok: true }
  }

  const db = getDb()
  await db.prepare(
    `UPDATE users
     SET name = ?, birth_date = ?, bank_name = ?, bank_account = ?, account_holder = ?, password_hash = COALESCE(?, password_hash), password_reset_required = ?, password_reset_notice_dismissed_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    body.name.trim(),
    body.birthDate,
    body.bankName.trim(),
    body.bankAccount.trim(),
    body.accountHolder.trim(),
    body.newPassword ? hashPassword(body.newPassword) : null,
    body.newPassword ? 0 : user.password_reset_required ? 1 : 0,
    body.newPassword ? now : user.password_reset_notice_dismissed_at || null,
    now,
    user.id
  )

  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any
  await syncUserToSupabase(userRow)
  return { ok: true }
})
