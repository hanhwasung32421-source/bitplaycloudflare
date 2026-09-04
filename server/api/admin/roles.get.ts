import { requireAdmin } from '../../utils/auth'
import { listRoles, grantableRolesFor } from '../../utils/roles'
import { ADMIN_MENU_KEYS, MENU_META } from '../../utils/menu-permissions'

// 읽기는 모든 관리자(일반 관리자 역할 포함)가 할 수 있다 — 예: 회원 목록에서
// "코드부여"할 때 어떤 역할을 줄지 고르려면 부관리자도 역할 목록을 볼 수 있어야 한다.
// 역할 생성/수정/삭제/순서변경은 총관리자만(각 엔드포인트에서 별도로 확인).
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const roles = await listRoles()
  // 이 계정이 실제로 부여할 수 있는(자기보다 서열이 낮은) 역할만 별도로 내려준다 —
  // 코드부여 드롭다운은 항상 이 목록만 써야 한다.
  const grantableRoles = await grantableRolesFor(admin.role)
  return { roles, grantableRoles, menuKeys: ADMIN_MENU_KEYS, menuMeta: MENU_META }
})
