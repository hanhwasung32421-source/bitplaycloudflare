<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">유저 및 권한 관리</h1>
        <p class="mt-1 text-sm text-slate-400">사용자 역할 설정 및 가상 USDT 잔고를 직접 변경할 수 있습니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="load">새로고침</button>
      </div>
    </div>

    <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div v-if="loading" class="text-sm text-slate-400">불러오는 중…</div>
      <div v-else class="overflow-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-slate-400">
            <tr>
              <th class="py-2">순번</th>
              <th class="py-2">아이디</th>
              <th class="py-2">역할</th>
              <th class="py-2">현재 USDT</th>
              <th class="py-2">USDT잔액 수정</th>
              <th class="py-2">실시간접속</th>
              <th class="py-2">접속 아이피</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, idx) in users" :key="u.id" class="border-t border-white/10">
              <td class="py-2 font-mono">{{ idx + 1 }}</td>
              <td class="py-2">{{ u.username }}</td>
              <td class="py-2">
                <select
                  v-model="roleDraft[u.id]"
                  class="w-48 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                  :disabled="!canEditRole"
                  @change="updateRole(u.id)"
                >
                  <option value="user">회원 (user)</option>
                  <option v-for="r in roleOptions" :key="r.id" :value="r.id">{{ r.label }} ({{ r.id }})</option>
                  <option value="super_admin">최고관리자 (super_admin)</option>
                </select>
              </td>
              <td class="py-2 font-mono">{{ (u.usdt ?? 0).toFixed(2) }}</td>
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="balanceDraft[u.id]"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-28 rounded-md bg-white/5 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                    placeholder="예: 1000"
                    :disabled="!canEditBalance"
                  />
                  <button
                    class="rounded-md bg-indigo-500 px-3 py-1 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!canEditBalance"
                    @click="updateBalance(u.id)"
                  >
                    수정
                  </button>
                </div>
              </td>
              <td class="py-2">
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="u.online ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-slate-300'"
                >
                  {{ u.online ? '온라인' : '오프라인' }}
                </span>
              </td>
              <td class="py-2 font-mono text-slate-300">{{ u.last_ip || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
      <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type AdminUserRow = { id: number; username: string; role: string; usdt: number; created_at: string; online?: boolean; last_ip?: string | null }

const { me, refresh } = useMe()
await refresh()

const users = ref<AdminUserRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const msg = ref<string | null>(null)
const balanceDraft = reactive<Record<number, number>>({})
const roleDraft = reactive<Record<number, string>>({})
const roleOptions = ref<{ id: string; label: string }[]>([])

const canEditRole = computed(() => me.value?.role === 'super_admin')
const canEditBalance = computed(() => me.value?.role === 'super_admin' || me.value?.permissions?.canCredit)

async function loadRoleOptions() {
  try {
    const data = await $fetch<{ roles: { id: string; label: string }[] }>('/api/admin/roles')
    roleOptions.value = data.roles || []
  } catch {
    roleOptions.value = []
  }
}

async function load() {
  loading.value = true
  error.value = null
  msg.value = null
  try {
    const data = await $fetch<{ users: AdminUserRow[] }>('/api/admin/users')
    users.value = data.users
    for (const u of users.value) {
      if (balanceDraft[u.id] === undefined) balanceDraft[u.id] = Number(u.usdt ?? 0)
      roleDraft[u.id] = String(u.role || 'user')
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '불러오기 실패'
  } finally {
    loading.value = false
  }
}

async function updateBalance(userId: number) {
  const usdt = Number(balanceDraft[userId])
  if (!Number.isFinite(usdt) || usdt < 0) return
  try {
    await $fetch('/api/admin/users/update', { method: 'POST', body: { userId, usdt } })
    await load()
    msg.value = '잔고가 수정되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '잔고 수정 실패'
  }
}

async function updateRole(userId: number) {
  const role = String(roleDraft[userId] || 'user')
  try {
    await $fetch('/api/admin/users/update', { method: 'POST', body: { userId, role } })
    await load()
    msg.value = '역할이 수정되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '역할 수정 실패'
  }
}

await loadRoleOptions()
await load()
</script>
