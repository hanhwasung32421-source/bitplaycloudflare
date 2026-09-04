import { z } from 'zod'

const QuerySchema = z.object({
  instId: z.string().min(1),
  sz: z.coerce.number().int().min(1).max(50).optional()
})

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const res = await $fetch<any>('https://www.okx.com/api/v5/market/books', {
    query: {
      instId: q.instId,
      sz: q.sz ?? 20
    }
  })
  return { data: res?.data?.[0] ?? null }
})

