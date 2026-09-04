import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = QuerySchema.parse(getQuery(event))

  const limit = q.limit ?? 20
  const offset = q.offset ?? 0

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error, count } = await supa
      .from('trae_trades')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    const trades = (data || []) as any[]
    const total = Number(count || 0)
    return {
      items: trades,
      total,
      limit,
      offset,
      hasMore: offset + trades.length < total
    }
  }

  const db = getDb()
  const trades = await db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(user.id, limit, offset) as any[]
  const totalRow = await db.prepare('SELECT COUNT(*) as count FROM trades WHERE user_id = ?').get(user.id) as { count: number }

  return {
    items: trades,
    total: totalRow.count,
    limit,
    offset,
    hasMore: offset + trades.length < totalRow.count
  }
})
