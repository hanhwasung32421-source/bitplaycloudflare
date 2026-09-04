import { z } from 'zod'
import { requireSuperAdmin, hashPassword } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'

const BodySchema = z.object({
  userId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data: row, error: e1 } = await supa.from('trae_users').select('username').eq('id', body.userId).single()
    if (e1) throw e1
    if (!row?.username) throw createError({ statusCode: 404, statusMessage: '유저를 찾을 수 없습니다.' })

    const passwordHash = hashPassword(String(row.username))
    const { error } = await supa
      .from('trae_users')
      .update({
        password_hash: passwordHash,
        password_reset_required: true,
        password_reset_notice_dismissed_at: null,
        updated_at: now
      })
      .eq('id', body.userId)
    if (error) throw error
    return { ok: true }
  }

  const db = getDb()
  const row = await db.prepare('SELECT username FROM users WHERE id = ?').get(body.userId) as { username?: string } | undefined
  if (!row?.username) throw createError({ statusCode: 404, statusMessage: '유저를 찾을 수 없습니다.' })

  const passwordHash = hashPassword(row.username)
  await db.prepare(
    'UPDATE users SET password_hash = ?, password_reset_required = 1, password_reset_notice_dismissed_at = NULL, updated_at = ? WHERE id = ?'
  ).run(passwordHash, now, body.userId)

  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
  await syncUserToSupabase(userRow)

  return { ok: true }
})
