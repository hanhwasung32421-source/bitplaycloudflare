import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserSettingsToSupabase } from '../../utils/supa-appdb'
import { supaSelectOne, supaUpsertUserSettings } from '../../utils/supabase'

const BodySchema = z.object({
  percent: z.coerce.number().int().min(0).max(100),
  leverage: z.coerce.number().int().min(1).max(100)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const prev = await supaSelectOne<any>('trae_user_settings', { user_id: user.id })
    const now = new Date().toISOString()
    await supaUpsertUserSettings({
      user_id: user.id,
      trade_percent: body.percent,
      trade_leverage: body.leverage,
      chart_prefs: prev?.chart_prefs || {},
      updated_at: now
    })
    return { ok: true }
  }

  const db = getDb()
  const prev = db.prepare('SELECT chart_prefs FROM user_settings WHERE user_id = ?').get(user.id) as { chart_prefs?: string } | undefined

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       trade_percent = excluded.trade_percent,
       trade_leverage = excluded.trade_leverage,
       chart_prefs = excluded.chart_prefs,
       updated_at = excluded.updated_at`
  ).run(user.id, body.percent, body.leverage, String(prev?.chart_prefs || '{}'), now)

  await syncUserSettingsToSupabase(
    user.id,
    body.percent,
    body.leverage,
    now,
    (() => {
      try {
        return prev?.chart_prefs ? JSON.parse(String(prev.chart_prefs)) : {}
      } catch {
        return {}
      }
    })()
  )
  return { ok: true }
})
