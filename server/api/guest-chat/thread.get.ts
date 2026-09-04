import { z } from 'zod'
import { listGuestChatThreadMessages } from '../../utils/guest-chat'

const QuerySchema = z.object({
  guestId: z.string().trim().min(8).max(80)
})

// 방문자 본인이 자신의 guestId로 대화 내역을 조회하는 공개 엔드포인트(로그인 불필요).
export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const items = await listGuestChatThreadMessages(q.guestId)
  return { items }
})
