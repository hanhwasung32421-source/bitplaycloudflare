<template>
  <div class="mx-auto max-w-xl">
    <h1 class="text-xl font-semibold">회원가입</h1>
    <p class="mt-1 text-sm text-slate-400">필수 정보를 입력해서 계정을 만드세요.</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="text-sm text-slate-300">아이디<span class="text-rose-400">*</span></label>
        <input
          v-model.trim="username"
          inputmode="latin"
          autocomplete="off"
          class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
        />
        <p v-if="username && !usernameValid" class="mt-1 text-xs text-rose-400">한글은 사용할 수 없습니다</p>
      </div>

      <div>
        <label class="text-sm text-slate-300">이름<span class="text-rose-400">*</span></label>
        <input v-model.trim="name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
        <p v-if="name && !nameValid" class="mt-1 text-xs text-rose-400">한국어만 사용 가능합니다</p>
      </div>

      <div>
        <div class="flex items-center justify-between gap-2">
          <label class="text-sm text-slate-300">생년월일 yyyy-mm-dd<span class="text-rose-400">*</span></label>
          <span v-if="birthDate && !birthDateValid" class="text-xs text-rose-400">날짜가 정확하지 않습니다.</span>
        </div>
        <input
          v-model="birthDate"
          inputmode="numeric"
          placeholder="YYYY-MM-DD"
          class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          @input="onBirthInput"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">비밀번호<span class="text-rose-400">*</span></label>
          <input
            :value="password"
            type="password"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
            @input="onPasswordInput"
          />
          <p v-if="password && password.length < 4" class="mt-1 text-xs text-rose-400">비밀번호는 4글자 이상만 가능합니다</p>
        </div>
        <div>
          <label class="text-sm text-slate-300">비밀번호확인<span class="text-rose-400">*</span></label>
          <input
            :value="passwordConfirm"
            type="password"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
            @input="onPasswordConfirmInput"
          />
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-300">은행계좌<span class="text-rose-400">*</span></label>
        <div class="mt-1 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            v-model="bankAccount"
            inputmode="numeric"
            placeholder="은행계좌"
            class="w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500"
            @input="onBankAccountInput"
          />
          <select
            v-model="bankName"
            class="w-full rounded-lg bg-black/70 px-3 py-2 text-white outline-none ring-1 ring-white/20 focus:ring-indigo-500"
          >
            <option disabled value="" class="bg-black text-white">선택(아래화살표)</option>
            <option v-for="bank in banks" :key="bank" :value="bank" class="bg-black text-white">{{ bank }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-300">예금주<span class="text-rose-400">*</span></label>
        <input
          v-model.trim="accountHolder"
          placeholder="예금주를 입력해 주세요"
          class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-indigo-500"
        />
        <p v-if="accountHolder && !accountHolderValid" class="mt-1 text-xs text-rose-400">한국어만 사용 가능합니다</p>
      </div>

      <div>
        <label class="text-sm text-slate-300">추천코드</label>
        <input v-model.trim="referralCode" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
      </div>

      <div class="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <label class="flex items-center gap-3 text-sm text-slate-200">
          <input v-model="agreedToTerms" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5" />
          <span>약관에 동의합니다. <span class="text-rose-400">*</span></span>
          <button type="button" class="text-indigo-300 underline underline-offset-2 hover:text-indigo-200" @click="termsOpen = true">이용약관</button>
        </label>
      </div>

      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="loading || !canSubmit"
      >
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        <span>{{ loading ? '가입 처리 중...' : '회원가입' }}</span>
      </button>
      <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
    </form>

    <div class="mt-5 text-center text-sm text-slate-400">
      <NuxtLink to="/auth/find-password" class="underline underline-offset-4 hover:text-indigo-300">이미 계정이 있으신가요?</NuxtLink>
    </div>
  </div>

  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="loading"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-sm"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="w-[320px] rounded-2xl border border-white/10 bg-[#0b1220] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/25 border-t-cyan-300" />
            <div>
              <div class="text-sm font-semibold text-slate-100">{{ loadingTitle }}</div>
              <div class="mt-1 text-xs text-slate-400">{{ loadingDesc }}</div>
            </div>
          </div>
          <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div class="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-cyan-400/70" />
          </div>
        </div>
      </div>

      <div v-if="termsOpen" class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/65 px-4" @click.self="termsOpen = false">
        <div class="max-h-[78vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 class="text-base font-semibold text-slate-100">이용약관</h2>
            <button type="button" class="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15" @click="termsOpen = false">닫기</button>
          </div>
          <div class="max-h-[60vh] overflow-auto px-5 py-4 text-[11px] leading-6 text-slate-400">
            <p v-for="(line, idx) in termsLines" :key="`terms-${idx}`" class="mb-3">{{ line }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
const { refresh } = useMe()
const route = useRoute()

const username = ref('')
const name = ref('')
const birthDate = ref('')
const password = ref('')
const passwordConfirm = ref('')
const bankAccount = ref('')
const bankName = ref('')
const accountHolder = ref('')
// 추천가입링크(?ref=코드)로 들어오면 추천코드를 미리 채워둔다
const referralCode = ref(String(route.query.ref || ''))
const agreedToTerms = ref(false)
const termsOpen = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const loadingTitle = ref('가입 처리 중입니다...')
const loadingDesc = ref('계정을 만들고 있습니다.')

const banks = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '새마을금고',
  '수협은행', 'SC제일은행', '씨티은행', '부산은행', '대구은행', '경남은행', '광주은행', '전북은행', '제주은행', '우체국'
]

const termsLines = [
  '본 약관은 회원가입 시 제공된 아이디, 이름, 생년월일, 은행계좌, 예금주, 추천코드 등의 정보를 회사가 서비스 운영과 법령상 의무 이행, 고객 응대, 이상 거래 탐지, 분쟁 대응, 내부 감사, 민원 처리 목적 범위 안에서 수집·보관·이용하는 내용 등을 포함합니다.',
  '회원정보는 관련 법령 및 내부 보관 기준에 따라 원칙적으로 서비스 종료 또는 탈퇴 요청 처리 후 지체 없이 파기하되, 거래 내역·정산 자료·민원 처리 기록과 같이 보존이 필요한 정보는 통상 1년 이상 분리 보관될 수 있으며, 관계 법령이 더 긴 기간을 요구하는 경우 그 기간 동안 보관될 수 있습니다.',
  '회원은 언제든지 정보 열람·수정·탈퇴를 요청할 수 있으나, 미정산 거래, 보안 점검, 본인 확인 미완료, 분쟁·조사 진행, 법령상 의무 보관 사유가 있는 경우 일부 요청은 즉시 처리되지 않을 수 있으며, 이 경우 회사는 처리 지연 사유를 합리적인 범위에서 안내할 수 있습니다.',
  '비밀번호 분실 등 보안 이슈가 발생한 경우 회사는 본인 확인을 위해 추가 자료를 요구할 수 있고, 운영자 승인 후 비밀번호를 초기화할 수 있으며, 초기화된 비밀번호는 회사가 정한 임시 기준으로 재설정된 뒤 회원이 즉시 변경해야 합니다.',
  '서비스 이용 과정에서 접속기록, IP, 브라우저 정보, 기기 정보, 거래 요청 기록 등 보안 관련 정보가 자동으로 수집될 수 있으며, 비정상 접근 또는 부정 이용 탐지 목적 범위 안에서 활용될 수 있습니다.',
  '회원은 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 되며, 허위 정보 기재로 인해 서비스 제한, 거래 취소, 계정 정지, 민형사상 책임이 발생할 수 있습니다. 회사는 서비스 안정성과 회원 보호를 위해 필요한 범위 안에서 본 약관을 개정할 수 있습니다.'
]

const birthDateValid = computed(() => {
  const v = birthDate.value.trim()
  if (!v) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map((n) => Number(n))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false
  if (y < 1900 || y > new Date().getFullYear()) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  const dt = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(dt.getTime())) return false
  const yy = dt.getUTCFullYear()
  const mm = dt.getUTCMonth() + 1
  const dd = dt.getUTCDate()
  return yy === y && mm === m && dd === d
})

const passwordsMatch = computed(() => String(password.value || '') === String(passwordConfirm.value || ''))

const usernameValid = computed(() => /^[A-Za-z0-9]+$/.test(username.value.trim()))
const nameValid = computed(() => /^[가-힣\s]+$/.test(name.value.trim()))
const accountHolderValid = computed(() => /^[가-힣\s]+$/.test(accountHolder.value.trim()))

const canSubmit = computed(() => {
  if (!username.value.trim()) return false
  if (!usernameValid.value) return false
  if (!name.value.trim()) return false
  if (!nameValid.value) return false
  if (!birthDateValid.value) return false
  if (!password.value) return false
  if (password.value.length < 4) return false
  if (!passwordConfirm.value) return false
  if (!passwordsMatch.value) return false
  if (!bankAccount.value.trim()) return false
  if (!bankName.value) return false
  if (!accountHolder.value.trim()) return false
  if (!accountHolderValid.value) return false
  if (!agreedToTerms.value) return false
  return true
})

function onBankAccountInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  const digits = raw.replace(/\D/g, '')
  bankAccount.value = digits
}

function onBirthInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const y = digits.slice(0, 4)
  const m = digits.slice(4, 6)
  const d = digits.slice(6, 8)
  let out = y
  if (m) out += `-${m}`
  if (d) out += `-${d}`
  birthDate.value = out
}

// 2벌식 한글 입력을 영문 QWERTY로 변환 (예: ㅁㄴㅇ -> asd)
function hangulToQwerty(input: string) {
  const CHO = [
    'r', 'R', 's', 'e', 'E', 'f', 'a', 'q', 'Q', 't', 'T', 'd', 'w', 'W', 'c', 'z', 'x', 'v', 'g'
  ]
  const JUNG = [
    'k', 'o', 'i', 'O', 'j', 'p', 'u', 'P', 'h', 'hk', 'ho', 'hl', 'y', 'n', 'nj', 'np', 'nl', 'b', 'm', 'ml', 'l'
  ]
  const JONG = [
    '', 'r', 'R', 'rt', 's', 'sw', 'sg', 'e', 'f', 'fr', 'fa', 'fq', 'ft', 'fx', 'fv', 'fg', 'a', 'q', 'qt', 't',
    'T', 'd', 'w', 'c', 'z', 'x', 'v', 'g'
  ]
  const JAMO_SINGLE: Record<string, string> = {
    'ㄱ': 'r',
    'ㄲ': 'R',
    'ㄴ': 's',
    'ㄷ': 'e',
    'ㄸ': 'E',
    'ㄹ': 'f',
    'ㅁ': 'a',
    'ㅂ': 'q',
    'ㅃ': 'Q',
    'ㅅ': 't',
    'ㅆ': 'T',
    'ㅇ': 'd',
    'ㅈ': 'w',
    'ㅉ': 'W',
    'ㅊ': 'c',
    'ㅋ': 'z',
    'ㅌ': 'x',
    'ㅍ': 'v',
    'ㅎ': 'g',
    'ㅏ': 'k',
    'ㅐ': 'o',
    'ㅑ': 'i',
    'ㅒ': 'O',
    'ㅓ': 'j',
    'ㅔ': 'p',
    'ㅕ': 'u',
    'ㅖ': 'P',
    'ㅗ': 'h',
    'ㅘ': 'hk',
    'ㅙ': 'ho',
    'ㅚ': 'hl',
    'ㅛ': 'y',
    'ㅜ': 'n',
    'ㅝ': 'nj',
    'ㅞ': 'np',
    'ㅟ': 'nl',
    'ㅠ': 'b',
    'ㅡ': 'm',
    'ㅢ': 'ml',
    'ㅣ': 'l'
  }
  const out: string[] = []
  for (const ch of input) {
    const code = ch.charCodeAt(0)
    // 한글 음절
    if (code >= 0xac00 && code <= 0xd7a3) {
      const sIndex = code - 0xac00
      const cho = Math.floor(sIndex / 588)
      const jung = Math.floor((sIndex % 588) / 28)
      const jong = sIndex % 28
      out.push(CHO[cho] + JUNG[jung] + JONG[jong])
      continue
    }
    // 한글 자모(단일)
    if (JAMO_SINGLE[ch]) {
      out.push(JAMO_SINGLE[ch])
      continue
    }
    out.push(ch)
  }
  return out.join('')
}

function onPasswordInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  password.value = hangulToQwerty(raw)
}

function onPasswordConfirmInput(e: Event) {
  const raw = String((e.target as HTMLInputElement)?.value || '')
  passwordConfirm.value = hangulToQwerty(raw)
}

async function onSubmit() {
  loading.value = true
  error.value = null
  try {
    if (!canSubmit.value) {
      throw new Error('필수 항목을 모두 올바르게 입력해 주세요.')
    }
    if (password.value !== passwordConfirm.value) {
      throw new Error('비밀번호 확인이 일치하지 않습니다.')
    }
    loadingTitle.value = '가입 처리 중입니다...'
    loadingDesc.value = '계정을 생성하고 있습니다.'
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        username: username.value,
        name: name.value,
        birthDate: birthDate.value,
        password: password.value,
        bankName: bankName.value,
        bankAccount: bankAccount.value,
        accountHolder: accountHolder.value,
        referralCode: referralCode.value,
        agreedToTerms: agreedToTerms.value
      }
    })

    loadingTitle.value = '인증 확인 중입니다...'
    loadingDesc.value = '세션을 적용하고 있습니다.'
    await refresh()

    loadingTitle.value = '거래소로 이동 중입니다...'
    loadingDesc.value = '잠시만 기다려주세요.'
    await navigateTo('/exchange/SAMSUNGUSDT')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || '회원가입에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes progress {
  0% {
    transform: translateX(-120%);
  }
  50% {
    transform: translateX(180%);
  }
  100% {
    transform: translateX(420%);
  }
}
</style>
