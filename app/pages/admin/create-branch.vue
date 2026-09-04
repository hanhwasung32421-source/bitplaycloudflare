<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">계정생성</h1>
          <p class="mt-1 text-sm text-slate-400">총관리자만 지사(관리자) 계정을 생성할 수 있습니다.</p>
        </div>
        <NuxtLink to="/admin" class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">대시보드</NuxtLink>
      </div>
    </div>

    <div v-if="me?.role !== 'super_admin'" class="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
      이 메뉴는 총관리자만 사용할 수 있습니다.
    </div>

    <div v-else class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="font-semibold">지사(관리자) 계정 생성</h2>
      <p class="mt-1 text-sm text-slate-400">권한에 따라 메뉴/기능 제한을 확장할 수 있습니다.</p>

      <form class="mt-4 grid gap-3 sm:grid-cols-3" @submit.prevent="createBranch">
        <div>
          <label class="text-sm text-slate-300">지사 아이디</label>
          <input
            v-model.trim="bUser"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-300">비밀번호</label>
          <input
            v-model="bPass"
            type="password"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-300">역할</label>
          <select
            v-model="bRole"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          >
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.label }}</option>
          </select>
        </div>
        <div class="flex items-end">
          <button class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400" :disabled="creating">
            생성
          </button>
        </div>

        <label class="flex items-center gap-2 text-sm text-slate-300 sm:col-span-3">
          <input v-model="canCredit" type="checkbox" class="h-4 w-4" />
          가상 입금 권한(canCredit)
        </label>
      </form>
      <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
      <p v-if="err" class="mt-3 text-sm text-rose-300">{{ err }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })
const { me, refresh } = useMe()
await refresh()

const bUser = ref('')
const bPass = ref('')
const bRole = ref('')
const canCredit = ref(false)
const creating = ref(false)
const msg = ref<string | null>(null)
const err = ref<string | null>(null)
const roles = ref<{ id: string; label: string }[]>([])

async function loadRoles() {
  try {
    const data = await $fetch<{ roles: { id: string; label: string }[] }>('/api/admin/roles')
    roles.value = data.roles || []
    if (!bRole.value && roles.value.length) bRole.value = roles.value[0].id
  } catch {
    roles.value = []
  }
}
await loadRoles()

async function createBranch() {
  creating.value = true
  msg.value = null
  err.value = null
  try {
    await $fetch('/api/admin/branches/create', {
      method: 'POST',
      body: {
        username: bUser.value,
        password: bPass.value,
        role: bRole.value || undefined,
        permissions: { canViewUsers: true, canCredit: canCredit.value }
      }
    })
    msg.value = '지사 계정이 생성되었습니다.'
    bUser.value = ''
    bPass.value = ''
    canCredit.value = false
  } catch (e: any) {
    err.value = e?.data?.statusMessage || '생성 실패'
  } finally {
    creating.value = false
  }
}
</script>

