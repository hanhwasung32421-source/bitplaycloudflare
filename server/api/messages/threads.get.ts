import { getQuery } from 'h3'
import { requireUser } from '../../utils/auth'
import { countUnreadMessages, ensureAdminThreadAccess, getThreadsForUser, listUsersByIds } from '../../utils/messages'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const targetUserId = q.userId ? Number(q.userId) : undefined

  const isAdmin = user.role !== 'user'
  if (isAdmin && targetUserId) {
    const { threadKey } = await ensureAdminThreadAccess(user, targetUserId)
    const summaries = await getThreadsForUser(user)
    const users = await listUsersByIds([targetUserId])
    const found = summaries.find((t) => t.threadKey === threadKey)
    return {
      items: found
        ? [
            {
              ...found,
              username: users.get(targetUserId)?.username || `회원 #${targetUserId}`,
              unreadCount: Number(found.unreadCount || 0)
            }
          ]
        : []
    }
  }

  const summaries = await getThreadsForUser(user)
  const userIds = summaries.map((t) => Number(t.userId)).filter(Boolean)
  const users = await listUsersByIds(userIds)
  const unreadTotal = isAdmin ? 0 : await countUnreadMessages(user.id)

  return {
    items: summaries.map((t) => ({
      ...t,
      username: users.get(Number(t.userId))?.username || (isAdmin ? `회원 #${t.userId}` : '운영자')
    })),
    unreadTotal
  }
})
