// "다른 계정으로 로그인" 새 창 전용. sessionStorage는 탭마다 독립적이므로,
// 이 값이 설정된 탭에서 나가는 모든 요청에만 임퍼스네이션 헤더가 붙는다 —
// 관리자가 새 창을 연 원래 탭의 쿠키 기반 세션에는 전혀 영향이 없다.
export const IMPERSONATE_STORAGE_KEY = 'impersonate_session_token'

export default defineNuxtPlugin(() => {
  const original = globalThis.$fetch as any
  if (!original || original.__wrappedForImpersonation__) return

  const wrapped = original.create({
    onRequest(ctx: any) {
      let token: string | null = null
      try {
        token = sessionStorage.getItem(IMPERSONATE_STORAGE_KEY)
      } catch {
        // ignore (private mode 등에서 접근 불가할 수 있음)
      }
      if (!token) return
      const headers = new Headers(ctx.options.headers || {})
      headers.set('x-impersonate-token', token)
      ctx.options.headers = headers
    }
  })
  wrapped.__wrappedForImpersonation__ = true
  globalThis.$fetch = wrapped
})
