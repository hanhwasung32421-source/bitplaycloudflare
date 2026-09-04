import { getDb } from './db'
import { SessionUser, hashPassword } from './auth'
import { getSupabaseAdminClient } from './supabase'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getOperatorAdminUser, insertMessages, threadKeyForUser } from './messages'
import { createError } from 'h3'

function makeId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}

function nowIso() {
  return new Date().toISOString()
}

export async function createPasswordResetRequest(user: SessionUser, name: string, birthDate: string) {
  const now = nowIso()
  const id = makeId()
  const operator = await getOperatorAdminUser()
  if (!operator) throw createError({ statusCode: 500, statusMessage: '운영자 계정을 찾을 수 없습니다.' })

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data: existing } = await supa
      .from('trae_password_reset_requests')
      .select('id')
      .eq('user_id', Number(user.id))
      .eq('status', 'pending')
      .limit(1)
    if ((existing || [])[0]) {
      throw createError({ statusCode: 409, statusMessage: '이미 처리 대기 중인 초기화 요청이 있습니다.' })
    }

    const insertedMessages = await insertMessages([
      {
        thread_key: threadKeyForUser(user.id),
        sender_id: Number(user.id),
        recipient_id: Number(operator.id),
        subject: '비밀번호 초기화 요청',
        body: `비밀번호 초기화 요청\n아이디: ${user.username}\n이름: ${name}\n생년월일: ${birthDate}\n\n운영자 확인 후 비밀번호는 1234로 초기화됩니다.`,
        read_at: null
      }
    ])
    await supa.from('trae_password_reset_requests').insert({
      id,
      user_id: Number(user.id),
      username_snapshot: user.username,
      requested_name: name,
      requested_birth_date: birthDate,
      status: 'pending',
      approved_by: null,
      message_id: Number(insertedMessages[0]?.id || 0),
      requested_at: now,
      approved_at: null
    })
    return { id }
  }

  const db = getDb()
  const existing = db
    .prepare(`SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`)
    .get(Number(user.id)) as any
  if (existing?.id) {
    throw createError({ statusCode: 409, statusMessage: '이미 처리 대기 중인 초기화 요청이 있습니다.' })
  }
  const insertedMessages = await insertMessages([
    {
      thread_key: threadKeyForUser(user.id),
      sender_id: Number(user.id),
      recipient_id: Number(operator.id),
      subject: '비밀번호 초기화 요청',
      body: `비밀번호 초기화 요청\n아이디: ${user.username}\n이름: ${name}\n생년월일: ${birthDate}\n\n운영자 확인 후 비밀번호는 1234로 초기화됩니다.`,
      read_at: null
    }
  ])
  db.prepare(
    `INSERT INTO password_reset_requests (id, user_id, username_snapshot, requested_name, requested_birth_date, status, approved_by, message_id, requested_at, approved_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?, NULL)`
  ).run(id, Number(user.id), user.username, name, birthDate, Number(insertedMessages[0]?.id || 0), now)
  return { id }
}

export async function getPendingResetRequestForUser(userId: number) {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data } = await supa
      .from('trae_password_reset_requests')
      .select('*')
      .eq('user_id', Number(userId))
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(1)
    const row = (data || [])[0] as any
    return row
      ? {
          id: Number(row.id),
          user_id: Number(row.user_id),
          username_snapshot: String(row.username_snapshot || ''),
          requested_name: String(row.requested_name || ''),
          requested_birth_date: String(row.requested_birth_date || ''),
          status: String(row.status || 'pending'),
          requested_at: String(row.requested_at || '')
        }
      : null
  }

  const db = getDb()
  const row = db
    .prepare(`SELECT * FROM password_reset_requests WHERE user_id = ? AND status = 'pending' ORDER BY requested_at DESC LIMIT 1`)
    .get(Number(userId)) as any
  return row || null
}

export async function approvePasswordReset(requestId: number, adminUser: SessionUser) {
  const approvedAt = nowIso()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data } = await supa.from('trae_password_reset_requests').select('*').eq('id', Number(requestId)).limit(1)
    const req = (data || [])[0] as any
    if (!req) throw createError({ statusCode: 404, statusMessage: '초기화 요청을 찾을 수 없습니다.' })
    if (String(req.status) !== 'pending') throw createError({ statusCode: 409, statusMessage: '이미 처리된 요청입니다.' })

    const newHash = hashPassword('1234')
    await supa
      .from('trae_users')
      .update({
        password_hash: newHash,
        password_reset_required: true,
        password_reset_notice_dismissed_at: null,
        updated_at: approvedAt
      })
      .eq('id', Number(req.user_id))
    await supa
      .from('trae_password_reset_requests')
      .update({ status: 'approved', approved_by: Number(adminUser.id), approved_at: approvedAt })
      .eq('id', Number(requestId))
    await insertMessages([
      {
        thread_key: threadKeyForUser(Number(req.user_id)),
        sender_id: Number(adminUser.id),
        recipient_id: Number(req.user_id),
        subject: '비밀번호 초기화 승인',
        body: `비밀번호 초기화가 승인되었습니다.\n현재 비밀번호는 1234로 변경되었습니다.\n로그인 후 우측상단 아이디를 클릭해서 비밀번호를 변경해 주세요.`,
        read_at: null
      }
    ])
    return { ok: true }
  }

  const db = getDb()
  const req = db.prepare(`SELECT * FROM password_reset_requests WHERE id = ?`).get(Number(requestId)) as any
  if (!req) throw createError({ statusCode: 404, statusMessage: '초기화 요청을 찾을 수 없습니다.' })
  if (String(req.status) !== 'pending') throw createError({ statusCode: 409, statusMessage: '이미 처리된 요청입니다.' })

  const newHash = hashPassword('1234')
  db.prepare(`UPDATE users SET password_hash = ?, password_reset_required = 1, password_reset_notice_dismissed_at = NULL, updated_at = ? WHERE id = ?`).run(newHash, approvedAt, Number(req.user_id))
  db.prepare(`UPDATE password_reset_requests SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`).run(Number(adminUser.id), approvedAt, Number(requestId))
  await insertMessages([
    {
      thread_key: threadKeyForUser(Number(req.user_id)),
      sender_id: Number(adminUser.id),
      recipient_id: Number(req.user_id),
      subject: '비밀번호 초기화 승인',
      body: `비밀번호 초기화가 승인되었습니다.\n현재 비밀번호는 1234로 변경되었습니다.\n로그인 후 우측상단 아이디를 클릭해서 비밀번호를 변경해 주세요.`,
      read_at: null
    }
  ])
  return { ok: true }
}
