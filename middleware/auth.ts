export default defineNuxtRouteMiddleware(async () => {
  const { me, refresh } = useMe()
  if (!me.value) {
    await refresh()
  }
  if (!me.value) {
    return navigateTo('/auth/login')
  }
})

