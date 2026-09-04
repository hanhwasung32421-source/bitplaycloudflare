import { requireAdmin } from '../../utils/auth'
import { listMessageRecipientsForAdmin } from '../../utils/messages'
import { canViewMenu } from '../../utils/menu-permissions'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'messages')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }
  const items = await listMessageRecipientsForAdmin()
  return { items }
})
