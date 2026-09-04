import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa
      .from('trae_users')
      .update({ password_reset_notice_dismissed_at: now, updated_at: now })
      .eq('id', user.id)
    if (error) throw error
    return { ok: true }
  }

  const db = getDb()
  await db.prepare(`UPDATE users SET password_reset_notice_dismissed_at = ?, updated_at = ? WHERE id = ?`).run(now, now, user.id)
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any
  await syncUserToSupabase(userRow)
  return { ok: true }
})
