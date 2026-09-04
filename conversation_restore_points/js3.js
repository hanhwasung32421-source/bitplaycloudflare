/**
 * Restore Point: js3
 * 변경 요약:
 * - 차트 도구(수평선/추세선) 로컬 캐시 저장을 "서버 chartPrefs 하이드레이션 여부와 무관"하게 항상 수행하도록 수정
 * - 서버에서 chartPrefs가 내려오지 않더라도, localStorage에 저장된 드로잉을 우선 복원하도록 보강
 * - version.json 갱신
 */
export const restorePoint = {
  id: 'js3',
  createdAt: '2026-08-05T16:15:01+09:00',
  changes: [
    {
      file: 'app/pages/exchange/[symbol].vue',
      summary: [
        '`scheduleSaveChartPrefs()`에서 localStorage 저장은 항상 수행(새로고침/F5에도 유지)',
        '서버 chartPrefs가 없을 때도 localStorage 드로잉을 복원하도록 하이드레이션 로직 보강',
      ],
    },
    {
      file: 'version.json',
      summary: ['버전을 `2026년 8월 5일 (수) - 2`로 갱신'],
    },
  ],
  git: {
    commits: ['63583c9 chart: persist drawings via localStorage even after refresh'],
    pushed: true,
    remote: 'https://github.com/hanhwasung32421-source/usdetrade.git',
    branch: 'main',
  },
  currentVersion: '2026년 8월 5일 (수) - 2',
}

export default restorePoint

