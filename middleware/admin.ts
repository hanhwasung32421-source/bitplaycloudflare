export default defineNuxtRouteMiddleware(async () => {
  const { me, refresh } = useMe()
  if (!me.value) {
    await refresh()
  }
  if (!me.value || (me.value.role !== 'super_admin' && me.value.role !== 'branch_admin')) {
    return navigateTo('/admin/login')
  }
})

