import { z } from 'zod'
import { requireSuperAdmin, hashPassword } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { supaSelectOne, supaUpsertStrict, supaUpsertUserSettings } from '../../../utils/supabase'
import { getRoleDefinition, listRoles } from '../../../utils/roles'

const BodySchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(4).max(50),
  role: z.string().trim().min(1).max(32).optional(),
  permissions: z
    .object({
      canCredit: z.boolean().optional(),
      canViewUsers: z.boolean().optional()
    })
    .optional()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  let role = body.role
  if (!role) {
    const roles = await listRoles()
    role = roles[0]?.id
    if (!role) {
      throw createError({ statusCode: 400, statusMessage: '등록된 관리자 역할이 없습니다. 역할 관리에서 먼저 역할을 만들어주세요.' })
    }
  } else if (!(await getRoleDefinition(role))) {
    throw createError({ statusCode: 400, statusMessage: '존재하지 않는 역할입니다.' })
  }

  if (useSupa) {
    const exists = await supaSelectOne<any>('trae_users', { username: body.username })
    if (exists?.id) {
      throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
    }

    const userId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const now = new Date().toISOString()
    await supaUpsertStrict(
      'trae_users',
      {
        id: userId,
        username: body.username,
        password_hash: hashPassword(body.password),
        role,
        permissions: body.permissions || { canViewUsers: true, canCredit: false },
        created_at: now
      },
      'id'
    )

    await supaUpsertStrict('trae_balances', { user_id: userId, usdt: 0 }, 'user_id')
    await supaUpsertUserSettings({
      user_id: userId,
      trade_percent: 50,
      trade_leverage: 100,
      chart_prefs: {},
      updated_at: now
    })

    return { ok: true }
  }

  const db = getDb()

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(body.username) as
    | { id: number }
    | undefined
  if (exists?.id) {
    throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
  }

  db.prepare(
    'INSERT INTO users (username, password_hash, role, permissions, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(
    body.username,
    hashPassword(body.password),
    role,
    JSON.stringify(body.permissions || { canViewUsers: true, canCredit: false }),
    new Date().toISOString()
  )

  const u = db.prepare('SELECT id FROM users WHERE username = ?').get(body.username) as { id: number }
  db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(u.id, 0)

  return { ok: true }
})
