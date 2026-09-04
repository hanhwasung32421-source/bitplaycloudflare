import { requireAdmin } from '../../utils/auth'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { getDb } from '../../utils/db'
import { canViewMenu } from '../../utils/menu-permissions'

function isAdminRole(role: string) {
  return role !== 'user' && role !== 'super_admin' && role !== ''
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'transfers')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }

  // 현재 시스템에서 입출금 내역은 "관리자 가상 입금(app_admin_credits)"만 기록됩니다.
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const q = getQuery(event)
    const limit = Math.min(200, Math.max(1, Number(q.limit ?? 50)))
    const offset = Math.max(0, Number(q.offset ?? 0))

    const { data: rows, error: e1 } = await supa
      .from('app_admin_credits')
      .select('admin_local_user_id, target_local_user_id, amount, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (e1) throw e1

    const ids = Array.from(
      new Set(
        (rows || [])
          .flatMap((r: any) => [Number(r.admin_local_user_id), Number(r.target_local_user_id)])
          .filter(Boolean)
      )
    )
    const { data: users, error: e2 } = await supa.from('trae_users').select('id, username, role').in('id', ids)
    if (e2) throw e2
    const userMap = new Map((users || []).map((u: any) => [Number(u.id), u]))

    const items = (rows || []).map((r: any) => {
      const targetId = Number(r.target_local_user_id)
      const adminId = Number(r.admin_local_user_id)
      const target = userMap.get(targetId)
      const admin = userMap.get(adminId)
      return {
        type: '입금',
        user_id: targetId,
        username: String(target?.username || `user${targetId}`),
        name: String(target?.username || `user${targetId}`),
        affiliateName: isAdminRole(String(target?.role || '')) ? String(target?.username || '') : '—',
        amount_usdt: Number(r.amount || 0),
        // KRW/환율/상태는 현재 데이터 소스가 없어 기본값 제공(확장 예정)
        amount_krw: null,
        rate: null,
        status: '승인',
        created_at: String(r.created_at || ''),
        admin: String(admin?.username || `admin${adminId}`)
      }
    })

    const totalIn = (rows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    return { items, hasMore: (rows || []).length === limit, summary: { totalInUsdt: totalIn, totalOutUsdt: 0 } }
  }

  // SQLite 모드: 입출금 로그 테이블이 없어서 빈 목록 반환
  const db = getDb()
  await db.prepare('SELECT 1').get()
  return { items: [], hasMore: false, summary: { totalInUsdt: 0, totalOutUsdt: 0 } }
})

