<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-xl font-semibold">회원정보 변경</h1>
      <p class="mt-1 text-sm text-slate-400">추천코드를 제외한 회원 정보를 수정할 수 있습니다.</p>
    </div>

    <form class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6" @submit.prevent="save">
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">아이디</label>
          <input :value="me?.username || ''" disabled class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-400 outline-none ring-1 ring-white/10" />
        </div>
        <div>
          <label class="text-sm text-slate-300">추천코드</label>
          <input :value="me?.referral_code || ''" disabled class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-400 outline-none ring-1 ring-white/10" />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">이름</label>
          <input v-model.trim="name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="text-sm text-slate-300">생년월일</label>
          <input v-model.trim="birthDate" placeholder="YYYY-MM-DD" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">은행명</label>
          <select v-model="bankName" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-100 outline-none ring-1 ring-white/10 focus:ring-indigo-500">
            <option v-for="bank in banks" :key="bank" :value="bank">{{ bank }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-slate-300">은행계좌</label>
          <input v-model.trim="bankAccount" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-300">예금주</label>
        <input v-model.trim="accountHolder" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>

      <div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div class="text-sm font-medium text-slate-200">비밀번호 변경</div>
        <div class="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm text-slate-300">새 비밀번호</label>
            <input v-model="newPassword" type="password" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">새 비밀번호 확인</label>
            <input v-model="newPasswordConfirm" type="password" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
        </div>
        <p class="mt-2 text-xs text-slate-500">변경하지 않을 경우 비워두세요.</p>
      </div>

      <div class="flex items-center justify-end gap-2">
        <button class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:opacity-60" :disabled="saving">
          {{ saving ? '저장 중...' : '저장' }}
        </button>
      </div>
      <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
      <p v-if="okText" class="text-sm text-emerald-300">{{ okText }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { me, refresh } = useMe()
await refresh()

const banks = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '새마을금고',
  '수협은행', 'SC제일은행', '씨티은행', '부산은행', '대구은행', '경남은행', '광주은행', '전북은행', '제주은행', '우체국'
]

const name = ref(me.value?.name || '')
const birthDate = ref(me.value?.birth_date || '')
const bankName = ref(me.value?.bank_name || banks[0])
const bankAccount = ref(me.value?.bank_account || '')
const accountHolder = ref(me.value?.account_holder || '')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const okText = ref<string | null>(null)

async function save() {
  saving.value = true
  error.value = null
  okText.value = null
  try {
    if ((newPassword.value || newPasswordConfirm.value) && newPassword.value !== newPasswordConfirm.value) {
      throw new Error('새 비밀번호 확인이 일치하지 않습니다.')
    }
    await $fetch('/api/me/profile', {
      method: 'POST',
      body: {
        name: name.value,
        birthDate: birthDate.value,
        bankName: bankName.value,
        bankAccount: bankAccount.value,
        accountHolder: accountHolder.value,
        newPassword: newPassword.value || undefined
      }
    })
    await refresh()
    newPassword.value = ''
    newPasswordConfirm.value = ''
    okText.value = '회원정보를 저장했습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '회원정보 저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>
