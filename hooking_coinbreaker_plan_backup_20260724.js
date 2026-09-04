export const hookingCoinbreakerPlanBackup = {
  date: '2026-07-24',
  topic: 'hooking2.0 + coinbreaker3 텔레그램 전송 자동화 계획',
  userRequest:
    'coinbreaker3에서 스크린샷 크롭 이미지와 함께 생성되는 문구를 텔레그램 창마다 이미지 1개 + 문구 1개 순서로 자동 전송하고 싶음',
  inspectedPaths: {
    hooking2: 'C:\\trae\\hooking2.0',
    coinbreaker3: 'C:\\trae\\coinbreaker3',
    workspaceBackup: 'C:\\trae\\거래소\\conversation_backup.js'
  },
  findings: {
    hooking2: [
      'Hooking.ahk는 module/actions.ahk, module/message_store.ahk, module/quick_paste.ahk 등을 조합하는 엔트리 구조임',
      'module/actions.ahk는 텔레그램 창 목록 감지, 창 활성화, 입력창 클릭, 창별 메시지 순회 전송 로직을 이미 갖고 있음',
      'module/quick_paste.ahk는 ClipboardAll 기반 백업/복구 패턴이 있어 이미지 클립보드 처리에 재사용 가능함',
      '현재 send 액션은 SendText 기반의 텍스트 전송 전용이라 이미지 전송 단계는 새 액션이 필요함'
    ],
    coinbreaker3: [
      'app.js에 크롭된 이미지를 blob으로 생성하고 navigator.clipboard.write로 이미지 클립보드 복사하는 로직이 이미 있음',
      '프리셋 클릭 시 문구를 생성해 `.preset-caption`에 넣고 텍스트 선택까지는 하지만 writeText 복사는 하지 않음',
      '즉 이미지 출력은 준비돼 있고, 문구를 외부 자동화가 안정적으로 가져가게 만드는 연결이 추가로 필요함'
    ]
  },
  recommendation: {
    primary: 'AutoHotkey 중심 구현',
    reason: [
      '기존 hooking2.0의 창별 텔레그램 순회 엔진을 그대로 재사용 가능',
      '이미 여러 텔레그램 창 좌표/가상화면/입력 포커스 문제가 해결된 상태',
      'Python으로 처음부터 창 제어를 다시 짜는 것보다 리스크가 낮음'
    ],
    alternative: 'Python은 오케스트레이션 또는 예외 로그 수집용 보조 도구로만 고려'
  },
  plannedFlow: [
    'coinbreaker3에서 프리셋 클릭',
    '이미지 blob을 클립보드에 복사',
    '같은 순간 생성된 문구를 텍스트 클립보드 또는 숨김 필드/로컬 상태로 확정',
    'hooking2.0가 각 텔레그램 창을 순회',
    '각 창에 이미지 Ctrl+V 후 Enter 1회',
    '같은 창에 문구 SendText 후 Enter 1회',
    '다음 창으로 이동'
  ],
  requiredChanges: [
    'coinbreaker3: 현재 프리셋 문구를 명시적으로 복사하거나 외부에서 읽을 수 있게 노출',
    'hooking2.0: 이미지 전송 + 텍스트 전송을 한 묶음으로 처리하는 신규 액션 추가',
    'hooking2.0: 이미지 붙여넣기 전후 클립보드 백업/복구와 Telegram 전송 대기 시간 조정',
    '두 프로그램 간 트리거 방식 정의(수동 단축키 / 파일 신호 / 로컬 HTTP 중 하나)'
  ],
  nextImplementationOrder: [
    '1. coinbreaker3에서 문구 복사 보장',
    '2. hooking2.0에 이미지+문구 2단 전송 액션 추가',
    '3. 1개 창으로 테스트',
    '4. 다중 창 순회로 확장',
    '5. 실패 재시도와 로그 추가'
  ]
};
