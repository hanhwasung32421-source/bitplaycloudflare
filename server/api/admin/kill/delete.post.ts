import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { deleteKillEvent } from '../../../utils/kill-events'

const BodySchema = z.object({
  id: z.coerce.number()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await deleteKillEvent(body.id)
  return { ok: true }
})
