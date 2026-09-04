type Me = {
  id: number
  username: string
  role: 'user' | 'super_admin' | 'branch_admin'
}

export function useMe() {
  const me = useState<Me | null>('me', () => null)
  const isLoading = useState<boolean>('me_loading', () => false)

  async function refresh() {
    isLoading.value = true
    try {
      const data = await $fetch<{ me: Me | null }>('/api/me')
      me.value = data.me
    } catch {
      me.value = null
    } finally {
      isLoading.value = false
    }
  }

  return { me, isLoading, refresh }
}

