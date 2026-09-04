import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, supaInsertStrict, supaSelectWhere } from './supabase'

const T_GUEST_CHATS = 'trae_guest_chats'

export type GuestChatMessage = {
  id: number
  guestId: string
  ip: string | null
  sender: 'guest' | 'admin'
  body: string
  readAt: string | null
  createdAt: string
}

export type GuestChatThreadSummary = {
  guestId: string
  ip: string | null
  lastMessage: string
  lastAt: string
  unreadCount: number
}

function nowIso() {
  return new Date().toISOString()
}

function makeId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}

function rowToMessage(row: any): GuestChatMessage {
  return {
    id: Number(row.id),
    guestId: String(row.guest_id),
    ip: row.ip ? String(row.ip) : null,
    sender: row.sender === 'admin' ? 'admin' : 'guest',
    body: String(row.body || ''),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at || '')
  }
}

export async function insertGuestChatMessage(guestId: string, sender: 'guest' | 'admin', body: string, ip?: string | null) {
  const payload = {
    id: makeId(),
    guest_id: guestId,
    ip: ip || null,
    sender,
    body,
    // 방문자가 보낸 메시지만 "관리자 미확인"으로 시작한다. 관리자가 보낸 답장은 애초에 읽음 처리할 대상이 아니다.
    read_at: sender === 'admin' ? nowIso() : null,
    created_at: nowIso()
  }

  if (supabaseAppDbEnabled()) {
    await supaInsertStrict(T_GUEST_CHATS, payload)
    return rowToMessage(payload)
  }

  const db = getDb()
  db.prepare(
    `INSERT INTO guest_chats (id, guest_id, ip, sender, body, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(payload.id, payload.guest_id, payload.ip, payload.sender, payload.body, payload.read_at, payload.created_at)
  return rowToMessage(payload)
}

export async function listGuestChatThreadMessages(guestId: string): Promise<GuestChatMessage[]> {
  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_GUEST_CHATS, where: { guest_id: guestId }, orderBy: 'created_at', ascending: true })
    return rows.map(rowToMessage)
  }
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM guest_chats WHERE guest_id = ? ORDER BY created_at ASC`).all(guestId) as any[]
  return rows.map(rowToMessage)
}

export async function listGuestChatThreads(): Promise<GuestChatThreadSummary[]> {
  const rows = supabaseAppDbEnabled()
    ? await supaSelectWhere<any>({ table: T_GUEST_CHATS, orderBy: 'created_at', ascending: false, limit: 2000 })
    : (getDb().prepare(`SELECT * FROM guest_chats ORDER BY created_at DESC LIMIT 2000`).all() as any[])

  const out = new Map<string, GuestChatThreadSummary>()
  for (const raw of rows) {
    const m = rowToMessage(raw)
    const unread = m.sender === 'guest' && !m.readAt ? 1 : 0
    const prev = out.get(m.guestId)
    if (!prev) {
      out.set(m.guestId, { guestId: m.guestId, ip: m.ip, lastMessage: m.body, lastAt: m.createdAt, unreadCount: unread })
      continue
    }
    prev.unreadCount += unread
  }
  return Array.from(out.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

export async function markGuestChatThreadRead(guestId: string) {
  const readAt = nowIso()
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    await supa.from(T_GUEST_CHATS).update({ read_at: readAt }).eq('guest_id', guestId).eq('sender', 'guest').is('read_at', null)
    return
  }
  const db = getDb()
  db.prepare(`UPDATE guest_chats SET read_at = ? WHERE guest_id = ? AND sender = 'guest' AND read_at IS NULL`).run(readAt, guestId)
}

export async function countUnreadGuestChats(): Promise<number> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { count, error } = await supa.from(T_GUEST_CHATS).select('*', { count: 'exact', head: true }).eq('sender', 'guest').is('read_at', null)
    if (error) return 0
    return Number(count || 0)
  }
  const db = getDb()
  const row = db.prepare(`SELECT COUNT(*) as c FROM guest_chats WHERE sender = 'guest' AND read_at IS NULL`).get() as any
  return Number(row?.c || 0)
}
