import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { updateRole } from '../../../utils/roles'
import { ADMIN_MENU_KEYS } from '../../../utils/menu-permissions'

const MenuSchema = z.object({
  view: z.boolean().optional(),
  edit: z.boolean().optional()
})

const BodySchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1).max(40).optional(),
  menus: z.record(z.enum(ADMIN_MENU_KEYS), MenuSchema).optional(),
  tier: z.number().int().optional()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const role = await updateRole(body.id, { label: body.label, menus: body.menus, tier: body.tier })
  return { ok: true, role }
})
