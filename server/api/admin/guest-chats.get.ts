import { requireAdmin } from '../../utils/auth'
import { canViewMenu } from '../../utils/menu-permissions'
import { listGuestChatThreads } from '../../utils/guest-chat'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'messages')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }
  const items = await listGuestChatThreads()
  return { items }
})
