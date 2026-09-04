<template>
  <div class="min-h-dvh">
    <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <NuxtLink to="/" class="font-semibold tracking-tight">
          {{ appName }}
        </NuxtLink>

        <nav class="flex items-center gap-2 text-sm">
          <NuxtLink to="/exchange/BTCUSDT" class="rounded-md px-3 py-1 hover:bg-white/10">거래</NuxtLink>
          <NuxtLink to="/profit" class="rounded-md px-3 py-1 hover:bg-white/10">수익인증</NuxtLink>
          <NuxtLink to="/me" class="rounded-md px-3 py-1 hover:bg-white/10">내 계정</NuxtLink>
          <NuxtLink to="/admin" class="rounded-md px-3 py-1 hover:bg-white/10">관리자</NuxtLink>
        </nav>

        <div class="flex items-center gap-2 text-sm">
          <template v-if="me">
            <span class="hidden sm:inline text-slate-300">{{ me.username }}</span>
            <button class="rounded-md bg-white/10 px-3 py-1 hover:bg-white/15" @click="logout">
              로그아웃
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/auth/login" class="rounded-md bg-white/10 px-3 py-1 hover:bg-white/15">로그인</NuxtLink>
            <NuxtLink to="/auth/register" class="rounded-md bg-indigo-500 px-3 py-1 hover:bg-indigo-400">가입</NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>

    <footer class="mx-auto max-w-6xl px-4 pb-10 pt-6 text-xs text-slate-500">
      본 프로젝트는 <span class="font-medium">모의 거래(가상 USDT)</span> 데모입니다. 실제 입금/출금, 실제 거래 체결 기능은 포함하지 않습니다.
    </footer>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName

const { me, refresh } = useMe()
await refresh()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  await refresh()
  await navigateTo('/')
}
</script>

