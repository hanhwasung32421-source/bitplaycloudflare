export function useMessages() {
  const unread = useState<number>('messages_unread_count', () => 0)
  const loading = useState<boolean>('messages_unread_loading', () => false)
  const toast = useState<{ visible: boolean; text: string } | null>('messages_toast', () => null)
  let pollTimer: any = null
  let toastTimer: any = null
  let initialized = false

  function showToast(text: string) {
    if (toastTimer) clearTimeout(toastTimer)
    toast.value = { visible: true, text }
    toastTimer = setTimeout(() => {
      toast.value = null
    }, 4000)
  }

  async function refreshUnread() {
    if (loading.value) return
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ unread: number }>('/api/messages/unread', { credentials: 'include', headers })
      const next = Number(data.unread || 0)
      // 새 쪽지가 실시간으로 도착한 경우에만 팝업(최초 로드 시에는 띄우지 않음)
      if (process.client && initialized && next > unread.value) {
        showToast('새 쪽지가 도착했습니다.')
      }
      unread.value = next
      initialized = true
    } catch (e: any) {
      unread.value = 0
      // 로그인 세션이 만료된 상태로 폴링이 계속 돌면 5초마다 같은 401만 반복되므로,
      // 그 경우엔 폴링을 멈춘다(다시 로그인해서 레이아웃이 재마운트되면 새로 시작됨).
      const status = e?.response?.status ?? e?.statusCode
      if (status === 401) stopUnreadPolling()
    } finally {
      loading.value = false
    }
  }

  function startUnreadPolling() {
    if (!process.client) return
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(() => {
      refreshUnread()
    }, 5000)
  }

  function stopUnreadPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  return { unread, loading, toast, refreshUnread, startUnreadPolling, stopUnreadPolling }
}
