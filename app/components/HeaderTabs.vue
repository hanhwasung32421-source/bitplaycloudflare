<template>
  <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">투자내역</h1>
        <p class="mt-1 text-sm text-slate-400">첨부 화면에 맞춰 탭 구조로 구성했습니다. (추후 동일 UI로 디테일 수정)</p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 text-sm">
      <NuxtLink
        to="/invest/balance"
        class="rounded-md px-3 py-2 ring-1 transition"
        :class="active === 'balance' ? 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/30' : 'bg-[#020b16] text-slate-300 ring-white/10 hover:bg-cyan-500/10 hover:text-white'"
      >
        잔액
      </NuxtLink>
      <NuxtLink
        to="/invest/orders"
        class="rounded-md px-3 py-2 ring-1 transition"
        :class="active === 'orders' ? 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/30' : 'bg-[#020b16] text-slate-300 ring-white/10 hover:bg-cyan-500/10 hover:text-white'"
      >
        선물 주문 내역
      </NuxtLink>
      <NuxtLink
        to="/invest/trades"
        class="rounded-md px-3 py-2 ring-1 transition"
        :class="active === 'trades' ? 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/30' : 'bg-[#020b16] text-slate-300 ring-white/10 hover:bg-cyan-500/10 hover:text-white'"
      >
        선물 거래 내역
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ active: 'balance' | 'orders' | 'trades' }>()
</script>
