<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-xl font-semibold">관리자 로그인</h1>
    <p class="mt-1 text-sm text-slate-400">관리자 페이지는 로그인만 가능합니다.</p>

    <form class="mt-6 space-y-3" @submit.prevent="onSubmit">
      <div>
        <label class="text-sm text-slate-300">아이디</label>
        <input v-model.trim="username" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="text-sm text-slate-300">비밀번호</label>
        <input v-model="password" type="password" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>
      <button class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400" :disabled="loading">
        로그인
      </button>
      <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
      <p class="text-xs text-slate-500">
        기본 총관리자 계정: <span class="font-mono">admin</span> / <span class="font-mono">1121</span>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
const { refresh } = useMe()
const username = ref('admin')
const password = ref('1121')
const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  loading.value = true
  error.value = null
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { username: username.value, password: password.value } })
    await refresh()
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

