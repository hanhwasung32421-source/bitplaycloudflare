/**
 * Supabase 앱DB 미러링 자리 — D1 전환으로 전부 비활성화되었습니다.
 *
 * `supabaseAppDbEnabled()` 가 항상 false 이므로, 호출부에 남아 있는
 *   if (supabaseAppDbEnabled()) { ...Supabase... }
 *   const db = getDb()   // <- 항상 이쪽으로 흐름
 * 패턴은 언제나 D1 경로를 탑니다.
 *
 * sync* 함수들은 D1 이 단일 진실 소스가 되면서 할 일이 없어졌습니다(no-op).
 * 호출부를 남겨 둔 이유는 43개 파일을 건드리지 않기 위해서입니다.
 *
 * 원본: server/legacy/supa-appdb.original.ts.bak
 */

/** 항상 false — D1 이 단일 진실 소스입니다. */
export function supabaseAppDbEnabled(): boolean {
  return false
}

export async function syncUserToSupabase(_row: any): Promise<void> {}
export async function syncBalanceToSupabase(_userId: number, _usdt: number): Promise<void> {}
export async function syncUserSettingsToSupabase(
  _userId: number,
  _percent: number,
  _leverage: number,
  _updatedAt: string,
  _chartPrefs?: any
): Promise<void> {}
export async function syncPositionToSupabase(_row: any): Promise<void> {}
export async function syncTradeToSupabase(_row: any): Promise<void> {}
export async function syncProfitCardToSupabase(_row: any): Promise<void> {}
export async function syncMessageToSupabase(_row: any): Promise<void> {}
export async function bootstrapSupabaseAppDb(_db?: any): Promise<void> {}
