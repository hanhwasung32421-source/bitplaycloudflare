import { getD1 } from './binding'
import { D1StatementAdapter } from './statement'

/**
 * 앱 전역에서 쓰는 DB 핸들.
 *
 * `getDb()` 는 동기 함수 그대로입니다 — 매 호출마다 바인딩을 조회할 뿐이라
 * 기존 `const db = getDb()` 코드가 수정 없이 동작합니다.
 * 실제 쿼리(get/all/run)만 비동기입니다.
 *
 * 스키마 생성/시드는 더 이상 여기서 하지 않습니다.
 * migrations/0001_init.sql, migrations/0002_seed.sql 로 분리되어 있습니다.
 */
export type Db = {
  prepare(sql: string): D1StatementAdapter
  exec(sql: string): Promise<void>
}

export function getDb(): Db {
  const d1 = getD1()
  return {
    prepare: (sql: string) => new D1StatementAdapter(d1, sql),
    exec: async (sql: string) => {
      await d1.exec(sql)
    }
  }
}

/** 지금부터 `days` 일 뒤의 ISO 시각 (세션 만료 계산용) */
export function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString()
}
