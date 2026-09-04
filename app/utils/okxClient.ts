/**
 * 브라우저에서 OKX 공개 REST 를 직접 호출하는 클라이언트.
 *
 * 왜 서버 프록시(/api/okx/*)를 기본 경로로 쓰지 않는가:
 *   Cloudflare Workers 는 egress IP 를 여러 워커가 공유해서, 서버가 대신
 *   호출하면 OKX 가 429(Too Many Requests)로 막습니다. 배포 후 실측에서
 *   /api/okx/candles 연속 호출의 24~35% 가 429 였습니다.
 *
 *   OKX 공개 엔드포인트는 CORS 를 허용하므로, 브라우저가 자기 IP 로 직접
 *   호출하면 이 문제가 사라집니다. 실시간 시세(WebSocket)가 이미 같은 방식이라
 *   구조적으로도 일관됩니다.
 *
 * 3중 안전장치:
 *   1) 요청 간격 제한(MIN_GAP_MS) — OKX 의 IP 당 속도 제한에 걸리지 않게 직렬화
 *   2) 429 면 백오프 후 재시도
 *   3) 그래도 실패하면 서버 프록시(/api/okx/*)로 폴백
 *      (사내망 등에서 okx.com 이 막혀 있는 경우도 여기서 흡수됩니다)
 */

const OKX_BASE = 'https://www.okx.com/api/v5'

/**
 * OKX 공개 시세 API 는 IP 당 대략 20회/2초입니다.
 * 차트가 과거로 스크롤할 때 페이지네이션을 연속으로 던지므로 간격을 둡니다.
 */
const MIN_GAP_MS = 150
const RETRIES = 2

type Query = Record<string, string | number | undefined>

/** 직전 요청이 끝난 시각. 모든 호출이 이 체인을 공유해 간격을 유지합니다. */
let gate: Promise<void> = Promise.resolve()

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** 호출들을 MIN_GAP_MS 간격으로 직렬화 */
function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = gate.then(task)
  gate = run.then(
    () => sleep(MIN_GAP_MS),
    () => sleep(MIN_GAP_MS)
  )
  return run
}

function toSearch(query: Query): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  return p.toString()
}

/** OKX 직접 호출(간격 제한 + 재시도) -> 실패하면 서버 프록시로 폴백 */
async function okxGet<T = any>(path: string, proxyPath: string, query: Query): Promise<T> {
  const qs = toSearch(query)
  const url = `${OKX_BASE}${path}?${qs}`

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await schedule(() => fetch(url, { headers: { accept: 'application/json' } }))
      if (res.ok) return (await res.json()) as T
      if (res.status !== 429 && res.status < 500) break
    } catch {
      // 네트워크/CORS 차단 -> 폴백으로
      break
    }
    await sleep(400 * (attempt + 1))
  }

  return await $fetch<T>(proxyPath, { query: query as any })
}

export function fetchOkxCandles(params: {
  instId: string
  bar: string
  limit?: number
  after?: string
  before?: string
}) {
  // after 커서가 있으면 과거 전용 엔드포인트를 써야 합니다.
  // (/market/candles 는 최근 구간만 응답해서 과거로 스크롤하면 끊깁니다.)
  const useHistory = Boolean(params.after)
  const path = useHistory ? '/market/history-candles' : '/market/candles'
  const limit = Math.min(params.limit ?? 120, useHistory ? 100 : 300)

  return okxGet<any>(path, '/api/okx/candles', {
    instId: params.instId,
    bar: params.bar,
    limit,
    after: params.after,
    before: params.before
  })
}

export async function fetchOkxBooks(instId: string, sz = 20) {
  const res = await okxGet<any>('/market/books', '/api/okx/books', { instId, sz })
  // 서버 프록시는 { data: <행> } 형태로, OKX 직접 호출은 { data: [<행>] } 형태로 옵니다.
  const row = Array.isArray(res?.data) ? res.data[0] : res?.data
  return { data: row ?? null }
}
