import { getDailyKrwRate } from '../../utils/system-settings'

// Vercel Cron이 매일 00:00 UTC(=오전 9시 KST)에 호출한다(vercel.json 참고).
// 그 시각이 지나면 이 요청이 "새로운 날"로 인식해 빗썸 시세로 환율을 새로 고정하고,
// 이미 그날 갱신됐다면(또는 크론이 아닌 다른 요청이 먼저 갱신했다면) 캐시된 값을 그대로 돌려준다.
export default defineEventHandler(async () => {
  const daily = await getDailyKrwRate()
  return { ok: true, ...daily }
})
