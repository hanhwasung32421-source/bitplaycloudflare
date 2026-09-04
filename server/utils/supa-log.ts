import { getRequestHeader, getRequestIP } from 'h3'
import type { H3Event } from 'h3'
import { supaInsert } from './supabase'

export async function logAppUser(user: { id: number; username: string; role: string }) {
  await supaInsert('app_users', {
    local_user_id: user.id,
    username: user.username,
    role: user.role,
    created_at: new Date().toISOString()
  })
}

export async function logLogin(
  event: H3Event,
  payload: { userId?: number | null; username?: string | null; area: 'main' | 'admin'; success: boolean }
) {
  const ua = getRequestHeader(event, 'user-agent')
  const ip = getRequestIP(event)
  await supaInsert('app_login_events', {
    local_user_id: payload.userId ?? null,
    username: payload.username ?? null,
    area: payload.area,
    success: payload.success,
    ip,
    user_agent: ua ?? null,
    created_at: new Date().toISOString()
  })
}

export async function logBuy(payload: {
  userId: number
  symbol: string
  side: string
  buy_price: number
  qty: number
  margin: number
  leverage: number
}) {
  await supaInsert('app_buys', {
    local_user_id: payload.userId,
    symbol: payload.symbol,
    side: payload.side,
    buy_time: new Date().toISOString(),
    buy_price: payload.buy_price,
    qty: payload.qty,
    margin: payload.margin,
    leverage: payload.leverage,
    total_usdt: payload.buy_price * payload.qty
  })
}

export async function logAdminCredit(payload: { adminUserId: number; userId: number; amount: number }) {
  await supaInsert('app_admin_credits', {
    admin_local_user_id: payload.adminUserId,
    target_local_user_id: payload.userId,
    amount: payload.amount,
    created_at: new Date().toISOString()
  })
}

