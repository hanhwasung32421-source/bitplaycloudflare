<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">내 지갑</h1>
          <p class="mt-2 text-sm text-slate-400">보유 USDT 잔고와 자산 정보를 확인할 수 있습니다.</p>
        </div>
        <button
          v-if="telegramUrl"
          type="button"
          class="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"
          title="고객센터 텔레그램"
          @click="openTelegram"
        >
          <TelegramIcon class="h-5 w-5" />
          <span class="hidden sm:inline">고객센터</span>
        </button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">USDT 잔고</div>
        <div class="mt-1 font-mono text-2xl">{{ fmtKrw(balance) }}</div>
        <div class="mt-0.5 font-mono text-sm text-slate-400">{{ balance.toFixed(2) }} USDT</div>
      </div>

      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">입금요청 (원화)</div>
        <div class="mt-2 flex items-center gap-2">
          <input
            v-model="krwInput"
            type="number"
            min="0"
            step="1"
            placeholder="입금할 금액(원)"
            class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/40"
          />
          <span class="whitespace-nowrap text-sm text-slate-400">원</span>
        </div>
        <div class="mt-1 text-xs text-slate-500">≈ {{ usdtPreview(krwInput) }} USDT</div>
        <button
          type="button"
          class="mt-3 w-full rounded-md bg-[#1d4ed8] px-3 py-2 text-sm font-medium text-white hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmitDeposit || submittingDeposit"
          @click="submitDepositRequest"
        >
          입금요청
        </button>
      </div>

      <div class="rounded-2xl border border-cyan-500/10 bg-[#05111d]/90 p-5 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <div class="text-sm text-slate-400">출금요청 (원화)</div>
        <div class="mt-2 flex items-center gap-2">
          <input
            v-model="krwWithdrawInput"
            type="number"
            min="0"
            step="1"
            placeholder="출금할 금액(원)"
            class="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/40"
          />
          <span class="whitespace-nowrap text-sm text-slate-400">원</span>
        </div>
        <div class="mt-1 text-xs text-slate-500">≈ {{ usdtPreview(krwWithdrawInput) }} USDT</div>
        <button
          type="button"
          class="mt-3 w-full rounded-md bg-[#1d4ed8] px-3 py-2 text-sm font-medium text-white hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmitWithdraw || submittingWithdraw"
          @click="submitWithdrawRequest"
        >
          출금요청
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4"
        @click.self="showModal = false"
      >
        <div class="relative w-full max-w-sm rounded-2xl border border-cyan-500/15 bg-[#0b1220] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            class="absolute right-4 top-4 text-slate-400 hover:text-white"
            aria-label="닫기"
            @click="showModal = false"
          >
            ✕
          </button>
          <h2 class="pr-6 text-lg font-semibold text-slate-100">{{ modalKind === 'withdraw' ? '출금요청되었습니다.' : '입금요청되었습니다.' }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">고객센터로 텔레그램 남겨주세요.</p>
          <button
            type="button"
            class="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#229ed9] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c8ec4]"
            @click="contactSupport"
          >
            <TelegramIcon class="h-5 w-5" />
            고객센터 문의하기
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const TelegramIcon = {
  props: { class: { type: String, default: '' } },
  template: `
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" :class="class">
      <circle cx="120" cy="120" r="120" fill="#229ED9" />
      <path
        d="M167.5 72.5L145.7 178.4c-1.6 7.3-6 9.1-12.1 5.7l-33.5-24.7-16.2 15.6c-1.8 1.8-3.3 3.3-6.7 3.3l2.4-33.9 61.8-55.9c2.7-2.4-.6-3.7-4.2-1.3l-76.4 48.1-32.9-10.3c-7.2-2.2-7.3-7.2 1.5-10.7l128.5-49.5c6-2.2 11.2 1.4 9.3 10.3z"
        fill="#fff"
      />
    </svg>
  `
}

const balance = ref(0)
const krwInput = ref('')
const krwWithdrawInput = ref('')
const submittingDeposit = ref(false)
const submittingWithdraw = ref(false)
const showModal = ref(false)
const modalKind = ref<'deposit' | 'withdraw'>('deposit')
const telegramUrl = ref('')
const krwPerUsdt = ref(0)

const data = await $fetch<any>('/api/account')
balance.value = data.balance.usdt

try {
  const settings = await $fetch<any>('/api/settings/telegram')
  telegramUrl.value = String(settings?.telegramUrl || '')
} catch {
  telegramUrl.value = ''
}

try {
  const rateData = await $fetch<any>('/api/settings/krw-rate')
  krwPerUsdt.value = Number(rateData?.rate || 0)
} catch {
  krwPerUsdt.value = 0
}

function fmtKrw(usdtValue: number) {
  return `${Math.round(Number(usdtValue || 0) * krwPerUsdt.value).toLocaleString()}원`
}
function usdtPreview(krwValue: string) {
  const krw = Number(krwValue)
  if (!(krw > 0) || !(krwPerUsdt.value > 0)) return '0.00'
  return (krw / krwPerUsdt.value).toFixed(2)
}

const canSubmitDeposit = computed(() => Number(krwInput.value) > 0)
const canSubmitWithdraw = computed(() => Number(krwWithdrawInput.value) > 0)

function openTelegram() {
  if (!telegramUrl.value) return
  window.open(telegramUrl.value, '_blank', 'noopener')
}

function contactSupport() {
  if (telegramUrl.value) {
    window.open(telegramUrl.value, '_blank', 'noopener')
  }
}

async function submitDepositRequest() {
  const krwAmount = Number(krwInput.value)
  if (!(krwAmount > 0) || submittingDeposit.value) return
  submittingDeposit.value = true
  try {
    await $fetch('/api/wallet/deposit-request', {
      method: 'POST',
      body: { krwAmount }
    })
    krwInput.value = ''
    modalKind.value = 'deposit'
    showModal.value = true
  } catch (e: any) {
    alert(e?.data?.statusMessage || '입금요청 중 오류가 발생했습니다.')
  } finally {
    submittingDeposit.value = false
  }
}

async function submitWithdrawRequest() {
  const krwAmount = Number(krwWithdrawInput.value)
  if (!(krwAmount > 0) || submittingWithdraw.value) return
  submittingWithdraw.value = true
  try {
    await $fetch('/api/wallet/withdraw-request', {
      method: 'POST',
      body: { krwAmount }
    })
    krwWithdrawInput.value = ''
    modalKind.value = 'withdraw'
    showModal.value = true
  } catch (e: any) {
    alert(e?.data?.statusMessage || '출금요청 중 오류가 발생했습니다.')
  } finally {
    submittingWithdraw.value = false
  }
}
</script>
