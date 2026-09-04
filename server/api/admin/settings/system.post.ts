import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { setLiquidationRoe } from '../../../utils/system-settings'

const BodySchema = z.object({
  // 예: -40 (음수 %). -1 ~ -99 범위로 제한.
  liquidationRoe: z.coerce.number().min(-99).max(-1)
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))

  try {
    const liquidationRoe = await setLiquidationRoe(body.liquidationRoe)
    return { ok: true, liquidationRoe }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Supabase에 trae_system_settings 테이블이 없어 저장하지 못했습니다. SUPABASE_TRAE_DB_patch_system_settings.sql을 Supabase SQL Editor에서 먼저 실행해주세요.'
    })
  }
})
