<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-black text-white">마켓</h1>
      <span class="flex items-center gap-1.5 text-xs text-emerald-400">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        실시간 시세
      </span>
    </div>

    <div v-if="loading" class="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-slate-500">불러오는 중…</div>
    <div v-else-if="error" class="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-rose-300">{{ error }}</div>

    <template v-else-if="overview">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <!-- 마켓 개요 -->
        <div class="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-white">마켓 개요</h2>
            <span class="text-xs text-slate-500">24시간 기준</span>
          </div>
          <div class="mt-5 grid grid-cols-3 gap-4">
            <div>
              <div class="text-xs text-slate-500">총 거래대금</div>
              <div class="mt-1 text-xl font-bold text-white">
                {{ fmtUsdShort(overview.totalVolUsd) }}
                <span class="ml-1 text-xs font-semibold text-emerald-400">+0.00%</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500">거래 종목</div>
              <div class="mt-1 text-xl font-bold text-white">{{ overview.totalCount }}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500">BTC 거래 비중</div>
              <div class="mt-1 text-xl font-bold text-white">{{ overview.btcSharePct.toFixed(1) }}%</div>
            </div>
          </div>
          <div class="mt-5 flex h-2 overflow-hidden rounded-full bg-white/10">
            <div class="bg-emerald-500" :style="{ width: upsharePct + '%' }" />
            <div class="bg-rose-500" :style="{ width: 100 - upsharePct + '%' }" />
          </div>
          <div class="mt-2 flex items-center gap-4 text-xs text-slate-400">
            <span>상승 <span class="text-emerald-400">{{ overview.upCount }}</span></span>
            <span>보합 {{ overview.flatCount }}</span>
            <span>하락 <span class="text-rose-400">{{ overview.downCount }}</span></span>
          </div>
        </div>

        <!-- 변동 상위 -->
        <div class="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 class="text-base font-semibold text-white">변동 상위</h2>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div class="mb-2 text-xs text-slate-500">상승</div>
              <div class="space-y-3">
                <NuxtLink v-for="i in overview.topGainers" :key="i.symbol" :to="`/exchange/${i.symbol}`" class="flex items-center justify-between text-sm hover:opacity-80">
                  <span class="font-semibold text-white">{{ i.base }}</span>
                  <span class="font-mono text-emerald-400">+{{ i.changePct.toFixed(2) }}%</span>
                </NuxtLink>
              </div>
            </div>
            <div>
              <div class="mb-2 text-xs text-slate-500">하락</div>
              <div class="space-y-3">
                <NuxtLink v-for="i in overview.topLosers" :key="i.symbol" :to="`/exchange/${i.symbol}`" class="flex items-center justify-between text-sm hover:opacity-80">
                  <span class="font-semibold text-white">{{ i.base }}</span>
                  <span class="font-mono text-rose-400">{{ i.changePct.toFixed(2) }}%</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 카테고리 탭 -->
      <div class="flex flex-wrap gap-1 border-b border-white/10 text-sm">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          type="button"
          class="border-b-2 px-3 py-2 font-medium transition"
          :class="activeCategory === tab.key ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="activeCategory = tab.key; page = 1"
        >
          {{ tab.label }} <span class="text-xs text-slate-500">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 정렬 프리셋 + 검색 -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex gap-1 rounded-lg bg-white/5 p-1 text-sm">
          <button
            v-for="preset in sortPresets"
            :key="preset.key"
            type="button"
            class="rounded-md px-3 py-1.5 font-medium transition"
            :class="activePreset === preset.key ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'"
            @click="applyPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
          <input
            v-model.trim="keyword"
            class="w-56 rounded-md border border-white/10 bg-[#06101b] py-2 pl-8 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            placeholder="종목 검색"
          />
        </div>
      </div>

      <!-- 테이블 -->
      <div class="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="border-b border-white/10 text-xs text-slate-500">
            <tr>
              <th class="w-10 px-4 py-3"></th>
              <th class="cursor-pointer select-none px-2 py-3 text-left" @click="toggleSort('name')">이름{{ sortArrow('name') }}</th>
              <th class="cursor-pointer select-none px-2 py-3 text-right" @click="toggleSort('price')">가격{{ sortArrow('price') }}</th>
              <th class="cursor-pointer select-none px-2 py-3 text-right" @click="toggleSort('change')">24시간 변동{{ sortArrow('change') }}</th>
              <th class="cursor-pointer select-none px-2 py-3 text-right" @click="toggleSort('volume')">24시간 거래대금{{ sortArrow('volume') }}</th>
              <th class="px-4 py-3 text-right">거래</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-if="pagedItems.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-slate-500">종목이 없습니다.</td>
            </tr>
            <tr v-for="item in pagedItems" :key="item.symbol" class="hover:bg-white/[0.03]">
              <td class="px-4 py-3">
                <button type="button" class="text-lg leading-none" :class="isFavorite(item.symbol) ? 'text-amber-300' : 'text-slate-600 hover:text-slate-400'" @click="toggleFavorite(item.symbol)">
                  {{ isFavorite(item.symbol) ? '★' : '☆' }}
                </button>
              </td>
              <td class="px-2 py-3">
                <NuxtLink :to="`/exchange/${item.symbol}`" class="flex items-center gap-2.5">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" :style="{ background: colorFor(item.base) }">
                    {{ item.base.slice(0, 1) }}
                  </span>
                  <span>
                    <div class="font-semibold text-white">{{ item.base }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.categoryLabel }}</div>
                  </span>
                </NuxtLink>
              </td>
              <td class="px-2 py-3 text-right font-mono text-white">{{ fmtPrice(item.price) }}</td>
              <td class="px-2 py-3 text-right font-mono font-semibold" :class="item.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ item.changePct >= 0 ? '+' : '' }}{{ item.changePct.toFixed(2) }}%
              </td>
              <td class="px-2 py-3 text-right font-mono text-slate-300">{{ fmtUsdShort(item.volUsd) }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink :to="`/exchange/${item.symbol}`" class="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">거래</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <button
          v-for="p in pageNumbers"
          :key="`market-page-${p}`"
          class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
          :class="p === page ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
          @click="page = p"
        >
          {{ p }}
        </button>
        <span v-if="showPageTail" class="px-1 text-sm text-slate-500">…</span>
        <button v-if="showPageTail" class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10" @click="page = totalPages">{{ totalPages }}</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

type MarketInstrument = {
  symbol: string
  base: string
  name: string
  category: 'coin' | 'stock' | 'etf' | 'commodity' | 'krStock'
  categoryLabel: string
  price: number
  changePct: number
  volUsd: number
}
type MarketOverview = {
  items: MarketInstrument[]
  totalVolUsd: number
  totalCount: number
  btcSharePct: number
  upCount: number
  downCount: number
  flatCount: number
  topGainers: MarketInstrument[]
  topLosers: MarketInstrument[]
  categoryCounts: Record<MarketInstrument['category'], number>
}

const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<MarketOverview | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    overview.value = await $fetch<MarketOverview>('/api/markets/overview')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '마켓 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}
await load()

const upsharePct = computed(() => {
  if (!overview.value || overview.value.totalCount === 0) return 50
  return (overview.value.upCount / overview.value.totalCount) * 100
})

type CategoryKey = 'all' | 'favorite' | MarketInstrument['category']
const activeCategory = ref<CategoryKey>('all')
const categoryTabs = computed(() => {
  const c = overview.value?.categoryCounts
  return [
    { key: 'favorite' as CategoryKey, label: '즐겨찾기', count: favorites.value.length },
    { key: 'all' as CategoryKey, label: '전체', count: overview.value?.totalCount ?? 0 },
    { key: 'coin' as CategoryKey, label: '암호화폐', count: c?.coin ?? 0 },
    { key: 'stock' as CategoryKey, label: '해외주식', count: c?.stock ?? 0 },
    { key: 'etf' as CategoryKey, label: 'ETF', count: c?.etf ?? 0 },
    { key: 'commodity' as CategoryKey, label: '원자재', count: c?.commodity ?? 0 },
    { key: 'krStock' as CategoryKey, label: '국내주식', count: c?.krStock ?? 0 }
  ]
})

// 즐겨찾기: 로그인 계정과 무관하게 이 브라우저에만 저장(가벼운 클라이언트 전용 기능)
const FAVORITES_KEY = 'usdetrade_market_favorites'
const favorites = ref<string[]>([])
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    favorites.value = raw ? JSON.parse(raw) : []
  } catch {
    favorites.value = []
  }
}
function isFavorite(symbol: string) {
  return favorites.value.includes(symbol)
}
function toggleFavorite(symbol: string) {
  const next = isFavorite(symbol) ? favorites.value.filter((s) => s !== symbol) : [...favorites.value, symbol]
  favorites.value = next
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}
onMounted(loadFavorites)

type SortKey = 'name' | 'price' | 'change' | 'volume'
const sortKey = ref<SortKey>('volume')
const sortDir = ref<'asc' | 'desc'>('desc')
function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 'asc' : 'desc'
  }
  activePreset.value = null
}
function sortArrow(key: SortKey) {
  if (sortKey.value !== key) return ' ⇅'
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const sortPresets = [
  { key: 'all', label: '전체' },
  { key: 'gainers', label: '상승률 상위' },
  { key: 'losers', label: '하락률 상위' },
  { key: 'volume', label: '거래대금 상위' }
] as const
const activePreset = ref<(typeof sortPresets)[number]['key'] | null>('all')
function applyPreset(key: (typeof sortPresets)[number]['key']) {
  activePreset.value = key
  if (key === 'all' || key === 'volume') {
    sortKey.value = 'volume'
    sortDir.value = 'desc'
  } else if (key === 'gainers') {
    sortKey.value = 'change'
    sortDir.value = 'desc'
  } else if (key === 'losers') {
    sortKey.value = 'change'
    sortDir.value = 'asc'
  }
  page.value = 1
}

const keyword = ref('')

const filtered = computed(() => {
  const all = overview.value?.items ?? []
  let list = all
  if (activeCategory.value === 'favorite') list = list.filter((i) => isFavorite(i.symbol))
  else if (activeCategory.value !== 'all') list = list.filter((i) => i.category === activeCategory.value)
  const q = keyword.value.toLowerCase()
  if (q) list = list.filter((i) => i.base.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))

  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (sortKey.value === 'name') return a.base.localeCompare(b.base) * dir
    if (sortKey.value === 'price') return (a.price - b.price) * dir
    if (sortKey.value === 'change') return (a.changePct - b.changePct) * dir
    return (a.volUsd - b.volUsd) * dir
  })
})

const page = ref(1)
const pageSize = 20
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pagedItems = computed(() => {
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

function fmtPrice(v: number) {
  if (!Number.isFinite(v) || v === 0) return '—'
  const digits = v >= 100 ? 2 : v >= 1 ? 4 : 6
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}
function fmtUsdShort(v: number) {
  if (!Number.isFinite(v) || v <= 0) return '$0'
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`
  return `$${v.toFixed(2)}`
}
const PALETTE = ['#f7931a', '#627eea', '#14f195', '#f0b90b', '#4b5563', '#e84142', '#8247e5', '#00d4aa', '#26a17b', '#c026d3']
function colorFor(base: string) {
  let h = 0
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
</script>
