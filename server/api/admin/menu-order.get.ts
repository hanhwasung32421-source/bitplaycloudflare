import { requireAdmin } from '../../utils/auth'
import { getSystemSettingsExtra } from '../../utils/system-settings'

// 어떤 관리자 역할이든 자기 상단 메뉴를 정렬해서 그려야 하므로, 총관리자 전용이 아니라
// 로그인한 관리자라면 누구나 읽을 수 있게 한다(수정은 /api/admin/settings/misc가 총관리자만).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const extra = await getSystemSettingsExtra()
  return { order: extra.menuOrder }
})
