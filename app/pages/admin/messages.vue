<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">쪽지관리</h1>
        <p class="mt-1 text-sm text-slate-400">전체회원 또는 선택 회원에게 쪽지를 보내고 답장을 확인합니다.</p>
      </div>
      <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="activeTab === 'members' ? loadAll() : loadGuestThreads()">새로고침</button>
    </div>

    <div class="flex gap-1 border-b border-white/10">
      <button
        type="button"
        class="border-b-2 px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'members' ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        @click="activeTab = 'members'"
      >
        회원 쪽지
      </button>
      <button
        type="button"
        class="relative border-b-2 px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'guests' ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        @click="activeTab = 'guests'"
      >
        비회원 상담
        <span v-if="guestUnreadTotal" class="ml-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">{{ guestUnreadTotal }}</span>
      </button>
    </div>

    <div v-show="activeTab === 'members'" class="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold">쪽지쓰기</h2>
          <label class="flex items-center gap-2 text-xs text-slate-300">
            <input v-model="sendToAll" type="checkbox" class="rounded border-white/20 bg-white/5" />
            전체회원
          </label>
        </div>

        <div class="mt-4 space-y-3">
          <input
            v-model.trim="subject"
            class="w-full rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            placeholder="제목"
          />
          <textarea
            v-model.trim="body"
            rows="6"
            class="w-full rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            placeholder="보낼 내용을 입력하세요"
          />
        </div>

        <div class="mt-5">
          <div class="mb-2 text-sm font-medium text-slate-200">회원 선택</div>
          <input
            v-model.trim="recipientKeyword"
            class="mb-3 w-full rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            placeholder="회원 검색"
            :disabled="sendToAll"
          />
          <div class="max-h-80 overflow-auto rounded-xl border border-white/10 bg-[#06101b]">
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-[#06101b] text-slate-400">
                <tr>
                  <th class="px-2 py-2"></th>
                  <th class="cursor-pointer select-none px-2 py-2 text-left" @click="toggleRecipientSort('id')">아이디{{ recipientSortArrow('id') }}</th>
                  <th class="cursor-pointer select-none px-2 py-2 text-right" @click="toggleRecipientSort('usdt')">지갑잔액{{ recipientSortArrow('usdt') }}</th>
                  <th class="cursor-pointer select-none px-2 py-2 text-left" @click="toggleRecipientSort('created_at')">가입일자{{ recipientSortArrow('created_at') }}</th>
                  <th class="cursor-pointer select-none px-2 py-2 text-left" @click="toggleRecipientSort('lastLoginAt')">최근로그인{{ recipientSortArrow('lastLoginAt') }}</th>
                  <th class="cursor-pointer select-none px-2 py-2 text-left" @click="toggleRecipientSort('online')">접속상태{{ recipientSortArrow('online') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="user in sortedRecipients"
                  :key="user.id"
                  class="border-t border-white/5"
                  :class="sendToAll ? 'opacity-50' : 'hover:bg-white/5'"
                >
                  <td class="px-2 py-2">
                    <input v-model="selectedRecipientIds" :value="user.id" type="checkbox" class="rounded border-white/20 bg-white/5" :disabled="sendToAll" />
                  </td>
                  <td class="px-2 py-2 text-slate-100">{{ user.username }}{{ user.name ? `(${user.name})` : '' }}</td>
                  <td class="px-2 py-2 text-right font-mono text-slate-300">{{ Number(user.usdt || 0).toFixed(2) }}</td>
                  <td class="px-2 py-2 font-mono text-slate-400">{{ dateOnly(user.created_at) }}</td>
                  <td class="px-2 py-2 font-mono text-slate-400">{{ user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—' }}</td>
                  <td class="px-2 py-2">
                    <span
                      class="rounded px-2 py-0.5 text-[10px] font-semibold ring-1"
                      :class="user.online ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-white/5 text-slate-400 ring-white/10'"
                    >
                      {{ user.online ? '접속' : '미접속' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="sortedRecipients.length === 0">
                  <td colspan="6" class="px-2 py-6 text-center text-sm text-slate-500">선택 가능한 회원이 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="text-xs text-slate-400">
            {{ sendToAll ? `전체회원 ${recipients.length}명에게 발송` : `${selectedRecipientIds.length}명 선택됨` }}
          </div>
          <button
            class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="sending || !canSend"
            @click="sendMessage"
          >
            {{ sending ? '전송 중...' : '쪽지 보내기' }}
          </button>
        </div>
        <p v-if="sendError" class="mt-3 text-sm text-rose-300">{{ sendError }}</p>
        <p v-if="sendMessageText" class="mt-3 text-sm text-emerald-300">{{ sendMessageText }}</p>
      </section>

      <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold">대화 목록</h2>
          <input
            v-model.trim="threadKeyword"
            class="w-52 rounded-md border border-white/10 bg-[#06101b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            placeholder="대화 검색"
          />
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div class="max-h-[720px] overflow-auto rounded-xl border border-white/10 bg-[#06101b] p-2">
            <button
              v-for="thread in filteredThreads"
              :key="thread.threadKey"
              class="mb-2 w-full rounded-xl border px-3 py-3 text-left transition"
              :class="activeThread?.threadKey === thread.threadKey ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'"
              @click="openThread(thread)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="font-medium text-slate-100">{{ thread.username }}</div>
                <span v-if="thread.unreadCount" class="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                  {{ thread.unreadCount }}
                </span>
              </div>
              <div class="mt-1 line-clamp-1 text-xs text-slate-400">{{ thread.lastMessage || thread.subject || '대화 없음' }}</div>
              <div class="mt-2 text-[11px] text-slate-500">{{ formatDateTime(thread.lastAt) }}</div>
            </button>
            <div v-if="filteredThreads.length === 0" class="px-3 py-8 text-center text-sm text-slate-500">대화가 없습니다.</div>
          </div>

          <div class="rounded-xl border border-white/10 bg-[#06101b] p-4">
            <div v-if="!activeThread" class="flex min-h-[420px] items-center justify-center text-sm text-slate-500">왼쪽에서 대화를 선택하세요.</div>
            <div v-else class="space-y-4">
              <div class="border-b border-white/10 pb-3">
                <div class="text-lg font-semibold text-slate-100">{{ activeThread.username }}</div>
                <div class="mt-1 text-xs text-slate-500">회원번호 #{{ activeThread.userId }}</div>
              </div>

              <div v-if="pendingResetRequest" class="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm">
                <div class="font-semibold text-amber-200">비밀번호 초기화 요청 대기중</div>
                <div class="mt-2 space-y-1 text-xs text-amber-100/90">
                  <div>아이디: {{ pendingResetRequest.username_snapshot }}</div>
                  <div>이름: {{ pendingResetRequest.requested_name }}</div>
                  <div>생년월일: {{ pendingResetRequest.requested_birth_date }}</div>
                  <div>요청시각: {{ formatDateTime(pendingResetRequest.requested_at) }}</div>
                </div>
                <div class="mt-3">
                  <button
                    class="rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-50"
                    :disabled="approvingReset"
                    @click="approveReset"
                  >
                    {{ approvingReset ? '승인 처리 중...' : '초기화 승인' }}
                  </button>
                </div>
              </div>

              <div class="max-h-[440px] space-y-3 overflow-auto pr-1">
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
                <div v-if="activeMessages.length === 0" class="py-8 text-center text-sm text-slate-500">아직 쪽지가 없습니다.</div>
              </div>

              <div class="border-t border-white/10 pt-4">
                <textarea
                  v-model.trim="replyBody"
                  rows="4"
                  class="w-full rounded-md border border-white/10 bg-[#020b16] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
                  placeholder="답장을 입력하세요"
                />
                <div class="mt-3 flex items-center justify-end gap-2">
                  <button
                    class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="replySending || !replyBody"
                    @click="sendReply"
                  >
                    {{ replySending ? '전송 중...' : '답장 보내기' }}
                  </button>
                </div>
                <p v-if="replyError" class="mt-2 text-sm text-rose-300">{{ replyError }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-show="activeTab === 'guests'" class="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div class="max-h-[720px] overflow-auto rounded-xl border border-white/10 bg-white/5 p-2">
        <button
          v-for="thread in guestThreads"
          :key="thread.guestId"
          class="mb-2 w-full rounded-xl border px-3 py-3 text-left transition"
          :class="activeGuestThread?.guestId === thread.guestId ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'"
          @click="openGuestThread(thread)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="font-mono text-sm text-slate-100">{{ thread.guestId.slice(0, 12) }}…</div>
            <span v-if="thread.unreadCount" class="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">{{ thread.unreadCount }}</span>
          </div>
          <div class="mt-1 line-clamp-1 text-xs text-slate-400">{{ thread.lastMessage || '대화 없음' }}</div>
          <div class="mt-1 text-[11px] text-slate-500">{{ thread.ip || 'IP 미확인' }}</div>
          <div class="mt-1 text-[11px] text-slate-500">{{ formatDateTime(thread.lastAt) }}</div>
        </button>
        <div v-if="guestThreads.length === 0" class="px-3 py-8 text-center text-sm text-slate-500">비회원 상담이 없습니다.</div>
      </div>

      <div class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="!activeGuestThread" class="flex min-h-[420px] items-center justify-center text-sm text-slate-500">왼쪽에서 대화를 선택하세요.</div>
        <div v-else class="space-y-4">
          <div class="border-b border-white/10 pb-3">
            <div class="font-mono text-sm text-slate-100">{{ activeGuestThread.guestId }}</div>
            <div class="mt-1 text-xs text-slate-500">접속 IP: {{ activeGuestThread.ip || '미확인' }}</div>
          </div>

          <div class="max-h-[440px] space-y-3 overflow-auto pr-1">
            <div
              v-for="message in guestMessages"
              :key="message.id"
              class="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
              :class="message.sender === 'admin' ? 'ml-auto bg-cyan-500/15 text-slate-100' : 'bg-white/5 text-slate-200'"
            >
              <div class="mb-1 text-[11px] text-slate-400">{{ message.sender === 'admin' ? '운영자' : '방문자' }}</div>
              <div class="whitespace-pre-wrap leading-6">{{ message.body }}</div>
              <div class="mt-2 text-[11px] text-slate-500">{{ formatDateTime(message.createdAt) }}</div>
            </div>
            <div v-if="guestMessages.length === 0" class="py-8 text-center text-sm text-slate-500">아직 대화가 없습니다.</div>
          </div>

          <div class="border-t border-white/10 pt-4">
            <textarea
              v-model.trim="guestReplyBody"
              rows="4"
              class="w-full rounded-md border border-white/10 bg-[#020b16] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
              placeholder="답장을 입력하세요"
            />
            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="guestReplySending || !guestReplyBody"
                @click="sendGuestReply"
              >
                {{ guestReplySending ? '전송 중...' : '답장 보내기' }}
              </button>
            </div>
            <p v-if="guestReplyError" class="mt-2 text-sm text-rose-300">{{ guestReplyError }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type Recipient = {
  id: number
  username: string
  name: string
  role: string
  created_at: string
  usdt: number
  online: boolean
  lastLoginAt: string | null
}
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
  recipient_id: number
  senderName: string
  recipientName: string
  body: string
  subject: string
  created_at: string
}
type PendingResetRequest = {
  id: number
  user_id: number
  username_snapshot: string
  requested_name: string
  requested_birth_date: string
  status: string
  requested_at: string
} | null

type GuestThreadSummary = {
  guestId: string
  ip: string | null
  lastMessage: string
  lastAt: string
  unreadCount: number
}
type GuestMessageItem = {
  id: number
  guestId: string
  ip: string | null
  sender: 'guest' | 'admin'
  body: string
  createdAt: string
}

const { me, refresh } = useMe()
await refresh()
const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const activeTab = ref<'members' | 'guests'>('members')
const guestThreads = ref<GuestThreadSummary[]>([])
const activeGuestThread = ref<GuestThreadSummary | null>(null)
const guestMessages = ref<GuestMessageItem[]>([])
const guestReplyBody = ref('')
const guestReplySending = ref(false)
const guestReplyError = ref<string | null>(null)
const guestUnreadTotal = computed(() => guestThreads.value.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0))

async function loadGuestThreads() {
  const res = await $fetch<{ items: GuestThreadSummary[] }>('/api/admin/guest-chats', { headers: requestHeaders, credentials: 'include' })
  guestThreads.value = res.items || []
  if (activeGuestThread.value) {
    const fresh = guestThreads.value.find((t) => t.guestId === activeGuestThread.value?.guestId)
    if (fresh) activeGuestThread.value = fresh
  }
}

async function openGuestThread(thread: GuestThreadSummary) {
  activeGuestThread.value = thread
  guestReplyBody.value = ''
  guestReplyError.value = null
  const res = await $fetch<{ items: GuestMessageItem[] }>('/api/admin/guest-chats/thread', {
    query: { guestId: thread.guestId },
    headers: requestHeaders,
    credentials: 'include'
  })
  guestMessages.value = res.items || []
  await loadGuestThreads()
}

async function sendGuestReply() {
  if (!activeGuestThread.value || !guestReplyBody.value.trim()) return
  guestReplySending.value = true
  guestReplyError.value = null
  try {
    const res = await $fetch<{ items: GuestMessageItem[] }>('/api/admin/guest-chats/reply', {
      method: 'POST',
      headers: requestHeaders,
      credentials: 'include',
      body: { guestId: activeGuestThread.value.guestId, body: guestReplyBody.value.trim() }
    })
    guestMessages.value = res.items || []
    guestReplyBody.value = ''
    await loadGuestThreads()
  } catch (e: any) {
    guestReplyError.value = e?.data?.statusMessage || '답장 전송에 실패했습니다.'
  } finally {
    guestReplySending.value = false
  }
}

const recipients = ref<Recipient[]>([])
const threads = ref<ThreadSummary[]>([])
const activeThread = ref<ThreadSummary | null>(null)
const activeMessages = ref<MessageItem[]>([])
const pendingResetRequest = ref<PendingResetRequest>(null)
const selectedRecipientIds = ref<number[]>([])
const recipientKeyword = ref('')
const threadKeyword = ref('')
const sendToAll = ref(false)
const subject = ref('')
const body = ref('')
const replyBody = ref('')
const sending = ref(false)
const replySending = ref(false)
const approvingReset = ref(false)
const sendError = ref<string | null>(null)
const replyError = ref<string | null>(null)
const sendMessageText = ref<string | null>(null)

const filteredRecipients = computed(() => {
  const q = recipientKeyword.value.trim().toLowerCase()
  return recipients.value.filter((u) => !q || [u.username, u.name, String(u.id)].some((v) => String(v || '').toLowerCase().includes(q)))
})

type RecipientSortKey = 'id' | 'usdt' | 'created_at' | 'lastLoginAt' | 'online'
const recipientSortKey = ref<RecipientSortKey>('id')
const recipientSortDir = ref<'asc' | 'desc'>('desc')

function toggleRecipientSort(key: RecipientSortKey) {
  if (recipientSortKey.value === key) {
    recipientSortDir.value = recipientSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    recipientSortKey.value = key
    recipientSortDir.value = 'asc'
  }
}
function recipientSortArrow(key: RecipientSortKey) {
  if (recipientSortKey.value !== key) return ''
  return recipientSortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const sortedRecipients = computed(() => {
  const dir = recipientSortDir.value === 'asc' ? 1 : -1
  const key = recipientSortKey.value
  return filteredRecipients.value.slice().sort((a, b) => {
    if (key === 'usdt') return (Number(a.usdt || 0) - Number(b.usdt || 0)) * dir
    if (key === 'online') return (Number(a.online) - Number(b.online)) * dir
    if (key === 'id') return (a.id - b.id) * dir
    // created_at / lastLoginAt: 날짜 문자열 비교(빈 값은 항상 뒤로)
    const av = String((a as any)[key] || '')
    const bv = String((b as any)[key] || '')
    if (!av && !bv) return 0
    if (!av) return 1
    if (!bv) return -1
    return av.localeCompare(bv) * dir
  })
})

function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : '—'
}

const filteredThreads = computed(() => {
  const q = threadKeyword.value.trim().toLowerCase()
  return threads.value.filter((t) => !q || [t.username, t.lastMessage, String(t.userId)].some((v) => String(v).toLowerCase().includes(q)))
})

const canSend = computed(() => Boolean(body.value.trim()) && (sendToAll.value || selectedRecipientIds.value.length > 0))

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

async function loadRecipients() {
  const res = await $fetch<{ items: Recipient[] }>('/api/messages/recipients', { headers: requestHeaders, credentials: 'include' })
  recipients.value = res.items || []
}

async function loadThreads() {
  const res = await $fetch<{ items: ThreadSummary[] }>('/api/messages/threads', { headers: requestHeaders, credentials: 'include' })
  threads.value = res.items || []
  if (activeThread.value) {
    const fresh = threads.value.find((t) => t.threadKey === activeThread.value?.threadKey)
    if (fresh) activeThread.value = fresh
  }
}

async function openThread(thread: ThreadSummary) {
  activeThread.value = thread
  replyBody.value = ''
  replyError.value = null
  const res = await $fetch<{ items: MessageItem[]; pendingResetRequest: PendingResetRequest }>('/api/messages/thread', {
    query: { userId: thread.userId },
    headers: requestHeaders,
    credentials: 'include'
  })
  activeMessages.value = res.items || []
  pendingResetRequest.value = res.pendingResetRequest || null
  await $fetch('/api/messages/mark-read', { method: 'POST', body: { userId: thread.userId }, headers: requestHeaders, credentials: 'include' }).catch(() => {})
  await loadThreads()
}

async function approveReset() {
  if (!pendingResetRequest.value) return
  approvingReset.value = true
  replyError.value = null
  try {
    await $fetch('/api/admin/users/approve-reset', {
      method: 'POST',
      headers: requestHeaders,
      credentials: 'include',
      body: { requestId: pendingResetRequest.value.id }
    })
    if (activeThread.value) await openThread(activeThread.value)
  } catch (e: any) {
    replyError.value = e?.data?.statusMessage || '비밀번호 초기화 승인에 실패했습니다.'
  } finally {
    approvingReset.value = false
  }
}

async function sendMessage() {
  if (!canSend.value) return
  sending.value = true
  sendError.value = null
  sendMessageText.value = null
  try {
    const res = await $fetch<{ count: number }>('/api/messages/send', {
      method: 'POST',
      headers: requestHeaders,
      credentials: 'include',
      body: {
        sendToAll: sendToAll.value,
        userIds: sendToAll.value ? [] : selectedRecipientIds.value,
        subject: subject.value.trim(),
        body: body.value.trim()
      }
    })
    sendMessageText.value = `${res.count}명에게 쪽지를 보냈습니다.`
    subject.value = ''
    body.value = ''
    selectedRecipientIds.value = []
    sendToAll.value = false
    await loadThreads()
  } catch (e: any) {
    sendError.value = e?.data?.statusMessage || '쪽지 전송에 실패했습니다.'
  } finally {
    sending.value = false
  }
}

async function sendReply() {
  if (!activeThread.value || !replyBody.value.trim()) return
  replySending.value = true
  replyError.value = null
  try {
    await $fetch('/api/messages/send', {
      method: 'POST',
      headers: requestHeaders,
      credentials: 'include',
      body: {
        userIds: [activeThread.value.userId],
        subject: activeThread.value.subject || '운영자 답장',
        body: replyBody.value.trim()
      }
    })
    replyBody.value = ''
    await openThread(activeThread.value)
  } catch (e: any) {
    replyError.value = e?.data?.statusMessage || '답장 전송에 실패했습니다.'
  } finally {
    replySending.value = false
  }
}

async function loadAll() {
  await Promise.all([loadRecipients(), loadThreads()])
}

await loadAll()
await loadGuestThreads().catch(() => {})
</script>
