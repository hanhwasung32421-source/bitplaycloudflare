<template>
  <div class="mx-auto max-w-4xl space-y-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6">
    <h1 class="text-xl font-semibold">Server Error</h1>
    <p class="text-sm text-slate-200">
      아래 내용을 그대로 복사해서 보내주면 바로 수정할 수 있어요.
    </p>

    <div class="rounded-xl bg-black/30 p-4 text-sm">
      <div class="text-slate-400">요약</div>
      <pre class="mt-2 whitespace-pre-wrap break-words font-mono text-slate-200">{{ summary }}</pre>
    </div>

    <div class="rounded-xl bg-black/30 p-4 text-sm">
      <div class="flex items-center justify-between gap-2">
        <div class="text-slate-400">최근 서버 오류(JSON)</div>
        <a class="text-indigo-300 hover:underline" href="/api/debug/last-error" target="_blank">/api/debug/last-error</a>
      </div>
      <pre class="mt-2 whitespace-pre-wrap break-words font-mono text-slate-200">{{ json }}</pre>
    </div>

    <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="clearError({ redirect: '/' })">
      홈으로
    </button>
  </div>
</template>

<script setup lang="ts">
const error = useError()
const { me, refresh } = useMe()
await refresh()

const isSuperAdmin = computed(() => me.value?.role === 'super_admin')

if (!isSuperAdmin.value) {
  await clearError({ redirect: '/' })
}

const summary = computed(() => {
  if (!error.value) return 'unknown error'
  return JSON.stringify(
    {
      statusCode: (error.value as any).statusCode,
      statusMessage: (error.value as any).statusMessage,
      message: (error.value as any).message
    },
    null,
    2
  )
})

const json = computed(() => JSON.stringify(error.value, null, 2))
</script>
