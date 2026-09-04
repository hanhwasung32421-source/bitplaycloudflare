/**
 * OKX 공개 REST 호출을 한 곳으로 모은 계층.
 *
 * 왜 필요한가:
 *   Cloudflare Workers 는 egress IP 를 여러 워커가 공유합니다. 그래서 OKX 가
 *   우리 요청을 429(Too Many Requests)로 막는 일이 실제로 발생합니다.
 *   (배포 후 /api/okx/candles 를 20회 연속 호출했더니 7회가 429였음)
 *
 *   브라우저는 OKX 에 직접 WebSocket 으로 붙으므로 실시간 시세/호가에는 영향이
 *   없고, 서버가 REST 로 대신 조회하는 경로만 영향을 받습니다.
 *
 * 방어 3중:
 *   1) Cloudflare 엣지 캐시 (cf.cacheTtl)
 *      - 같은 코로(colo)의 모든 아이솔레이트가 공유하는 진짜 캐시.
 *      - 상류로 나가는 요청 자체를 크게 줄여 주는 핵심 장치입니다.
 *   2) 아이솔레이트 메모리 캐시
 *      - 엣지 캐시보다 앞단. 같은 아이솔레이트의 연속 요청을 즉시 처리합니다.
 *      - 동시 요청은 inflight 로 합쳐 상류 중복 호출을 막습니다.
 *   3) 재시도 + 스테일 폴백
 *      - 429/5xx 면 백오프 재시도, 그래도 안 되면 staleMs 안의 예전 값이라도 반환.
 *      - 화면이 비거나 포지션 청산이 실패하는 것보다 낫습니다.
 *
 * OKX 를 호출하는 코드는 반드시 이 모듈을 거치세요. 직접 $fetch 를 쓰면
 * 위 방어가 전부 우회되어 429 가 그대로 사용자에게 노출됩니다.
 */

const MAX_ENTRIES = 200
const RETRIES = 2

type CacheEntry = { value: any; ts: number }

const memory = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<any>>()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildUrl(url: string, query: Record<string, any>): string {
  const u = new URL(url)
  for (const key of Object.keys(query).sort()) {
    const v = query[key]
    if (v !== undefined && v !== null) u.searchParams.set(key, String(v))
  }
  return u.toString()
}

function remember(key: string, value: any) {
  if (memory.size >= MAX_ENTRIES) {
    const oldest = memory.keys().next().value
    if (oldest !== undefined) memory.delete(oldest)
  }
  memory.set(key, { value, ts: Date.now() })
}

export type OkxFetchOptions = {
  /** 이 시간 안에는 캐시를 그대로 재사용 (ms). 엣지 캐시 TTL 도 여기서 파생됩니다. */
  freshMs?: number
  /** 상류가 실패했을 때 여기까지는 오래된 값이라도 사용 (ms) */
  staleMs?: number
}

export async function okxFetch<T = any>(
  url: string,
  query: Record<string, any> = {},
  { freshMs = 1000, staleMs = 15000 }: OkxFetchOptions = {}
): Promise<T> {
  const target = buildUrl(url, query)
  const now = Date.now()
  const cached = memory.get(target)

  if (cached && now - cached.ts < freshMs) {
    return cached.value as T
  }

  const running = inflight.get(target)
  if (running) return (await running) as T

  // cf.cacheTtl 은 초 단위이고 최소 1초입니다.
  const cacheTtl = Math.max(1, Math.round(freshMs / 1000))

  const task = (async () => {
    let lastError: any = null

    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        const res = await fetch(target, {
          headers: { accept: 'application/json' },
          // @ts-expect-error - cf 는 Workers 런타임 전용 옵션입니다.
          cf: { cacheTtl, cacheEverything: true }
        })

        if (!res.ok) {
          lastError = new Error(`OKX ${res.status}`)
          ;(lastError as any).statusCode = res.status
          // 429/5xx 만 재시도할 가치가 있습니다.
          if (res.status !== 429 && res.status < 500) break
        } else {
          const json = (await res.json()) as T
          remember(target, json)
          return json
        }
      } catch (e: any) {
        lastError = e
      }

      if (attempt < RETRIES) {
        // 지터를 섞어 여러 아이솔레이트가 동시에 재시도하지 않게 합니다.
        await sleep(200 * (attempt + 1) + Math.floor(Math.random() * 120))
      }
    }

    const stale = memory.get(target)
    if (stale && Date.now() - stale.ts < staleMs) {
      console.warn('[okx] 상류 실패 - 캐시된 값으로 응답', target, lastError?.statusCode ?? '')
      return stale.value as T
    }

    console.warn('[okx] 상류 실패', target, lastError?.statusCode ?? '', lastError?.message ?? lastError)
    throw lastError ?? new Error('OKX 요청 실패')
  })()

  inflight.set(target, task)
  try {
    return (await task) as T
  } finally {
    inflight.delete(target)
  }
}
