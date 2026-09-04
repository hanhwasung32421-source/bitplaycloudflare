export default defineNuxtRouteMiddleware(async () => {
  const { me, refresh } = useMe()
  if (!me.value) {
    await refresh()
  }
  if (!me.value || me.value.role === 'user') {
    return navigateTo('/admin/login')
  }
})

