import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { latestProfitEvent } from '../../utils/profit-events'

const QuerySchema = z.object({
  symbol: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = QuerySchema.parse(getQuery(event))
  // 모든 접속자의 차트에서 1.5초마다 폴링되는 읽기 전용 엔드포인트라, 저장소 쪽 문제(테이블
  // 미생성, 일시적 오류 등)로 500을 띄우지 않고 "이벤트 없음"으로 조용히 넘어간다.
  try {
    const item = await latestProfitEvent(query.symbol)
    return { event: item }
  } catch {
    return { event: null }
  }
})
