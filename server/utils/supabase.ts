/**
 * Supabase 클라이언트 자리 — D1 전환으로 전부 비활성화되었습니다.
 *
 * `@supabase/supabase-js` 를 더 이상 import 하지 않으므로 번들에서도 빠집니다.
 * 여기 함수들은 호출부의 import 를 깨지 않기 위한 no-op 이며,
 * supabaseAppDbEnabled() 가 false 라서 실제로 호출되지 않습니다.
 *
 * 원본: server/legacy/supabase.original.ts.bak
 */

const DISABLED = '[supabase] D1 로 이전되어 비활성화된 경로입니다.'

export function isMissingColumnError(_error: any, _column: string): boolean {
  return false
}

export function isMissingTableError(_error: any): boolean {
  return false
}

export function getSupabaseAdminClient(): any {
  throw new Error(DISABLED)
}

export async function supaInsert(_table: string, _payload: any): Promise<void> {}
export async function supaInsertStrict(_table: string, _payload: any): Promise<void> {}
export async function supaUpsert(_table: string, _payload: any, _onConflict: string): Promise<void> {}
export async function supaUpsertStrict(_table: string, _payload: any, _onConflict: string): Promise<void> {}
export async function supaUpsertUserSettings(_payload: any): Promise<void> {}
export async function ensureAdminExists(..._args: any[]): Promise<void> {}
export async function supaDelete(..._args: any[]): Promise<void> {}
export async function supaCount<T = any>(..._args: any[]): Promise<number> {
  return 0
}
export async function supaSelectAll<T = any>(..._args: any[]): Promise<any[]> {
  return []
}
export async function supaSelectWhere<T = any>(..._args: any[]): Promise<any[]> {
  return []
}
export async function supaSelectOne<T = any>(..._args: any[]): Promise<any> {
  return null
}
export async function supaUpdate(..._args: any[]): Promise<void> {}
export async function supaSelectIn<T = any>(..._args: any[]): Promise<any[]> {
  return []
}
