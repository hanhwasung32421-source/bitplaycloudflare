import { requireSuperAdmin } from '../../../utils/auth'
import { getSystemSettingsExtra, getDailyKrwRate } from '../../../utils/system-settings'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const extra = await getSystemSettingsExtra()
  const daily = await getDailyKrwRate()
  return { ...extra, dailyKrwRate: daily.rate, dailyKrwRateDay: daily.day, dailyKrwRateUpdatedAt: daily.updatedAt }
})
