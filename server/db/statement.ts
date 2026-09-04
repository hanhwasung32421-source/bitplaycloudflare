/**
 * D1 을 기존 `node:sqlite` 호출 형태로 감싸는 얇은 어댑터.
 *
 * 목적: 앱 전역에 퍼져 있는 호출부(245곳)를 그대로 두고 `await` 만 붙여
 *       D1 으로 넘어가기 위한 것입니다.
 *
 *   기존:  db.prepare(sql).get(a, b)
 *   현재:  await db.prepare(sql).get(a, b)
 *
 * 반환 형태도 node:sqlite 와 맞춰 둡니다.
 *   get() -> 행 객체 또는 undefined
 *   all() -> 행 배열
 *   run() -> { changes, lastInsertRowid }
 */

/**
 * D1 은 undefined / boolean / bigint 를 바인딩 값으로 받지 않습니다.
 * node:sqlite 는 받아주던 값들이라 여기서 흡수합니다.
 */
function normalizeParam(value: unknown): unknown {
  if (value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'bigint') return Number(value)
  return value
}

export type RunResult = {
  changes: number
  lastInsertRowid: number
}

export class D1StatementAdapter {
  constructor(
    private readonly db: D1Database,
    private readonly sql: string
  ) {}

  private bind(params: unknown[]): D1PreparedStatement {
    const stmt = this.db.prepare(this.sql)
    if (params.length === 0) return stmt
    return stmt.bind(...params.map(normalizeParam))
  }

  /** 단일 행. 없으면 undefined (node:sqlite 와 동일, D1 의 null 이 아님) */
  async get<T = any>(...params: unknown[]): Promise<T | undefined> {
    const row = await this.bind(params).first<T>()
    return row ?? undefined
  }

  /** 행 배열. 없으면 빈 배열 */
  async all<T = any>(...params: unknown[]): Promise<T[]> {
    const { results } = await this.bind(params).all<T>()
    return results ?? []
  }

  /** INSERT/UPDATE/DELETE 실행 */
  async run(...params: unknown[]): Promise<RunResult> {
    const { meta } = await this.bind(params).run()
    return {
      changes: Number(meta?.changes ?? 0),
      lastInsertRowid: Number(meta?.last_row_id ?? 0)
    }
  }
}
