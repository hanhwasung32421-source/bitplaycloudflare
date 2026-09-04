import { z } from 'zod'
import { requireAdmin, requireSuperAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncUserToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne } from '../../../utils/supabase'
import { canEditMenu } from '../../../utils/menu-permissions'
import { getRoleDefinition, canGrantRole } from '../../../utils/roles'

const BodySchema = z.object({
  userId: z.number().int().positive(),
  usdt: z.number().nonnegative().optional(),
  // 'user'/'super_admin' 외에는 역할 관리에서 만든 커스텀 관리자 역할 ID(예: branch_admin)
  role: z.string().trim().min(1).max(32).optional(),
  username: z.string().trim().min(3).max(20).optional(),
  // 이름/계좌정보는 아직 등록되지 않았을 수 있는 선택 항목이라 빈 값 저장을 허용한다.
  name: z.string().trim().max(40).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  bankName: z.string().trim().max(40).optional(),
  bankAccount: z.string().trim().max(80).optional(),
  accountHolder: z.string().trim().max(40).optional(),
  referralCode: z.string().trim().max(32).optional(),
  settlementType: z.enum(['loss', 'referral']).optional(),
  // null = 총관리자가 정산/기타 설정에서 지정한 기본 비율을 그대로 사용
  settlementPercent: z.number().min(0).max(100).nullable().optional()
})

function isAdminRole(role: string) {
  return role !== 'user' && role !== 'super_admin'
}

async function resolveRolePermissions(role: string): Promise<any> {
  if (role === 'super_admin') return { all: true, canCredit: true }
  if (role === 'user') return {}
  // 커스텀 관리자 역할: 존재하는 역할인지 확인(없으면 오타/삭제된 역할)
  const roleDef = await getRoleDefinition(role)
  if (!roleDef) {
    throw createError({ statusCode: 400, statusMessage: '존재하지 않는 역할입니다.' })
  }
  return { canViewUsers: true, canCredit: false }
}

export default defineEventHandler(async (event) => {
  try {
    return await handleUpdate(event)
  } catch (e: any) {
    // createError로 던진 에러(로그인/권한/검증 실패 등)는 이미 statusMessage가 있으므로 그대로 전달.
    // 그 외(예: DB/네트워크 예외)는 클라이언트에 "저장 실패"만 보이고 원인을 알 수 없게 되므로,
    // 서버 로그에 원인을 남기고 statusMessage에도 실제 메시지를 담아 내려준다.
    if (e && typeof e.statusCode === 'number') throw e
    console.error('[admin/users/update] unexpected error:', e)
    throw createError({ statusCode: 500, statusMessage: e?.message || '저장 중 알 수 없는 오류가 발생했습니다.' })
  }
})

async function handleUpdate(event: any) {
  const admin = await requireAdmin(event)
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' })
  }
  const body = parsed.data
  const useSupa = supabaseAppDbEnabled()

  // 최고관리자(super_admin) 계정은 사고 방지를 위해 이 화면에서 더 이상 수정할 수 없다 —
  // 단, 매수/매도 연습이 가능하도록 USDT 잔액만은 예외로 허용한다.
  // (다른 계정을 super_admin으로 "승격"하는 것은 계속 허용하되, 이미 super_admin인 계정은
  //  이후 잔액을 제외한 다른 필드는— 이름/역할/정산비율 등— 바꿀 수 없다.)
  const targetRole = useSupa
    ? String((await supaSelectOne<any>('trae_users', { id: body.userId }))?.role || '')
    : String((await getDb().prepare('SELECT role FROM users WHERE id = ?').get(body.userId) as { role?: string } | undefined)?.role || '')
  const isLockedSuperAdmin = targetRole === 'super_admin'
  function assertNotLockedSuperAdmin() {
    if (isLockedSuperAdmin) {
      throw createError({ statusCode: 403, statusMessage: '최고관리자 계정은 잔액 외에는 이 화면에서 수정할 수 없습니다.' })
    }
  }

  if (useSupa) {
    const supa = getSupabaseAdminClient()

    if (typeof body.username === 'string') {
      assertNotLockedSuperAdmin()
      // 아이디(로그인 계정명) 변경은 총관리자만, 중복 확인 필요
      await requireSuperAdmin(event)
      const { data: existing, error: eCheck } = await supa
        .from('trae_users')
        .select('id')
        .eq('username', body.username)
        .neq('id', body.userId)
        .limit(1)
      if (eCheck) throw eCheck
      if (existing && existing.length) {
        throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
      }
      const { error } = await supa
        .from('trae_users')
        .update({ username: body.username, updated_at: new Date().toISOString() })
        .eq('id', body.userId)
      if (error) throw error
    }

    if (typeof body.usdt === 'number') {
      if (!canEditMenu(admin, 'members')) {
        throw createError({ statusCode: 403, statusMessage: '보유금액 수정 권한이 없습니다.' })
      }
      const { error } = await supa.from('trae_balances').upsert({ user_id: body.userId, usdt: body.usdt }, { onConflict: 'user_id' })
      if (error) throw error
    }

    if (body.role) {
      // 역할이 실제로 바뀔 때만 권한(permissions)을 역할 기본값으로 초기화한다.
      // (그렇지 않으면 다른 필드만 저장할 때마다 매번 role이 같이 전송되어 기존에 설정해둔
      //  메뉴 권한/정산유형이 매 저장마다 지워져 버린다.)
      const current = await supaSelectOne<any>('trae_users', { id: body.userId })
      if (current && String(current.role) !== body.role) {
        assertNotLockedSuperAdmin()
        // 영업 조직 구조: 관리자 역할을 가진 계정은 "본인 코드로 가입한(직속)" 회원의 역할을
        // 자기보다 서열이 낮은 역할로만 부여/변경할 수 있다. 그 외(서열이 같거나 위, 또는
        // 직속이 아닌 경우)는 총관리자만 가능.
        const isDirectChild = String(current.referral_code || '').trim() === admin.username
        const allowedByRank = isDirectChild && (await canGrantRole(admin.role, body.role))
        if (!allowedByRank) {
          await requireSuperAdmin(event)
        }
        const permissions = await resolveRolePermissions(body.role)
        const { error } = await supa
          .from('trae_users')
          .update({ role: body.role, permissions })
          .eq('id', body.userId)
        if (error) throw error
      }
    }

    if (
      typeof body.name === 'string' ||
      typeof body.birthDate === 'string' ||
      typeof body.bankName === 'string' ||
      typeof body.bankAccount === 'string' ||
      typeof body.accountHolder === 'string'
    ) {
      assertNotLockedSuperAdmin()
      const patch: any = { updated_at: new Date().toISOString() }
      if (typeof body.name === 'string') patch.name = body.name.trim()
      if (typeof body.birthDate === 'string') patch.birth_date = body.birthDate
      if (typeof body.bankName === 'string') patch.bank_name = body.bankName.trim()
      if (typeof body.bankAccount === 'string') patch.bank_account = body.bankAccount.trim()
      if (typeof body.accountHolder === 'string') patch.account_holder = body.accountHolder.trim()
      const { error } = await supa.from('trae_users').update(patch).eq('id', body.userId)
      if (error) throw error
    }

    if (typeof body.referralCode === 'string') {
      assertNotLockedSuperAdmin()
      // 추천코드 수정은 총관리자만
      await requireSuperAdmin(event)
      const { error } = await supa
        .from('trae_users')
        .update({ referral_code: body.referralCode.trim(), updated_at: new Date().toISOString() })
        .eq('id', body.userId)
      if (error) throw error
    }

    if (typeof body.settlementType === 'string') {
      assertNotLockedSuperAdmin()
      // 정산유형(손실정산/레퍼럴정산) 지정은 총관리자만. 부관리자 1명당 하나만 배정된다.
      await requireSuperAdmin(event)
      const current = await supaSelectOne<any>('trae_users', { id: body.userId })
      const { settlementTypes: _drop, ...prevRest } = current?.permissions || {}
      const permissions = { ...prevRest, settlementType: body.settlementType }
      const { error } = await supa
        .from('trae_users')
        .update({ permissions, updated_at: new Date().toISOString() })
        .eq('id', body.userId)
      if (error) throw error
    }

    if (body.settlementPercent !== undefined) {
      assertNotLockedSuperAdmin()
      // 정산 비율 지정: 총관리자는 누구든, 관리자 역할 계정은 자기 직속 하부(본인 코드로 가입한 관리자)만 가능.
      const current = await supaSelectOne<any>('trae_users', { id: body.userId })
      const isDirectChild = isAdminRole(admin.role) && String(current?.referral_code || '').trim() === admin.username
      if (!isDirectChild) {
        await requireSuperAdmin(event)
      }
      const permissions = { ...(current?.permissions || {}), settlementPercent: body.settlementPercent }
      const { error } = await supa
        .from('trae_users')
        .update({ permissions, updated_at: new Date().toISOString() })
        .eq('id', body.userId)
      if (error) throw error
    }

    return { ok: true }
  }

  const db = getDb()

  if (typeof body.username === 'string') {
    assertNotLockedSuperAdmin()
    // 아이디(로그인 계정명) 변경은 총관리자만, 중복 확인 필요
    await requireSuperAdmin(event)
    const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(body.username, body.userId) as
      | { id: number }
      | undefined
    if (existing?.id) {
      throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
    }
    await db.prepare('UPDATE users SET username = ?, updated_at = ? WHERE id = ?').run(body.username, new Date().toISOString(), body.userId)
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  if (typeof body.usdt === 'number') {
    if (!canEditMenu(admin, 'members')) {
      throw createError({ statusCode: 403, statusMessage: '보유금액 수정 권한이 없습니다.' })
    }
    await db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(body.userId, 0)
    await db.prepare('UPDATE balances SET usdt = ? WHERE user_id = ?').run(body.usdt, body.userId)

    await syncBalanceToSupabase(body.userId, body.usdt)
  }

  if (body.role) {
    // 역할이 실제로 바뀔 때만 권한(permissions)을 역할 기본값으로 초기화한다(위 Supabase 분기와 동일한 이유).
    const current = await db.prepare('SELECT role, referral_code FROM users WHERE id = ?').get(body.userId) as
      | { role?: string; referral_code?: string }
      | undefined
    if (current && String(current.role) !== body.role) {
      assertNotLockedSuperAdmin()
      // 영업 조직 구조: 관리자 역할을 가진 계정은 "본인 코드로 가입한(직속)" 회원의 역할을
      // 자기보다 서열이 낮은 역할로만 부여/변경할 수 있다. 그 외는 총관리자만 가능.
      const isDirectChild = String(current.referral_code || '').trim() === admin.username
      const allowedByRank = isDirectChild && (await canGrantRole(admin.role, body.role))
      if (!allowedByRank) {
        await requireSuperAdmin(event)
      }
      const permissions = JSON.stringify(await resolveRolePermissions(body.role))

      await db.prepare('UPDATE users SET role = ?, permissions = ? WHERE id = ?').run(body.role, permissions, body.userId)

      const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
      await syncUserToSupabase(userRow)
    }
  }

  if (
    typeof body.name === 'string' ||
    typeof body.birthDate === 'string' ||
    typeof body.bankName === 'string' ||
    typeof body.bankAccount === 'string' ||
    typeof body.accountHolder === 'string'
  ) {
    assertNotLockedSuperAdmin()
    await db.prepare(
      `UPDATE users
       SET name = COALESCE(?, name),
           birth_date = COALESCE(?, birth_date),
           bank_name = COALESCE(?, bank_name),
           bank_account = COALESCE(?, bank_account),
           account_holder = COALESCE(?, account_holder),
           updated_at = ?
       WHERE id = ?`
    ).run(
      typeof body.name === 'string' ? body.name.trim() : null,
      typeof body.birthDate === 'string' ? body.birthDate : null,
      typeof body.bankName === 'string' ? body.bankName.trim() : null,
      typeof body.bankAccount === 'string' ? body.bankAccount.trim() : null,
      typeof body.accountHolder === 'string' ? body.accountHolder.trim() : null,
      new Date().toISOString(),
      body.userId
    )
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  if (typeof body.referralCode === 'string') {
    assertNotLockedSuperAdmin()
    // 추천코드 수정은 총관리자만
    await requireSuperAdmin(event)
    await db.prepare('UPDATE users SET referral_code = ?, updated_at = ? WHERE id = ?').run(
      body.referralCode.trim(),
      new Date().toISOString(),
      body.userId
    )
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  if (typeof body.settlementType === 'string') {
    assertNotLockedSuperAdmin()
    // 정산유형(손실정산/레퍼럴정산) 지정은 총관리자만. 부관리자 1명당 하나만 배정된다.
    await requireSuperAdmin(event)
    const row = await db.prepare('SELECT permissions FROM users WHERE id = ?').get(body.userId) as { permissions?: string } | undefined
    let prevPermissions: any = {}
    try {
      prevPermissions = JSON.parse(row?.permissions || '{}')
    } catch {
      prevPermissions = {}
    }
    delete prevPermissions.settlementTypes
    const permissions = { ...prevPermissions, settlementType: body.settlementType }
    await db.prepare('UPDATE users SET permissions = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(permissions), new Date().toISOString(), body.userId)
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  if (body.settlementPercent !== undefined) {
    assertNotLockedSuperAdmin()
    // 정산 비율 지정: 총관리자는 누구든, 관리자 역할 계정은 자기 직속 하부(본인 코드로 가입한 관리자)만 가능.
    const targetRow = await db.prepare('SELECT referral_code FROM users WHERE id = ?').get(body.userId) as { referral_code?: string } | undefined
    const isDirectChild = isAdminRole(admin.role) && String(targetRow?.referral_code || '').trim() === admin.username
    if (!isDirectChild) {
      await requireSuperAdmin(event)
    }
    const row = await db.prepare('SELECT permissions FROM users WHERE id = ?').get(body.userId) as { permissions?: string } | undefined
    let prevPermissions: any = {}
    try {
      prevPermissions = JSON.parse(row?.permissions || '{}')
    } catch {
      prevPermissions = {}
    }
    const permissions = { ...prevPermissions, settlementPercent: body.settlementPercent }
    await db.prepare('UPDATE users SET permissions = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(permissions), new Date().toISOString(), body.userId)
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  return { ok: true }
}
