import { getSystemSettingsExtra } from '../utils/system-settings'

// 최상단 메인 메뉴는 비회원도 보므로 로그인 여부와 무관하게 누구나 조회 가능해야 한다.
export default defineEventHandler(async () => {
  const extra = await getSystemSettingsExtra()
  return { order: extra.mainNavOrder, hidden: extra.mainNavHidden }
})
