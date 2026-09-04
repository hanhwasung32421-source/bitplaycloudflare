import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { canViewMenu } from '../../../utils/menu-permissions'
import { listGuestChatThreadMessages, markGuestChatThreadRead } from '../../../utils/guest-chat'

const QuerySchema = z.object({
  guestId: z.string().trim().min(8).max(80)
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'messages')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }
  const q = QuerySchema.parse(getQuery(event))
  const items = await listGuestChatThreadMessages(q.guestId)
  await markGuestChatThreadRead(q.guestId)
  return { items }
})
