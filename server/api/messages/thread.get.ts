import { getQuery } from 'h3'
import { requireUser } from '../../utils/auth'
import { WALLET_NOTICE_SUBJECT, ensureAdminThreadAccess, getOperatorAdminUser, getThreadMessages, listUsersByIds } from '../../utils/messages'
import { getPendingResetRequestForUser } from '../../utils/password-reset'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const targetUserId = q.userId ? Number(q.userId) : undefined
  const { threadKey, targetUserId: resolvedUserId } = await ensureAdminThreadAccess(user, targetUserId)

  const messages = await getThreadMessages(threadKey)
  const operator = await getOperatorAdminUser()
  const users = await listUsersByIds(
    Array.from(new Set(messages.flatMap((m) => [Number(m.sender_id), Number(m.recipient_id), resolvedUserId]).filter(Boolean)))
  )

  return {
    threadKey,
    targetUserId: resolvedUserId,
    operatorId: operator?.id ?? null,
    pendingResetRequest: user.role !== 'user' ? await getPendingResetRequestForUser(resolvedUserId) : null,
    items: messages.map((m) => ({
      ...m,
      senderName:
        m.subject === WALLET_NOTICE_SUBJECT
          ? WALLET_NOTICE_SUBJECT
          : users.get(Number(m.sender_id))?.username || (Number(m.sender_id) === operator?.id ? 'admin' : `회원 #${m.sender_id}`),
      recipientName: users.get(Number(m.recipient_id))?.username || (Number(m.recipient_id) === operator?.id ? 'admin' : `회원 #${m.recipient_id}`)
    }))
  }
})
