/**
 * Restore Point: js5
 * 변경 요약:
 * - 관리자 계정으로 거래 화면(차트) 상단에 `킬UP / 킬DOWN` 버튼 추가
 * - 동작: 현재가 기준 ±1%로 차트 표시를 1초간 튀게 한 뒤 자동으로 원래 데이터로 동기화
 * - 주의: 연습용 "차트 표시" 기능이며, 서버 정산/청산/다른 사용자 손익에는 영향 없음
 * - version.json 갱신
 */
export const restorePoint = {
  id: 'js5',
  createdAt: '2026-08-05T16:51:04+09:00',
  changes: [
    {
      file: 'app/pages/exchange/[symbol].vue',
      summary: [
        '관리자 전용 킬UP/킬DOWN 버튼 UI 추가',
        '차트 표시를 1초 동안 ±1%로 튀게(실시간 업데이트 잠깐 freeze) 후, `reloadCandles()`로 원복 동기화',
        '현재가 표시용 `displayLastPrice` computed 추가(실제 lastPrice 로직은 유지)',
      ],
    },
    {
      file: 'version.json',
      summary: ['버전을 `2026년 8월 5일 (수) - 4`로 갱신'],
    },
  ],
  git: {
    commits: ['7a23073 admin: add kill up/down (chart display only)'],
    pushed: true,
    remote: 'https://github.com/hanhwasung32421-source/usdetrade.git',
    branch: 'main',
  },
  currentVersion: '2026년 8월 5일 (수) - 4',
}

export default restorePoint

