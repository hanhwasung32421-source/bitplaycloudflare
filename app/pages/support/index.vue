<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 class="text-xl font-semibold">고객센터</h1>
      <p class="mt-2 text-sm text-slate-400">운영자(admin)와 쪽지를 주고받을 수 있습니다.</p>
    </div>

    <div class="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold">쪽지함</h2>
          <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadThreads">새로고침</button>
        </div>

        <div class="mt-4 max-h-[680px] space-y-2 overflow-auto">
          <button
            v-for="thread in threads"
            :key="thread.threadKey"
            class="w-full rounded-xl border px-3 py-3 text-left transition"
            :class="activeThread?.threadKey === thread.threadKey ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'"
            @click="openThread(thread)"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="font-medium text-slate-100">운영자</div>
              <span v-if="thread.unreadCount" class="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                {{ thread.unreadCount }}
              </span>
            </div>
            <div class="mt-1 line-clamp-1 text-xs text-slate-400">{{ thread.lastMessage || '대화 없음' }}</div>
            <div class="mt-2 text-[11px] text-slate-500">{{ formatDateTime(thread.lastAt) }}</div>
          </button>
          <div v-if="threads.length === 0" class="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
            받은 쪽지가 없습니다.
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="border-b border-white/10 pb-4">
          <div class="text-base font-semibold text-slate-100">운영자(admin)</div>
          <div class="mt-1 text-sm text-slate-400">문의 내용과 답장을 이곳에서 확인할 수 있습니다.</div>
        </div>

        <div class="mt-4 max-h-[440px] space-y-3 overflow-auto pr-1">
          <div
            v-for="message in activeMessages"
            :key="message.id"
            class="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
            :class="message.sender_id === me?.id ? 'ml-auto bg-cyan-500/15 text-slate-100' : 'bg-white/5 text-slate-200'"
          >
            <div class="mb-1 text-[11px] text-slate-400">{{ message.senderName }}</div>
            <div class="whitespace-pre-wrap leading-6">{{ message.body }}</div>
            <div class="mt-2 text-[11px] text-slate-500">{{ formatDateTime(message.created_at) }}</div>
          </div>
          <div v-if="activeMessages.length === 0" class="py-10 text-center text-sm text-slate-500">아직 쪽지가 없습니다. 아래에서 새 문의를 보낼 수 있습니다.</div>
        </div>

        <div class="mt-5 border-t border-white/10 pt-4">
          <input
            v-model.trim="subject"
            class="mb-3 w-full rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            placeholder="제목"
          />
          <textarea
            v-model.trim="body"
            rows="5"
            class="w-full rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            placeholder="운영자에게 보낼 내용을 입력하세요"
          />
          <div class="mt-3 flex items-center justify-end">
            <button
              class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="sending || !body"
              @click="sendMessage"
            >
              {{ sending ? '전송 중...' : '보내기' }}
            </button>
          </div>
          <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
          <p v-if="okText" class="mt-3 text-sm text-emerald-300">{{ okText }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

type ThreadSummary = {
  threadKey: string
  userId: number
  username: string
  lastMessage: string
  lastAt: string
  unreadCount: number
  subject: string
}
type MessageItem = {
  id: number
  sender_id: number
  senderName: string
  body: string
  created_at: string
}

const { me, refresh } = useMe()
await refresh()
const { refreshUnread } = useMessages()

const threads = ref<ThreadSummary[]>([])
const activeThread = ref<ThreadSummary | null>(null)
const activeMessages = ref<MessageItem[]>([])
const subject = ref('')
const body = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const okText = ref<string | null>(null)

function formatDateTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v || ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

async function loadThreads() {
  const res = await $fetch<{ items: ThreadSummary[] }>('/api/messages/threads')
  threads.value = res.items || []
  if (!activeThread.value && threads.value.length) {
    await openThread(threads.value[0], false)
  }
}

async function openThread(thread: ThreadSummary, refreshList = true) {
  activeThread.value = thread
  const res = await $fetch<{ items: MessageItem[] }>('/api/messages/thread')
  activeMessages.value = res.items || []
  await $fetch('/api/messages/mark-read', { method: 'POST', body: {} }).catch(() => {})
  await refreshUnread()
  if (refreshList) await loadThreads()
}

async function sendMessage() {
  if (!body.value.trim()) return
  sending.value = true
  error.value = null
  okText.value = null
  try {
    await $fetch('/api/messages/send', {
      method: 'POST',
      body: {
        subject: subject.value.trim(),
        body: body.value.trim()
      }
    })
    subject.value = ''
    body.value = ''
    okText.value = '쪽지를 보냈습니다.'
    await loadThreads()
    if (threads.value[0]) await openThread(threads.value[0], false)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '쪽지를 보내지 못했습니다.'
  } finally {
    sending.value = false
  }
}

await loadThreads()
await refreshUnread()
</script>
