export default defineNuxtRouteMiddleware(async () => {
  const { me, refresh } = useMe()
  if (!me.value) {
    await refresh()
  }
  if (me.value?.role !== 'super_admin') {
    return navigateTo('/admin/members')
  }
})
