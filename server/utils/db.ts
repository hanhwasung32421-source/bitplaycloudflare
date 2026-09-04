/**
 * 하위 호환 파사드.
 *
 * 기존 코드 43개 파일이 `~/server/utils/db` 에서 getDb 를 가져오고 있어,
 * import 경로를 바꾸지 않으려고 남겨 둔 재수출 전용 모듈입니다.
 * 새 코드는 `server/db` 를 직접 import 하세요.
 *
 * 실제 구현: server/db/
 *   binding.ts   - Cloudflare 바인딩 접근
 *   statement.ts - D1 문(statement) 어댑터
 *   client.ts    - getDb()
 */
export { getDb, isoPlusDays, getBindings, getD1, getSessionKv } from '../db'
export type { Db, RunResult, Bindings } from '../db'
