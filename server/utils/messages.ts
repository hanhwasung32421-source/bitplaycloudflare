import { getDb } from './db'
import { SessionUser } from './auth'
import { getSupabaseAdminClient } from './supabase'
import { supabaseAppDbEnabled } from './supa-appdb'
import { createError } from 'h3'

export type MessageRow = {
  id: number
  thread_key: string
  sender_id: number
  recipient_id: number
  subject: string
  body: string
  read_at: string | null
  created_at: string
}

export function threadKeyForUser(userId: number) {
  return `user:${Number(userId)}`
}

function nowIso() {
  return new Date().toISOString()
}

function makeId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}

export async function getOperatorAdminUser() {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data: adminByName } = await supa
      .from('trae_users')
      .select('id, username, role')
      .eq('username', 'admin')
      .limit(1)
    const found = (adminByName || [])[0]
    if (found) return { id: Number((found as any).id), username: String((found as any).username || 'admin') }

    const { data: superAdmins } = await supa
      .from('trae_users')
      .select('id, username, role')
      .eq('role', 'super_admin')
      .order('id', { ascending: true })
      .limit(1)
    const fallback = (superAdmins || [])[0]
    if (fallback) return { id: Number((fallback as any).id), username: String((fallback as any).username || 'admin') }
    return null
  }

  const db = getDb()
  const row = db
    .prepare(`SELECT id, username FROM users WHERE username = ? OR role = 'super_admin' ORDER BY CASE WHEN username = 'admin' THEN 0 ELSE 1 END, id ASC LIMIT 1`)
    .get('admin') as any
  if (!row) return null
  return { id: Number(row.id), username: String(row.username || 'admin') }
}

export async function listMessageRecipientsForAdmin() {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa
      .from('trae_users')
      .select('id, username, name, role, created_at')
      .eq('role', 'user')
      .order('id', { ascending: false })
    if (error) throw error
    const ids = (data || []).map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return []

    const nowIsoStr = nowIso()
    const { data: balances } = await supa.from('trae_balances').select('user_id, usdt').in('user_id', ids)
    const balMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))

    const { data: sessions } = await supa.from('trae_sessions').select('user_id, expires_at').in('user_id', ids).gt('expires_at', nowIsoStr)
    const onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))

    const { data: events } = await supa
      .from('app_login_events')
      .select('local_user_id, created_at')
      .in('local_user_id', ids)
      .order('created_at', { ascending: false })
      .limit(500)
    const lastLoginMap = new Map<number, string>()
    for (const ev of events || []) {
      const uid = Number((ev as any).local_user_id)
      if (!uid || lastLoginMap.has(uid)) continue
      lastLoginMap.set(uid, String((ev as any).created_at || ''))
    }

    return (data || []).map((u: any) => {
      const id = Number(u.id)
      return {
        id,
        username: String(u.username || ''),
        name: String(u.name || ''),
        role: String(u.role || 'user'),
        created_at: String(u.created_at || ''),
        usdt: balMap.get(id) ?? 0,
        online: onlineSet.has(id),
        lastLoginAt: lastLoginMap.get(id) ?? null
      }
    })
  }

  const db = getDb()
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.name, u.role, u.created_at, b.usdt
       FROM users u
       LEFT JOIN balances b ON b.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY u.id DESC`
    )
    .all() as any[]
  return rows.map((u) => ({
    id: Number(u.id),
    username: String(u.username || ''),
    name: String(u.name || ''),
    role: String(u.role || 'user'),
    created_at: String(u.created_at || ''),
    usdt: Number(u.usdt ?? 0),
    // SQLite 모드는 세션 기반 온라인/최근 로그인 추적이 없어 기본값으로 채운다
    online: false,
    lastLoginAt: null as string | null
  }))
}

export async function listUsersByIds(ids: number[]) {
  const uniq = Array.from(new Set(ids.map((v) => Number(v)).filter(Boolean)))
  if (!uniq.length) return new Map<number, { id: number; username: string; role: string }>()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from('trae_users').select('id, username, role').in('id', uniq)
    if (error) throw error
    return new Map(
      (data || []).map((u: any) => [Number(u.id), { id: Number(u.id), username: String(u.username || ''), role: String(u.role || 'user') }])
    )
  }

  const db = getDb()
  const placeholders = uniq.map(() => '?').join(', ')
  const rows = db.prepare(`SELECT id, username, role FROM users WHERE id IN (${placeholders})`).all(...uniq) as any[]
  return new Map(rows.map((u) => [Number(u.id), { id: Number(u.id), username: String(u.username || ''), role: String(u.role || 'user') }]))
}

export async function insertMessages(rows: Array<Omit<MessageRow, 'id' | 'created_at'>>) {
  const payload = rows.map((r) => ({
    id: makeId(),
    thread_key: String(r.thread_key),
    sender_id: Number(r.sender_id),
    recipient_id: Number(r.recipient_id),
    subject: String(r.subject || ''),
    body: String(r.body || ''),
    read_at: r.read_at ? String(r.read_at) : null,
    created_at: nowIso()
  }))

  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      const { error } = await supa.from('trae_messages').insert(payload as any)
      if (!error) return payload
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO messages (id, thread_key, sender_id, recipient_id, subject, body, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const row of payload) {
    stmt.run(row.id, row.thread_key, row.sender_id, row.recipient_id, row.subject, row.body, row.read_at, row.created_at)
  }
  return payload
}

export async function getThreadMessages(threadKey: string) {
  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      const { data, error } = await supa.from('trae_messages').select('*').eq('thread_key', threadKey).order('created_at', { ascending: true })
      if (!error) {
        return ((data || []) as any[]).map((m) => ({
          id: Number(m.id),
          thread_key: String(m.thread_key),
          sender_id: Number(m.sender_id),
          recipient_id: Number(m.recipient_id),
          subject: String(m.subject || ''),
          body: String(m.body || ''),
          read_at: m.read_at ? String(m.read_at) : null,
          created_at: String(m.created_at || '')
        })) as MessageRow[]
      }
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const rows = db.prepare(`SELECT * FROM messages WHERE thread_key = ? ORDER BY created_at ASC`).all(threadKey) as any[]
  return rows.map((m) => ({
    id: Number(m.id),
    thread_key: String(m.thread_key),
    sender_id: Number(m.sender_id),
    recipient_id: Number(m.recipient_id),
    subject: String(m.subject || ''),
    body: String(m.body || ''),
    read_at: m.read_at ? String(m.read_at) : null,
    created_at: String(m.created_at || '')
  })) as MessageRow[]
}

export async function getThreadsForUser(user: SessionUser) {
  const isAdmin = user.role !== 'user'

  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      let q: any = supa.from('trae_messages').select('*').order('created_at', { ascending: false }).limit(3000)
      if (!isAdmin) q = q.eq('thread_key', threadKeyForUser(user.id))
      const { data, error } = await q
      if (!error) return normalizeThreadSummaries((data || []) as any[], user.id)
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const rows = isAdmin
    ? (db.prepare(`SELECT * FROM messages ORDER BY created_at DESC LIMIT 3000`).all() as any[])
    : (db.prepare(`SELECT * FROM messages WHERE thread_key = ? ORDER BY created_at DESC LIMIT 3000`).all(threadKeyForUser(user.id)) as any[])
  return normalizeThreadSummaries(rows, user.id)
}

function normalizeThreadSummaries(rows: any[], currentUserId: number) {
  const out = new Map<
    string,
    {
      threadKey: string
      userId: number
      lastMessage: string
      lastAt: string
      unreadCount: number
      lastSenderId: number
      subject: string
    }
  >()
  for (const m of rows) {
    const threadKey = String(m.thread_key || '')
    const userId = Number(String(threadKey).replace('user:', '')) || 0
    const unread = Number(m.recipient_id) === Number(currentUserId) && !m.read_at ? 1 : 0
    const prev = out.get(threadKey)
    if (!prev) {
      out.set(threadKey, {
        threadKey,
        userId,
        lastMessage: String(m.body || ''),
        lastAt: String(m.created_at || ''),
        unreadCount: unread,
        lastSenderId: Number(m.sender_id || 0),
        subject: String(m.subject || '')
      })
      continue
    }
    prev.unreadCount += unread
  }
  return Array.from(out.values()).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
}

export async function markThreadAsRead(threadKey: string, userId: number) {
  const readAt = nowIso()
  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      await supa.from('trae_messages').update({ read_at: readAt }).eq('thread_key', threadKey).eq('recipient_id', Number(userId)).is('read_at', null)
      return
    } catch {
      // fall through
    }
  }

  const db = getDb()
  db.prepare(`UPDATE messages SET read_at = ? WHERE thread_key = ? AND recipient_id = ? AND read_at IS NULL`).run(readAt, threadKey, Number(userId))
}

export async function countUnreadMessages(userId: number) {
  if (supabaseAppDbEnabled()) {
    try {
      const supa = getSupabaseAdminClient()
      const { count, error } = await supa
        .from('trae_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', Number(userId))
        .is('read_at', null)
      if (!error) return Number(count || 0)
    } catch {
      // fall through
    }
  }

  const db = getDb()
  const row = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE recipient_id = ? AND read_at IS NULL`).get(Number(userId)) as any
  return Number(row?.c || 0)
}

// 입출금센터 알림: 회원의 지갑 입금/출금 요청을 총관리자에게 쪽지로 알린다.
// - 그 회원의 대화창(thread_key = user:<memberId>)에 남겨서 관리자가 문맥과 함께 볼 수 있게 하고,
// - sender_id를 회원이 아니라 운영자 계정으로 넣어서, 회원 본인 채팅에는 "내가 admin에게 보낸 것"으로
//   보이지 않게 한다(회원 화면에서는 sender_id === 내 id 여야 "내가 보낸 말풍선"으로 표시됨).
// - 화면 표시용 발신자 이름은 subject 마커("입출금센터")로 구분해 실제 계정명 대신 보여준다.
export const WALLET_NOTICE_SUBJECT = '입출금센터'

export async function notifyAdminOfWalletRequest(memberId: number, kind: 'deposit' | 'withdrawal', krwAmount: number) {
  const operator = await getOperatorAdminUser()
  if (!operator) return
  const label = kind === 'deposit' ? '입금' : '출금'
  const amountText = `${Math.round(Number(krwAmount) || 0).toLocaleString()}원`
  await insertMessages([
    {
      thread_key: threadKeyForUser(memberId),
      sender_id: operator.id,
      recipient_id: operator.id,
      subject: WALLET_NOTICE_SUBJECT,
      body: `${label}요청이 접수되었습니다. (신청 금액: ${amountText})`,
      read_at: null
    }
  ])
}

export async function ensureAdminThreadAccess(user: SessionUser, targetUserId?: number) {
  if (user.role !== 'user') {
    if (!targetUserId) {
      throw createError({ statusCode: 400, statusMessage: '대화 대상 회원이 필요합니다.' })
    }
    return { threadKey: threadKeyForUser(targetUserId), targetUserId: Number(targetUserId) }
  }
  return { threadKey: threadKeyForUser(user.id), targetUserId: user.id }
}
