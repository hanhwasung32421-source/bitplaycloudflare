import { getMarketOverview } from '../../utils/market-instruments'

export default defineEventHandler(async () => {
  try {
    return await getMarketOverview()
  } catch (e: any) {
    console.error('[markets/overview] failed:', e)
    throw createError({ statusCode: 502, statusMessage: '마켓 정보를 불러오지 못했습니다.' })
  }
})
