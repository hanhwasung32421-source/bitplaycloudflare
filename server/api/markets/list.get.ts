import { listCategorizedMarketInstruments } from '../../utils/market-instruments'

export default defineEventHandler(async () => {
  try {
    return await listCategorizedMarketInstruments()
  } catch (e: any) {
    console.error('[markets/list] failed:', e)
    throw createError({ statusCode: 502, statusMessage: '마켓 목록을 불러오지 못했습니다.' })
  }
})
