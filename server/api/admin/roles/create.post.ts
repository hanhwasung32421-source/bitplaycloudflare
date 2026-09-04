import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { createRole } from '../../../utils/roles'

const BodySchema = z.object({
  id: z.string().trim().min(2).max(31),
  label: z.string().trim().min(1).max(40)
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const role = await createRole(body.id, body.label)
  return { ok: true, role }
})
