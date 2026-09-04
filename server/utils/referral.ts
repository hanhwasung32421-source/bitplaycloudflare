import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient } from './supabase'

// 영업 조직처럼: 총판(부관리자) 아래 팀장/팀원(역시 관리자 역할)이 있고,
// 그 팀장/팀원 아래에 또 일반회원(또는 더 아래 팀원)이 있을 수 있다. referral_code는
// "누가 나를 추천해서 가입시켰는가"(=추천인의 아이디)를 저장하므로, 이 그래프를
// root(관리자 본인 아이디)에서부터 몇 단계든 따라 내려가면 그 관리자의 전체 하부 조직을 구할 수 있다.
export function computeDownlineUsernames(root: string, edges: Array<{ username: string; referralCode: string }>): Set<string> {
  const childrenMap = new Map<string, string[]>()
  for (const e of edges) {
    const parent = String(e.referralCode || '').trim()
    if (!parent) continue
    if (!childrenMap.has(parent)) childrenMap.set(parent, [])
    childrenMap.get(parent)!.push(String(e.username))
  }

  const result = new Set<string>()
  let frontier = [root]
  let depth = 0
  // 조직도가 아무리 깊어도(예: 총판 > 팀장 > 팀원 > 팀원 ...) 안전하게 끝까지 따라간다.
  // depth 상한은 순환 참조 등 이상 데이터로 인한 무한루프만 방지하는 안전장치.
  while (frontier.length && depth < 50) {
    const next: string[] = []
    for (const parent of frontier) {
      for (const child of childrenMap.get(parent) || []) {
        if (result.has(child) || child === root) continue
        result.add(child)
        next.push(child)
      }
    }
    frontier = next
    depth++
  }
  return result
}

// members.get.ts처럼 이미 전체 유저 목록(username/referral_code 포함)을 들고 있지 않은
// 엔드포인트(settlement/deposits 등)를 위한 편의 함수: 그래프만 새로 조회해서 하부 조직을 구한다.
export async function fetchDownlineUsernames(root: string): Promise<Set<string>> {
  let edges: Array<{ username: string; referralCode: string }>
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from('trae_users').select('username, referral_code')
    if (error) throw error
    edges = (data || []).map((u: any) => ({ username: String(u.username || ''), referralCode: String(u.referral_code || '') }))
  } else {
    const db = getDb()
    const rows = await db.prepare('SELECT username, referral_code FROM users').all() as any[]
    edges = rows.map((u) => ({ username: String(u.username || ''), referralCode: String(u.referral_code || '') }))
  }
  return computeDownlineUsernames(root, edges)
}
