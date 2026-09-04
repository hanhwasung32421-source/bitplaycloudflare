import { z } from 'zod'
import { getRequestIP } from 'h3'
import { insertGuestChatMessage, listGuestChatThreadMessages } from '../../utils/guest-chat'

const BodySchema = z.object({
  guestId: z.string().trim().min(8).max(80),
  body: z.string().trim().min(1).max(2000)
})

// 로그인 없이 첫화면 "실시간 상담"에서 누구나 보낼 수 있는 공개 엔드포인트.
// guestId는 방문자 브라우저(localStorage)에 저장된 임의 코드로, 추측하기 어려운 값이어야 한다.
export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))
  const ip = getRequestIP(event, { xForwardedFor: true }) || null
  await insertGuestChatMessage(body.guestId, 'guest', body.body, ip)
  const items = await listGuestChatThreadMessages(body.guestId)
  return { ok: true, items }
})
