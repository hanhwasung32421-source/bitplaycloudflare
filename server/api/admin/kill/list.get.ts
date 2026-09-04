import { requireSuperAdmin } from '../../../utils/auth'
import { listAllKillEvents } from '../../../utils/kill-events'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const items = await listAllKillEvents(100)
  return { items }
})
