import { readBody, createError } from 'h3'
import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { ensureAdminThreadAccess, getOperatorAdminUser, insertMessages, listMessageRecipientsForAdmin, threadKeyForUser } from '../../utils/messages'

const BodySchema = z.object({
  userIds: z.array(z.number().int().positive()).optional(),
  sendToAll: z.boolean().optional(),
  subject: z.string().trim().max(100).optional(),
  body: z.string().trim().min(1, '내용을 입력하세요.').max(5000)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const isAdmin = user.role !== 'user'
  const operator = await getOperatorAdminUser()
  if (!operator) {
    throw createError({ statusCode: 500, statusMessage: '운영자 계정을 찾을 수 없습니다.' })
  }

  if (isAdmin) {
    let targetIds = (body.userIds || []).map((v) => Number(v)).filter(Boolean)
    if (body.sendToAll) {
      const users = await listMessageRecipientsForAdmin()
      targetIds = users.map((u) => Number(u.id))
    }
    targetIds = Array.from(new Set(targetIds)).filter((id) => id !== operator.id)
    if (!targetIds.length) {
      throw createError({ statusCode: 400, statusMessage: '수신 회원을 선택하세요.' })
    }

    await insertMessages(
      targetIds.map((uid) => ({
        thread_key: threadKeyForUser(uid),
        sender_id: Number(user.id),
        recipient_id: uid,
        subject: String(body.subject || '운영자 쪽지'),
        body: String(body.body || ''),
        read_at: null
      }))
    )
    return { ok: true, count: targetIds.length }
  }

  await ensureAdminThreadAccess(user)
  await insertMessages([
    {
      thread_key: threadKeyForUser(user.id),
      sender_id: Number(user.id),
      recipient_id: Number(operator.id),
      subject: String(body.subject || '회원 문의'),
      body: String(body.body || ''),
      read_at: null
    }
  ])
  return { ok: true, count: 1 }
})
