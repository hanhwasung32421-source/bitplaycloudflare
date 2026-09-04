<template>
  <div class="space-y-6">
    <HeaderTabs active="trades" />

    <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
      <h2 class="font-semibold">선물 거래 내역</h2>
      <p class="mt-2 text-sm text-slate-400">청산된 거래(손익 포함) 내역입니다.</p>

      <div class="mt-4 space-y-2">
        <div v-if="trades.length === 0" class="text-sm text-slate-400">거래 내역이 없습니다.</div>
        <div v-for="t in trades" :key="t.id" class="rounded-xl bg-[#031019] p-4 text-sm ring-1 ring-cyan-500/10">
          <div class="flex justify-between">
            <div class="flex items-center gap-2 font-medium">
              <span>{{ t.symbol }} · {{ t.side.toUpperCase() }} · x{{ t.leverage }}</span>
              <span
                class="rounded px-2 py-1 text-[10px] font-semibold ring-1"
                :class="tradeResultBadgeClass(t)"
              >
                {{ tradeResultLabel(t) }}
              </span>
            </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const trades = ref<any[]>([])
const data = await $fetch<any>('/api/account')
trades.value = data.trades

function tradeResultLabel(t: any) {
  if (Boolean(t?.liquidation)) return '강제청산'
  return Number(t?.pnl || 0) >= 0 ? '수익' : '손실'
}

function tradeResultBadgeClass(t: any) {
  if (Boolean(t?.liquidation)) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
  return Number(t?.pnl || 0) >= 0 ? 'bg-blue-500/15 text-blue-300 ring-blue-400/20' : 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
}
</script>
