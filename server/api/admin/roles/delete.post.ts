import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { deleteRole } from '../../../utils/roles'

const BodySchema = z.object({
  id: z.string().trim().min(1)
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await deleteRole(body.id)
  return { ok: true }
})
