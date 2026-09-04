<template>
  <div class="space-y-5" :class="{ 'font-landing': type === 'kr' }">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div class="flex gap-1 text-sm">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.type"
            :to="`/markets/${tab.type}`"
            class="rounded-md px-3 py-1.5 font-medium transition"
            :class="type === tab.type ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'"
          >
            {{ tab.label }}
          </NuxtLink>
        </div>
        <h1 class="mt-3 text-xl font-semibold text-white">{{ currentTab?.label }}</h1>
        <p class="mt-1 text-sm text-slate-400">{{ currentTab?.desc }}</p>
      </div>
      <input
        v-model.trim="keyword"
        class="w-56 rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
        placeholder="종목 검색"
      />
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/[0.02]">
      <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">불러오는 중…</div>
      <div v-else-if="error" class="px-4 py-10 text-center text-sm text-rose-300">{{ error }}</div>
      <div v-else-if="filtered.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">종목이 없습니다.</div>
      <div v-else class="divide-y divide-white/5">
        <NuxtLink
          v-for="item in filtered"
          :key="item.symbol"
          :to="`/exchange/${item.symbol}`"
          class="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
              :style="{ background: colorFor(item.base) }"
            >
              {{ item.base.slice(0, 1) }}
            </span>
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-white">
                {{ item.symbol }}
                <span class="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">무기한</span>
              </div>
              <div class="truncate text-xs text-slate-500">{{ item.name }} · {{ item.base }}/USDT</div>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <div class="font-mono text-sm font-semibold text-white">{{ fmtPrice(item.price) }}</div>
            <div class="text-xs font-semibold" :class="item.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              {{ item.changePct >= 0 ? '+' : '' }}{{ item.changePct.toFixed(2) }}%
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

type MarketInstrument = { symbol: string; instId: string; base: string; name: string; price: number; changePct: number }
type MarketsResponse = { coin: MarketInstrument[]; globalStock: MarketInstrument[]; krStock: MarketInstrument[] }

const route = useRoute()
const type = computed(() => String(route.params.type || 'coin'))

const tabs = [
  { type: 'coin', label: '코인선물', desc: '암호화폐 무기한 선물 전 종목' },
  { type: 'global', label: '해외주식', desc: '해외 주식·ETF·원자재 토큰' },
  { type: 'kr', label: '국내주식', desc: '국내 주식·ETF 토큰' }
]
const currentTab = computed(() => tabs.find((t) => t.type === type.value))

const keyword = ref('')
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<MarketsResponse | null>(null)

const items = computed<MarketInstrument[]>(() => {
  if (!data.value) return []
  if (type.value === 'global') return data.value.globalStock
  if (type.value === 'kr') return data.value.krStock
  return data.value.coin
})

const filtered = computed(() => {
  const q = keyword.value.toLowerCase()
  if (!q) return items.value
  return items.value.filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.base.toLowerCase().includes(q))
})

function fmtPrice(v: number) {
  if (!Number.isFinite(v) || v === 0) return '—'
  const digits = v >= 100 ? 2 : v >= 1 ? 4 : 6
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

const PALETTE = ['#f7931a', '#627eea', '#14f195', '#f0b90b', '#4b5563', '#e84142', '#8247e5', '#00d4aa', '#26a17b', '#c026d3']
function colorFor(base: string) {
  let h = 0
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await $fetch<MarketsResponse>('/api/markets/list')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '마켓 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

await load()
</script>
