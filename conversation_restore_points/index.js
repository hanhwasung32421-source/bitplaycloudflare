/**
 * 대화 Restore Point 인덱스
 * - 각 대화마다 `conversation_restore_points/jsN.js`를 추가하고 여기에도 누적한다.
 * - 사용자는 원하는 시점의 jsN 파일을 열어서 당시 상태/규칙을 기준으로 되돌리거나 이어서 작업하면 된다.
 */

export const restoreIndex = [
  {
    id: 'js1',
    createdAt: '2026-08-04T17:27:30+09:00',
    file: 'c:\\trae\\거래소\\conversation_restore_points\\js1.js',
    note: 'conversation_backup.js 기반 전체 이해 완료 스냅샷',
  },
  {
    id: 'js2',
    createdAt: '2026-08-05T16:04:53+09:00',
    file: 'c:\\trae\\거래소\\conversation_restore_points\\js2.js',
    note: '관리자 > 포지션 목록: 박스/가로스크롤 제거',
  },
  {
    id: 'js3',
    createdAt: '2026-08-05T16:15:01+09:00',
    file: 'c:\\trae\\거래소\\conversation_restore_points\\js3.js',
    note: '차트 도구(수평선/추세선): F5/재접속에도 로컬 캐시로 유지',
  },
  {
    id: 'js4',
    createdAt: '2026-08-05T16:46:23+09:00',
    file: 'c:\\trae\\거래소\\conversation_restore_points\\js4.js',
    note: '차트 도구 저장 불가 재수정: 기기 단위 v2 키로 저장/복원',
  },
  {
    id: 'js5',
    createdAt: '2026-08-05T16:51:04+09:00',
    file: 'c:\\trae\\거래소\\conversation_restore_points\\js5.js',
    note: '관리자: 킬UP/킬DOWN(차트표시 ±1% 1초) 버튼 추가',
  },
  {
    id: 'js6',
    createdAt: '2026-08-05T16:55:40+09:00',
    file: 'c:\\trae\\거래소\\conversation_restore_points\\js6.js',
    note: '킬버튼 전파 여부 질의 응답 기록(현재: 로컬 표시만)',
  },
]

export function getRestorePointMeta(id) {
  return restoreIndex.find((x) => x.id === id) || null
}
