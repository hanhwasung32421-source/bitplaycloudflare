/**
 * Restore Point: js2
 * 변경 요약:
 * - 관리자 > 포지션 목록: 테이블이 박스 안에서 가로 스크롤 되던 UX를 제거
 * - 카드(박스) 스타일을 약화/확장하고, overflow-x-auto 제거 + table-fixed 압축으로 화면 안에 맞춰 한 번에 보이도록 수정
 * - version.json 갱신
 */
export const restorePoint = {
  id: 'js2',
  createdAt: '2026-08-05T16:04:53+09:00',
  changes: [
    {
      file: 'app/pages/admin/positions.vue',
      summary: [
        '전체 컨테이너 "박스"를 제거(혹은 최소화)해서 화면 폭을 최대한 사용하도록 변경',
        '테이블 래퍼의 `overflow-x-auto` 제거',
        '`table-fixed` + 컬럼 폭 지정 + 패딩/폰트 축소로 가로 스크롤 없이 한 화면에 들어오도록 압축',
        '긴 텍스트(소속총판/심볼/주문타입)는 `truncate`로 처리해 폭 초과 시 줄이지 않고 말줄임 처리',
      ],
    },
    {
      file: 'version.json',
      summary: ['버전을 `2026년 8월 5일 (수) - 1`로 갱신'],
    },
  ],
  git: {
    commits: ['5d43abf admin positions: remove horizontal scroll', 'f6bab6e chore: bump version'],
    pushed: true,
    remote: 'https://github.com/hanhwasung32421-source/usdetrade.git',
    branch: 'main',
  },
  currentVersion: '2026년 8월 5일 (수) - 1',
}

export default restorePoint

