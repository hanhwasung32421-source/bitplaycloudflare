import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { reorderRoles } from '../../../utils/roles'

const BodySchema = z.object({
  order: z.array(z.string()).min(1)
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const roles = await reorderRoles(body.order)
  return { ok: true, roles }
})
