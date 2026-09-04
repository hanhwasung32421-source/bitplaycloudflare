/**
 * 과거 Supabase 로깅(app_users / app_login_events) 자리.
 *
 * D1 로 옮기면서 해당 테이블은 만들지 않았습니다. 호출부를 건드리지 않으려고
 * 시그니처만 유지한 no-op 입니다. 로그가 필요해지면 여기 구현만 채우면 되고,
 * 호출부 5개 파일은 그대로 두면 됩니다.
 *
 * 원본: server/legacy/supa-log.original.ts.bak
 */
import type { H3Event } from 'h3'

export async function logAppUser(_user: { id: number; username: string; role: string }): Promise<void> {}

export async function logLogin(
  _event: H3Event,
  _payload: { userId?: number | null; username?: string | null; area: 'main' | 'admin'; success: boolean }
): Promise<void> {}

export async function logBuy(..._args: any[]): Promise<void> {}

export async function logAdminCredit(..._args: any[]): Promise<void> {}
