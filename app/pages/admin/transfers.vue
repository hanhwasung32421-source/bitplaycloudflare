<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">입출금 내역</h1>
        <p class="mt-1 text-sm text-slate-400">현재는 관리자 가상 입금 기록만 표시됩니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20" @click="load(true)">새로고침</button>
      </div>
    </div>

    <div class="rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div class="flex flex-wrap items-center gap-2 text-sm text-slate-200">
        <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2">총입금: <span class="font-mono">{{ fmt2(summary.totalInUsdt) }}</span> USDT</span>
        <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2">총출금: <span class="font-mono">{{ fmt2(summary.totalOutUsdt) }}</span> USDT</span>
      </div>

      <div class="mt-3 grid gap-2 md:grid-cols-[360px_180px_minmax(240px,1fr)_120px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="date-input w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="date-input w-full bg-transparent outline-none" />
        </div>
        <select v-model="typeFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">유형</option>
          <option value="입금">입금</option>
          <option value="출금">출금</option>
        </select>
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="검색어를 입력하세요"
        />
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/15" @click="load(true)">검색</button>
      </div>

      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full text-xs text-slate-200">
          <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
            <tr>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('username')">회원 아이디<span class="sort-icon">{{ sortArrow('username') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('name')">회원 이름<span class="sort-icon">{{ sortArrow('name') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('affiliateName')">총판 이름<span class="sort-icon">{{ sortArrow('affiliateName') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('type')">입금 유형<span class="sort-icon">{{ sortArrow('type') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-right" @click="toggleSort('amount_usdt')">USDT 금액<span class="sort-icon">{{ sortArrow('amount_usdt') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('status')">입금 상태<span class="sort-icon">{{ sortArrow('status') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('created_at')">입금 일시<span class="sort-icon">{{ sortArrow('created_at') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('admin')">처리자<span class="sort-icon">{{ sortArrow('admin') || ' ⇅' }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="8" class="px-3 py-8 text-center text-slate-500">입출금 내역이 없습니다.</td>
            </tr>
            <tr v-for="r in paged" :key="`${r.created_at}-${r.user_id}-${r.amount_usdt}`" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="whitespace-nowrap px-3 py-3 font-mono text-slate-100">{{ r.username }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-slate-200">{{ r.name }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-slate-300">{{ r.affiliateName }}</td>
              <td class="whitespace-nowrap px-3 py-3">{{ r.type }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right font-mono text-slate-200">{{ fmt2(r.amount_usdt) }}</td>
              <td class="whitespace-nowrap px-3 py-3">
                <span class="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">{{ r.status }}</span>
              </td>
              <td class="whitespace-nowrap px-3 py-3 font-mono text-slate-300">{{ formatDateTime(r.created_at) }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-slate-300">{{ r.admin }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <button
          v-for="p in pageNumbers"
          :key="`transfers-page-${p}`"
          class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
          :class="p === page ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
          @click="page = p"
        >
          {{ p }}
        </button>
        <span v-if="showPageTail" class="px-1 text-sm text-slate-500">~</span>
        <button
          v-if="showPageTail"
          class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
          @click="page = totalPages"
        >
          {{ totalPages }}
        </button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type TransferRow = {
  type: string
  user_id: number
  username: string
  name: string
  affiliateName: string
  amount_usdt: number
  status: string
  created_at: string
  admin: string
}

const { refresh } = useMe()
await refresh()

const items = ref<TransferRow[]>([])
const summary = ref({ totalInUsdt: 0, totalOutUsdt: 0 })
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const typeFilter = ref('')
const DEFAULT_FROM_DATE = '2026-01-01'
const DEFAULT_TO_DATE = new Date().toISOString().slice(0, 10)
const fromDate = ref(DEFAULT_FROM_DATE)
const toDate = ref(DEFAULT_TO_DATE)
const page = ref(1)
const pageSize = 10

function fmt2(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
function formatDateTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d)
}

type SortKey = 'username' | 'name' | 'affiliateName' | 'type' | 'amount_usdt' | 'status' | 'created_at' | 'admin'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function sortArrow(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const rows = items.value.filter((r) => {
    if (typeFilter.value && r.type !== typeFilter.value) return false
    if (fromDate.value && dateOnly(r.created_at) < fromDate.value) return false
    if (toDate.value && dateOnly(r.created_at) > toDate.value) return false
    if (!q) return true
    return [r.username, r.name, r.affiliateName, r.admin].some((v) => String(v).toLowerCase().includes(q))
  })

  if (!sortKey.value) return rows
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})
const pageNumbers = computed(() => {
  const total = totalPages.value
  const start = Math.floor((page.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showPageTail = computed(() => {
  const nums = pageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < totalPages.value
})

watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

async function load(reset = false) {
  if (reset) page.value = 1
  loading.value = true
  try {
    const res = await $fetch<{ items: TransferRow[]; summary: { totalInUsdt: number; totalOutUsdt: number } }>('/api/admin/transfers', {
      query: { limit: 200, offset: 0 }
    })
    items.value = res.items || []
    summary.value = res.summary || { totalInUsdt: 0, totalOutUsdt: 0 }
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '입출금 내역을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load(true).catch(() => {})
})
</script>

<style scoped>
.date-input {
  position: relative;
  min-width: 140px;
  padding-right: 24px;
  color-scheme: dark;
}

.date-input::-webkit-calendar-picker-indicator {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.9;
}

.sortable-th {
  color: rgb(203 213 225 / 0.9);
  transition: color 0.15s ease;
}
.sortable-th:hover {
  color: #fff;
}
.sortable-th .sort-icon {
  margin-left: 2px;
  font-size: 10px;
  color: rgb(148 163 184 / 0.6);
}
.sortable-th:hover .sort-icon {
  color: rgb(203 213 225 / 0.9);
}
</style>
