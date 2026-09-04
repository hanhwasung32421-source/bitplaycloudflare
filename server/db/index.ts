/**
 * DB 계층 공개 API.
 *
 * 서버 코드는 이 모듈(또는 하위 호환용 `server/utils/db.ts`)만 import 하세요.
 * D1 바인딩·바인드 파라미터 정규화 같은 내부 구현은 밖으로 새지 않습니다.
 */
export { getDb, isoPlusDays } from './client'
export type { Db } from './client'
export type { RunResult } from './statement'
export { getBindings, getD1, getSessionKv } from './binding'
export type { Bindings } from './binding'
