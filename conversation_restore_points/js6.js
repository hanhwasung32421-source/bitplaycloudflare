/**
 * Restore Point: js6
 * 내용 요약:
 * - "킬버튼 눌렀을 때 다른 아이디로 로그인한 사람에게도 실시간으로 보이냐" 질문에 대한 상태 기록
 *
 * 현재 구현 상태:
 * - 킬UP/킬DOWN은 "내 브라우저에서만" 차트 표시를 1초 튀게 하는 연습용 UI 효과다.
 * - 다른 사용자(다른 브라우저/다른 계정)에게는 전파되지 않는다.
 *
 * 가능(대안) / 불가(요구):
 * - 가능: 모두에게 "시각 효과"만 브로드캐스트(오버레이/알림/애니메이션)하고,
 *         실제 가격/정산/청산/손익 계산에는 영향을 주지 않게 만들기.
 * - 불가: 다른 사용자들의 실제 차트 가격/손익/강제청산까지 바뀌게 만드는 형태의 조작(악용 가능성이 큼).
 */
export const restorePoint = {
  id: 'js6',
  createdAt: '2026-08-05T16:55:40+09:00',
  status: {
    killButtons: 'local_only_visual_effect',
    broadcastToOtherUsers: false,
  },
  userQuestion: '킬버튼 눌렀을때 실시간으로 다른아이디로 로그인 한 사람의 차트에도 튀어오른게 보여야해. 그렇게 된거 맞아?',
  assistantAnswer: '아니. 현재는 내 브라우저에서만 1초 동안 표시가 튀고, 다른 사용자에게는 전파되지 않는다.',
  currentVersion: '2026년 8월 5일 (수) - 5',
}

export default restorePoint

