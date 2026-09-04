export type ClientErrorEntry = {
  at: string
  type: 'fetch' | 'fetch-network' | 'vue' | 'window' | 'promise'
  url?: string
  method?: string
  statusCode?: number
  statusMessage?: string
  message?: string
  stack?: string
  data?: any
}

// 총관리자 전용 에러 배너(app/components/AdminErrorConsole.vue)에서 읽는 전역 상태.
// 여기서 잡은 원본 에러는 저장만 하고 그대로 다시 던지므로, 각 페이지의 기존
// try/catch(친절한 한글 메시지 표시)는 지금까지와 동일하게 동작한다.
const MAX_ERROR_HISTORY = 20

export default defineNuxtPlugin((nuxtApp) => {
  const lastError = useState<ClientErrorEntry | null>('client_last_error', () => null)
  const errorHistory = useState<ClientErrorEntry[]>('client_error_history', () => [])

  function record(entry: Omit<ClientErrorEntry, 'at'>) {
    const full: ClientErrorEntry = { at: new Date().toISOString(), ...entry }
    lastError.value = full
    errorHistory.value = [full, ...errorHistory.value].slice(0, MAX_ERROR_HISTORY)
  }

  const original = globalThis.$fetch as any
  if (original && !original.__wrappedForErrorLog__) {
    const wrapped = original.create({
      onResponseError(ctx: any) {
        const url = String(ctx.request)
        const status = ctx.response?.status
        // OKX 공개 API의 캔들(과거 데이터 백필) 429는 OKX 쪽 요청 제한일 뿐이고,
        // 호출부에서 이미 조용히 넘어가도록 처리돼 있어 실제 거래엔 영향이 없다 — 콘솔 노이즈만 되므로 제외.
        if (url.includes('/api/okx/candles') && status === 429) return
        // 로그인 세션이 만료된 상태에서 쪽지 안읽음 폴링이 401을 반환하는 건
        // 정상적인 로그아웃 상태일 뿐이고(호출부에서 폴링을 바로 멈춤) 실제 오류가 아니므로 제외.
        if (url.includes('/api/messages/unread') && status === 401) return
        // 비로그인 게스트가 차트를 볼 때 킬업/다운 기준점 조회가 401을 반환하는 것도
        // 호출부에서 로그인 상태일 때만 부르도록 이미 막아뒀고, 실제 오류가 아니므로 제외.
        if (url.includes('/api/kill/latest') && status === 401) return
        record({
          type: 'fetch',
          url,
          method: ctx.options?.method || 'GET',
          statusCode: status,
          statusMessage: ctx.response?.statusText,
          message: ctx.response?._data?.statusMessage || ctx.response?._data?.message || ctx.error?.message,
          data: ctx.response?._data
        })
      },
      onRequestError(ctx: any) {
        record({
          type: 'fetch-network',
          url: String(ctx.request),
          method: ctx.options?.method || 'GET',
          message: ctx.error?.message
        })
      }
    })
    wrapped.__wrappedForErrorLog__ = true
    globalThis.$fetch = wrapped
  }

  nuxtApp.vueApp.config.errorHandler = (err: any, _instance, info) => {
    record({ type: 'vue', message: err?.message || String(err), stack: err?.stack, data: { info } })
    console.error(err)
  }

  window.addEventListener('error', (e) => {
    record({ type: 'window', message: e.message, stack: e.error?.stack, url: e.filename })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason
    record({ type: 'promise', message: reason?.message || String(reason), stack: reason?.stack })
  })
})
