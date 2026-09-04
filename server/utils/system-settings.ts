import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { supaSelectOne, supaUpsertStrict } from './supabase'

const T_SYSTEM_SETTINGS = 'trae_system_settings'
export const DEFAULT_LIQUIDATION_ROE = -40

// 강제청산 기준 ROE(%). 관리자 대시보드에서 조정하며, 모든 유저의 실시간 청산 판정에 사용됩니다.
export async function getLiquidationRoe(): Promise<number> {
  if (supabaseAppDbEnabled()) {
    try {
      const row = await supaSelectOne<any>(T_SYSTEM_SETTINGS, { id: 1 })
      if (row && Number.isFinite(Number(row.liquidation_roe))) return Number(row.liquidation_roe)
    } catch {
      // 테이블이 아직 없을 수 있음(SQL 패치 미적용) → 기본값 사용
    }
    return DEFAULT_LIQUIDATION_ROE
  }

  const db = getDb()
  const row = db.prepare('SELECT liquidation_roe FROM system_settings WHERE id = 1').get() as
    | { liquidation_roe?: number }
    | undefined
  return Number.isFinite(Number(row?.liquidation_roe)) ? Number(row!.liquidation_roe) : DEFAULT_LIQUIDATION_ROE
}

export async function setLiquidationRoe(value: number): Promise<number> {
  // 음수 퍼센트만 허용(예: -40). 안전 범위로 clamp.
  const v = Math.max(-99, Math.min(-1, Math.round(Number(value))))
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    await supaUpsertStrict(T_SYSTEM_SETTINGS, { id: 1, liquidation_roe: v, updated_at: now }, 'id')
    return v
  }

  const db = getDb()
  db.prepare(
    `INSERT INTO system_settings (id, liquidation_roe, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET liquidation_roe = excluded.liquidation_roe, updated_at = excluded.updated_at`
  ).run(v, now)
  return v
}

// 상단 관리자 메뉴 표시 순서(입출금 내역은 숨김 처리되어 있어 대상에서 뺀다).
export const REORDERABLE_MENU_KEYS = ['members', 'online', 'trades', 'positions', 'messages', 'settlement', 'deposits'] as const
export type ReorderableMenuKey = (typeof REORDERABLE_MENU_KEYS)[number]

// 모든 방문자(비회원 포함)가 보는 최상단 메인 메뉴. 순서 변경/숨기기를 관리자 대시보드에서 지원한다.
export const MAIN_NAV_KEYS = ['coin', 'stock', 'kr', 'markets', 'wallet', 'invest', 'support'] as const
export type MainNavKey = (typeof MAIN_NAV_KEYS)[number]
// 기본값: 요청에 따라 "투자내역"은 처음부터 숨김 처리.
const DEFAULT_MAIN_NAV_HIDDEN: MainNavKey[] = ['invest']

export type SystemSettingsExtra = {
  telegramUrl: string
  krwPerUsdt: number
  lossSettlementPercent: number
  referralSettlementPercent: number
  menuOrder: string[]
  mainNavOrder: string[]
  mainNavHidden: string[]
}

const DEFAULT_EXTRA: SystemSettingsExtra = {
  telegramUrl: '',
  krwPerUsdt: 0,
  lossSettlementPercent: 0,
  referralSettlementPercent: 0,
  menuOrder: [...REORDERABLE_MENU_KEYS],
  mainNavOrder: [...MAIN_NAV_KEYS],
  mainNavHidden: [...DEFAULT_MAIN_NAV_HIDDEN]
}

// 저장된 값이 없거나 최근에 메뉴가 추가/삭제되어 목록이 어긋나도 항상 유효한 순서를 돌려준다.
function normalizeMenuOrder(raw: any): string[] {
  const known = new Set<string>(REORDERABLE_MENU_KEYS)
  const fromRaw = Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string' && known.has(k)) : []
  const missing = REORDERABLE_MENU_KEYS.filter((k) => !fromRaw.includes(k))
  return [...fromRaw, ...missing]
}

function normalizeMainNavOrder(raw: any): string[] {
  const known = new Set<string>(MAIN_NAV_KEYS)
  const fromRaw = Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string' && known.has(k)) : []
  const missing = MAIN_NAV_KEYS.filter((k) => !fromRaw.includes(k))
  return [...fromRaw, ...missing]
}

function normalizeMainNavHidden(raw: any, fallback: string[]): string[] {
  const known = new Set<string>(MAIN_NAV_KEYS)
  if (!Array.isArray(raw)) return fallback
  return raw.filter((k): k is string => typeof k === 'string' && known.has(k))
}

function rowToExtra(row: any): SystemSettingsExtra {
  if (!row) return { ...DEFAULT_EXTRA }
  let menuOrderRaw: any = row.menu_order
  if (typeof menuOrderRaw === 'string') {
    try {
      menuOrderRaw = JSON.parse(menuOrderRaw)
    } catch {
      menuOrderRaw = null
    }
  }
  let mainNavOrderRaw: any = row.main_nav_order
  if (typeof mainNavOrderRaw === 'string') {
    try {
      mainNavOrderRaw = JSON.parse(mainNavOrderRaw)
    } catch {
      mainNavOrderRaw = null
    }
  }
  let mainNavHiddenRaw: any = row.main_nav_hidden
  if (typeof mainNavHiddenRaw === 'string') {
    try {
      mainNavHiddenRaw = JSON.parse(mainNavHiddenRaw)
    } catch {
      mainNavHiddenRaw = null
    }
  }
  // main_nav_hidden 컬럼이 아예 비어있으면(=한 번도 저장된 적 없음) 기본 숨김값을 쓰고,
  // 관리자가 빈 배열로 명시적으로 저장했으면(=전부 표시) 그 값을 그대로 존중한다.
  const hiddenFallback = row.main_nav_hidden === undefined || row.main_nav_hidden === null || row.main_nav_hidden === ''
    ? DEFAULT_MAIN_NAV_HIDDEN
    : []
  return {
    telegramUrl: String(row.telegram_url || ''),
    krwPerUsdt: Number(row.krw_per_usdt || 0),
    lossSettlementPercent: Number(row.loss_settlement_percent || 0),
    referralSettlementPercent: Number(row.referral_settlement_percent || 0),
    menuOrder: normalizeMenuOrder(menuOrderRaw),
    mainNavOrder: normalizeMainNavOrder(mainNavOrderRaw),
    mainNavHidden: normalizeMainNavHidden(mainNavHiddenRaw, hiddenFallback)
  }
}

// 텔레그램 링크/원-USDT 환율/정산 비율 등, 관리자가 조정하는 그 외 전역 설정
export async function getSystemSettingsExtra(): Promise<SystemSettingsExtra> {
  if (supabaseAppDbEnabled()) {
    try {
      const row = await supaSelectOne<any>(T_SYSTEM_SETTINGS, { id: 1 })
      return rowToExtra(row)
    } catch {
      return { ...DEFAULT_EXTRA }
    }
  }
  const db = getDb()
  const row = db
    .prepare(
      'SELECT telegram_url, krw_per_usdt, loss_settlement_percent, referral_settlement_percent, menu_order, main_nav_order, main_nav_hidden FROM system_settings WHERE id = 1'
    )
    .get()
  return rowToExtra(row)
}

export async function updateSystemSettingsExtra(patch: Partial<SystemSettingsExtra>): Promise<SystemSettingsExtra> {
  const current = await getSystemSettingsExtra()
  const next: SystemSettingsExtra = {
    ...current,
    ...patch,
    menuOrder: patch.menuOrder ? normalizeMenuOrder(patch.menuOrder) : current.menuOrder,
    mainNavOrder: patch.mainNavOrder ? normalizeMainNavOrder(patch.mainNavOrder) : current.mainNavOrder,
    mainNavHidden: patch.mainNavHidden ? normalizeMainNavHidden(patch.mainNavHidden, current.mainNavHidden) : current.mainNavHidden
  }
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    await supaUpsertStrict(
      T_SYSTEM_SETTINGS,
      {
        id: 1,
        telegram_url: next.telegramUrl,
        krw_per_usdt: next.krwPerUsdt,
        loss_settlement_percent: next.lossSettlementPercent,
        referral_settlement_percent: next.referralSettlementPercent,
        menu_order: next.menuOrder,
        main_nav_order: next.mainNavOrder,
        main_nav_hidden: next.mainNavHidden,
        updated_at: now
      },
      'id'
    )
    return next
  }

  const db = getDb()
  db.prepare(
    `INSERT INTO system_settings (id, telegram_url, krw_per_usdt, loss_settlement_percent, referral_settlement_percent, menu_order, main_nav_order, main_nav_hidden, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       telegram_url = excluded.telegram_url,
       krw_per_usdt = excluded.krw_per_usdt,
       loss_settlement_percent = excluded.loss_settlement_percent,
       referral_settlement_percent = excluded.referral_settlement_percent,
       menu_order = excluded.menu_order,
       main_nav_order = excluded.main_nav_order,
       main_nav_hidden = excluded.main_nav_hidden,
       updated_at = excluded.updated_at`
  ).run(
    next.telegramUrl,
    next.krwPerUsdt,
    next.lossSettlementPercent,
    next.referralSettlementPercent,
    JSON.stringify(next.menuOrder),
    JSON.stringify(next.mainNavOrder),
    JSON.stringify(next.mainNavHidden),
    now
  )
  return next
}

// 매일 오전 9시(KST)에 한 번 빗썸 시세로 고정하는 자동 환율 캐시.
// KST 09:00 = UTC 00:00 이므로, UTC 날짜(YYYY-MM-DD)가 그대로 "환율 갱신일" 키가 된다.
function currentRateDayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

type DailyRateRow = { rate: number; day: string; updatedAt: string | null }

async function readDailyRateRow(): Promise<DailyRateRow> {
  if (supabaseAppDbEnabled()) {
    try {
      const row = await supaSelectOne<any>(T_SYSTEM_SETTINGS, { id: 1 })
      return {
        rate: Number(row?.krw_auto_rate || 0),
        day: String(row?.krw_auto_rate_day || ''),
        updatedAt: row?.krw_auto_rate_updated_at ? String(row.krw_auto_rate_updated_at) : null
      }
    } catch {
      return { rate: 0, day: '', updatedAt: null }
    }
  }
  const db = getDb()
  const row = db.prepare('SELECT krw_auto_rate, krw_auto_rate_day, krw_auto_rate_updated_at FROM system_settings WHERE id = 1').get() as any
  return {
    rate: Number(row?.krw_auto_rate || 0),
    day: String(row?.krw_auto_rate_day || ''),
    updatedAt: row?.krw_auto_rate_updated_at ? String(row.krw_auto_rate_updated_at) : null
  }
}

async function writeDailyRateRow(rate: number, day: string): Promise<void> {
  const now = new Date().toISOString()
  if (supabaseAppDbEnabled()) {
    await supaUpsertStrict(T_SYSTEM_SETTINGS, { id: 1, krw_auto_rate: rate, krw_auto_rate_day: day, krw_auto_rate_updated_at: now }, 'id')
    return
  }
  const db = getDb()
  db.prepare(
    `INSERT INTO system_settings (id, krw_auto_rate, krw_auto_rate_day, krw_auto_rate_updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       krw_auto_rate = excluded.krw_auto_rate,
       krw_auto_rate_day = excluded.krw_auto_rate_day,
       krw_auto_rate_updated_at = excluded.krw_auto_rate_updated_at`
  ).run(rate, day, now)
}

// 그날(오전 9시 기준) 아직 갱신된 적이 없으면 빗썸에서 새로 받아와 고정하고, 있으면 캐시된 값을 그대로 쓴다.
// Vercel Cron이 매일 09:00 KST에 /api/cron/refresh-krw-rate를 호출해 갱신하지만,
// 혹시 그게 실패하더라도 이후 아무 요청에서나(정산내역 조회, 입금 승인 등) 이 함수가 알아서 갱신한다.
export async function getDailyKrwRate(): Promise<{ rate: number; day: string; updatedAt: string | null }> {
  const today = currentRateDayKey()
  const cached = await readDailyRateRow()
  if (cached.day === today && cached.rate > 0) return cached

  let price = 0
  try {
    const res = await $fetch<any>('https://api.bithumb.com/public/ticker/USDT_KRW')
    price = Number(res?.data?.closing_price)
  } catch {
    // 시세 조회 자체가 실패한 경우
  }

  if (Number.isFinite(price) && price > 0) {
    const result = { rate: price, day: today, updatedAt: new Date().toISOString() }
    // 캐시 저장은 실패해도(예: DB 마이그레이션 미적용) 방금 받아온 실시간 시세는 그대로 써야 한다 —
    // 여기서 실패했다고 0원을 돌려주면 안 된다.
    try {
      await writeDailyRateRow(price, today)
    } catch (e) {
      console.error('[system-settings] failed to persist daily KRW rate cache:', (e as any)?.message || e)
    }
    return result
  }

  // 갱신 실패 시 이전에 캐시된 값이라도 사용 (없으면 0)
  return cached
}

// 관리자가 원/USDT 비율을 0(또는 미설정)으로 두면, 매일 09시(KST)에 고정한 빗썸 환율을 사용한다.
export async function resolveKrwPerUsdtRate(): Promise<number> {
  const extra = await getSystemSettingsExtra()
  if (extra.krwPerUsdt > 0) return extra.krwPerUsdt
  const daily = await getDailyKrwRate()
  return daily.rate
}
