import { requireUser } from '../../utils/auth'
import { resolveKrwPerUsdtRate } from '../../utils/system-settings'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const rate = await resolveKrwPerUsdtRate()
  return { rate }
})
