import { z } from 'zod'
import { getDb } from '../../utils/db'
import { createSession, hashPassword } from '../../utils/auth'
import { logAppUser, logLogin } from '../../utils/supa-log'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncUserSettingsToSupabase, syncUserToSupabase } from '../../utils/supa-appdb'
import { supaSelectOne, supaUpsertStrict, supaUpsertUserSettings } from '../../utils/supabase'
import { getOperatorAdminUser, insertMessages, threadKeyForUser } from '../../utils/messages'

const BodySchema = z.object({
  username: z.string().min(3).max(20),
  name: z.string().trim().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  password: z.string().min(4).max(50),
  bankName: z.string().trim().min(1).max(40),
  bankAccount: z.string().trim().min(1).max(80),
  accountHolder: z.string().trim().min(1).max(40),
  referralCode: z.string().trim().max(32).optional(),
  agreedToTerms: z.boolean()
})

export default defineEventHandler(async (event) => {
  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await readBody(event))
  } catch {
    throw createError({ statusCode: 400, statusMessage: '필수 항목을 모두 올바르게 입력해 주세요.' })
  }
  const useSupa = supabaseAppDbEnabled()
  // 추천코드를 비워두고 가입하면 기본 총관리자(admin) 추천으로 처리
  const referralCode = (body.referralCode || '').trim() || 'admin'

  // 입력 제한 (프론트와 동일 규칙)
  if (!/^[A-Za-z0-9]+$/.test(String(body.username || '').trim())) {
    throw createError({ statusCode: 400, statusMessage: '아이디는 한글은 사용할 수 없습니다' })
  }
  if (!/^[가-힣\s]+$/.test(String(body.name || '').trim())) {
    throw createError({ statusCode: 400, statusMessage: '이름은 한국어만 사용 가능합니다' })
  }
  if (!/^\d+$/.test(String(body.bankAccount || '').trim())) {
    throw createError({ statusCode: 400, statusMessage: '은행계좌는 숫자만 입력해 주세요' })
  }
  if (!/^[가-힣\s]+$/.test(String(body.accountHolder || '').trim())) {
    throw createError({ statusCode: 400, statusMessage: '예금주는 한국어만 사용 가능합니다' })
  }

  // 배포/서버리스: Supabase를 단일 진실 소스로 사용 (가입 즉시 Supabase에 반영)
  if (useSupa) {
    const cfg = useRuntimeConfig()
    if (!String(cfg.public.supabaseUrl || '')) {
      throw createError({ statusCode: 500, statusMessage: 'SUPABASE_URL이 설정되지 않았습니다.' })
    }
    if (!String(cfg.supabaseServiceRoleKey || '')) {
      throw createError({ statusCode: 500, statusMessage: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' })
    }

    const exists = await supaSelectOne<{ id: number }>('trae_users', { username: body.username })
    if (exists?.id) {
      throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
    }
    if (!body.agreedToTerms) {
      throw createError({ statusCode: 400, statusMessage: '약관 동의가 필요합니다.' })
    }

    const passwordHash = hashPassword(body.password)
    const userId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const now = new Date().toISOString()

    try {
      await supaUpsertStrict(
        'trae_users',
        {
          id: userId,
          username: body.username,
          password_hash: passwordHash,
          name: body.name.trim(),
          birth_date: body.birthDate,
          bank_name: body.bankName.trim(),
          bank_account: body.bankAccount.trim(),
          account_holder: body.accountHolder.trim(),
          referral_code: referralCode,
          terms_agreed_at: now,
          role: 'user',
          permissions: {},
          created_at: now,
          updated_at: now
        },
        'id'
      )
      await supaUpsertStrict('trae_balances', { user_id: userId, usdt: 0 }, 'user_id')
      await supaUpsertUserSettings({ user_id: userId, trade_percent: 50, trade_leverage: 100, chart_prefs: {}, updated_at: now })
    } catch (e: any) {
      const msg = String(e?.message || e || '')
      if (msg.includes("Could not find the '") && msg.includes(" column")) {
        throw createError({
          statusCode: 500,
          statusMessage:
            'Supabase 회원 테이블 컬럼이 아직 업데이트되지 않았습니다. 방금 드린 SQL(trae_users 컬럼 추가)을 다시 실행한 뒤 재시도해 주세요.'
        })
      }
      throw createError({ statusCode: 500, statusMessage: msg || '회원가입 처리 중 오류가 발생했습니다.' })
    }

    // 세션 생성(서버리스에서 지속되도록 auth.ts에서 Supabase 세션으로 저장)
    await createSession(event, userId)

    await logAppUser({ id: userId as any, username: body.username, role: 'user' })
    await logLogin(event, { userId: userId as any, username: body.username, area: 'main', success: true })

    // 가입 환영 쪽지(기본 1개, 안읽음)
    try {
      const operator = await getOperatorAdminUser()
      if (operator) {
        await insertMessages([
          {
            thread_key: threadKeyForUser(userId),
            sender_id: Number(operator.id),
            recipient_id: Number(userId),
            subject: '환영합니다',
            body: '환영합니다.\n궁금한 점이 있으시면 이곳으로 문의해 주세요.\n항상 빠르게 답변드리겠습니다.',
            read_at: null
          }
        ])
      }
    } catch {
      // ignore
    }

    return { ok: true }
  }

  const db = getDb()

  const exists = await db.prepare('SELECT id FROM users WHERE username = ?').get(body.username) as
    | { id: number }
    | undefined
  if (exists?.id) {
    throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
  }
  if (!body.agreedToTerms) {
    throw createError({ statusCode: 400, statusMessage: '약관 동의가 필요합니다.' })
  }

  const passwordHash = hashPassword(body.password)
  await db.prepare(
    'INSERT INTO users (username, password_hash, name, birth_date, bank_name, bank_account, account_holder, referral_code, terms_agreed_at, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    body.username,
    passwordHash,
    body.name.trim(),
    body.birthDate,
    body.bankName.trim(),
    body.bankAccount.trim(),
    body.accountHolder.trim(),
    referralCode,
    new Date().toISOString(),
    'user',
    JSON.stringify({}),
    new Date().toISOString(),
    new Date().toISOString()
  )

  const user = await db.prepare('SELECT id FROM users WHERE username = ?').get(body.username) as { id: number }
  await db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(user.id, 0)
  await db.prepare(
    'INSERT OR IGNORE INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, 50, 100, '{}', new Date().toISOString())

  await createSession(event, user.id)
  await logAppUser({ id: user.id, username: body.username, role: 'user' })
  await logLogin(event, { userId: user.id, username: body.username, area: 'main', success: true })

  // 가입 환영 쪽지(기본 1개, 안읽음)
  try {
    const operator = await getOperatorAdminUser()
    if (operator) {
      await insertMessages([
        {
          thread_key: threadKeyForUser(user.id),
          sender_id: Number(operator.id),
          recipient_id: Number(user.id),
          subject: '환영합니다',
          body: '환영합니다.\n궁금한 점이 있으시면 이곳으로 문의해 주세요.\n항상 빠르게 답변드리겠습니다.',
          read_at: null
        }
      ])
    }
  } catch {
    // ignore
  }

  // Supabase(회원 DB)에도 항상 저장(미러)
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any
  await syncUserToSupabase(userRow)
  const balRow = await db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any
  await syncBalanceToSupabase(user.id, Number(balRow?.usdt ?? 0))
  const st = await db.prepare('SELECT trade_percent, trade_leverage, chart_prefs, updated_at FROM user_settings WHERE user_id = ?').get(user.id) as any
  await syncUserSettingsToSupabase(
    user.id,
    Number(st?.trade_percent ?? 50),
    Number(st?.trade_leverage ?? 100),
    String(st?.updated_at ?? new Date().toISOString()),
    (() => {
      try {
        return st?.chart_prefs ? JSON.parse(String(st.chart_prefs)) : {}
      } catch {
        return {}
      }
    })()
  )
  return { ok: true }
})
