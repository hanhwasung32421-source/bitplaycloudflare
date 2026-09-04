<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-[200] border-t border-rose-500/30 bg-[#0b0510]/97 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur"
    >
      <div class="mx-auto flex max-w-6xl items-start gap-3">
        <div class="mt-0.5 text-rose-400">⚠</div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-xs text-rose-300">
            <span class="font-semibold">최근 오류 (총관리자 전용)</span>
            <span class="text-slate-500">{{ error?.at }}</span>
          </div>
          <pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-200">{{ text }}</pre>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="copy">
            {{ copied ? '복사됨!' : '복사' }}
          </button>
          <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="historyOpen = true">
            최근20개
          </button>
          <button class="rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15" @click="dismiss">✕</button>
        </div>
      </div>
    </div>

    <div
      v-if="historyOpen"
      class="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 px-4"
      @click.self="historyOpen = false"
    >
      <div class="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-rose-500/20 bg-[#0b0510] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-rose-300">최근 오류 {{ historyList.length }}개 (총관리자 전용)</h2>
          <div class="flex items-center gap-2">
            <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="copyHistory">
              {{ historyCopied ? '복사됨!' : '최근20개 복사' }}
            </button>
            <button class="rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15" @click="historyOpen = false">✕</button>
          </div>
        </div>
        <div class="mt-3 min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          <div v-if="historyList.length === 0" class="py-8 text-center text-sm text-slate-500">기록된 오류가 없습니다.</div>
          <div v-for="(e, idx) in historyList" :key="`${e.at}-${idx}`" class="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div class="flex items-center gap-2 text-xs text-rose-300">
              <span class="font-mono text-slate-500">#{{ historyList.length - idx }}</span>
              <span class="font-semibold">{{ e.type }}</span>
              <span class="text-slate-500">{{ e.at }}</span>
            </div>
            <pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-200">{{ entryText(e) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ClientErrorEntry } from '../plugins/error-reporter.client'

const { me } = useMe()
const lastError = useState<ClientErrorEntry | null>('client_last_error', () => null)
const errorHistory = useState<ClientErrorEntry[]>('client_error_history', () => [])
const dismissedAt = ref<string | null>(null)
const historyOpen = ref(false)

const isSuperAdmin = computed(() => me.value?.role === 'super_admin')
const error = computed(() => lastError.value)
const visible = computed(() => isSuperAdmin.value && !!error.value && error.value.at !== dismissedAt.value)
const historyList = computed(() => errorHistory.value)

function entryText(e: ClientErrorEntry) {
  const { at, ...rest } = e
  return JSON.stringify(rest, null, 2)
}

const text = computed(() => (error.value ? entryText(error.value) : ''))

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // ignore
  }
}

const historyCopied = ref(false)
async function copyHistory() {
  try {
    const combined = historyList.value
      .map((e, idx) => `#${historyList.value.length - idx} [${e.at}]\n${entryText(e)}`)
      .join('\n\n---\n\n')
    await navigator.clipboard.writeText(combined)
    historyCopied.value = true
    setTimeout(() => {
      historyCopied.value = false
    }, 1500)
  } catch {
    // ignore
  }
}

function dismiss() {
  dismissedAt.value = error.value?.at || null
}
</script>
