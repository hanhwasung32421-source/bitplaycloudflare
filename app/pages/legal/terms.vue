<template>
  <div class="font-landing mx-auto max-w-3xl px-6 py-14">
    <div class="text-xs font-bold tracking-[0.3em] text-slate-500">LEGAL</div>
    <h1 class="mt-4 text-3xl font-black text-white">이용약관</h1>
    <p class="mt-2 text-sm text-slate-500">최종 업데이트: {{ updatedAt }}</p>

    <div class="mt-10 space-y-8 border-t border-white/10 pt-10">
      <section v-for="(item, idx) in sections" :key="idx">
        <h2 class="text-base font-bold text-white">{{ item.title }}</h2>
        <p class="mt-2 text-sm leading-7 text-slate-400">{{ item.body }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName
const updatedAt = '2026년 6월 30일'

const sections = [
  {
    title: '1. 서비스 범위',
    body: `${appName}는 디지털 자산 선물거래, 지갑, 입출금, 대회 및 관련 부가 기능을 제공합니다. 이용자는 본 약관과 화면에 표시되는 거래 조건, 수수료, 위험 고지를 확인한 뒤 서비스를 이용해야 합니다.`
  },
  {
    title: '2. 계정과 보안',
    body: '이용자는 본인 명의의 정확한 정보로 계정을 생성해야 하며, 비밀번호, 2FA, 인증 수단을 안전하게 관리할 책임이 있습니다. 비정상 접속이나 계정 도용이 의심되는 경우 즉시 비밀번호를 변경하고 고객지원에 문의해야 합니다.'
  },
  {
    title: '3. 거래 위험',
    body: '선물거래는 높은 변동성과 레버리지로 인해 원금을 초과하는 손실, 강제 청산, 시장 유동성 부족에 따른 체결 지연이 발생할 수 있습니다. 모든 주문과 포지션 관리는 이용자 책임입니다.'
  },
  {
    title: '4. 금지 행위',
    body: '시세 조작, 다중 계정 악용, 보너스 부정 수령, 불법 자금 이용, 시스템 우회, 자동화 공격, 타인 정보 도용은 금지됩니다. 위반 시 계정 제한, 거래 취소, 출금 보류, 관계 기관 신고가 이뤄질 수 있습니다.'
  },
  {
    title: '5. 입출금과 수수료',
    body: '입출금 가능 자산, 네트워크, 최소 금액, 수수료는 화면에 표시된 기준을 따릅니다. 잘못된 주소, 네트워크 선택 오류, 태그 누락 등 이용자 입력 오류로 인한 손실은 복구가 제한될 수 있습니다.'
  },
  {
    title: '6. 서비스 제한과 변경',
    body: '보안, 점검, 법령 준수, 유동성 공급자 장애, 외부 네트워크 장애가 있는 경우 서비스 일부가 지연되거나 제한될 수 있습니다. 중요한 변경은 공지사항 또는 서비스 화면을 통해 안내합니다.'
  },
  {
    title: '7. 문의',
    body: '약관, 계정, 거래, 입출금 문의는 고객지원을 통해 접수할 수 있습니다.'
  }
]
</script>
