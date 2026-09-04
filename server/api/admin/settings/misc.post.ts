import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { updateSystemSettingsExtra } from '../../../utils/system-settings'

const BodySchema = z.object({
  telegramUrl: z.string().trim().max(300).optional(),
  krwPerUsdt: z.number().nonnegative().optional(),
  lossSettlementPercent: z.number().min(0).max(100).optional(),
  referralSettlementPercent: z.number().min(0).max(100).optional(),
  menuOrder: z.array(z.string()).optional(),
  mainNavOrder: z.array(z.string()).optional(),
  mainNavHidden: z.array(z.string()).optional()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const next = await updateSystemSettingsExtra(body)
  return { ok: true, ...next }
})
