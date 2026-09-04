/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Workers 바인딩 접근 계층.
 *
 * Nitro 의 cloudflare-module 프리셋은 모든 fetch/scheduled 진입점에서
 * `globalThis.__env__ = env` 를 설정합니다.
 * (node_modules/nitropack/dist/presets/cloudflare/runtime/_module-handler.mjs)
 *
 * 덕분에 H3Event 를 넘겨받지 않는 유틸 함수에서도 바인딩을 읽을 수 있어,
 * 기존 `getDb()` 시그니처를 그대로 유지할 수 있습니다.
 *
 * 이 파일만이 `globalThis.__env__` 를 직접 참조합니다.
 * 다른 곳에서 전역을 건드리지 마세요 — 바인딩 접근 방식이 바뀌면 여기만 고치면 됩니다.
 */

/** wrangler.jsonc 에 선언된 바인딩 목록과 1:1 로 대응합니다. */
export type Bindings = {
  /** D1 데이터베이스 (wrangler.jsonc: d1_databases[].binding = "DB") */
  DB: D1Database
  /** 세션용 KV (wrangler.jsonc: kv_namespaces[].binding = "SESSIONS") */
  SESSIONS?: KVNamespace
  /** 정적 자산 (Nitro 가 자동 주입) */
  ASSETS?: Fetcher
}

export function getBindings(): Bindings {
  const env = (globalThis as any).__env__ as Bindings | undefined
  if (!env) {
    throw new Error(
      '[db] Cloudflare 바인딩을 찾을 수 없습니다. Workers 런타임 밖에서 호출되었는지 확인하세요.'
    )
  }
  return env
}

export function getD1(): D1Database {
  const { DB } = getBindings()
  if (!DB) {
    throw new Error(
      '[db] D1 바인딩(DB)이 없습니다. wrangler.jsonc 의 d1_databases 설정을 확인하세요.'
    )
  }
  return DB
}

/** 세션 KV. 바인딩이 없으면 null — 호출부가 D1 폴백을 쓸 수 있게 던지지 않습니다. */
export function getSessionKv(): KVNamespace | null {
  return getBindings().SESSIONS ?? null
}
