import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { listProfitEvents } from '../../utils/profit-events'

const QuerySchema = z.object({
  symbol: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(500).optional()
})

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = QuerySchema.parse(getQuery(event))
  // 캔들 로딩마다 호출되는 읽기 전용 엔드포인트라, 저장소 쪽 문제(테이블 미생성, 일시적 오류 등)로
  // 500을 띄우지 않고 빈 목록으로 조용히 넘어간다.
  try {
    const items = await listProfitEvents(query.symbol, query.limit ?? 200)
    return { items }
  } catch {
    return { items: [] }
  }
})
