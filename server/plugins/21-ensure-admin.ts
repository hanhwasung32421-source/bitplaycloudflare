import { getSupabaseAdminClient, supaSelectOne, supaUpsertUserSettings } from '../utils/supabase'
import { supabaseAppDbEnabled } from '../utils/supa-appdb'
import { hashPassword } from '../utils/auth'

// 배포/푸시를 반복해도 "admin / 1234" 계정이 항상 존재하도록 보장합니다.
// - Supabase App DB 모드일 때만 동작
// - 없으면 생성
// - 이미 있으면 절대 수정/덮어쓰기 하지 않음(비밀번호/권한/잔고 유지)
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('ready', async () => {
    try {
      if (!supabaseAppDbEnabled()) return

      const cfg = useRuntimeConfig()
      if (!String(cfg.supabaseServiceRoleKey || '')) return

      const supa = getSupabaseAdminClient()
      const now = new Date().toISOString()

      const existing = await supaSelectOne<any>('trae_users', { username: 'admin' })
      const adminId = Number(existing?.id ?? 1053)

      if (!existing) {
        const desiredPasswordHash = hashPassword('1234')
        const { error } = await supa.from('trae_users').insert({
          id: adminId,
          username: 'admin',
          password_hash: desiredPasswordHash,
          name: '',
          birth_date: '',
          bank_name: '',
          bank_account: '',
          account_holder: '',
          referral_code: '',
          terms_agreed_at: now,
          password_reset_required: false,
          password_reset_notice_dismissed_at: null,
          role: 'super_admin',
          permissions: { all: true, canCredit: true },
          created_at: now,
          updated_at: now
        })
        if (error) throw error
      }

      // 잔고/설정은 "없을 때만" 생성 (기존 값 절대 유지)
      const bal = await supaSelectOne<any>('trae_balances', { user_id: adminId })
      if (!bal) {
        const { error } = await supa.from('trae_balances').insert({ user_id: adminId, usdt: 10000 })
        if (error) throw error
      }

      const settings = await supaSelectOne<any>('trae_user_settings', { user_id: adminId })
      if (!settings) {
        await supaUpsertUserSettings({
          user_id: adminId,
          trade_percent: 50,
          trade_leverage: 100,
          chart_prefs: {},
          updated_at: now
        })
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[ensure-admin] failed:', e?.message || e)
    }
  })
})
