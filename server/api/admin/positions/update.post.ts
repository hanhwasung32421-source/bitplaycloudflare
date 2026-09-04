import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { canEditMenu } from '../../../utils/menu-permissions'

const BodySchema = z.object({
  positionId: z.coerce.number().int().positive(),
  field: z.enum(['qty', 'entry_price', 'margin', 'leverage']),
  value: z.coerce.number().positive()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canEditMenu(admin, 'positions')) {
    throw createError({ statusCode: 403, statusMessage: '포지션 수정 권한이 없습니다.' })
  }
  const body = BodySchema.parse(await readBody(event))

  const patch: Record<string, number> = {
    [body.field]: body.field === 'leverage' ? Math.max(1, Math.min(100, Math.round(body.value))) : body.value
  }

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa
      .from('trae_positions')
      .update(patch)
      .eq('id', body.positionId)
    if (error) throw error
    return { ok: true }
  }

  const db = getDb()
  const allowed = ['qty', 'entry_price', 'margin', 'leverage']
  if (!allowed.includes(body.field)) {
    throw createError({ statusCode: 400, statusMessage: '수정할 수 없는 항목입니다.' })
  }
  db.prepare(`UPDATE positions SET ${body.field} = ? WHERE id = ?`).run(patch[body.field], body.positionId)
  return { ok: true }
})
