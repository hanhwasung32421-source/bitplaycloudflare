import { z } from 'zod'
import { getDb } from '../../utils/db'
import { createSession, verifyPassword } from '../../utils/auth'
import { logLogin } from '../../utils/supa-log'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { supaSelectOne } from '../../utils/supabase'

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const user = await supaSelectOne<any>('trae_users', { username: body.username })
    if (!user) {
      await logLogin(event, { userId: null, username: body.username, area: 'admin', success: false })
      throw createError({ statusCode: 404, statusMessage: '아이디가 존재하지 않습니다.' })
    }
    if (!verifyPassword(body.password, String(user.password_hash))) {
      await logLogin(event, { userId: Number(user.id), username: body.username, area: 'admin', success: false })
      throw createError({ statusCode: 401, statusMessage: '비밀번호가 올바르지 않습니다.' })
    }
    if (user.role === 'user') {
      await logLogin(event, { userId: Number(user.id), username: body.username, area: 'admin', success: false })
      throw createError({ statusCode: 403, statusMessage: '관리자 계정이 아닙니다.' })
    }

    await createSession(event, Number(user.id))
    await logLogin(event, { userId: Number(user.id), username: body.username, area: 'admin', success: true })
    return { ok: true }
  }

  const db = getDb()

  const user = db
    .prepare('SELECT id, password_hash, role FROM users WHERE username = ?')
    .get(body.username) as { id: number; password_hash: string; role: string } | undefined

  if (!user) {
    await logLogin(event, { userId: null, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 404, statusMessage: '아이디가 존재하지 않습니다.' })
  }
  if (!verifyPassword(body.password, user.password_hash)) {
    await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 401, statusMessage: '비밀번호가 올바르지 않습니다.' })
  }
  if (user.role === 'user') {
    await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 403, statusMessage: '관리자 계정이 아닙니다.' })
  }

  await createSession(event, user.id)
  await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: true })
  return { ok: true }
})
