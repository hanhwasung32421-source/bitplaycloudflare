/**
 * Restore Point: js4
 * 변경 요약:
 * - 차트 도구(수평선/추세선) 저장이 안 되는 문제 재수정
 * - 저장 키가 me.id(유저 로드 타이밍)에 의존해 "guest 키로 저장되거나" 복원 시점에 키가 달라져 못 읽는 문제가 있었음
 * - 해결: 기기/브라우저 단위로 고정되는 v2 키(`trae:chart-drawings:v2:{SYMBOL}`)로 항상 저장/복원
 * - 호환: 기존 v1 키(uid/guest)도 같이 저장/탐색해서 이전 데이터도 자연스럽게 복원
 * - version.json 갱신
 */
export const restorePoint = {
  id: 'js4',
  createdAt: '2026-08-05T16:46:23+09:00',
  changes: [
    {
      file: 'app/pages/exchange/[symbol].vue',
      summary: [
        '드로잉 저장 키를 기기 단위 v2로 변경(유저 로드 타이밍 영향 제거)',
        '복원 시 v2 → v1(uid) → v1(guest) 순으로 탐색해 항상 복원되게 보강',
        '저장 시 v2 저장 + v1(uid)도 같이 저장(legacy 호환)',
      ],
    },
    {
      file: 'version.json',
      summary: ['버전을 `2026년 8월 5일 (수) - 3`로 갱신'],
    },
  ],
  git: {
    commits: ['d81a81d chart: fix drawing persistence key (device-based v2)'],
    pushed: true,
    remote: 'https://github.com/hanhwasung32421-source/usdetrade.git',
    branch: 'main',
  },
  currentVersion: '2026년 8월 5일 (수) - 3',
}

export default restorePoint

