import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getCookie, setCookie, deleteCookie, getHeader, H3Event } from 'h3'
import { getDb, isoPlusDays } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, supaSelectOne, supaInsertStrict } from './supabase'
import { getRoleDefinition } from './roles'

const COOKIE_NAME = 'session_token'
// "다른 계정으로 로그인" 새 창 전용 헤더. sessionStorage는 탭마다 독립적이므로,
// 이 헤더가 실려오면(=탭이 스스로 sessionStorage에서 읽어 붙인 것) 쿠키(관리자 세션)
// 대신 이 토큰으로 세션을 조회한다 — 관리자 탭의 쿠키는 전혀 건드리지 않는다.
const IMPERSONATE_HEADER = 'x-impersonate-token'

// 'user'/'super_admin' 외의 값은 총관리자가 직접 만든 커스텀 관리자 역할(예: branch_admin,
// team_lead 등)이다. 고정된 enum이 아니라 server/utils/roles.ts에 저장된 동적 목록이다.
export type Role = string

// 이 역할의 메뉴 권한(permissions.menus)을 role 정의(role definition)에서 가져와 덮어쓴다 —
// 계정마다가 아니라 "역할별"로 관리자 메뉴 권한을 설정한다는 요구사항을 반영한 것.
async function applyRoleMenuPermissions(role: string, permissions: Record<string, any>): Promise<Record<string, any>> {
  if (role === 'user' || role === 'super_admin') return permissions
  const roleDef = await getRoleDefinition(role)
  if (!roleDef) return permissions
  return { ...permissions, menus: roleDef.menus }
}

export type SessionUser = {
  id: number
  username: string
  name?: string
  birth_date?: string
  bank_name?: string
  bank_account?: string
  account_holder?: string
  referral_code?: string
  password_reset_required?: boolean
  password_reset_notice_dismissed_at?: string | null
  role: Role
  permissions: Record<string, any>
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash)
}

// 세션 행만 만들고 토큰/만료시각을 돌려준다(쿠키는 건드리지 않음) — "다른 계정으로 로그인"
// 새 창에서 쓰기 위한 것으로, 현재 요청의 쿠키 기반 세션(관리자)에는 영향이 없다.
export async function createSessionToken(userId: number, days = 7): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(24).toString('hex')
  const createdAt = new Date().toISOString()
  const expiresAt = isoPlusDays(days)
  if (supabaseAppDbEnabled()) {
    await supaInsertStrict('trae_sessions', {
      token,
      user_id: userId,
      created_at: createdAt,
      expires_at: expiresAt
    })
  } else {
    const db = getDb()
    await db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, createdAt, expiresAt)
  }
  return { token, expiresAt }
}

// remember=true(아이디 저장/로그인 상태 유지 체크)면 쿠키에 만료일을 길게(1년) 박아서
// 브라우저를 껐다 켜도 로그아웃 전까지 유지되고, 아니면 브라우저 세션 쿠키(껐다 켜면 사라짐)로 발급한다.
export async function createSession(event: H3Event, userId: number, remember = false) {
  const { token, expiresAt } = await createSessionToken(userId, remember ? 365 : 7)

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(remember ? { expires: new Date(expiresAt) } : {})
  })
}

export async function clearAuthSession(event: H3Event) {
  const impersonateToken = getHeader(event, IMPERSONATE_HEADER)
  const token = impersonateToken || getCookie(event, COOKIE_NAME)
  if (token) {
    if (supabaseAppDbEnabled()) {
      try {
        const supa = getSupabaseAdminClient()
        await supa.from('trae_sessions').delete().eq('token', token)
      } catch {
        // ignore
      }
    } else {
      const db = getDb()
      await db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    }
  }
  // 임퍼스네이션 헤더로 들어온 로그아웃이면 관리자 탭의 쿠키(=관리자 세션)는 절대 건드리지 않는다.
  if (!impersonateToken) {
    deleteCookie(event, COOKIE_NAME, { path: '/' })
  }
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getHeader(event, IMPERSONATE_HEADER) || getCookie(event, COOKIE_NAME)
  if (!token) return null

  if (supabaseAppDbEnabled()) {
    try {
      const now = new Date().toISOString()
      const session = await supaSelectOne<any>('trae_sessions', { token })
      if (!session) return null
      if (session.expires_at && String(session.expires_at) <= now) return null
      const user = await supaSelectOne<any>('trae_users', { id: Number(session.user_id) })
      if (!user) return null
      const role = String(user.role) as Role
      return {
        id: Number(user.id),
        username: String(user.username),
        name: String(user.name || ''),
        birth_date: String(user.birth_date || ''),
        bank_name: String(user.bank_name || ''),
        bank_account: String(user.bank_account || ''),
        account_holder: String(user.account_holder || ''),
        referral_code: String(user.referral_code || ''),
        password_reset_required: Boolean(user.password_reset_required),
        password_reset_notice_dismissed_at: user.password_reset_notice_dismissed_at ? String(user.password_reset_notice_dismissed_at) : null,
        role,
        permissions: await applyRoleMenuPermissions(role, user.permissions || {})
      }
    } catch (e) {
      console.error('[auth] getSessionUser supabase failed:', (e as any)?.message || e)
      return null
    }
  }

  const db = getDb()
  const row = await db
    .prepare(
      `
      SELECT u.id, u.username, u.name, u.birth_date, u.bank_name, u.bank_account, u.account_holder, u.referral_code, u.password_reset_required, u.password_reset_notice_dismissed_at, u.role, u.permissions
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
      `
    )
    .get(token) as { id: number; username: string; name: string; birth_date: string; bank_name: string; bank_account: string; account_holder: string; referral_code: string; password_reset_required: number; password_reset_notice_dismissed_at: string | null; role: Role; permissions: string } | undefined

  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    name: (row as any).name || '',
    birth_date: (row as any).birth_date || '',
    bank_name: (row as any).bank_name || '',
    bank_account: (row as any).bank_account || '',
    account_holder: (row as any).account_holder || '',
    referral_code: (row as any).referral_code || '',
    password_reset_required: Boolean((row as any).password_reset_required),
    password_reset_notice_dismissed_at: (row as any).password_reset_notice_dismissed_at || null,
    role: row.role,
    permissions: await applyRoleMenuPermissions(row.role, JSON.parse(row.permissions || '{}'))
  }
}

export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }
  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  // 'user' 외의 모든 역할(총관리자 + 커스텀 관리자 역할 전부)은 관리자로 취급한다.
  if (user.role === 'user') {
    throw createError({ statusCode: 403, statusMessage: '관리자 권한이 필요합니다.' })
  }
  return user
}

export async function requireSuperAdmin(event: H3Event) {
  const user = await requireAdmin(event)
  if (user.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: '총관리자 권한이 필요합니다.' })
  }
  return user
}
