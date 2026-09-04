import { z } from 'zod'
import { getDb } from '../../utils/db'
import { createSession, verifyPassword } from '../../utils/auth'
import { logLogin } from '../../utils/supa-log'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { ensureAdminExists, supaSelectOne } from '../../utils/supabase'

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false)
})

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const cfg = useRuntimeConfig()
    if (!String(cfg.supabaseServiceRoleKey || '')) {
      throw createError({ statusCode: 500, statusMessage: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' })
    }
    let user = await supaSelectOne<any>('trae_users', { username: body.username })
    // 서버리스 배포에서 Nitro plugin이 실행되지 않는 케이스 대비: admin은 로그인 시점에 없으면 생성
    if (!user && body.username === 'admin') {
      await ensureAdminExists()
      user = await supaSelectOne<any>('trae_users', { username: body.username })
    }
    if (!user) {
      await logLogin(event, { userId: null, username: body.username, area: 'main', success: false })
      throw createError({ statusCode: 404, statusMessage: '아이디가 존재하지 않습니다.' })
    }
    if (!verifyPassword(body.password, String(user.password_hash))) {
      await logLogin(event, { userId: Number(user.id), username: body.username, area: 'main', success: false })
      throw createError({ statusCode: 401, statusMessage: '비밀번호가 올바르지 않습니다.' })
    }
    await createSession(event, Number(user.id), body.remember)
    await logLogin(event, { userId: Number(user.id), username: body.username, area: 'main', success: true })
    return { ok: true }
  }

  const db = getDb()

  const user = db
    .prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .get(body.username) as { id: number; password_hash: string } | undefined

  if (!user) {
    await logLogin(event, { userId: null, username: body.username, area: 'main', success: false })
    throw createError({ statusCode: 404, statusMessage: '아이디가 존재하지 않습니다.' })
  }
  if (!verifyPassword(body.password, user.password_hash)) {
    await logLogin(event, { userId: user.id, username: body.username, area: 'main', success: false })
    throw createError({ statusCode: 401, statusMessage: '비밀번호가 올바르지 않습니다.' })
  }

  await createSession(event, user.id, body.remember)
  await logLogin(event, { userId: user.id, username: body.username, area: 'main', success: true })
  return { ok: true }
})
