export default defineEventHandler(() => {
  ;(globalThis as any).__LAST_ERROR__ = undefined
  return { ok: true }
})

