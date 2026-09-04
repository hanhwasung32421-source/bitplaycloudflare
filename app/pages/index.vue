<template>
  <div class="font-landing">
    <section class="px-6 py-10 md:px-12 md:py-14">
      <div class="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div>
          <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">THE NEW STANDARD OF TRADING</div>
          <h1 class="mt-6 text-[57.6px] font-black leading-[1.08] tracking-tight text-white md:text-[72px]">
            더 빠르고,
            <br />
            더 강력한
            <br />
            디지털 자산 거래
          </h1>
          <p class="mt-6 max-w-xl text-[19.2px] leading-7 text-slate-400">
            KYC 인증으로 신뢰할 수 있는 보안시스템.<br />
            전세계 300개 이상의 레버리지 종목 거래 환경<br />
            지금 {{ appName }}에서 시작하세요.
          </p>
          <div class="mt-9 flex flex-wrap gap-3">
            <NuxtLink to="/auth/register" class="rounded-xl bg-white px-6 py-3 text-[16.8px] font-bold text-slate-950 hover:bg-slate-200">
              회원가입
            </NuxtLink>
            <NuxtLink
              to="/exchange/SAMSUNGUSDT"
              class="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-[16.8px] font-bold text-slate-100 hover:bg-white/[0.08]"
            >
              <span>⬇</span>
              앱 다운로드
            </NuxtLink>
          </div>
          <div class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14.4px] text-slate-500">
            <span class="flex items-center gap-1.5"><span class="h-1 w-1 rounded-full bg-slate-600" />실시간 리스크 관리</span>
            <span class="flex items-center gap-1.5"><span class="h-1 w-1 rounded-full bg-slate-600" />24/7 고객지원</span>
            <span class="flex items-center gap-1.5"><span class="h-1 w-1 rounded-full bg-slate-600" />투명한 자산 흐름</span>
          </div>
        </div>

        <div class="pb-6">
          <SquareOrbitVisual mark="U" caption="TRADE CORE" />
        </div>
      </div>
    </section>

    <!-- SECURITY & CONTROL -->
    <section class="border-t border-white/10 px-6 py-14 text-center md:px-12">
      <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">SECURITY &amp; CONTROL</div>
      <h2 class="mx-auto mt-4 max-w-xl text-[36px] font-black leading-tight text-white md:text-[43.2px]">신뢰할 수 있는 거래 파트너</h2>
      <div class="mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-4">
        <div
          v-for="(item, idx) in securityItems"
          :key="item.title"
          class="border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"
          :class="idx === 0 ? 'md:border-l-0 md:pl-0' : ''"
        >
          <svg viewBox="0 0 24 24" class="mx-auto h-8 w-8 text-white" fill="none" stroke="currentColor" stroke-width="1.5">
            <path :d="item.path" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div class="mt-4 text-[19.2px] font-bold text-white">{{ item.title }}</div>
          <p class="mt-2 text-[16.8px] leading-6 text-slate-400">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <!-- MARKETS -->
    <section class="border-t border-white/10 px-6 py-14 md:px-12">
      <div class="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
        <div>
          <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">MARKETS</div>
          <h2 class="mt-4 text-[36px] font-black leading-tight text-white md:text-[43.2px]">당신의 포트폴리오를<br />완성하세요</h2>
          <p class="mt-5 max-w-md text-[16.8px] leading-7 text-slate-400">
            처음 시작하는 순간부터 전문적인 전략까지, 주요 디지털 자산을 하나의 계정에서 빠르고 명확하게 거래하세요.
          </p>
          <NuxtLink to="/exchange/SAMSUNGUSDT" class="mt-7 inline-block rounded-xl bg-white px-6 py-3 text-[16.8px] font-bold text-slate-950 hover:bg-slate-200">
            거래 시작하기
          </NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div v-for="m in markets" :key="m.symbol" class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-black text-white" :style="{ background: m.color }">{{ m.badge }}</span>
              <span class="text-[16.8px] font-bold text-white">{{ m.symbol }}<span class="text-[12px] font-medium text-slate-500">/USDT</span></span>
            </div>
            <div class="mt-3 font-mono text-[21.6px] font-bold text-white">{{ m.price }}</div>
            <div class="mt-1 text-[14.4px] font-semibold" :class="m.up ? 'text-emerald-400' : 'text-rose-400'">{{ m.up ? '+' : '' }}{{ m.change }}%</div>
          </div>
        </div>
      </div>
    </section>

    <!-- PRODUCTS -->
    <section class="border-t border-white/10 px-6 py-14 text-center md:px-12">
      <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">PRODUCTS</div>
      <h2 class="mx-auto mt-4 max-w-2xl text-[36px] font-black leading-tight text-white md:text-[43.2px]">거래의 모든 순간이 한 번의 클릭으로</h2>
      <div class="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="p in products"
          :key="p.title"
          :to="p.to"
          class="group flex min-h-[220px] flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.05]"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7 text-white" fill="none" stroke="currentColor" stroke-width="1.6">
            <path :d="p.path" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div class="mt-5 text-[19.2px] font-bold text-white">{{ p.title }}</div>
          <p class="mt-2 text-[16.8px] leading-6 text-slate-400">{{ p.desc }}</p>
          <div class="mt-auto pt-4 text-[16.8px] font-semibold text-cyan-300 group-hover:text-cyan-200">{{ p.linkText }} →</div>
        </NuxtLink>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-white/10 px-6 py-14 md:px-12">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
        <div>
          <div class="text-[14.4px] font-bold tracking-[0.3em] text-slate-500">FAQ</div>
          <h2 class="mt-4 text-[36px] font-black leading-tight text-white md:text-[43.2px]">궁금한 점이<br />있으신가요?</h2>
          <p class="mt-5 max-w-sm text-[16.8px] leading-7 text-slate-400">
            자주 묻는 질문에서 {{ appName }} 이용에 필요한 핵심 정보를 확인하세요.
          </p>
          <NuxtLink to="/support" class="mt-6 inline-block text-[16.8px] font-semibold text-white underline underline-offset-4">
            고객지원 바로가기 →
          </NuxtLink>
        </div>
        <div class="divide-y divide-white/10 border-t border-white/10">
          <div v-for="(item, idx) in faqItems" :key="item.q">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 py-5 text-left text-[16.8px] font-semibold text-slate-100 hover:text-white"
              @click="openFaq = openFaq === idx ? null : idx"
            >
              {{ item.q }}
              <span class="shrink-0 text-[21.6px] font-light text-slate-500">{{ openFaq === idx ? '−' : '+' }}</span>
            </button>
            <p v-if="openFaq === idx" class="pb-5 text-[16.8px] leading-7 text-slate-400">{{ item.a }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName

const securityItems = [
  {
    title: '검증된 안정성',
    desc: '시장 변화 속에서도 계정과 주문 상태를 명확하게 확인할 수 있도록 설계했습니다.',
    path: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zm-3 9 2 2 4-4'
  },
  {
    title: '투명한 자산 운영',
    desc: '펀딩 지갑과 거래 지갑의 흐름을 구분하고 모든 이동 내역을 한곳에서 추적합니다.',
    path: 'M4 21V10l8-6 8 6v11M9 21v-6h6v6'
  },
  {
    title: '간편한 입출금',
    desc: '복잡한 단계를 줄이고, 처리 상태와 필요한 다음 행동을 분명하게 안내합니다.',
    path: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zm4 3 4 4 4-4M12 7v7'
  },
  {
    title: '빠른 본인 인증',
    desc: '필요한 인증 단계를 확인하고 거래에 필요한 보안 설정까지 이어서 완료하세요.',
    path: 'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5zm3 4h4M8 13h8M8 17h5'
  }
]

const markets = [
  { symbol: 'BTC', badge: 'B', color: '#f7931a', price: '80,090.10', change: '1.67', up: true },
  { symbol: 'ETH', badge: 'Ξ', color: '#627eea', price: '2,499.87', change: '0.01', up: false },
  { symbol: 'SOL', badge: '◎', color: '#14f195', price: '107.3200', change: '5.62', up: true },
  { symbol: 'BNB', badge: 'B', color: '#f0b90b', price: '710.6700', change: '0.81', up: true },
  { symbol: 'XRP', badge: 'X', color: '#4b5563', price: '1.4359', change: '1.87', up: true },
  { symbol: 'AVAX', badge: 'A', color: '#e84142', price: '7.4720', change: '1.23', up: true }
]

const products = [
  {
    title: '선물거래',
    desc: '실시간 차트와 주문창으로 주요 무기한 선물을 정교하게 거래하세요.',
    linkText: '거래하기',
    to: '/exchange/SAMSUNGUSDT',
    path: 'M4 19V5m5 14V9m5 10V7m5 12V11'
  },
  {
    title: '주요 마켓',
    desc: '암호화폐와 주요 종목의 가격 흐름을 한눈에 비교하세요.',
    linkText: '마켓 보기',
    to: '/exchange/SAMSUNGUSDT',
    path: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z'
  },
  {
    title: '자산 관리',
    desc: '펀딩과 거래 지갑을 분리해 잔액, 이동, 손익을 한 흐름으로 관리하세요.',
    linkText: '지갑 보기',
    to: '/wallet',
    path: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm14 5h-3a1.5 1.5 0 0 0 0 3h3'
  },
  {
    title: '손익 분석',
    desc: '실현 손익과 수수료 흐름을 거래 내역에서 명확하게 확인하세요.',
    linkText: 'P&L 확인',
    to: '/invest/trades',
    path: 'M4 19V5m5 14V9m5 10V7m5 12V11'
  }
]

const openFaq = ref<number | null>(null)
const faqItems = [
  { q: `${appName}에서는 어떤 상품을 이용할 수 있나요?`, a: '무기한 선물 거래를 중심으로, 격리 마진과 다양한 레버리지 설정을 지원합니다.' },
  { q: '처음 거래를 시작하려면 무엇이 필요한가요?', a: '회원가입 후 내 지갑에서 입금 요청을 하면, 승인 즉시 거래에 사용할 수 있습니다.' },
  { q: '내 자산과 거래 내역은 어디에서 확인하나요?', a: '상단 메뉴의 내 지갑과 투자내역에서 잔액, 입출금, 거래 내역을 확인할 수 있습니다.' },
  { q: '문제가 생기면 어떻게 도움을 받을 수 있나요?', a: '우측 하단 실시간 상담이나 상단 고객센터를 통해 운영자에게 바로 문의할 수 있습니다.' }
]
</script>
