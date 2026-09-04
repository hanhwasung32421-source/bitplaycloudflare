import { getSessionUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const me = await getSessionUser(event)
  return { me }
})
