import { readBody } from 'h3'
import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { approvePasswordReset } from '../../../utils/password-reset'

const BodySchema = z.object({
  requestId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await approvePasswordReset(body.requestId, admin)
  return { ok: true }
})
