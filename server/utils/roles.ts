import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, supaInsertStrict } from './supabase'
import { defaultMenuPermissions, normalizeMenuPermissions, type MenuPermissions } from './menu-permissions'

const T_ADMIN_ROLES = 'trae_admin_roles'

// 시스템에 고정된 역할(계정 생성/수정 UI에서 항상 존재) — 역할 관리에서 추가/삭제 대상이 아니다.
export const RESERVED_ROLE_IDS = new Set(['user', 'super_admin'])
const DEFAULT_ROLE_ID = 'branch_admin'
const DEFAULT_ROLE_LABEL = '부어드민'

export type RoleDefinition = {
  id: string
  label: string
  menus: MenuPermissions
  sortOrder: number
  // 실제 권한 서열(등급). sortOrder(화면 표시 순서)와 달리 여러 역할이 같은 tier를 가질 수 있다 —
  // 같은 등급끼리는 서로 역할을 부여할 수 없고, tier가 자기보다 더 큰(아래) 역할만 부여할 수 있다.
  tier: number
  createdAt: string
}

function rowToRole(row: any): RoleDefinition {
  let menus: any = row.menus
  if (typeof menus === 'string') {
    try {
      menus = JSON.parse(menus)
    } catch {
      menus = {}
    }
  }
  return {
    id: String(row.id),
    label: String(row.label || row.id),
    menus: normalizeMenuPermissions(menus),
    sortOrder: Number(row.sort_order ?? 0),
    tier: Number(row.tier ?? row.sort_order ?? 0),
    createdAt: String(row.created_at || '')
  }
}

async function fetchAllRoles(): Promise<RoleDefinition[]> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from(T_ADMIN_ROLES).select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(rowToRole)
  }
  const db = getDb()
  const rows = await db.prepare('SELECT * FROM admin_roles ORDER BY sort_order ASC, created_at ASC').all() as any[]
  return rows.map(rowToRole)
}

// 기존에 이미 branch_admin 역할로 활동 중인 계정들이 계속 정상 동작하도록,
// 역할 테이블이 비어있으면(최초 실행) 기본 역할을 하나 만들어 둔다.
async function seedDefaultIfEmpty(roles: RoleDefinition[]): Promise<RoleDefinition[]> {
  if (roles.length > 0) return roles
  const now = new Date().toISOString()
  const menus = defaultMenuPermissions()
  try {
    if (supabaseAppDbEnabled()) {
      await supaInsertStrict(T_ADMIN_ROLES, { id: DEFAULT_ROLE_ID, label: DEFAULT_ROLE_LABEL, menus, sort_order: 0, tier: 0, created_at: now })
    } else {
      const db = getDb()
      await db.prepare('INSERT OR IGNORE INTO admin_roles (id, label, menus, sort_order, tier, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        DEFAULT_ROLE_ID,
        DEFAULT_ROLE_LABEL,
        JSON.stringify(menus),
        0,
        0,
        now
      )
    }
  } catch {
    // 동시 요청 등으로 이미 생성됐을 수 있음 - 무시
  }
  return fetchAllRoles()
}

let cache: { at: number; roles: RoleDefinition[] } | null = null
const CACHE_MS = 5000

function invalidateCache() {
  cache = null
}

// 목록 순서 = 조직 서열(위에 있을수록 상위 역할). 총관리자는 이 목록 밖에서 항상 최상위.
export async function listRoles(forceRefresh = false): Promise<RoleDefinition[]> {
  if (!forceRefresh && cache && Date.now() - cache.at < CACHE_MS) return cache.roles
  let roles = await fetchAllRoles()
  roles = await seedDefaultIfEmpty(roles)
  cache = { at: Date.now(), roles }
  return roles
}

export async function getRoleDefinition(id: string, forceRefresh = false): Promise<RoleDefinition | null> {
  const roles = await listRoles(forceRefresh)
  return roles.find((r) => r.id === id) || null
}

// 서열 순위(= tier/등급). 낮을수록 상위. super_admin은 항상 -1(모두의 위), user는 항상 +Infinity(모두의 아래).
// 같은 tier를 가진 역할끼리는 서로 부여할 수 없다(canGrantRole이 "더 큰"만 허용하므로 동률은 자동으로 제외됨).
export async function getRoleRank(roleId: string): Promise<number> {
  if (roleId === 'super_admin') return -1
  if (roleId === 'user') return Number.POSITIVE_INFINITY
  const roles = await listRoles()
  const role = roles.find((r) => r.id === roleId)
  return role ? role.tier : Number.POSITIVE_INFINITY
}

// actorRole 계정이 targetRole을 부여(코드부여/역할변경)할 수 있는지: 총관리자는 항상 가능,
// 그 외에는 자기보다 등급(tier)이 더 큰(더 아래) 역할만 부여할 수 있다. 같은 등급은 부여 불가.
export async function canGrantRole(actorRole: string, targetRole: string): Promise<boolean> {
  if (actorRole === 'super_admin') return true
  const [actorRank, targetRank] = await Promise.all([getRoleRank(actorRole), getRoleRank(targetRole)])
  return targetRank > actorRank
}

// 이 역할(actorRole)이 부여할 수 있는 하위 역할 전체 목록(등급이 자기보다 큰 것만, 같은 등급은 제외).
export async function grantableRolesFor(actorRole: string): Promise<RoleDefinition[]> {
  const roles = await listRoles()
  if (actorRole === 'super_admin') return roles
  const actorRank = await getRoleRank(actorRole)
  return roles.filter((r) => r.tier > actorRank)
}

async function countUsersWithRole(id: string): Promise<number> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { count, error } = await supa.from('trae_users').select('*', { count: 'exact', head: true }).eq('role', id)
    if (error) throw error
    return count ?? 0
  }
  const db = getDb()
  const row = await db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get(id) as { c: number } | undefined
  return Number(row?.c || 0)
}

export async function createRole(id: string, label: string): Promise<RoleDefinition> {
  const cleanId = id.trim().toLowerCase()
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(cleanId)) {
    throw createError({ statusCode: 400, statusMessage: '역할 ID는 영문 소문자로 시작하는 영문 소문자/숫자/밑줄 2~31자여야 합니다.' })
  }
  if (RESERVED_ROLE_IDS.has(cleanId)) {
    throw createError({ statusCode: 409, statusMessage: '이미 시스템에서 사용 중인 이름입니다.' })
  }
  const existingRoles = await listRoles(true)
  if (existingRoles.some((r) => r.id === cleanId)) {
    throw createError({ statusCode: 409, statusMessage: '이미 존재하는 역할입니다.' })
  }
  const now = new Date().toISOString()
  const menus = defaultMenuPermissions()
  const cleanLabel = label.trim() || cleanId
  // 새 역할은 서열 맨 아래(가장 낮은 우선순위/등급)에 추가한다. 필요하면 화살표로 표시 순서를,
  // 등급 입력으로 실제 권한 서열을 바꾸면 된다.
  const sortOrder = existingRoles.length ? Math.max(...existingRoles.map((r) => r.sortOrder)) + 1 : 0
  const tier = existingRoles.length ? Math.max(...existingRoles.map((r) => r.tier)) + 1 : 0
  if (supabaseAppDbEnabled()) {
    await supaInsertStrict(T_ADMIN_ROLES, { id: cleanId, label: cleanLabel, menus, sort_order: sortOrder, tier, created_at: now })
  } else {
    const db = getDb()
    await db.prepare('INSERT INTO admin_roles (id, label, menus, sort_order, tier, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      cleanId,
      cleanLabel,
      JSON.stringify(menus),
      sortOrder,
      tier,
      now
    )
  }
  invalidateCache()
  return { id: cleanId, label: cleanLabel, menus, sortOrder, tier, createdAt: now }
}

export async function updateRole(id: string, patch: { label?: string; menus?: any; tier?: number }): Promise<RoleDefinition> {
  const current = await getRoleDefinition(id, true)
  if (!current) throw createError({ statusCode: 404, statusMessage: '역할을 찾을 수 없습니다.' })
  const next: RoleDefinition = {
    ...current,
    label: typeof patch.label === 'string' ? patch.label.trim() || current.label : current.label,
    menus: patch.menus ? normalizeMenuPermissions(patch.menus) : current.menus,
    tier: typeof patch.tier === 'number' && Number.isFinite(patch.tier) ? Math.trunc(patch.tier) : current.tier
  }
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(T_ADMIN_ROLES).update({ label: next.label, menus: next.menus, tier: next.tier }).eq('id', id)
    if (error) throw error
  } else {
    const db = getDb()
    await db.prepare('UPDATE admin_roles SET label = ?, menus = ?, tier = ? WHERE id = ?').run(next.label, JSON.stringify(next.menus), next.tier, id)
  }
  invalidateCache()
  return next
}

// 역할 관리 화면에서 화살표로 순서(서열)를 바꿀 때 쓴다. orderedIds는 위에서부터(최상위부터) 순서대로.
export async function reorderRoles(orderedIds: string[]): Promise<RoleDefinition[]> {
  const current = await listRoles(true)
  const currentIds = new Set(current.map((r) => r.id))
  const cleanOrder = orderedIds.filter((id) => currentIds.has(id))
  // 빠진 게 있으면(클라이언트가 오래된 목록을 보냈을 수 있음) 끝에 붙여서 유실 방지
  for (const r of current) {
    if (!cleanOrder.includes(r.id)) cleanOrder.push(r.id)
  }

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    for (let idx = 0; idx < cleanOrder.length; idx++) {
      const { error } = await supa.from(T_ADMIN_ROLES).update({ sort_order: idx }).eq('id', cleanOrder[idx])
      if (error) throw error
    }
  } else {
    const db = getDb()
    const stmt = db.prepare('UPDATE admin_roles SET sort_order = ? WHERE id = ?')
    // D1 은 비동기라 forEach 로는 완료를 기다릴 수 없어 순차 루프로 처리합니다.
    for (const [idx, id] of cleanOrder.entries()) {
      await stmt.run(idx, id)
    }
  }
  invalidateCache()
  return listRoles(true)
}

export async function deleteRole(id: string): Promise<void> {
  if (RESERVED_ROLE_IDS.has(id)) {
    throw createError({ statusCode: 400, statusMessage: '기본 역할은 삭제할 수 없습니다.' })
  }
  const count = await countUsersWithRole(id)
  if (count > 0) {
    throw createError({ statusCode: 409, statusMessage: `이 역할을 사용 중인 계정이 ${count}명 있어 삭제할 수 없습니다. 먼저 해당 계정들의 역할을 바꿔주세요.` })
  }
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(T_ADMIN_ROLES).delete().eq('id', id)
    if (error) throw error
  } else {
    const db = getDb()
    await db.prepare('DELETE FROM admin_roles WHERE id = ?').run(id)
  }
  invalidateCache()
}
