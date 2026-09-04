import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { supaSelectOne } from '../../utils/supabase'
import { createDepositRequest } from '../../utils/deposit-requests'
import { resolveKrwPerUsdtRate } from '../../utils/system-settings'
import { notifyAdminOfWalletRequest } from '../../utils/messages'

const BodySchema = z.object({
  krwAmount: z.number().positive().max(1_000_000_000)
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)
    const body = BodySchema.parse(await readBody(event))

    const balance = supabaseAppDbEnabled()
      ? Number((await supaSelectOne<any>('trae_balances', { user_id: user.id }))?.usdt ?? 0)
      : Number((getDb().prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any)?.usdt ?? 0)

    const rate = await resolveKrwPerUsdtRate()
    if (!(rate > 0)) {
      throw createError({ statusCode: 400, statusMessage: '환율을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.' })
    }
    const requestedUsdt = body.krwAmount / rate
    if (requestedUsdt > balance) {
      throw createError({ statusCode: 400, statusMessage: '보유한 USDT 잔고보다 큰 금액은 출금 요청할 수 없습니다.' })
    }

    const req = await createDepositRequest(user.id, body.krwAmount, 'withdrawal')
    // 쪽지 알림은 부가 기능이므로 실패해도 출금요청 자체는 그대로 성공 처리한다.
    notifyAdminOfWalletRequest(user.id, 'withdrawal', body.krwAmount).catch((e) => {
      console.error('[wallet/withdraw-request] admin notice failed:', e)
    })
    return { ok: true, request: req }
  } catch (e: any) {
    if (e && typeof e.statusCode === 'number') throw e
    console.error('[wallet/withdraw-request] unexpected error:', e)
    throw createError({ statusCode: 500, statusMessage: e?.message || '출금요청 처리 중 오류가 발생했습니다.' })
  }
})
