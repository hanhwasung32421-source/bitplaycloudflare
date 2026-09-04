import { z } from 'zod'
import { getOkxLastPrice } from '../../utils/okx'

const BodySchema = z.object({
  symbols: z.array(z.string().min(1)).max(30)
})

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))
  const uniq = Array.from(new Set(body.symbols.map((s) => s.toUpperCase()))).slice(0, 30)

  const entries = await Promise.all(
    uniq.map(async (symbol) => {
      try {
        const { last } = await getOkxLastPrice(symbol)
        return [symbol, Number(last)] as const
      } catch {
        return [symbol, 0] as const
      }
    })
  )

  return { prices: Object.fromEntries(entries) }
})

