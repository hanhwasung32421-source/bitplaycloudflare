import { requireSuperAdmin } from '../../../utils/auth'
import { listAllProfitEvents } from '../../../utils/profit-events'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const items = await listAllProfitEvents(100)
  return { items }
})
