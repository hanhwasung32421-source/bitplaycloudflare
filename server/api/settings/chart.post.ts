import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserSettingsToSupabase } from '../../utils/supa-appdb'
import { supaSelectOne, supaUpsertUserSettings } from '../../utils/supabase'

const DrawingPointSchema = z.object({
  time: z.any(),
  price: z.coerce.number()
})

const BolPrefsSchema = z.union([
  z.boolean(),
  z.object({
    enabled: z.boolean().optional().default(false),
    length: z.coerce.number().positive().optional().default(20),
    stdDev: z.coerce.number().positive().optional().default(2),
    showBasis: z.boolean().optional().default(false),
    showUpper: z.boolean().optional().default(true),
    showLower: z.boolean().optional().default(true),
    basisColor: z.string().optional().default('#f59e0b'),
    upperColor: z.string().optional().default('#2563eb'),
    lowerColor: z.string().optional().default('#38bdf8')
  })
])

const ChartPrefsSchema = z.object({
  indicators: z.object({
    bol: BolPrefsSchema.optional().default(false),
    extra: z.array(z.string()).max(30).optional().default([])
  }).default({}),
  drawings: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['trend', 'hline', 'vline', 'rect', 'circle']),
      color: z.string().optional(),
      price: z.coerce.number().optional(),
      time: z.any().optional(),
      points: z.array(DrawingPointSchema).optional()
    })
  ).max(100).default([])
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = ChartPrefsSchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const prev = await supaSelectOne<any>('trae_user_settings', { user_id: user.id })
    const now = new Date().toISOString()
    await supaUpsertUserSettings({
      user_id: user.id,
      trade_percent: Number(prev?.trade_percent ?? 50),
      trade_leverage: Number(prev?.trade_leverage ?? 100),
      chart_prefs: body,
      updated_at: now
    })
    return { ok: true }
  }

  const db = getDb()
  const prev = await db.prepare('SELECT trade_percent, trade_leverage FROM user_settings WHERE user_id = ?').get(user.id) as any
  const now = new Date().toISOString()
  const chartPrefsText = JSON.stringify(body)

  await db.prepare(
    `INSERT INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       trade_percent = excluded.trade_percent,
       trade_leverage = excluded.trade_leverage,
       chart_prefs = excluded.chart_prefs,
       updated_at = excluded.updated_at`
  ).run(user.id, Number(prev?.trade_percent ?? 50), Number(prev?.trade_leverage ?? 100), chartPrefsText, now)

  await syncUserSettingsToSupabase(
    user.id,
    Number(prev?.trade_percent ?? 50),
    Number(prev?.trade_leverage ?? 100),
    now,
    body
  )

  return { ok: true }
})
