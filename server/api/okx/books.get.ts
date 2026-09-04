import { z } from 'zod'
import { okxFetch } from '../../upstream/okx-fetch'

const QuerySchema = z.object({
  instId: z.string().min(1),
  sz: z.coerce.number().int().min(1).max(50).optional()
})

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  // 호가는 빠르게 변하므로 캐시는 아주 짧게. 브라우저는 OKX WebSocket 에 직접 붙으므로
  // 이 엔드포인트는 초기 로드/폴백 용도입니다.
  const res = await okxFetch<any>(
    'https://www.okx.com/api/v5/market/books',
    { instId: q.instId, sz: q.sz ?? 20 },
    { freshMs: 800, staleMs: 10000 }
  )
  return { data: res?.data?.[0] ?? null }
})
