<template>
  <div class="space-y-6">
    <HeaderTabs active="orders" />

    <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
      <h2 class="font-semibold">선물 주문 내역</h2>
      <p class="mt-2 text-sm text-slate-400">최근 주문/포지션 내역을 확인할 수 있습니다.</p>

      <div class="mt-4 overflow-auto">
        <table class="w-full text-xs">
          <thead class="text-slate-500">
            <tr class="text-left">
              <th class="py-2">코인</th>
              <th class="py-2">포지션</th>
              <th class="py-2">수량</th>
              <th class="py-2">진입가격</th>
              <th class="py-2">증거금</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="positions.length === 0" class="border-t border-cyan-500/10">
              <td colspan="5" class="py-3 text-slate-400">데이터가 없습니다.</td>
            </tr>
            <tr v-for="p in positions" :key="p.id" class="border-t border-cyan-500/10">
              <td class="py-2 font-mono">{{ p.symbol }}</td>
              <td class="py-2" :class="p.side === 'long' ? 'text-emerald-300' : 'text-rose-300'">
                {{ p.side.toUpperCase() }} x{{ p.leverage }}
              </td>
              <td class="py-2 font-mono">{{ Number(p.qty).toFixed(6) }}</td>
              <td class="py-2 font-mono">{{ Number(p.entry_price).toFixed(2) }}</td>
              <td class="py-2 font-mono">{{ Number(p.margin).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const positions = ref<any[]>([])
const data = await $fetch<any>('/api/account')
positions.value = data.positions
</script>
