import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { canEditMenu } from '../../../utils/menu-permissions'
import { insertGuestChatMessage, listGuestChatThreadMessages } from '../../../utils/guest-chat'

const BodySchema = z.object({
  guestId: z.string().trim().min(8).max(80),
  body: z.string().trim().min(1).max(2000)
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canEditMenu(admin, 'messages')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 답장 권한이 없습니다.' })
  }
  const body = BodySchema.parse(await readBody(event))
  await insertGuestChatMessage(body.guestId, 'admin', body.body)
  const items = await listGuestChatThreadMessages(body.guestId)
  return { ok: true, items }
})
