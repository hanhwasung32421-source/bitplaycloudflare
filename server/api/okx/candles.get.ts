import { z } from 'zod'
import { okxFetch } from '../../upstream/okx-fetch'

const QuerySchema = z.object({
  instId: z.string().min(1),
  bar: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(300).optional(),
  after: z.string().optional(),
  before: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  // 중요: /market/candles는 "최근 데이터"만 캐싱된 창(생각보다 짧음)에서만 응답해서
  // after 커서로 더 과거를 요청해도 어느 지점부턴 그냥 끊긴다(그래서 축소하면 하루 정도밖에 안 보임).
  // after가 있으면(=더 과거 페이지를 요청하는 것) 과거 데이터 전용 history-candles로 페이징한다.
  // history-candles는 1회 최대 100개까지만 지원한다.
  const useHistory = Boolean(q.after)
  const url = useHistory
    ? 'https://www.okx.com/api/v5/market/history-candles'
    : 'https://www.okx.com/api/v5/market/candles'
  const limit = Math.min(q.limit ?? 120, useHistory ? 100 : 300)

  // 과거 구간은 더 이상 변하지 않으므로 길게 캐시한다. 차트가 과거로 스크롤할 때
  // 같은 구간을 반복 요청하는데, 이게 429의 주된 원인이었다.
  const ttl = useHistory
    ? { freshMs: 600000, staleMs: 3600000 }
    : { freshMs: 3000, staleMs: 60000 }

  return await okxFetch<any>(
    url,
    {
      instId: q.instId,
      bar: q.bar,
      limit,
      ...(q.after ? { after: q.after } : {}),
      ...(q.before ? { before: q.before } : {})
    },
    ttl
  )
})
