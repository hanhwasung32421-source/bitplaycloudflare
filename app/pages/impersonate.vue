<template>
  <div class="flex min-h-[50vh] items-center justify-center">
    <p class="text-sm text-slate-400">로그인 처리 중...</p>
  </div>
</template>

<script setup lang="ts">
import { IMPERSONATE_STORAGE_KEY } from '../plugins/impersonation.client'

const route = useRoute()
const { refresh } = useMe()

if (process.client) {
  const token = String(route.query.token || '')
  if (token) {
    try {
      sessionStorage.setItem(IMPERSONATE_STORAGE_KEY, token)
    } catch {
      // ignore
    }
    await refresh()
  }
  await navigateTo('/exchange/SAMSUNGUSDT', { replace: true })
}
</script>
