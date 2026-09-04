import { getSystemSettingsExtra } from '../../utils/system-settings'

// 로그인 전 화면(로그인 페이지, 게스트 채팅 등)에서도 고객지원 링크를 보여줘야 해서 로그인 불필요.
export default defineEventHandler(async (_event) => {
  const extra = await getSystemSettingsExtra()
  return { telegramUrl: extra.telegramUrl }
})
