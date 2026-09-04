<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">거래 내역</h1>
        <p class="mt-1 text-sm text-slate-400">포지션 매매(청산) 거래내역입니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20" @click="load(true)">
          새로고침
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div class="grid gap-2 md:grid-cols-[360px_180px_minmax(240px,1fr)_120px_160px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="date-input w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="date-input w-full bg-transparent outline-none" />
        </div>
        <input
          v-model.trim="memberKeyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="회원 아이디/이름"
        />
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="검색어를 입력하세요"
        />
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/15" @click="load(true)">검색</button>
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <span class="whitespace-nowrap text-slate-400">표시수</span>
          <input
            v-model.number="pageSizeInput"
            type="number"
            min="1"
            max="500"
            class="w-full bg-transparent text-right outline-none"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-[14px] text-slate-200">
          <thead class="border-b border-[#12314a] text-[13px] text-slate-400">
            <tr>
              <th class="px-3 py-3 text-left">날짜</th>
              <th class="px-3 py-3 text-left">회원 아이디</th>
              <th class="px-3 py-3 text-left">회원 이름</th>
              <th class="px-3 py-3 text-left">총판 이름</th>
              <th class="px-3 py-3 text-left">심볼</th>
              <th class="px-3 py-3 text-left">구분</th>
              <th class="px-3 py-3 text-right">레버리지</th>
              <th class="px-3 py-3 text-right">체결가격</th>
              <th class="px-3 py-3 text-right">체결량</th>
              <th class="px-3 py-3 text-right">실현손익</th>
              <th class="px-3 py-3 text-right">수수료</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="11" class="px-3 py-8 text-center text-slate-500">거래 내역이 없습니다.</td>
            </tr>
            <tr v-for="t in paged" :key="t.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3 font-mono text-slate-300">{{ formatDateTime(t.created_at) }}</td>
              <td class="px-3 py-3 font-mono text-slate-100">{{ t.username }}</td>
              <td class="px-3 py-3 text-slate-200">{{ t.name }}</td>
              <td class="px-3 py-3 text-slate-300">{{ t.affiliateName }}</td>
              <td class="px-3 py-3 font-semibold text-slate-100">{{ t.symbol }}</td>
              <td class="px-3 py-3">
                <span
                  class="rounded px-2 py-1 text-[12px] font-semibold ring-1"
                  :class="tradeResultBadgeClass(t)"
                >
                  {{ tradeResultLabel(t) }}
                </span>
              </td>
              <td class="px-3 py-3 text-right font-mono text-slate-300">x{{ t.leverage }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmtPrice(t.price) }}</td>
              <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmt2(t.qty) }}</td>
              <td class="px-3 py-3 text-right font-mono" :class="t.pnl >= 0 ? 'text-emerald-400' : 'text-blue-400'">
                {{ t.pnl >= 0 ? '+' : '' }}{{ fmt2(t.pnl) }}
              </td>
              <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmt2(t.fee) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="text-sm text-slate-400">페이지 {{ page }} / {{ totalPages }} · 총 {{ filtered.length }}건</div>
        <div class="flex items-center justify-center gap-2" v-if="totalPages > 1">
          <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
          <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
          <button
            v-for="p in pageNumbers"
            :key="`trades-page-${p}`"
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
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type TradeRow = {
  id: number
  created_at: string
  user_id: number
  username: string
  name: string
  affiliateName: string
  symbol: string
  orderType: string
  liquidation?: boolean
  positionSide: string
  leverage: number
  price: number
  qty: number
  pnl: number
  fee: number
}

const { refresh } = useMe()
await refresh()

const items = ref<TradeRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const memberKeyword = ref('')
const DEFAULT_FROM_DATE = '2026-01-01'
const DEFAULT_TO_DATE = new Date().toISOString().slice(0, 10)
const fromDate = ref(DEFAULT_FROM_DATE)
const toDate = ref(DEFAULT_TO_DATE)
const page = ref(1)
const pageSizeInput = ref(10)
const pageSize = computed(() => {
  const n = Number(pageSizeInput.value || 10)
  return Math.max(1, Math.min(500, Number.isFinite(n) ? Math.floor(n) : 10))
})

function fmt2(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPrice(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
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

function tradeResultLabel(t: Pick<TradeRow, 'liquidation' | 'pnl'>) {
  if (Boolean(t?.liquidation)) return '강제청산'
  return Number(t?.pnl || 0) >= 0 ? '수익' : '손실'
}

function tradeResultBadgeClass(t: Pick<TradeRow, 'liquidation' | 'pnl'>) {
  if (Boolean(t?.liquidation)) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
  return Number(t?.pnl || 0) >= 0 ? 'bg-blue-500/15 text-blue-300 ring-blue-400/20' : 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
}

function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const mq = memberKeyword.value.trim().toLowerCase()
  return items.value.filter((t) => {
    if (fromDate.value && dateOnly(t.created_at) < fromDate.value) return false
    if (toDate.value && dateOnly(t.created_at) > toDate.value) return false
    if (mq) {
      const ok = [t.username, t.name].some((v) => String(v).toLowerCase().includes(mq))
      if (!ok) return false
    }
    if (!q) return true
    return [t.symbol, t.orderType, t.positionSide, t.affiliateName, tradeResultLabel(t)].some((v) => String(v).toLowerCase().includes(q))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
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

watch(pageSizeInput, (v) => {
  const next = Math.max(1, Math.min(500, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 10))
  if (next !== Number(v)) pageSizeInput.value = next
  if (page.value > totalPages.value) page.value = totalPages.value
})

async function load(reset = false) {
  if (reset) page.value = 1
  loading.value = true
  try {
    const res = await $fetch<{ items: TradeRow[] }>('/api/admin/trades', { query: { limit: 200, offset: 0 } })
    items.value = res.items || []
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '거래 내역을 불러오지 못했습니다.'
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
</style>
