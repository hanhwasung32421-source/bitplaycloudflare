import { clearAuthSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await clearAuthSession(event)
  return { ok: true }
})
