// 중요: fs.readFileSync로 project root의 version.json을 읽으면 Vercel 같은 서버리스
// 배포에서는 그 파일이 함수 번들에 포함되지 않아 항상 ENOENT로 실패하고 build가 1로
// 고정되어 보인다. JSON을 직접 import하면 빌드 시점에 값이 번들에 인라인되어
// 어떤 배포 환경에서도 정확히 표시된다.
import versionInfo from '../../version.json'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function todayStamp(d: Date) {
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

function formatKoreanDate(d: Date) {
  const weekday = WEEKDAYS[d.getDay()]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`
}

export default defineEventHandler(() => {
  const now = new Date()
  const today = todayStamp(now)

  // 마지막으로 푸시된 날짜가 오늘이면 그 빌드 번호를 쓰고,
  // 아니면(푸시 없이 날짜만 지난 경우) 항상 1로 표시한다.
  const info = versionInfo as { date?: string; build?: number }
  const build = info?.date === today && Number.isFinite(Number(info?.build)) ? Number(info.build) : 1

  return { date: formatKoreanDate(now), build }
})
