<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">포지션 목록</h1>
        <p class="mt-1 text-sm text-slate-400">실시간 오픈 포지션을 1초마다 갱신합니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <span class="rounded-md border border-cyan-500/10 bg-cyan-500/5 px-3 py-2 text-xs font-mono text-slate-300">
          {{ lastUpdatedText }}
        </span>
      </div>
    </div>

    <div>
      <div class="grid gap-2 rounded-xl border border-[#12314a]/40 bg-[#03101d]/40 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.18)] md:grid-cols-[180px_minmax(220px,1fr)_120px_120px_120px]">
        <select
          v-model="memberFilter"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
        >
          <option value="">회원 이름</option>
          <option v-for="name in memberOptions" :key="name" :value="name">{{ name }}</option>
        </select>

        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
          placeholder="검색어를 입력하세요"
        />

        <select
          v-model="symbolFilter"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
        >
          <option value="">심볼</option>
          <option v-for="sym in symbolOptions" :key="sym" :value="sym">{{ sym }}</option>
        </select>

        <select
          v-model="positionFilter"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
        >
          <option value="">포지션</option>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>

        <select
          v-model="settledFilter"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
        >
          <option value="">접속여부</option>
          <option value="접속">접속</option>
          <option value="미접속">미접속</option>
        </select>
      </div>

      <div class="mt-3">
        <table class="w-full text-[12px] leading-tight text-slate-200">
          <thead class="border-b border-[#12314a] text-[12px] text-slate-400">
            <tr>
              <th class="whitespace-nowrap px-2 py-3 text-left">회원 이름</th>
              <th class="whitespace-nowrap px-2 py-3 text-left">소속총판</th>
              <th class="whitespace-nowrap px-2 py-3 text-left">심볼</th>
              <th class="whitespace-nowrap px-2 py-3 text-left">주문타입</th>
              <th class="whitespace-nowrap px-2 py-3 text-left">포지션</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">증거금</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">레버리지</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">진입가격</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">계약수량</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">청산가격</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">수익</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">수익률</th>
              <th class="whitespace-nowrap px-2 py-3 text-right">수수료</th>
              <th class="whitespace-nowrap px-2 py-3 text-center">접속확인</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filteredItems.length === 0" class="border-b border-[#0d2438]">
              <td colspan="14" class="px-2 py-10 text-center text-slate-500">표시할 포지션이 없습니다.</td>
            </tr>
            <tr v-for="row in pagedItems" :key="row.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="whitespace-nowrap px-2 py-2.5">
                <div class="font-semibold text-slate-100">{{ row.username }}</div>
                <div class="mt-0.5 font-mono text-[10px] text-slate-500">(#{{ row.user_id }})</div>
              </td>
              <td class="whitespace-nowrap px-2 py-2.5 text-slate-300">{{ row.affiliate }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 font-semibold text-slate-100">{{ row.symbol }}</td>
              <td class="whitespace-nowrap px-2 py-2.5">{{ row.orderType }}</td>
              <td class="whitespace-nowrap px-2 py-2.5">
                <span
                  class="rounded px-2 py-1 text-[13px] font-semibold ring-1"
                  :class="row.position === 'LONG' ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-[#151f35] text-[#60a5fa] ring-[#3b82f6]/30'"
                >
                  {{ row.position }}
                </span>
              </td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">{{ fmtNum(row.margin) }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">{{ row.leverage }}x</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">{{ fmtPrice(row.entryPrice) }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">{{ fmtQty(row.qty) }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums">{{ fmtPrice(row.liqPrice) }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums" :class="profitClass(row.pnl)">
                {{ signed(row.pnl) }}
              </td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums" :class="profitClass(row.roe)">
                {{ signed(row.roe, '%') }}
              </td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums text-slate-300">{{ fmtNum(row.fee) }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-center">
                <span
                  class="rounded px-2 py-1 text-[10px] font-semibold"
                  :class="row.online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#2b3445] text-slate-200'"
                >
                  {{ row.online ? '접속' : '미접속' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <button
          v-for="p in pageNumbers"
          :key="`positions-page-${p}`"
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

type AdminPositionRow = {
  id: number
  user_id: number
  username: string
  affiliate: string
  symbol: string
  orderType: string
  position: 'LONG' | 'SHORT'
  margin: number
  leverage: number
  entryPrice: number
  qty: number
  liqPrice: number
  pnl: number
  roe: number
  fee: number
  online: boolean
  created_at: string
}

const { refresh } = useMe()
await refresh()

const items = ref<AdminPositionRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const memberFilter = ref('')
const symbolFilter = ref('')
const positionFilter = ref('')
const settledFilter = ref('')
const page = ref(1)
const pageSize = 10
const lastUpdated = ref('')
let pollTimer: any = null
let loadingNow = false

const memberOptions = computed(() => Array.from(new Set(items.value.map((r) => r.username))).sort())
const symbolOptions = computed(() => Array.from(new Set(items.value.map((r) => r.symbol))).sort())

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((row) => {
    if (memberFilter.value && row.username !== memberFilter.value) return false
    if (symbolFilter.value && row.symbol !== symbolFilter.value) return false
    if (positionFilter.value && row.position !== positionFilter.value) return false
    if (settledFilter.value === '접속' && !row.online) return false
    if (settledFilter.value === '미접속' && row.online) return false
    if (!q) return true
    return [row.username, row.symbol, row.position, row.affiliate, String(row.user_id)].some((v) => String(v).toLowerCase().includes(q))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize)))
const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
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
const lastUpdatedText = computed(() => (lastUpdated.value ? `실시간 갱신 ${lastUpdated.value}` : '실시간 갱신 대기'))

watch(filteredItems, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

function fmtNum(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtQty(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPrice(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
function signed(v: number, suffix = '') {
  const n = Number(v || 0)
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`
}
function profitClass(v: number) {
  if (Number(v) > 0) return 'text-emerald-400'
  if (Number(v) < 0) return 'text-blue-400'
  return 'text-slate-300'
}

async function load(silent = false) {
  if (loadingNow) return
  loadingNow = true
  if (!silent) loading.value = true
  try {
    const data = await $fetch<{ items: AdminPositionRow[]; serverTime: string }>('/api/admin/positions')
    items.value = data.items || []
    lastUpdated.value = new Date().toLocaleTimeString('ko-KR', { hour12: false })
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '포지션 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
    loadingNow = false
  }
}

onMounted(async () => {
  await load()
  pollTimer = setInterval(() => {
    load(true).catch(() => {})
  }, 1000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
})
</script>
