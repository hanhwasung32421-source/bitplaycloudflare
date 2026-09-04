type StoredError = {
  at: string
  requestId?: string
  url?: string
  method?: string
  message: string
  stack?: string
}

declare global {
  // eslint-disable-next-line no-var
  var __LAST_ERROR__: StoredError | undefined
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: any, ctx: any) => {
    const event = ctx?.event
    const requestId = event?.context?.requestId
    const url = event?.path || event?.node?.req?.url
    const method = event?.method || event?.node?.req?.method

    // 정적 자산(_nuxt) 요청은 배포/캐시 타이밍에 따라 일시적으로 실패할 수 있어
    // "최근 서버 오류"를 오염시키는 경우가 많습니다. (실제 API/DB 오류를 보기 힘들어짐)
    // 필요하면 Vercel 로그/네트워크 탭으로 별도 확인 가능합니다.
    if (typeof url === 'string' && url.startsWith('/_nuxt/')) return

    globalThis.__LAST_ERROR__ = {
      at: new Date().toISOString(),
      requestId,
      url,
      method,
      message: String(error?.message || error),
      stack: error?.stack ? String(error.stack) : undefined
    }

    // 서버 콘솔에도 남겨서 바로 복붙 가능하게
    // eslint-disable-next-line no-console
    console.error('[APP_ERROR]', globalThis.__LAST_ERROR__)
  })
})
