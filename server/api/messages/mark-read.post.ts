import { readBody } from 'h3'
import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { ensureAdminThreadAccess, markThreadAsRead } from '../../utils/messages'

const BodySchema = z.object({
  userId: z.number().int().positive().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const { threadKey } = await ensureAdminThreadAccess(user, body.userId)
  await markThreadAsRead(threadKey, user.id)
  return { ok: true }
})
