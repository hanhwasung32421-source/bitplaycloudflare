/**
 * Restore Point: js1
 * 생성 목적: "conversation_backup.js"를 기준으로 현재 프로젝트/대화 상태를 완전히 이해했음을 고정 스냅샷으로 남김
 *
 * 주의:
 * - 이 파일은 "대화/결정/규칙" 백업용이다. 코드 롤백(깃 revert)과는 별개다.
 * - 과거 상태로 돌아가고 싶으면, 원하는 restore id 파일을 열어서 당시 요약/규칙/핵심 변경점을 참고하면 된다.
 */
export const restorePoint = {
  id: 'js1',
  createdAt: '2026-08-04T17:27:30+09:00',
  source: {
    primaryBackupFile: 'c:\\trae\\거래소\\conversation_backup.js',
  },
  projectUnderstanding: {
    stack: ['Nuxt 4', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Vercel'],
    activeAppDir: 'app',
    backendDir: 'server',
    currentVersionAtThatTime: '2026년 8월 4일 (화) - 43',
  },
  confirmedKeyRulesAndFlows: [
    '거래/수익: 거래 화면/투자내역/관리자 거래내역에서 결과를 `강제청산(빨강) / 수익(파랑) / 손실(빨강)`로 구분해 표시',
    '강제청산 정의: ROE -50% 도달 시 단순 -50% 손실이 아니라, 포지션 증거금 100% 전액 손실로 처리',
    'Supabase 안정성: 특정 컬럼/조인 누락(예: liquidation 컬럼 부재 등)이 있어도 API가 500을 내지 않고 빈 배열/부분 응답으로 방어',
    '쪽지 기능: 회원(고객센터=쪽지함) ↔ 운영자(관리자 쪽지관리) 대화/발송/답장, 안읽음 종 아이콘 + 숫자 표시',
    '비밀번호 초기화: 사용자가 요청 → 운영자가 승인 → 비밀번호 `1234`로 초기화, 로그인 시 1회 안내 팝업 + 다시보지않기 저장',
    '회원가입 입력 제한: 아이디 영문만, 이름/예금주 한글만, 은행계좌 숫자만, 비밀번호 4자+ 및 한글 2벌식 입력 시 영문 QWERTY로 변환 저장',
  ],
  lastUserMessage: '기존에 했던거 JS 백업파일 참고해서 전부 이해해줘.',
  assistantResult: 'conversation_backup.js의 최신 로그까지 확인했고, 현재 기능/규칙/운영 플로우를 기준으로 이후 수정 작업을 바로 이어갈 수 있는 상태로 이해 완료.',
}

export default restorePoint

