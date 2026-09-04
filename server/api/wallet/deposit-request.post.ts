import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { createDepositRequest } from '../../utils/deposit-requests'
import { notifyAdminOfWalletRequest } from '../../utils/messages'

const BodySchema = z.object({
  krwAmount: z.number().positive().max(1_000_000_000)
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)
    const body = BodySchema.parse(await readBody(event))
    const req = await createDepositRequest(user.id, body.krwAmount)
    // 쪽지 알림은 부가 기능이므로 실패해도 입금요청 자체는 그대로 성공 처리한다.
    notifyAdminOfWalletRequest(user.id, 'deposit', body.krwAmount).catch((e) => {
      console.error('[wallet/deposit-request] admin notice failed:', e)
    })
    return { ok: true, request: req }
  } catch (e: any) {
    if (e && typeof e.statusCode === 'number') throw e
    console.error('[wallet/deposit-request] unexpected error:', e)
    throw createError({ statusCode: 500, statusMessage: e?.message || '입금요청 처리 중 오류가 발생했습니다.' })
  }
})
