import { requireUser } from '../utils/auth'
import { getDb } from '../utils/db'
import { supabaseAppDbEnabled } from '../utils/supa-appdb'
import { supaSelectIn, supaSelectOne, supaSelectWhere, supaUpsertUserSettings } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const bal = await supaSelectOne<{ usdt: number }>('trae_balances', { user_id: user.id })

    // 사용자 거래 설정(비중/레버리지/차트 설정) - 없을 때만 기본값으로 생성.
    // 매 요청마다 upsert하면 이미 저장된 chart_prefs(BOL 등)가 기본값 {}로 덮어써져
    // 새로고침/재로그인 때마다 초기화되는 문제가 있었음(SQLite 쪽의 INSERT OR IGNORE와 동작이 달랐음).
    let settings = await supaSelectOne<any>('trae_user_settings', { user_id: user.id })
    if (!settings) {
      await supaUpsertUserSettings({
        user_id: user.id,
        trade_percent: 50,
        trade_leverage: 100,
        chart_prefs: {},
        updated_at: new Date().toISOString()
      })
      settings = await supaSelectOne<any>('trae_user_settings', { user_id: user.id })
    }

    const positions = await supaSelectWhere<any>({
      table: 'trae_positions',
      where: { user_id: user.id },
      orderBy: 'id',
      ascending: false
    })
    const trades = await supaSelectWhere<any>({
      table: 'trae_trades',
      where: { user_id: user.id },
      orderBy: 'id',
      ascending: false,
      limit: 50
    })
    const cardsRaw = await supaSelectWhere<any>({
      table: 'trae_profit_cards',
      where: { user_id: user.id },
      orderBy: 'id',
      ascending: false,
      limit: 50
    })
    const tradeIds = cardsRaw.map((c: any) => c.trade_id).filter(Boolean)
    const tradesForCards = await supaSelectIn<any>({
      table: 'trae_trades',
      column: 'id',
      values: tradeIds
    })
    const tradeMap = new Map(tradesForCards.map((t: any) => [t.id, t]))
    const cards = cardsRaw.map((pc: any) => {
      const t = tradeMap.get(pc.trade_id) || {}
      return {
        id: pc.id,
        title: pc.title,
        note: pc.note,
        created_at: pc.created_at,
        symbol: t.symbol,
        side: t.side,
        qty: t.qty,
        pnl: t.pnl,
        entry_price: t.entry_price,
        exit_price: t.exit_price
      }
    })

    return {
      me: user,
      balance: { usdt: bal?.usdt ?? 0 },
      settings: {
        tradePercent: settings?.trade_percent ?? 50,
        tradeLeverage: settings?.trade_leverage ?? 100,
        chartPrefs: settings?.chart_prefs || {}
      },
      positions,
      trades,
      cards
    }
  }

  const db = getDb()

  const bal = await db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as { usdt: number } | undefined

  // 사용자 거래 설정(비중/레버리지) - 없으면 기본값으로 생성
  await db.prepare('INSERT OR IGNORE INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    50,
    100,
    '{}',
    new Date().toISOString()
  )
  const settings = await db
    .prepare('SELECT trade_percent, trade_leverage, chart_prefs FROM user_settings WHERE user_id = ?')
    .get(user.id) as { trade_percent: number; trade_leverage: number; chart_prefs?: string } | undefined

  const positions = await db
    .prepare('SELECT * FROM positions WHERE user_id = ? ORDER BY id DESC')
    .all(user.id) as any[]
  const trades = await db
    .prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT 50')
    .all(user.id) as any[]
  const cards = await db
    .prepare(
      `SELECT pc.id, pc.title, pc.note, pc.created_at, t.symbol, t.side, t.qty, t.pnl, t.entry_price, t.exit_price
       FROM profit_cards pc
       JOIN trades t ON t.id = pc.trade_id
       WHERE pc.user_id = ?
       ORDER BY pc.id DESC
       LIMIT 50`
    )
    .all(user.id) as any[]

  return {
    me: user,
    balance: { usdt: bal?.usdt ?? 0 },
    settings: {
      tradePercent: settings?.trade_percent ?? 50,
      tradeLeverage: settings?.trade_leverage ?? 100,
      chartPrefs: (() => {
        try {
          return settings?.chart_prefs ? JSON.parse(String(settings.chart_prefs)) : {}
        } catch {
          return {}
        }
      })()
    },
    positions,
    trades,
    cards
  }
})
