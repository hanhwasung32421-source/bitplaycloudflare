<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">실시간 접속</h1>
        <p class="mt-1 text-sm text-slate-400">1초마다 갱신됩니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <span class="rounded-md border border-cyan-500/10 bg-cyan-500/5 px-3 py-2 text-xs font-mono text-slate-300">{{ lastUpdatedText }}</span>
      </div>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="grid gap-2 md:grid-cols-[minmax(240px,1fr)_160px]">
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="검색어를 입력하세요"
        />
        <select v-model="roleFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">유저권한</option>
          <option value="super_admin">관리자</option>
          <option value="admin">부관리자</option>
          <option value="user">회원</option>
        </select>
      </div>

      <div class="mt-4 overflow-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-left">회원 ID</th>
              <th class="px-3 py-3 text-left">회원 이름</th>
              <th class="px-3 py-3 text-left">권한</th>
              <th class="px-3 py-3 text-left">IP</th>
              <th class="px-3 py-3 text-left">최근 접속</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="5" class="px-3 py-8 text-center text-slate-500">접속중인 유저가 없습니다.</td>
            </tr>
            <tr v-for="u in filtered" :key="u.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3 font-mono text-slate-300">#{{ u.id }}</td>
              <td class="px-3 py-3 font-semibold text-slate-100">{{ u.username }}</td>
              <td class="px-3 py-3 text-slate-300">{{ u.role }}</td>
              <td class="px-3 py-3 font-mono text-slate-300">{{ u.ip || '—' }}</td>
              <td class="px-3 py-3 font-mono text-slate-400">{{ u.lastSeenAt ? formatTime(u.lastSeenAt) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type OnlineRow = {
  id: number
  username: string
  role: string
  roleId: string
  ip: string | null
  lastSeenAt: string | null
  online: boolean
}

const { refresh } = useMe()
await refresh()

const items = ref<OnlineRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const roleFilter = ref('')
const lastUpdated = ref('')
let timer: any = null
let loadingNow = false

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((u) => {
    if (roleFilter.value === 'user' && u.roleId !== 'user') return false
    if (roleFilter.value === 'super_admin' && u.roleId !== 'super_admin') return false
    if (roleFilter.value === 'admin' && (u.roleId === 'user' || u.roleId === 'super_admin')) return false
    if (!q) return true
    return [u.username, String(u.id), u.ip || ''].some((v) => String(v).toLowerCase().includes(q))
  })
})

const lastUpdatedText = computed(() => (lastUpdated.value ? `갱신 ${lastUpdated.value}` : '갱신 대기'))

function formatTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d)
}

async function load(silent = false) {
  if (loadingNow) return
  loadingNow = true
  if (!silent) loading.value = true
  try {
    const res = await $fetch<{ items: OnlineRow[] }>('/api/admin/online')
    items.value = res.items || []
    lastUpdated.value = new Date().toLocaleTimeString('ko-KR', { hour12: false })
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '실시간 접속 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
    loadingNow = false
  }
}

onMounted(async () => {
  await load()
  timer = setInterval(() => load(true).catch(() => {}), 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
})
</script>

