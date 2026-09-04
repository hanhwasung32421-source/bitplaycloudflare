<template>
  <div class="relative left-1/2 right-1/2 -mx-[50vw] -my-6 w-screen min-h-[calc(100vh-73px)]">
    <div class="grid min-h-[calc(100vh-73px)] md:grid-cols-2">
      <!-- 왼쪽: 브랜드 소개 패널 -->
      <div class="hex-pattern relative hidden overflow-hidden bg-[#0a0d13] px-16 py-16 md:flex md:flex-col md:items-center md:justify-center">
        <div class="relative z-10 mx-auto max-w-md">
          <h1 class="text-5xl font-black leading-tight text-white">
            더 넓은 시장을<br />
            하나의 계정으로.
          </h1>
          <p class="mt-5 text-sm leading-6 text-slate-400">
            KYC 인증으로 전세계 300개 이상의 실시간 선물과 자산 관리를 연결하는 {{ appName }} 거래 환경을 지금 만나보세요.
          </p>

          <div class="mt-10 border-t border-white/10 pt-8">
            <div class="grid grid-cols-3 gap-x-6 gap-y-8">
              <div v-for="item in features" :key="item.label" class="flex flex-col items-center gap-2 text-center">
                <div class="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-sm font-bold text-white">
                  {{ item.icon }}
                </div>
                <span class="text-[11px] font-semibold tracking-wide text-slate-300">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 오른쪽: 로그인 폼 -->
      <div class="flex flex-col justify-center bg-[#050709] px-6 py-16 sm:px-12 md:px-20">
        <div class="mx-auto w-full max-w-sm">
          <h2 class="text-2xl font-bold text-white">로그인</h2>
          <p class="mt-2 text-sm text-slate-400">계정에 로그인하세요</p>

          <form class="mt-8 space-y-5" @submit.prevent="onSubmit">
            <div>
              <label class="text-xs font-semibold tracking-wide text-slate-300">아이디</label>
              <input
                v-model.trim="username"
                placeholder="아이디"
                class="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
              />
            </div>
            <div>
              <label class="text-xs font-semibold tracking-wide text-slate-300">PASSWORD</label>
              <input
                v-model="password"
                type="password"
                placeholder="비밀번호"
                class="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
              />
            </div>

            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 text-slate-300">
                <input v-model="rememberId" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5 accent-emerald-500" />
                아이디 저장
              </label>
              <NuxtLink to="/auth/find-password" class="font-semibold text-white underline underline-offset-4 hover:text-emerald-300">
                비밀번호를 잊으셨나요?
              </NuxtLink>
            </div>

            <button
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              :disabled="loading"
            >
              <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/40 border-t-slate-950" />
              <span>{{ loading ? '로그인 중...' : '로그인' }}</span>
            </button>
            <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
          </form>

          <div class="mt-6 text-center text-sm text-slate-400">
            계정이 없으신가요?
            <NuxtLink to="/auth/register" class="font-semibold text-white underline underline-offset-4 hover:text-emerald-300">회원가입</NuxtLink>
          </div>

          <div class="mt-10 flex items-center justify-center gap-3 text-xs text-slate-600">
            <NuxtLink to="/legal/terms" class="hover:text-slate-400">이용약관</NuxtLink>
            <span>·</span>
            <NuxtLink to="/legal/privacy" class="hover:text-slate-400">개인정보처리방침</NuxtLink>
            <span>·</span>
            <a v-if="telegramUrl" :href="telegramUrl" target="_blank" rel="noopener" class="hover:text-slate-400">고객지원</a>
            <NuxtLink v-else to="/support" class="hover:text-slate-400">고객지원</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 전체 화면 로딩 오버레이 -->
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
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-emerald-400/25 border-t-emerald-300" />
            <div>
              <div class="text-sm font-semibold text-slate-100">{{ loadingTitle }}</div>
              <div class="mt-1 text-xs text-slate-400">{{ loadingDesc }}</div>
            </div>
          </div>
          <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div class="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] rounded-full bg-emerald-400/70" />
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
const { refresh } = useMe()
const config = useRuntimeConfig()
const appName = config.public.appName

const SAVED_ID_KEY = 'bitplay_saved_login_id'

const username = ref('')
const password = ref('')
const rememberId = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const loadingTitle = ref('접속 중입니다...')
const loadingDesc = ref('인증 정보를 확인하고 있습니다.')

const features = [
  { icon: 'F', label: 'FUTURES' },
  { icon: '₮', label: 'USDT' },
  { icon: '↗', label: 'LIVE' },
  { icon: '2', label: '2FA' },
  { icon: '◈', label: 'WALLET' },
  { icon: 'BP', label: appName }
]

const telegramUrl = ref('')

onMounted(() => {
  const saved = localStorage.getItem(SAVED_ID_KEY)
  if (saved) {
    username.value = saved
    rememberId.value = true
  }
  $fetch<{ telegramUrl: string }>('/api/settings/telegram')
    .then((res) => { telegramUrl.value = String(res?.telegramUrl || '') })
    .catch(() => {})
})

async function onSubmit() {
  loading.value = true
  error.value = null
  loadingTitle.value = '접속 중입니다...'
  loadingDesc.value = '서버에 연결하고 있습니다.'
  try {
    // 1) 로그인
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value, remember: rememberId.value }
    })

    // 아이디 저장 체크 여부에 따라 이 컴퓨터에 아이디를 남기거나 지운다.
    if (rememberId.value) {
      localStorage.setItem(SAVED_ID_KEY, username.value)
    } else {
      localStorage.removeItem(SAVED_ID_KEY)
    }

    // 2) 세션/유저 갱신
    loadingTitle.value = '인증 확인 중입니다...'
    loadingDesc.value = '세션을 적용하고 있습니다.'
    await refresh()

    // 3) 이동
    loadingTitle.value = '거래소로 이동 중입니다...'
    loadingDesc.value = '잠시만 기다려주세요.'
    await navigateTo('/exchange/SAMSUNGUSDT')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '로그인에 실패했습니다.'
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

.hex-pattern {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='96' viewBox='0 0 84 96'%3E%3Cpath fill='none' stroke='%23ffffff' stroke-opacity='0.06' stroke-width='1' d='M42 0 84 24 84 72 42 96 0 72 0 24Z'/%3E%3C/svg%3E");
  background-position: 0 0;
  background-repeat: repeat;
}

.hex-pattern::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.08), transparent 45%);
  pointer-events: none;
}
</style>
