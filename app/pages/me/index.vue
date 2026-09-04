<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">내 계정</h1>
      <p class="mt-2 text-sm text-slate-400">계정 정보 및 거래 현황</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">가상 잔고 (USDT)</div>
          <div class="mt-1 font-mono text-2xl">{{ balance.toFixed(2) }}</div>
        </div>
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">오픈 포지션</div>
          <div class="mt-1 font-mono text-2xl">{{ positions.length }}</div>
        </div>
        <div class="rounded-xl bg-black/20 p-4">
          <div class="text-xs text-slate-400">최근 거래</div>
          <div class="mt-1 font-mono text-2xl">{{ trades.length }}</div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-end justify-between">
          <h2 class="font-semibold">오픈 포지션</h2>
          <NuxtLink to="/exchange/SAMSUNGUSDT" class="text-sm text-indigo-300 hover:underline">거래로 이동</NuxtLink>
        </div>
        <div class="mt-3 space-y-2">
          <div v-if="positions.length === 0" class="text-sm text-slate-400">오픈 포지션이 없습니다.</div>
          <div v-for="p in positions" :key="p.id" class="rounded-xl bg-black/20 p-4 text-sm">
            <div class="flex justify-between">
              <div class="font-medium">{{ p.symbol }} · {{ p.side.toUpperCase() }}</div>
              <div class="font-mono">x{{ p.leverage }}</div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>수량: <span class="font-mono text-slate-200">{{ p.qty }}</span></div>
              <div>진입가: <span class="font-mono text-slate-200">{{ p.entry_price }}</span></div>
              <div>증거금: <span class="font-mono text-slate-200">{{ p.margin }}</span></div>
              <div>생성: <span class="font-mono text-slate-200">{{ p.created_at.slice(0, 19) }}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-end justify-between">
          <h2 class="font-semibold">거래 내역(최근 50)</h2>
          <NuxtLink to="/profit" class="text-sm text-indigo-300 hover:underline">수익인증</NuxtLink>
        </div>
        <div class="mt-3 space-y-2">
          <div v-if="trades.length === 0" class="text-sm text-slate-400">거래 내역이 없습니다.</div>
          <div v-for="t in trades" :key="t.id" class="rounded-xl bg-black/20 p-4 text-sm">
            <div class="flex justify-between">
              <div class="font-medium">{{ t.symbol }} · {{ t.side.toUpperCase() }} · x{{ t.leverage }}</div>
              <div class="font-mono" :class="t.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ t.pnl >= 0 ? '+' : '' }}{{ Number(t.pnl).toFixed(2) }} USDT
              </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>수량: <span class="font-mono text-slate-200">{{ t.qty }}</span></div>
              <div>진입/청산: <span class="font-mono text-slate-200">{{ t.entry_price }} → {{ t.exit_price }}</span></div>
              <div>시간: <span class="font-mono text-slate-200">{{ t.created_at.slice(0, 19) }}</span></div>
              <div>ID: <span class="font-mono text-slate-200">#{{ t.id }}</span></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const balance = ref(0)
const positions = ref<any[]>([])
const trades = ref<any[]>([])

const data = await $fetch<any>('/api/account')
balance.value = data.balance.usdt
positions.value = data.positions
trades.value = data.trades
</script>
