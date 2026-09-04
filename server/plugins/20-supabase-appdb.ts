import { bootstrapSupabaseAppDb } from '../utils/supa-appdb'
import { getDb } from '../utils/db'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('ready', async () => {
    try {
      const db = getDb()
      await bootstrapSupabaseAppDb(db)
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[supabase-appdb] bootstrap failed', e?.message || e)
    }
  })
})

